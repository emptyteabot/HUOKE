import { markDealWon } from '../../../../lib/intelligence/action-engine';

type Payload = {
  contactKey?: string;
};

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Payload;
    const contactKey = String(payload.contactKey || '').trim().toLowerCase();

    if (!contactKey) {
      return Response.json({ error: '缺少 contactKey。' }, { status: 400 });
    }

    const result = await markDealWon({ contactKey });
    return Response.json(result);
  } catch (error) {
    console.error('LeadPulse mark deal won failed:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : '标记成交失败。' },
      { status: 500 },
    );
  }
}
