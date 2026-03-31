import { extractCommunityLeadSignal } from '../../../../lib/community-intel/extractor-agent';
import type { CommunityRawPost } from '../../../../lib/community-intel/types';

type ExtractPayload = {
  posts?: CommunityRawPost[];
};

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ExtractPayload;
    const posts = (payload.posts || []).slice(0, 25);

    if (posts.length === 0) {
      return Response.json({ error: '至少需要一条 community post。' }, { status: 400 });
    }

    return Response.json({
      ok: true,
      count: posts.length,
      signals: posts.map(extractCommunityLeadSignal),
    });
  } catch (error) {
    console.error('LeadPulse community extract failed:', error);
    return Response.json({ error: '社区语料提取失败。' }, { status: 500 });
  }
}
