import type { CommunityLeadSignal, CommunityOutreachDraft, CommunityRouterDecision } from './types';

function byId<T extends { postId: string }>(items: T[], postId: string) {
  return items.find((item) => item.postId === postId);
}

export function runOutreachRole(args: {
  signals: CommunityLeadSignal[];
  routes: CommunityRouterDecision[];
}): CommunityOutreachDraft[] {
  return args.routes.flatMap((route) => {
    const signal = byId(args.signals, route.postId);
    if (!signal) return [];
    if (route.route === 'nurture_hold') return [];

    const hook =
      signal.painSignals[0]
        ? `先围绕“${signal.painSignals[0]}”切入，不先讲功能。`
        : '先围绕当前增长瓶颈切入，不先讲功能。';

    const cta =
      route.route === 'milvus_hybrid_match'
        ? '给对方一个更具体的下一步：推荐、诊断或定价页。'
        : '先补齐关键信息，再决定推演示、诊断还是定价。';

    return [
      {
        postId: route.postId,
        channel: signal.source,
        hook,
        cta,
        requiresHumanReview: route.route !== 'milvus_hybrid_match' || signal.contactability !== 'high',
      },
    ];
  });
}
