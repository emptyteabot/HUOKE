import {
  createOutreachEvent,
  getOutreachEvent,
  persistOutreachEvent,
} from '../../../../lib/outreach-log';

type OutreachSendPayload = {
  contactKey?: string;
  contactName?: string;
  company?: string;
  stageBucket?: string;
  stepKey?: string;
  stepLabel?: string;
  channel?: string;
  subject?: string;
  body?: string;
};

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as OutreachSendPayload;
    const contactKey = String(payload.contactKey || '').trim().toLowerCase();
    const contactName = String(payload.contactName || '').trim();
    const company = String(payload.company || '').trim();
    const stageBucket = String(payload.stageBucket || '').trim();
    const stepKey = String(payload.stepKey || '').trim();
    const stepLabel = String(payload.stepLabel || '').trim();
    const channel = String(payload.channel || '').trim();
    const subject = String(payload.subject || '').trim();
    const body = String(payload.body || '').trim();

    if (!contactKey || !company || !stageBucket || !stepKey || !stepLabel || !channel || !body) {
      return Response.json({ error: '缺少发送记录所需字段。' }, { status: 400 });
    }

    const existing = await getOutreachEvent(contactKey, stepKey);
    if (existing) {
      return Response.json({ error: '这个触达步骤已经标记过已发送。' }, { status: 409 });
    }

    const event = createOutreachEvent({
      contactKey,
      contactName: contactName || '未填写联系人',
      company,
      stageBucket: stageBucket as 'payment' | 'booking' | 'qualification' | 'completed',
      stepKey,
      stepLabel,
      channel,
      subject,
      body,
      operator: 'Founder',
    });

    await persistOutreachEvent(event);

    return Response.json({
      ok: true,
      message: '已记录这一步触达，后续跟进状态会自动刷新。',
      sentAt: event.sentAt,
    });
  } catch (error) {
    console.error('LeadPulse outreach send log failed:', error);
    return Response.json({ error: '系统繁忙，请稍后再试。' }, { status: 500 });
  }
}
