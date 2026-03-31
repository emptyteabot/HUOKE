import { runCommunityWorkflow } from '../../../../lib/community-intel/workflow';
import type { CommunityRawPost, CommunityRuntimeMetrics } from '../../../../lib/community-intel/types';

type WorkflowPayload = {
  posts?: CommunityRawPost[];
  runtimeMetrics?: CommunityRuntimeMetrics;
};

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as WorkflowPayload;
    const posts = (payload.posts || []).slice(0, 100);

    if (posts.length === 0) {
      return Response.json({ error: '至少需要一批 community posts。' }, { status: 400 });
    }

    return Response.json({
      ok: true,
      workflow: runCommunityWorkflow(posts, payload.runtimeMetrics),
    });
  } catch (error) {
    console.error('LeadPulse community workflow failed:', error);
    return Response.json({ error: '社区多角色工作流执行失败。' }, { status: 500 });
  }
}
