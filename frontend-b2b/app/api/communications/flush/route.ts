import { markCommunicationDraftSent, readReadyEmailDrafts } from '../../../../lib/communications';
import { isSmtpConfigured, sendEmail } from '../../../../lib/mailer';

function authorized(request: Request) {
  const secret = String(process.env.LEADPULSE_AUTOMATION_KEY || '').trim();
  if (!secret) {
    return false;
  }

  const header = request.headers.get('x-leadpulse-automation-key');
  return header === secret;
}

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    if (!authorized(request)) {
      return Response.json({ error: '未授权。' }, { status: 401 });
    }

    if (!isSmtpConfigured()) {
      return Response.json({
        ok: true,
        skipped: true,
        reason: 'SMTP 尚未配置。',
        total: 0,
        sent: 0,
        failed: 0,
        results: [],
      });
    }

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') || 10);
    const drafts = await readReadyEmailDrafts(Number.isFinite(limit) ? limit : 10);

    const results: Array<{ draftId: string; company: string; ok: boolean; error?: string }> = [];
    let closerSent = 0;

    for (const draft of drafts) {
      try {
        if (!draft.email) {
          throw new Error('缺少收件邮箱');
        }

        await sendEmail({
          to: draft.email,
          subject: draft.subject,
          text: draft.body,
        });
        await markCommunicationDraftSent(draft.id);
        results.push({
          draftId: draft.id,
          company: draft.company,
          ok: true,
        });
        if (draft.templateKey === 'intelligence-closer-email' || draft.templateKey === 'intelligence-closer-dm') {
          closerSent += 1;
        }
      } catch (error) {
        results.push({
          draftId: draft.id,
          company: draft.company,
          ok: false,
          error: error instanceof Error ? error.message : '发送失败',
        });
      }
    }

    return Response.json({
      ok: true,
      total: drafts.length,
      sent: results.filter((item) => item.ok).length,
      failed: results.filter((item) => !item.ok).length,
      closerSent,
      results,
    });
  } catch (error) {
    console.error('LeadPulse communication flush failed:', error);
    return Response.json({ error: '批量发信失败。' }, { status: 500 });
  }
}
