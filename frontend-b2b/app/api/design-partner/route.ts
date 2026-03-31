import {
  buildCommunicationDraftsForIntake,
  persistCommunicationDrafts,
} from '../../../lib/communications';
import {
  createIntakeRecord,
  fanOutNotifications,
  persistIntakeRecord,
  segmentLabels,
} from '../../../lib/intake';
import { persistEvaluationSnapshotWithMeta } from '../../../lib/intelligence';
import { evaluateIntakeSubmission } from '../../../lib/intelligence/intake-adapter';
import { SITE_URL } from '../../../lib/site';
import { initialTaskFieldsForSource } from '../../../lib/task-automation';
import { createFollowUpTask, dueAtFromNow, persistFollowUpTask } from '../../../lib/tasks';

type IntakePayload = {
  name?: string;
  email?: string;
  company?: string;
  website?: string;
  segment?: string;
  monthlyRevenue?: string;
  bottleneck?: string;
};

function normalizePayload(payload: IntakePayload) {
  return {
    name: String(payload.name || '').trim(),
    email: String(payload.email || '').trim(),
    company: String(payload.company || '').trim(),
    website: String(payload.website || '').trim(),
    segment: String(payload.segment || '').trim(),
    monthlyRevenue: String(payload.monthlyRevenue || '').trim(),
    bottleneck: String(payload.bottleneck || '').trim(),
  };
}

function buildSummary(record: Record<string, string>) {
  return [
    'LeadPulse 新设计伙伴申请',
    `- 公司：${record.company}`,
    `- 联系人：${record.name}`,
    `- 邮箱：${record.email}`,
    `- 行业：${segmentLabels[record.segment] || record.segment || '未填写'}`,
    `- 月收入：${record.monthlyRevenue || '未填写'}`,
    `- 网站：${record.website || '未填写'}`,
    `- 瓶颈：${record.bottleneck}`,
    `- 阶段：${record.stage}`,
    `- 下一步：${record.nextAction}`,
    `- 时间：${record.createdAt}`,
  ].join('\n');
}

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const payload = normalizePayload((await request.json()) as IntakePayload);
    if (!payload.name || !payload.email || !payload.company || !payload.bottleneck) {
      return Response.json(
        { error: '请至少填写姓名、邮箱、公司和当前获客瓶颈。' },
        { status: 400 },
      );
    }

    const initialTask = initialTaskFieldsForSource('design_partner');
    const intelligence = evaluateIntakeSubmission({
      sourceKind: 'design_partner',
      payload,
      fallbackNextAction: '先判断 ICP、客单价和支付准备度，再决定推预约还是直接推 Pro / Max。',
      basePriority:
        payload.monthlyRevenue === '10w-30w' || payload.monthlyRevenue === '30w+' ? 'high' : 'medium',
    });
    const record = createIntakeRecord({
      kind: 'design_partner',
      payload: {
        ...payload,
        stage: initialTask.stage,
        priority: intelligence.priority,
        nextAction: intelligence.nextAction,
        ...intelligence.recordFields,
      },
    });

    await persistIntakeRecord('design_partner_applications.json', record);
    await persistEvaluationSnapshotWithMeta(intelligence.evaluation, {
      sourceKind: 'design_partner',
      sourceId: record.id,
      contactKey: intelligence.contactKey,
      lead: intelligence.lead,
    });
    await persistFollowUpTask(
      createFollowUpTask({
        sourceKind: 'design_partner',
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
        channel: '邮件 + 微信 / 飞书',
        owner: 'Founder',
        title: initialTask.title,
        detail: `${initialTask.detail} 行业：${segmentLabels[record.segment] || record.segment || '未填写'}；瓶颈：${record.bottleneck || '未填写'}`,
        dueAt: dueAtFromNow(initialTask.dueHours),
        playbookId: initialTask.playbookId,
        stepKey: initialTask.stepKey,
        stepOrder: initialTask.stepOrder,
        stepLabel: initialTask.stepLabel,
      }),
    );
    await persistCommunicationDrafts(
      buildCommunicationDraftsForIntake({
        sourceKind: 'design_partner',
        record,
      }),
    );
    await fanOutNotifications(buildSummary(record), record);

    return Response.json({
      ok: true,
      bookingUrl: process.env.NEXT_PUBLIC_BOOKING_URL || `${SITE_URL}/book`,
      paymentUrl: process.env.NEXT_PUBLIC_PRO_PAYMENT_URL || `${SITE_URL}/pay?plan=pro`,
      proofUrl: `${SITE_URL}/compare`,
      messagesUrl: `${SITE_URL}/dashboard/messages`,
    });
  } catch (error) {
    console.error('LeadPulse design partner intake failed:', error);
    return Response.json(
      { error: '系统繁忙，请稍后再试。' },
      { status: 500 },
    );
  }
}
