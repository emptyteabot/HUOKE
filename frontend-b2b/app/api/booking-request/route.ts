import {
  buildCommunicationDraftsForIntake,
  persistCommunicationDrafts,
} from '../../../lib/communications';
import { createIntakeRecord, fanOutNotifications, persistIntakeRecord } from '../../../lib/intake';
import { persistEvaluationSnapshotWithMeta } from '../../../lib/intelligence';
import { evaluateIntakeSubmission } from '../../../lib/intelligence/intake-adapter';
import { SITE_URL } from '../../../lib/site';
import { initialTaskFieldsForSource } from '../../../lib/task-automation';
import { createFollowUpTask, dueAtFromNow, persistFollowUpTask } from '../../../lib/tasks';

type BookingPayload = {
  name?: string;
  email?: string;
  company?: string;
  preferredTime?: string;
  timezone?: string;
  channel?: string;
  context?: string;
};

function normalizePayload(payload: BookingPayload) {
  return {
    name: String(payload.name || '').trim(),
    email: String(payload.email || '').trim(),
    company: String(payload.company || '').trim(),
    preferredTime: String(payload.preferredTime || '').trim(),
    timezone: String(payload.timezone || '').trim(),
    channel: String(payload.channel || '').trim(),
    context: String(payload.context || '').trim(),
  };
}

function buildSummary(record: Record<string, string>) {
  return [
    'LeadPulse 新预约请求',
    `- 公司：${record.company || '未填写'}`,
    `- 联系人：${record.name}`,
    `- 邮箱：${record.email}`,
    `- 希望时间：${record.preferredTime || '未填写'}`,
    `- 时区：${record.timezone || '未填写'}`,
    `- 偏好渠道：${record.channel || '未填写'}`,
    `- 背景：${record.context || '未填写'}`,
    `- 阶段：${record.stage}`,
    `- 下一步：${record.nextAction}`,
    `- 时间：${record.createdAt}`,
  ].join('\n');
}

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const payload = normalizePayload((await request.json()) as BookingPayload);
    if (!payload.name || !payload.email || !payload.preferredTime) {
      return Response.json(
        { error: '请至少填写姓名、邮箱和希望预约时间。' },
        { status: 400 },
      );
    }

    const initialTask = initialTaskFieldsForSource('booking_request');
    const intelligence = evaluateIntakeSubmission({
      sourceKind: 'booking_request',
      payload,
      fallbackNextAction: `按 ${payload.channel || '邮件 / 微信'} 确认时间，并在 24 小时内完成会前资格判断。`,
      basePriority: 'medium',
    });
    const record = createIntakeRecord({
      kind: 'booking_request',
      payload: {
        ...payload,
        stage: initialTask.stage,
        priority: intelligence.priority,
        nextAction: intelligence.nextAction,
        ...intelligence.recordFields,
      },
    });

    await persistIntakeRecord('booking_requests.json', record);
    await persistEvaluationSnapshotWithMeta(intelligence.evaluation, {
      sourceKind: 'booking_request',
      sourceId: record.id,
      contactKey: intelligence.contactKey,
      lead: intelligence.lead,
    });
    await persistFollowUpTask(
      createFollowUpTask({
        sourceKind: 'booking_request',
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
        channel: record.channel || '邮件 / 微信',
        owner: 'Founder',
        title: initialTask.title,
        detail: `${initialTask.detail} 希望时间：${record.preferredTime || '未填写'}；背景：${record.context || '未填写'}`,
        dueAt: dueAtFromNow(initialTask.dueHours),
        playbookId: initialTask.playbookId,
        stepKey: initialTask.stepKey,
        stepOrder: initialTask.stepOrder,
        stepLabel: initialTask.stepLabel,
      }),
    );
    await persistCommunicationDrafts(
      buildCommunicationDraftsForIntake({
        sourceKind: 'booking_request',
        record,
      }),
    );
    await fanOutNotifications(buildSummary(record), record);

    return Response.json({
      ok: true,
      message: '预约请求已提交，我们会尽快联系你确认时间。',
      bookingUrl: `${SITE_URL}/book`,
      paymentUrl: `${SITE_URL}/pay?plan=pro`,
      proofUrl: `${SITE_URL}/compare`,
      messagesUrl: `${SITE_URL}/dashboard/messages`,
    });
  } catch (error) {
    console.error('LeadPulse booking request failed:', error);
    return Response.json(
      { error: '系统繁忙，请稍后再试。' },
      { status: 500 },
    );
  }
}
