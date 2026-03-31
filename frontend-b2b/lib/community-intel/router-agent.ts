import type { CommunityIntentScore, CommunityLeadSignal, CommunityRouterDecision } from './types';

function byId<T extends { postId: string }>(items: T[], postId: string) {
  return items.find((item) => item.postId === postId);
}

export function runRouterAgent(args: {
  signals: CommunityLeadSignal[];
  scores: CommunityIntentScore[];
}): CommunityRouterDecision[] {
  return args.scores.map((score) => {
    const signal = byId(args.signals, score.postId);
    const weakContactability = signal?.contactability === 'low';

    if (score.posterior >= 0.78 && !weakContactability) {
      return {
        postId: score.postId,
        route: 'milvus_hybrid_match',
        reason: '高意向线索，直接进入混合检索匹配与推荐重排。',
        retrievalMode: 'hybrid',
        destinationRole: 'recommendation_agent',
      };
    }

    if (score.posterior >= 0.42) {
      return {
        postId: score.postId,
        route: 'tool_call_collect_more',
        reason: '意向不弱，但仍然缺信息，优先触发 ToolCall_Agent 继续补充上下文。',
        retrievalMode: 'ask_more',
        destinationRole: 'tool_call_agent',
      };
    }

    return {
      postId: score.postId,
      route: 'nurture_hold',
      reason: '当前线索偏弱，暂不进入高成本匹配与触达。',
      retrievalMode: 'hold',
      destinationRole: 'nurture_agent',
    };
  });
}
