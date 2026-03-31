import { createCommunicationDraft, persistCommunicationDraft } from '../communications';
import { buildExecutionTasksFromFulfillment, provisionFulfillmentPackage } from '../fulfillment';
import { readIntakeRecords } from '../intake';
import { getPlanById, normalizePlanId } from '../pricing';
import { SITE_URL } from '../site';
import { createFollowUpTask, dueAtFromNow, persistFollowUpTask, persistFollowUpTasks, updateSourceStage } from '../tasks';
import { upsertRerankOverride } from './rerank-store';

export type IntelligenceActionType = 'handoff_to_closer' | 'rerank_catalog' | 'open_micro_prompt';
type SourceKind = 'design_partner' | 'booking_request' | 'payment_intent';

type SourceRecord = {
  id: string;
  email?: string;
  company?: string;
  name?: string;
  stage?: string;
  nextAction?: string;
  priority?: string;
  recommendedPlanLabel?: string;
  plan?: string;
  productUrl?: string;
  deliveryId?: string;
  deliveryWorkspaceId?: string;
  deliveryAccessCode?: string;
  deliveryStatus?: string;
};

function contactKey(value?: string) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

async function findLatestSourceForContact(targetKey: string) {
  const [designPartners, bookings, payments] = await Promise.all([
    readIntakeRecords<SourceRecord & { createdAt: string }>('design_partner_applications.json'),
    readIntakeRecords<SourceRecord & { createdAt: string }>('booking_requests.json'),
    readIntakeRecords<SourceRecord & { createdAt: string; plan?: string; paymentMethod?: string }>('payment_intents.json'),
  ]);

  const candidates: Array<{
    sourceKind: SourceKind;
    record: SourceRecord & { createdAt: string; plan?: string; paymentMethod?: string };
  }> = [];

  designPartners.forEach((record) => {
    const key = contactKey(record.email || record.company || record.id);
    if (key === targetKey) candidates.push({ sourceKind: 'design_partner', record });
  });
  bookings.forEach((record) => {
    const key = contactKey(record.email || record.company || record.id);
    if (key === targetKey) candidates.push({ sourceKind: 'booking_request', record });
  });
  payments.forEach((record) => {
    const key = contactKey(record.email || record.company || record.id);
    if (key === targetKey) candidates.push({ sourceKind: 'payment_intent', record });
  });

  return candidates.sort((left, right) => right.record.createdAt.localeCompare(left.record.createdAt))[0] || null;
}

function actionPatch(action: IntelligenceActionType, sourceKind: SourceKind, company: string) {
  if (action === 'handoff_to_closer') {
    return {
      stage: sourceKind === 'payment_intent' ? '待确认收款' : '高意向待成交',
      priority: 'high',
      nextAction:
        sourceKind === 'payment_intent'
          ? '高意向，立即确认收款、发放 credits，并安排 onboarding。'
          : '高意向，优先由 closer 跟进，2 小时内推进预约、报价或收款。',
      task: {
        title: sourceKind === 'payment_intent' ? '立即确认收款并安排 onboarding' : '2 小时内推进 closer 成交动作',
        detail:
          sourceKind === 'payment_intent'
            ? `${company} 已进入收款确认优先链路，立即确认到账并接 onboarding。`
            : `${company} 已被标记为高意向，按 closer 节奏优先推进报价、预约或支付。`,
        dueHours: sourceKind === 'payment_intent' ? 2 : 2,
        priority: 'high' as const,
      },
    };
  }

  if (action === 'rerank_catalog') {
    return {
      stage: '高意向待推荐',
      priority: 'high',
      nextAction: '中高意向，先做推荐重排和方案重排，再推进预约或支付。',
      rerank: {
        boost: 35,
        reason: '已由确定性动作确认进入高优先推荐队列。',
      },
      task: {
        title: '检查推荐重排结果',
        detail: `${company} 已进入高优先推荐队列，检查重排后的下一步动作。`,
        dueHours: 12,
        priority: 'medium' as const,
      },
    };
  }

  return {
    stage: '待补关键信息',
    priority: 'medium',
    nextAction: '先补预算、场景、团队信息，再决定推演示、诊断还是方案。',
    task: {
      title: '补齐关键信息再推进',
      detail: `${company} 当前需要先补充预算、场景或团队信息，再继续成交动作。`,
      dueHours: 12,
      priority: 'medium' as const,
    },
  };
}

function buildStartUrl(params: { planId: string; deliveryId?: string; company?: string; email?: string }) {
  if (!params.deliveryId) {
    return '';
  }

  const search = new URLSearchParams({
    plan: params.planId,
    delivery: params.deliveryId,
  });

  if (params.company) {
    search.set('company', params.company);
  }

  if (params.email) {
    search.set('email', params.email);
  }

  return `${SITE_URL}/start?${search.toString()}`;
}

export async function applyDeterministicIntelligenceAction(args: {
  contactKey: string;
  action: IntelligenceActionType;
}) {
  const matched = await findLatestSourceForContact(args.contactKey);
  if (!matched) {
    throw new Error('未找到对应线索。');
  }

  const company = matched.record.company || matched.record.name || '未命名线索';
  const patch = actionPatch(args.action, matched.sourceKind, company);

  await updateSourceStage(matched.sourceKind, matched.record.id, {
    stage: patch.stage,
    priority: patch.priority,
    nextAction: patch.nextAction,
    intelligenceAction: args.action,
    intelligenceAppliedAt: new Date().toISOString(),
  });

  if (args.action === 'rerank_catalog') {
    await upsertRerankOverride({
      contactKey: args.contactKey,
      sourceKind: matched.sourceKind,
      sourceId: matched.record.id,
      company,
      boost: 35,
      reason: '已由确定性动作确认进入高优先推荐队列。',
      updatedAt: new Date().toISOString(),
    });
  }

  if (args.action === 'handoff_to_closer') {
    await persistCommunicationDraft(
      createCommunicationDraft({
        sourceKind: matched.sourceKind,
        sourceId: matched.record.id,
        key: args.contactKey,
        company,
        contactName: matched.record.name || company,
        email: matched.record.email || '',
        stage: patch.stage,
        priority: 'high',
        channel: 'email',
        templateKey: 'intelligence-closer-email',
        templateLabel: 'Closer 成交推进邮件',
        objective: '把高意向线索尽快推进到预约、报价或收款',
        subject: `${company}：今天把预约、报价或收款定下来`,
        body: [
          `Hi ${matched.record.name || company}，`,
          '',
          `我这边已经把 ${company} 标记为高意向优先线索。`,
          '现在最值钱的不是继续泛聊，而是直接把下一步定下来：预约、报价，或者确认收款。',
          '',
          `当前建议：${patch.nextAction}`,
          '',
          '如果你愿意，我会按 closer 路径直接推进，不再走普通 nurture 节奏。',
          '',
          '— LeadPulse',
        ].join('\n'),
        readyAt: new Date().toISOString(),
      }),
    );

    await persistCommunicationDraft(
      createCommunicationDraft({
        sourceKind: matched.sourceKind,
        sourceId: matched.record.id,
        key: args.contactKey,
        company,
        contactName: matched.record.name || company,
        email: matched.record.email || '',
        stage: patch.stage,
        priority: 'high',
        channel: 'dm',
        templateKey: 'intelligence-closer-dm',
        templateLabel: 'Closer 成交推进私信',
        objective: '快速拿到回复并锁定成交下一步',
        subject: 'Closer 跟进',
        body: `${matched.record.name || company}，我这边已经把你标成高意向优先线索。下一步别再泛聊了，直接把预约、报价或收款中的一个定下来。当前建议：${patch.nextAction}`,
        readyAt: new Date().toISOString(),
      }),
    );
  }

  await persistFollowUpTask(
    createFollowUpTask({
      sourceKind: matched.sourceKind,
      sourceId: matched.record.id,
      key: args.contactKey,
      company,
      contactName: matched.record.name || company,
      email: matched.record.email || '',
      stage: patch.stage,
      priority: patch.task.priority,
      channel: matched.sourceKind === 'payment_intent' ? '微信支付 / 邮件' : '邮件 + 微信 / 飞书',
      owner: args.action === 'handoff_to_closer' ? 'Closer' : 'Founder',
      title: patch.task.title,
      detail: patch.task.detail,
      dueAt: dueAtFromNow(patch.task.dueHours),
      playbookId: matched.sourceKind,
      stepKey: `intelligence-${args.action}`,
      stepOrder: 99,
      stepLabel: '智能动作',
    }),
  );

  return {
    ok: true,
    contactKey: args.contactKey,
    sourceKind: matched.sourceKind,
    sourceId: matched.record.id,
    company,
    contactName: matched.record.name || company,
    email: matched.record.email || '',
    stage: patch.stage,
    nextAction: patch.nextAction,
  };
}

export async function markDealWon(args: { contactKey: string }) {
  const matched = await findLatestSourceForContact(args.contactKey);
  if (!matched) {
    throw new Error('未找到对应线索。');
  }

  const company = matched.record.company || matched.record.name || '未命名线索';
  const isPaymentIntent = matched.sourceKind === 'payment_intent';
  const planId = normalizePlanId(matched.record.plan);
  const plan = getPlanById(planId);
  const stage = isPaymentIntent ? '已确认收款' : '待确认收款';
  const nextAction = isPaymentIntent
    ? '已确认收款，24 小时内完成 onboarding 并交付首批结果。'
    : '已确认成交，下一步确认首笔款项到账并发放 credits。';
  let deliveryId = String(matched.record.deliveryId || '').trim();
  let startUrl = '';

  if (isPaymentIntent && !deliveryId) {
    const deliveryPackage = await provisionFulfillmentPackage({
      sourceId: matched.record.id,
      sourceKind: 'payment_intent',
      company,
      email: matched.record.email || '',
      plan: planId,
      productUrl: matched.record.productUrl || '',
    });

    deliveryId = deliveryPackage.id;
    startUrl = buildStartUrl({
      planId,
      deliveryId,
      company,
      email: matched.record.email || '',
    });

    await persistFollowUpTasks(buildExecutionTasksFromFulfillment(deliveryPackage));

    await updateSourceStage(matched.sourceKind, matched.record.id, {
      stage,
      priority: 'high',
      nextAction,
      intelligenceAction: 'handoff_to_closer',
      intelligenceAppliedAt: new Date().toISOString(),
      dealWonAt: new Date().toISOString(),
      deliveryId: deliveryPackage.id,
      deliveryWorkspaceId: deliveryPackage.workspaceId,
      deliveryAccessCode: deliveryPackage.accessCode,
      deliveryStatus: deliveryPackage.status,
      paymentStatus: 'verified',
    });
  } else {
    startUrl = buildStartUrl({
      planId,
      deliveryId,
      company,
      email: matched.record.email || '',
    });

    await updateSourceStage(matched.sourceKind, matched.record.id, {
      stage,
      priority: 'high',
      nextAction,
      intelligenceAction: 'handoff_to_closer',
      intelligenceAppliedAt: new Date().toISOString(),
      dealWonAt: new Date().toISOString(),
      paymentStatus: isPaymentIntent ? 'verified' : 'confirmed',
    });
  }

  await persistFollowUpTask(
    createFollowUpTask({
      sourceKind: matched.sourceKind,
      sourceId: matched.record.id,
      key: args.contactKey,
      company,
      contactName: matched.record.name || company,
      email: matched.record.email || '',
      stage,
      priority: 'high',
      channel: isPaymentIntent ? '微信支付 / 邮件' : '邮件 + 微信 / 飞书',
      owner: 'Closer',
      title: isPaymentIntent ? '完成 onboarding 并交付首批结果' : '确认收款并发放 credits',
      detail: isPaymentIntent
        ? `${company} 已确认收款，24 小时内完成 onboarding 与首批结果交付。`
        : `${company} 已确认成交，下一步必须尽快确认首笔款项到账。`,
      dueAt: dueAtFromNow(isPaymentIntent ? 24 : 6),
      playbookId: matched.sourceKind,
      stepKey: 'intelligence-mark_deal_won',
      stepOrder: 100,
      stepLabel: '成交确认',
    }),
  );

  if (!isPaymentIntent) {
    await persistCommunicationDraft(
      createCommunicationDraft({
        sourceKind: matched.sourceKind,
        sourceId: matched.record.id,
        key: args.contactKey,
        company,
        contactName: matched.record.name || company,
        email: matched.record.email || '',
        stage,
        priority: 'high',
        channel: 'email',
        templateKey: 'intelligence-payment-collect-email',
        templateLabel: '成交后收款确认邮件',
        objective: '把已确认成交线索快速推进到首笔款项到账',
        subject: `${company}：确认 ${plan.name} 首笔款项并启动交付`,
        body: [
          `Hi ${matched.record.name || company}，`,
          '',
          `我们这边已经确认 ${company} 进入成交推进阶段。`,
          `下一步只剩一件事：确认 ${plan.name} 首笔款项到账，然后立即发放 credits 并启动 onboarding。`,
          '',
          `当前建议：${nextAction}`,
          '',
          `付款页：/pay?plan=${planId}`,
          '',
          '— LeadPulse',
        ].join('\n'),
        ctaUrl: `/pay?plan=${planId}`,
        ctaLabel: '去付款页',
        readyAt: new Date().toISOString(),
      }),
    );

    await persistCommunicationDraft(
      createCommunicationDraft({
        sourceKind: matched.sourceKind,
        sourceId: matched.record.id,
        key: args.contactKey,
        company,
        contactName: matched.record.name || company,
        email: matched.record.email || '',
        stage,
        priority: 'high',
        channel: 'dm',
        templateKey: 'intelligence-payment-collect-dm',
        templateLabel: '成交后收款确认私信',
        objective: '快速确认收款动作，不让已成交线索拖延',
        subject: '确认收款',
        body: `${matched.record.name || company}，我们这边已经确认进入成交推进阶段。下一步请直接确认 ${plan.name} 首笔款项，到账后我就安排 credits 和 onboarding。`,
        ctaUrl: `/pay?plan=${planId}`,
        ctaLabel: '去付款页',
        readyAt: new Date().toISOString(),
      }),
    );
  }

  return {
    ok: true,
    contactKey: args.contactKey,
    sourceKind: matched.sourceKind,
    sourceId: matched.record.id,
    company,
    contactName: matched.record.name || company,
    email: matched.record.email || '',
    planId,
    stage,
    nextAction,
    deliveryId: deliveryId || null,
    startUrl: startUrl || null,
  };
}
