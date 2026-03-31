import { benchmarkCommunityExtractor } from '../../../../lib/community-intel/extractor-agent';
import type { CommunityRawPost } from '../../../../lib/community-intel/types';

type BenchmarkPayload = {
  posts?: CommunityRawPost[];
};

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as BenchmarkPayload;
    const posts = (payload.posts || []).slice(0, 200);

    if (posts.length === 0) {
      return Response.json({ error: '至少需要一批 community posts。' }, { status: 400 });
    }

    return Response.json({
      ok: true,
      benchmark: benchmarkCommunityExtractor(posts),
    });
  } catch (error) {
    console.error('LeadPulse community benchmark failed:', error);
    return Response.json({ error: '社区基线压测失败。' }, { status: 500 });
  }
}
