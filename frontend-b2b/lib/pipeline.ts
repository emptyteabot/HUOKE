import { readRerankOverrides } from './intelligence/rerank-store';
import { readIntakeRecords, segmentLabels } from './intake';
import { getPlanById, normalizePlanId, type PlanId } from './pricing';
import { isTaskOverdue, taskStepSummary } from './task-automation';
import { readFollowUpTasks, type FollowUpTask } from './tasks';

type BaseRecord = {
  id: string;
  kind?: string;
  createdAt: string;
  name?: string;
  email?: string;
  company?: string;
  stage?: string;
  priority?: string;
  nextAction?: string;
  intelligenceProbability?: string;
  intelligenceConfidence?: string;
  intelligenceRoute?: string;
  intelligenceSummary?: string;
  intelligenceGuardrailApproved?: string;
  intelligenceHighValue?: string;
  intelligenceAction?: string;
};

type DesignPartnerRecord = BaseRecord & {
  kind?: 'design_partner';
  website?: string;
  segment?: string;
  monthlyRevenue?: string;
  bottleneck?: string;
};

type BookingRequestRecord = BaseRecord & {
  kind?: 'booking_request';
  preferredTime?: string;
  timezone?: string;
  channel?: string;
  context?: string;
};

type PaymentIntentRecord = BaseRecord & {
  kind?: 'payment_intent';
  plan?: string;
  amount?: string;
  paymentMethod?: string;
  notes?: string;
};

type PipelineContactAccumulator = {
  key: string;
  name: string;
  email: string;
  company: string;
  designPartner?: DesignPartnerRecord;
  booking?: BookingRequestRecord;
  payment?: PaymentIntentRecord;
};

export type PipelineTaskPreview = {
  id: string;
  title: string;
  status: FollowUpTask['status'];
  stepLabel: string;
  progressLabel: string;
  playbookLabel: string;
  dueAt: string;
  completedAt?: string;
};

export type PipelineContact = {
  key: string;
  name: string;
  email: string;
  company: string;
  sourceKind: 'design_partner' | 'booking_request' | 'payment_intent';
  sourceId: string;
  stageLabel: string;
  urgency: 'high' | 'medium' | 'low';
  recommendedPlan: PlanId;
  recommendedPlanLabel: string;
  preferredChannel: string;
  latestAt: string;
  nextAction: string;
  summary: string;
  notes: string[];
  emailSubject: string;
  emailBody: string;
  dmBody: string;
  pendingTaskCount: number;
  completedTaskCount: number;
  overdueTaskCount: number;
  latestPendingTaskId?: string;
  latestPendingTaskTitle?: string;
  latestPendingTaskDueAt?: string;
  latestCompletedTaskTitle?: string;
  latestCompletedTaskAt?: string;
  taskPlaybookLabel?: string;
  taskStepLabel?: string;
  taskProgressLabel?: string;
  taskTimeline: PipelineTaskPreview[];
  intelligenceProbability?: number;
  intelligenceConfidence?: string;
  intelligenceRoute?: string;
  intelligenceSummary?: string;
  intelligenceGuardrailApproved?: boolean;
  intelligenceHighValue?: boolean;
  intelligenceAction?: string;
  rerankBoost?: number;
  rerankReason?: string;
};

export type PipelineSnapshot = {
  summary: {
    totalContacts: number;
    qualificationQueue: number;
    bookingQueue: number;
    paymentQueue: number;
    completedQueue: number;
    pendingTasks: number;
    overdueTasks: number;
  };
  contacts: PipelineContact[];
};

function pickContactKey(record: BaseRecord) {
  return String(record.email || record.company || record.id || '').trim().toLowerCase();
}

function pickRecommendedPlan(accumulator: PipelineContactAccumulator): PlanId {
  if (accumulator.payment?.plan) {
    return normalizePlanId(accumulator.payment.plan);
  }

  const monthlyRevenue = accumulator.designPartner?.monthlyRevenue || '';
  if (monthlyRevenue === '10w-30w' || monthlyRevenue === '30w+') {
    return 'max';
  }

  if (accumulator.designPartner?.segment === 'ai_agency') {
    return 'max';
  }

  return 'pro';
}

function paymentStage(accumulator: PipelineContactAccumulator) {
  const explicitLabel = accumulator.payment?.stage?.trim();
  const label = explicitLabel || '待确认收款';

  return {
    label,
    urgency: label.includes('待确认收款') ? ('high' as const) : ('low' as const),
    nextAction:
      accumulator.payment?.nextAction ||
      `确认 ${getPlanById(accumulator.payment?.plan).name} 首笔款项到账，发放 credits，并安排 onboarding。`,
  };
}

function bookingStage(accumulator: PipelineContactAccumulator) {
  const explicitLabel = accumulator.booking?.stage?.trim();
  const label = explicitLabel || '待确认诊断';

  return {
    label,
    urgency: label.includes('待确认诊断') ? ('medium' as const) : ('low' as const),
    nextAction:
      accumulator.booking?.nextAction ||
      `按 ${accumulator.booking?.channel || '邮件 / 微信'} 确认时间，并在 24 小时内完成会前资格判断。`,
  };
}

function qualificationStage(accumulator: PipelineContactAccumulator) {
  const explicitLabel = accumulator.designPartner?.stage?.trim();
  const label = explicitLabel || '待资格判断';

  return {
    label,
    urgency: label.includes('待资格判断') ? ('medium' as const) : ('low' as const),
    nextAction:
      accumulator.designPartner?.nextAction ||
      '先判断 ICP、客单价和当前瓶颈，再决定推预约还是直接推 Pro / Max。',
  };
}

function pickStage(accumulator: PipelineContactAccumulator) {
  if (accumulator.payment) {
    return paymentStage(accumulator);
  }

  if (accumulator.booking) {
    return bookingStage(accumulator);
  }

  return qualificationStage(accumulator);
}

function buildSummary(accumulator: PipelineContactAccumulator, planId: PlanId) {
  if (accumulator.payment) {
    return `${accumulator.company || accumulator.name} 已提交 ${getPlanById(planId).name} 付款意向，当前优先推进收款确认、credits 开通和续费经营。`;
  }

  if (accumulator.booking) {
    return `${accumulator.company || accumulator.name} 已提交诊断预约，当前重点是快速确认时间、会后推进成交，再锁定最终决策。`;
  }

  const segment = segmentLabels[accumulator.designPartner?.segment || ''] || '潜在设计伙伴';
  return `${accumulator.company || accumulator.name} 来自 ${segment}，需要先完成资格判断，再决定是否进入预约或订阅。`;
}

function buildNotes(accumulator: PipelineContactAccumulator) {
  const intelligenceSummary =
    accumulator.payment?.intelligenceSummary ||
    accumulator.booking?.intelligenceSummary ||
    accumulator.designPartner?.intelligenceSummary ||
    '';
  const intelligenceRoute =
    accumulator.payment?.intelligenceRoute ||
    accumulator.booking?.intelligenceRoute ||
    accumulator.designPartner?.intelligenceRoute ||
    '';

  const notes = [
    accumulator.designPartner?.bottleneck,
    accumulator.booking?.context,
    accumulator.payment?.notes,
    accumulator.booking?.preferredTime
      ? `希望时间：${accumulator.booking.preferredTime} (${accumulator.booking.timezone || '默认时区'})`
      : '',
    accumulator.payment?.amount ? `首笔金额：${accumulator.payment.amount}` : '',
    accumulator.payment?.paymentMethod ? `支付方式：${accumulator.payment.paymentMethod}` : '',
    intelligenceSummary ? `智能判断：${intelligenceSummary}` : '',
    intelligenceRoute ? `路由：${intelligenceRoute}` : '',
  ].filter(Boolean) as string[];

  return notes.slice(0, 4);
}

function pickIntelligence(accumulator: PipelineContactAccumulator) {
  const source = accumulator.payment || accumulator.booking || accumulator.designPartner;
  if (!source) return null;

  const probability = Number(source.intelligenceProbability || '');
  return {
    probability: Number.isFinite(probability) ? probability : undefined,
    confidence: source.intelligenceConfidence,
    route: source.intelligenceRoute,
    summary: source.intelligenceSummary,
    approved:
      source.intelligenceGuardrailApproved === 'true'
        ? true
        : source.intelligenceGuardrailApproved === 'false'
          ? false
          : undefined,
    highValue:
      source.intelligenceHighValue === 'true'
        ? true
        : source.intelligenceHighValue === 'false'
          ? false
          : undefined,
    action: source.intelligenceAction,
  };
}

function buildMessages(
  accumulator: PipelineContactAccumulator,
  planId: PlanId,
  nextAction: string,
) {
  const plan = getPlanById(planId);
  const name = accumulator.name || '你好';
  const company = accumulator.company || '你的项目';
  const pain =
    accumulator.designPartner?.bottleneck ||
    accumulator.booking?.context ||
    accumulator.payment?.notes ||
    '把上线、支付和获客漏斗尽快跑通';

  if (accumulator.payment) {
    return {
      emailSubject: `收到你的 ${plan.name} 开通意向：下一步这样走`,
      emailBody: `Hi ${name}，\n\n已经看到你为 ${company} 提交了 ${plan.name} 开通意向。我建议今天直接完成三步：\n1. 确认首笔款项到账；\n2. 发放首批 credits 与订阅配置；\n3. 约一个 15 分钟 onboarding，把支付、部署和增长动作一次接好。\n\n我这边会重点帮你解决：${pain}。\n\n下一步：${nextAction}\n\n— LeadPulse`,
      dmBody: `${name}，我看到你已经提交 ${plan.name} 开通意向了。建议我们今天直接确认到账，然后把 credits、支付和 onboarding 一次接好。你这边方便的话，我按这个顺序推进：${nextAction}`,
    };
  }

  if (accumulator.booking) {
    return {
      emailSubject: '收到你的 15 分钟诊断预约，先把这次通话准备好',
      emailBody: `Hi ${name}，\n\n看到你为 ${company} 提交了诊断预约。为了让这 15 分钟不聊空话，我会先围绕这件事展开：${pain}。\n\n我建议我们直接确认时间，然后在通话里判断你更适合 Free、${plan.name}，还是直接上 Max。\n\n下一步：${nextAction}\n\n— LeadPulse`,
      dmBody: `${name}，看到你的预约了。我想把这 15 分钟直接用来判断你最短回款路径，而不是聊功能。你这边的核心瓶颈我记录为：${pain}。下一步我按这个节奏推进：${nextAction}`,
    };
  }

  return {
    emailSubject: '看到你的 Design Partner 申请：先判断是否适合一起做',
    emailBody: `Hi ${name}，\n\n已经收到你为 ${company} 提交的 Design Partner 申请。我会先看三件事：ICP 是否够清楚、支付是否能接、当前获客瓶颈是否适合用 credits-first 方案解决。\n\n目前我看到的核心问题是：${pain}。\n\n如果判断合适，我会建议你先走诊断，再进入 ${plan.name} 或 Max。\n\n下一步：${nextAction}\n\n— LeadPulse`,
    dmBody: `${name}，已经看到你的 Design Partner 申请。你的核心瓶颈我记下来了：${pain}。我会先判断是否适合进 14 天合作，再决定推预约还是直接上 ${plan.name} / Max。`,
  };
}

function sortScore(contact: PipelineContact) {
  const urgencyScore = contact.urgency === 'high' ? 3 : contact.urgency === 'medium' ? 2 : 1;
  const intelligenceScore = Math.round((contact.intelligenceProbability || 0) * 1000);
  const rerankBoost = Math.round(contact.rerankBoost || 0);
  return (
    urgencyScore * 10000000000000 +
    rerankBoost * 10000000000 +
    intelligenceScore * 1000000000 +
    new Date(contact.latestAt).getTime()
  );
}

function isPaymentPriorityLabel(label: string) {
  return label.includes('待确认收款') || label.includes('高意向待成交');
}

function isBookingPriorityLabel(label: string) {
  return (
    label.includes('待确认诊断') ||
    label.includes('高意向待推荐') ||
    label.includes('信息补全中')
  );
}

function taskKeyForSource(kind: string, sourceId: string) {
  return `${kind}:${sourceId}`;
}

function sourceKeysForAccumulator(accumulator: PipelineContactAccumulator) {
  return [
    accumulator.designPartner ? taskKeyForSource('design_partner', accumulator.designPartner.id) : '',
    accumulator.booking ? taskKeyForSource('booking_request', accumulator.booking.id) : '',
    accumulator.payment ? taskKeyForSource('payment_intent', accumulator.payment.id) : '',
  ].filter(Boolean);
}

function taskMoment(task: FollowUpTask) {
  return new Date(task.completedAt || task.dueAt || task.createdAt).getTime();
}

function timelinePreview(task: FollowUpTask): PipelineTaskPreview {
  const summary = taskStepSummary(task);
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    stepLabel: summary.stepLabel,
    progressLabel: summary.progressLabel,
    playbookLabel: summary.playbookLabel,
    dueAt: task.dueAt,
    completedAt: task.completedAt,
  };
}

export async function readPipelineSnapshot(): Promise<PipelineSnapshot> {
  const [designPartners, bookings, paymentIntents, followUpTasks, rerankOverrides] = await Promise.all([
    readIntakeRecords<DesignPartnerRecord>('design_partner_applications.json'),
    readIntakeRecords<BookingRequestRecord>('booking_requests.json'),
    readIntakeRecords<PaymentIntentRecord>('payment_intents.json'),
    readFollowUpTasks(),
    readRerankOverrides(),
  ]);

  const contacts = new Map<string, PipelineContactAccumulator>();

  const mergeRecord = (
    record: DesignPartnerRecord | BookingRequestRecord | PaymentIntentRecord,
    field: 'designPartner' | 'booking' | 'payment',
  ) => {
    const key = pickContactKey(record);
    if (!key) {
      return;
    }

    const current = contacts.get(key) || {
      key,
      name: String(record.name || '').trim(),
      email: String(record.email || '').trim(),
      company: String(record.company || '').trim(),
    };

    current.name = current.name || String(record.name || '').trim();
    current.email = current.email || String(record.email || '').trim();
    current.company = current.company || String(record.company || '').trim();
    current[field] = record as never;

    contacts.set(key, current);
  };

  designPartners.forEach((record) => mergeRecord(record, 'designPartner'));
  bookings.forEach((record) => mergeRecord(record, 'booking'));
  paymentIntents.forEach((record) => mergeRecord(record, 'payment'));

  const taskMap = new Map<string, FollowUpTask[]>();
  const rerankMap = new Map(rerankOverrides.map((item) => [item.contactKey, item]));
  followUpTasks.forEach((task) => {
    const list = taskMap.get(taskKeyForSource(task.sourceKind, task.sourceId)) || [];
    list.push(task);
    taskMap.set(taskKeyForSource(task.sourceKind, task.sourceId), list);
  });

  const now = new Date();

  const normalizedContacts = Array.from(contacts.values())
    .map((accumulator) => {
      const planId = pickRecommendedPlan(accumulator);
      const stage = pickStage(accumulator);
      const intelligence = pickIntelligence(accumulator);
      const latestAt =
        accumulator.payment?.createdAt ||
        accumulator.booking?.createdAt ||
        accumulator.designPartner?.createdAt ||
        '';
      const sourceKind = accumulator.payment
        ? 'payment_intent'
        : accumulator.booking
          ? 'booking_request'
          : 'design_partner';
      const sourceId =
        accumulator.payment?.id ||
        accumulator.booking?.id ||
        accumulator.designPartner?.id ||
        accumulator.key;
      const messages = buildMessages(accumulator, planId, stage.nextAction);
      const rerank = rerankMap.get(accumulator.key);
      const relatedTasks = sourceKeysForAccumulator(accumulator)
        .flatMap((item) => taskMap.get(item) || [])
        .sort((left, right) => taskMoment(right) - taskMoment(left));
      const pendingTasks = relatedTasks
        .filter((item) => item.status === 'pending')
        .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime());
      const completedTasks = relatedTasks
        .filter((item) => item.status === 'completed')
        .sort(
          (left, right) =>
            new Date(right.completedAt || right.createdAt).getTime() -
            new Date(left.completedAt || left.createdAt).getTime(),
        );
      const latestPendingTask = pendingTasks.at(0);
      const latestCompletedTask = completedTasks.at(0);
      const activeTask = latestPendingTask || relatedTasks.at(0);
      const activeSummary = activeTask ? taskStepSummary(activeTask) : null;
      const overdueTaskCount = pendingTasks.filter((item) => isTaskOverdue(item, now)).length;
      const taskTimeline = relatedTasks.slice(0, 4).map(timelinePreview);

      return {
        key: accumulator.key,
        name: accumulator.name || '未命名联系人',
        email: accumulator.email || '未填写邮箱',
        company: accumulator.company || '未填写公司',
        sourceKind,
        sourceId,
        stageLabel: stage.label,
        urgency: stage.urgency,
        recommendedPlan: planId,
        recommendedPlanLabel: getPlanById(planId).name,
        preferredChannel:
          accumulator.booking?.channel ||
          accumulator.payment?.paymentMethod ||
          '邮件 + 微信 / X 私信',
        latestAt,
        nextAction: stage.nextAction,
        summary: buildSummary(accumulator, planId),
        notes: buildNotes(accumulator),
        ...messages,
        pendingTaskCount: pendingTasks.length,
        completedTaskCount: completedTasks.length,
        overdueTaskCount,
        latestPendingTaskId: latestPendingTask?.id,
        latestPendingTaskTitle: latestPendingTask?.title,
        latestPendingTaskDueAt: latestPendingTask?.dueAt,
        latestCompletedTaskTitle: latestCompletedTask?.title,
        latestCompletedTaskAt: latestCompletedTask?.completedAt,
        taskPlaybookLabel: activeSummary?.playbookLabel,
        taskStepLabel: activeSummary?.stepLabel,
        taskProgressLabel: activeSummary?.progressLabel,
        taskTimeline,
        intelligenceProbability: intelligence?.probability,
        intelligenceConfidence: intelligence?.confidence,
        intelligenceRoute: intelligence?.route,
        intelligenceSummary: intelligence?.summary,
        intelligenceGuardrailApproved: intelligence?.approved,
        intelligenceHighValue: intelligence?.highValue,
        intelligenceAction: intelligence?.action,
        rerankBoost: rerank?.boost,
        rerankReason: rerank?.reason,
      } satisfies PipelineContact;
    })
    .sort((left, right) => sortScore(right) - sortScore(left));

  return {
    summary: {
      totalContacts: normalizedContacts.length,
      qualificationQueue: normalizedContacts.filter((item) => item.stageLabel.includes('待资格判断')).length,
      bookingQueue: normalizedContacts.filter((item) => isBookingPriorityLabel(item.stageLabel)).length,
      paymentQueue: normalizedContacts.filter((item) => isPaymentPriorityLabel(item.stageLabel)).length,
      completedQueue: normalizedContacts.filter(
        (item) =>
          !item.stageLabel.includes('待资格判断') &&
          !isBookingPriorityLabel(item.stageLabel) &&
          !isPaymentPriorityLabel(item.stageLabel),
      ).length,
      pendingTasks: normalizedContacts.reduce((sum, item) => sum + item.pendingTaskCount, 0),
      overdueTasks: normalizedContacts.reduce((sum, item) => sum + item.overdueTaskCount, 0),
    },
    contacts: normalizedContacts,
  };
}
