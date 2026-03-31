import {
  getCommunicationDraftById,
  markCommunicationDraftSent,
} from '../../../../lib/communications';
import { isSmtpConfigured, sendEmail } from '../../../../lib/mailer';

type Payload = {
  draftId?: string;
};

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Payload;
    const draftId = String(payload.draftId || '').trim();

    if (!draftId) {
      return Response.json({ error: '缺少 draftId。' }, { status: 400 });
    }

    if (!isSmtpConfigured()) {
      return Response.json({ error: 'SMTP 尚未配置，暂时不能自动发信。' }, { status: 412 });
    }

    const draft = await getCommunicationDraftById(draftId);
    if (!draft) {
      return Response.json({ error: '消息草稿不存在。' }, { status: 404 });
    }

    if (draft.status === 'sent') {
      return Response.json({ error: '这条草稿已经发送过。' }, { status: 409 });
    }

    if (draft.channel !== 'email') {
      return Response.json({ error: '自动发信当前只支持 email 草稿。' }, { status: 400 });
    }

    if (!draft.email) {
      return Response.json({ error: '缺少收件邮箱。' }, { status: 400 });
    }

    await sendEmail({
      to: draft.email,
      subject: draft.subject,
      text: draft.body,
    });
    const updated = await markCommunicationDraftSent(draft.id);

    return Response.json({
      ok: true,
      message: '邮件已通过 SMTP 发出。',
      sentAt: updated?.sentAt || null,
    });
  } catch (error) {
    console.error('LeadPulse communication send failed:', error);
    return Response.json({ error: '发信失败，请检查 SMTP 配置或稍后再试。' }, { status: 500 });
  }
}
