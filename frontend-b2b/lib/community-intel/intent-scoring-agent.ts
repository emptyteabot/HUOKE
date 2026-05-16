import type { CommunityIntentScore, CommunityLeadSignal, AtomicReasoningNode } from './types';

function confidenceFor(posterior: number): CommunityIntentScore['confidence'] {
  if (posterior >= 0.8) return 'high';
  if (posterior >= 0.5) return 'medium';
  return 'low';
}

function atomicNodesFromLlmSignal(signal: CommunityLeadSignal): AtomicReasoningNode[] {
  const accepted = signal.recommendedQueue === 'extract_pass' && signal.commercialIntentScore > 0;
  return [
    {
      id: `${signal.postId}-llm-buyer-intent`,
      question: 'LLM 是否判定为真实目标买家？',
      answer: accepted ? '是，LLM 判定为可进入触达队列。' : '否，LLM 判定不应触达或需要继续观察。',
      weight: 0,
    },
    {
      id: `${signal.postId}-llm-pain`,
      question: 'LLM 是否抽取到真实痛点？',
      answer: signal.painSignals[0] || '未抽取到可执行痛点。',
      weight: 0,
    },
    {
      id: `${signal.postId}-llm-next-action`,
      question: 'LLM 是否给出下一步触达角度？',
      answer: signal.outreachHooks[0] || '无触达角度。',
      weight: 0,
    },
  ];
}

export function runIntentScoringAgent(signals: CommunityLeadSignal[]): CommunityIntentScore[] {
  return signals.map((signal) => {
    const posterior = Number(signal.commercialIntentScore.toFixed(4));
    return {
      postId: signal.postId,
      prior: 0,
      posterior,
      confidence: confidenceFor(posterior),
      semanticScore: posterior,
      bayesDelta: 0,
      atomicNodes: atomicNodesFromLlmSignal(signal),
      modelTier: 'premium_reasoning',
    };
  });
}
