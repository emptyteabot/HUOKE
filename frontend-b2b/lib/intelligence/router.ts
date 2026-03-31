import type { LeadContext, ObservationStateVector, RouterDecision } from './types';

function missingFields(lead: LeadContext = {}) {
  const items = [
    !lead.email ? 'email' : '',
    !lead.company ? 'company' : '',
    !lead.selectedPlan ? 'selectedPlan' : '',
  ].filter(Boolean);

  return items;
}

export function routeLeadIntent(args: {
  probability: number;
  vector: ObservationStateVector;
  lead?: LeadContext;
}): RouterDecision {
  const lead = args.lead || {};
  const missing = missingFields(lead);
  const hasDeepCommercialMotion = args.vector.pricingVisits > 0 || args.vector.bookingVisits > 0;

  if (args.probability >= 0.82 && hasDeepCommercialMotion && missing.length === 0) {
    return {
      destination: 'closer_agent',
      reason: '高意向且信息完整，适合直接推进成交或支付。',
      retrievalMode: 'structured',
      suggestedAction: 'handoff_to_closer',
      missingFields: missing,
    };
  }

  if (args.probability >= 0.66 && missing.length <= 1) {
    return {
      destination: 'recommendation_agent',
      reason: '意图较强，但更适合先做语义 + 结构化重排，再推动下一步。',
      retrievalMode: 'hybrid',
      suggestedAction: 'rerank_catalog',
      missingFields: missing,
    };
  }

  if (args.probability >= 0.42) {
    return {
      destination: 'tool_call_agent',
      reason: '意图存在，但关键信息缺失，优先通过工具调用或微弹窗补全资料。',
      retrievalMode: 'semantic',
      suggestedAction: 'open_micro_prompt',
      missingFields: missing,
    };
  }

  return {
    destination: 'nurture_agent',
    reason: '当前信号不足，先继续 nurture，不触发重成交动作。',
    retrievalMode: 'none',
    suggestedAction: 'continue_nurture',
    missingFields: missing,
  };
}
