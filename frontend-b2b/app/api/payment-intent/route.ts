import {
  buildCommunicationDraftsForIntake,
  persistCommunicationDrafts,
} from '../../../lib/communications';
import Stripe from 'stripe';
import { createIntakeRecord, fanOutNotifications, persistIntakeRecord } from '../../../lib/intake';
import { persistEvaluationSnapshotWithMeta } from '../../../lib/intelligence';
import { evaluateIntakeSubmission } from '../../../lib/intelligence/intake-adapter';
import { getPlanById, normalizePlanId } from '../../../lib/pricing';
import { SITE_URL } from '../../../lib/site';
import { initialTaskFieldsForSource } from '../../../lib/task-automation';
import { createFollowUpTask, dueAtFromNow, persistFollowUpTask, updateSourceStage } from '../../../lib/tasks';

type PaymentPayload = {
  name?: string;
  email?: string;
  company?: string;
  productUrl?: string;
  plan?: string;
  amount?: string;
  paymentMethod?: string;
  notes?: string;
};

function startUrlForRecord(record: { id: string; plan?: string; company?: string; email?: string }) {
  const params = new URLSearchParams({
    plan: String(record.plan || '').trim() || 'pro',
    sourceId: record.id,
  });

  if (record.company) params.set('company', String(record.company).trim());
  if (record.email) params.set('email', String(record.email).trim());

  return `${SITE_URL}/start?${params.toString()}`;
}

function getStripeClient() {
  const secretKey = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY missing');
  }

  return new Stripe(secretKey, {
    apiVersion: '2026-01-28.clover',
  });
}

function amountToMinorUnits(priceLabel: string) {
  const numeric = Number(String(priceLabel || '').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error(`invalid price label: ${priceLabel}`);
  }
  return Math.round(numeric * 100);
}

function normalizePayload(payload: PaymentPayload) {
  const normalizedPlan = normalizePlanId(payload.plan);
  const plan = getPlanById(normalizedPlan);

  return {
    name: String(payload.name || '').trim(),
    email: String(payload.email || '').trim(),
    company: String(payload.company || '').trim(),
    productUrl: String(payload.productUrl || '').trim(),
    plan: normalizedPlan,
    amount: String(plan.price).trim(),
    reportedAmount: String(payload.amount || '').trim(),
    paymentMethod: String(payload.paymentMethod || '微信支付').trim(),
    notes: String(payload.notes || '').trim(),
  };
}

function buildSummary(record: Record<string, string>) {
  return [
    'LeadPulse 新付款意向',
    `- 公司：${record.company || '未填写'}`,
    `- 联系人：${record.name}`,
    `- 邮箱：${record.email}`,
    `- 方案：${getPlanById(record.plan).name}`,
    `- 金额：${record.amount || '未填写'}`,
    `- 支付方式：${record.paymentMethod || '未填写'}`,
    `- 备注：${record.notes || '未填写'}`,
    `- 阶段：${record.stage}`,
    `- 下一步：${record.nextAction}`,
    `- 时间：${record.createdAt}`,
  ].join('\n');
}

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const payload = normalizePayload((await request.json()) as PaymentPayload);
    if (!payload.name || !payload.email || !payload.plan) {
      return Response.json(
        { error: '请至少填写姓名、邮箱和要购买的方案。' },
        { status: 400 },
      );
    }

    const plan = getPlanById(payload.plan);
    const initialTask = initialTaskFieldsForSource('payment_intent');
    const intelligence = evaluateIntakeSubmission({
      sourceKind: 'payment_intent',
      payload,
      fallbackNextAction: `确认 ${plan.name} 首笔款项到账，发放 credits，并安排 onboarding。`,
      basePriority: 'high',
    });
    const record = createIntakeRecord({
      kind: 'payment_intent',
      payload: {
        ...payload,
        stage: initialTask.stage,
        priority: intelligence.priority,
        nextAction: intelligence.nextAction,
        paymentStatus: 'checkout_creating',
        deliveryStatus: 'awaiting_checkout',
        ...intelligence.recordFields,
      },
    });

    await persistIntakeRecord('payment_intents.json', record);
    await persistEvaluationSnapshotWithMeta(intelligence.evaluation, {
      sourceKind: 'payment_intent',
      sourceId: record.id,
      contactKey: intelligence.contactKey,
      lead: intelligence.lead,
    });
    await persistFollowUpTask(
      createFollowUpTask({
        sourceKind: 'payment_intent',
        sourceId: record.id,
        key: String(record.email || record.company || record.id).toLowerCase(),
        company: record.company || '未填写公司',
        contactName: record.name,
        email: record.email,
        stage: initialTask.stage,
        priority:
          record.priority === 'high'
            ? 'high'
            : record.priority === 'low'
              ? 'low'
              : initialTask.priority,
        channel: record.paymentMethod || '微信支付',
        owner: 'Founder',
        title: initialTask.title,
        detail: `${initialTask.detail} 应收金额：${record.amount || plan.price}；用户填写金额：${record.reportedAmount || '未填写'}；备注：${record.notes || '未填写'}`,
        dueAt: dueAtFromNow(initialTask.dueHours),
        playbookId: initialTask.playbookId,
        stepKey: initialTask.stepKey,
        stepOrder: initialTask.stepOrder,
        stepLabel: initialTask.stepLabel,
      }),
    );
    await persistCommunicationDrafts(
      buildCommunicationDraftsForIntake({
        sourceKind: 'payment_intent',
        record,
      }),
    );
    await fanOutNotifications(buildSummary(record), record);

    const startUrl = startUrlForRecord({
      id: record.id,
      plan: record.plan,
      company: record.company,
      email: record.email,
    });

    const paymentProvider = String(process.env.LEADPULSE_PAYMENT_PROVIDER || 'wechat').trim().toLowerCase();
    if (paymentProvider !== 'stripe') {
      await updateSourceStage('payment_intent', record.id, {
        paymentStatus: 'pending_verification',
        deliveryStatus: 'pending_payment_verification',
      });

      return Response.json({
        ok: true,
        message: '付款确认已记录。我们会先核验微信到账，再开通方案并发送启动交付包。',
        startUrl,
        bookingUrl: `${SITE_URL}/book`,
        proofUrl: `${SITE_URL}/product`,
        messagesUrl: `${SITE_URL}/dashboard/messages`,
      });
    }

    const stripe = getStripeClient();

    const startParams = new URLSearchParams({
      plan: record.plan,
      sourceId: record.id,
      checkout: 'success',
    });
    if (record.company) startParams.set('company', record.company);
    if (record.email) startParams.set('email', record.email);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: record.email,
      client_reference_id: record.id,
      allow_promotion_codes: true,
      line_items: [
        {
          price_data: {
            currency: 'cny',
            recurring: {
              interval: 'month',
            },
            product_data: {
              name: `LeadPulse ${plan.name}`,
              description: plan.goodFor,
            },
            unit_amount: amountToMinorUnits(record.amount || plan.price),
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          sourceId: record.id,
          contactKey: intelligence.contactKey,
          company: record.company,
          email: record.email,
          plan: record.plan,
        },
      },
      success_url: `${SITE_URL}/start?${startParams.toString()}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/pay?plan=${record.plan}&checkout=cancel`,
      metadata: {
        sourceId: record.id,
        contactKey: intelligence.contactKey,
        company: record.company,
        email: record.email,
        plan: record.plan,
        productUrl: record.productUrl,
      },
    });

    await updateSourceStage('payment_intent', record.id, {
      paymentStatus: 'checkout_pending',
      stripeCheckoutSessionId: session.id,
      stripeCheckoutUrl: String(session.url || ''),
    });

    return Response.json({
      ok: true,
      message: '付款确认已记录，正在跳转到安全支付。',
      startUrl,
      bookingUrl: `${SITE_URL}/book`,
      proofUrl: `${SITE_URL}/product`,
      messagesUrl: `${SITE_URL}/dashboard/messages`,
      checkoutUrl: session.url,
      checkoutSessionId: session.id,
    });
  } catch (error) {
    console.error('LeadPulse payment intent failed:', error);
    return Response.json(
      {
        error:
          error instanceof Error && error.message.includes('STRIPE_SECRET_KEY')
            ? 'Stripe 尚未配置，自动支付暂不可用。'
            : error instanceof Error && error.message.includes('Invalid API Key')
              ? 'Stripe 密钥无效，当前还不能真正收款。请换成有效的 Stripe test/live key。'
            : '系统繁忙，请稍后再试。',
      },
      { status: 500 },
    );
  }
}
