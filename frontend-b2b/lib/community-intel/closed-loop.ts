import type {
  CommunityClosedLoopItem,
  CommunityDeterministicGuardrail,
  CommunityIntentScore,
  CommunityLeadSignal,
  CommunityRouterDecision,
} from './types';

function byId<T extends { postId: string }>(items: T[], postId: string) {
  return items.find((item) => item.postId === postId);
}

export function buildClosedLoop(args: {
  signals: CommunityLeadSignal[];
  scores: CommunityIntentScore[];
  routes: CommunityRouterDecision[];
  guardrails: CommunityDeterministicGuardrail[];
}): CommunityClosedLoopItem[] {
  return args.scores.map((score) => {
    const signal = byId(args.signals, score.postId);
    const route = byId(args.routes, score.postId);
    const guardrail = byId(args.guardrails, score.postId);
    const reasons = [
      signal?.productNeedSignals[0] ? `出现产品/商业信号：${signal.productNeedSignals[0]}` : '',
      signal?.painSignals[0] ? `出现痛点：${signal.painSignals[0]}` : '',
      route?.reason || '',
      guardrail && !guardrail.allowSend ? `执行被护栏拦截：${guardrail.blockedReasons.join('；')}` : '',
    ].filter(Boolean);

    const level = score.posterior >= 0.78 ? 'high' : score.posterior >= 0.48 ? 'medium' : 'low';
    const rankingAction =
      route?.route === 'milvus_hybrid_match'
        ? 'boost'
        : route?.route === 'tool_call_collect_more'
          ? 'ask_more'
          : 'hold';
    const nextStep =
      route?.route === 'milvus_hybrid_match'
        ? '提升推荐排序，优先给出更匹配对象和下一步方案。'
        : route?.route === 'tool_call_collect_more'
          ? '先补充关键信息，再决定是否继续推进。'
          : '暂不强推，继续观察后续行为信号。';
    const leadPriority = rankingAction === 'boost' ? 'high' : rankingAction === 'ask_more' ? 'medium' : 'low';

    return {
      postId: score.postId,
      judgment: {
        level,
        probability: score.posterior,
        reasons,
      },
      feedback: {
        explanation: reasons.join('；') || '当前没有足够理由进入强动作。',
        userFacingMessage:
          rankingAction === 'boost'
            ? '系统判断你现在更接近高意向线索，所以会优先展示更匹配的对象和下一步建议。'
            : rankingAction === 'ask_more'
              ? '系统认为你可能有需求，但还需要更多信息来减少误判。'
              : '系统暂时不会强推推荐或触达，避免在低置信情况下误导。 ',
      },
      action: {
        rankingAction,
        nextStep,
        leadPriority,
      },
    };
  });
}
