import type { CommunityIntentScore, CommunityLeadSignal, AtomicReasoningNode } from './types';

function logistic(value: number) {
  return 1 / (1 + Math.exp(-value));
}

function needsAoT(signal: CommunityLeadSignal) {
  return signal.language === 'mixed' || signal.normalizedText.length > 420 || signal.commercialIntentScore < 0.62;
}

function buildAtomicNodes(signal: CommunityLeadSignal): AtomicReasoningNode[] {
  return [
    {
      id: `${signal.postId}-intent`,
      question: '文本里是否出现明确商业意图？',
      answer: signal.productNeedSignals.length > 0 ? '是，出现了定价/获客/转化等词。' : '弱，几乎没有明确商业词。',
      weight: signal.productNeedSignals.length > 0 ? 0.36 : -0.12,
    },
    {
      id: `${signal.postId}-pain`,
      question: '文本里是否出现真实痛点？',
      answer: signal.painSignals.length > 0 ? '是，出现了获客、卖不动、转化差等痛点。' : '弱，没有清楚痛点。',
      weight: signal.painSignals.length > 0 ? 0.28 : -0.08,
    },
    {
      id: `${signal.postId}-monetization`,
      question: '是否与付费、方案或服务交付有关？',
      answer: signal.monetizationSignals.length > 0 ? '是，文本包含订阅、套餐、服务、agency 等信号。' : '不明显，更像泛讨论。',
      weight: signal.monetizationSignals.length > 0 ? 0.22 : -0.04,
    },
    {
      id: `${signal.postId}-contactability`,
      question: '是否值得进入下一步触达？',
      answer:
        signal.contactability === 'high'
          ? '高，值得进入更强的下一步动作。'
          : signal.contactability === 'medium'
            ? '中，建议先补信息。'
            : '低，建议继续观察。',
      weight: signal.contactability === 'high' ? 0.24 : signal.contactability === 'medium' ? 0.06 : -0.16,
    },
  ];
}

export function runIntentScoringAgent(signals: CommunityLeadSignal[]): CommunityIntentScore[] {
  return signals.map((signal) => {
    const prior = 0.16;
    const priorLogOdds = Math.log(prior / (1 - prior));
    const semanticScore = signal.commercialIntentScore;
    const bayesDelta = semanticScore * 2.1 - 0.45;
    const atomicNodes = needsAoT(signal) ? buildAtomicNodes(signal) : [];
    const atomicDelta = atomicNodes.reduce((sum, node) => sum + node.weight, 0);
    const posterior = Number(logistic(priorLogOdds + bayesDelta + atomicDelta).toFixed(4));
    const confidence = posterior >= 0.8 ? 'high' : posterior >= 0.5 ? 'medium' : 'low';

    return {
      postId: signal.postId,
      prior,
      posterior,
      confidence,
      semanticScore,
      bayesDelta: Number(bayesDelta.toFixed(4)),
      atomicNodes,
      modelTier: needsAoT(signal) ? 'premium_reasoning' : 'lightweight_open_source',
    };
  });
}
