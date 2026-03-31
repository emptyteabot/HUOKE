import { markCommunicationDraftSent } from '../../../../lib/communications';

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

    const draft = await markCommunicationDraftSent(draftId);
    if (!draft) {
      return Response.json({ error: '消息草稿不存在。' }, { status: 404 });
    }

    return Response.json({
      ok: true,
      message: '已记录为已发送。',
      sentAt: draft.sentAt,
    });
  } catch (error) {
    console.error('LeadPulse communication mark sent failed:', error);
    return Response.json({ error: '系统繁忙，请稍后再试。' }, { status: 500 });
  }
}
