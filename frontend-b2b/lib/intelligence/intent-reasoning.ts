import type { AtomicIntentCheck, IntentReasoningResult, LeadContext, ObservationStateVector } from './types';

function logistic(value: number) {
  return 1 / (1 + Math.exp(-value));
}

function hasBusinessSemantics(vector: ObservationStateVector) {
  return vector.semanticIntentSignals.some((signal) =>
    ['价格', '定价', '付款', '支付', '预约', '成交', '方案', 'pricing', 'checkout', 'book'].includes(signal),
  );
}

function buildAtomicChecks(vector: ObservationStateVector, lead: LeadContext = {}): AtomicIntentCheck[] {
  const completenessCount = [lead.email, lead.company, lead.selectedPlan, lead.requestedAction].filter(Boolean).length;

  return [
    {
      id: 'commercial-language',
      title: '商业语义是否明确',
      rationale: hasBusinessSemantics(vector)
        ? '搜索词、点击文案或页面路径中已经出现价格、预约、付款等强商业信号。'
        : '目前语义信号偏弱，更像浏览而不是明确采购。 ',
      contribution: hasBusinessSemantics(vector) ? 0.9 : -0.15,
      status: hasBusinessSemantics(vector) ? 'positive' : 'neutral',
    },
    {
      id: 'conversion-depth',
      title: '是否进入成交路径深处',
      rationale:
        vector.pricingVisits > 0 || vector.bookingVisits > 0
          ? '访问已触达定价页或预约页，说明已经进入更接近转化的路径。'
          : '还停留在浅层浏览阶段。',
      contribution: vector.pricingVisits > 0 ? 1.05 : vector.bookingVisits > 0 ? 0.72 : -0.2,
      status: vector.pricingVisits > 0 || vector.bookingVisits > 0 ? 'positive' : 'negative',
    },
    {
      id: 'engagement-quality',
      title: '互动质量是否足够',
      rationale:
        vector.engagementScore >= 0.65
          ? '滚动、点击和停留质量都已达到高意向阈值。'
          : vector.engagementScore >= 0.4
            ? '互动存在，但还不够稳定。'
            : '互动过浅，暂时不能视为强意向。',
      contribution: vector.engagementScore >= 0.65 ? 0.78 : vector.engagementScore >= 0.4 ? 0.28 : -0.42,
      status: vector.engagementScore >= 0.65 ? 'positive' : vector.engagementScore >= 0.4 ? 'neutral' : 'negative',
    },
    {
      id: 'form-completeness',
      title: '信息完整度是否可执行',
      rationale:
        completenessCount >= 3 || vector.completionScore >= 0.6
          ? '当前字段已足够支持更深的推荐或成交动作。'
          : '关键信息仍然缺失，更适合先补信息。 ',
      contribution: completenessCount >= 3 || vector.completionScore >= 0.6 ? 0.65 : -0.35,
      status: completenessCount >= 3 || vector.completionScore >= 0.6 ? 'positive' : 'negative',
    },
    {
      id: 'plan-readiness',
      title: '是否出现明确方案倾向',
      rationale:
        vector.explicitPlanInterest.length > 0 || Boolean(lead.selectedPlan)
          ? '访客已经表现出明确套餐倾向，适合更强的下一步动作。'
          : '尚未看到明确套餐偏好。',
      contribution: vector.explicitPlanInterest.length > 0 || Boolean(lead.selectedPlan) ? 0.5 : 0,
      status: vector.explicitPlanInterest.length > 0 || Boolean(lead.selectedPlan) ? 'positive' : 'neutral',
    },
    {
      id: 'high-value-fit',
      title: '是否具备高净值或高价值线索特征',
      rationale:
        ['agency', 'ai_agency', 'b2b_consulting', 'premium_training'].includes(String(lead.segment || '').toLowerCase()) ||
        String(lead.selectedPlan || '').toLowerCase() === 'max'
          ? '当前线索更像高客单、高复用或团队型需求。'
          : '当前更像常规试用或轻量评估。 ',
      contribution:
        ['agency', 'ai_agency', 'b2b_consulting', 'premium_training'].includes(String(lead.segment || '').toLowerCase()) ||
        String(lead.selectedPlan || '').toLowerCase() === 'max'
          ? 0.42
          : 0,
      status:
        ['agency', 'ai_agency', 'b2b_consulting', 'premium_training'].includes(String(lead.segment || '').toLowerCase()) ||
        String(lead.selectedPlan || '').toLowerCase() === 'max'
          ? 'positive'
          : 'neutral',
    },
  ];
}

export function scoreIntentProbability(
  vector: ObservationStateVector,
  lead: LeadContext = {},
): IntentReasoningResult {
  const priorProbability = 0.18;
  const priorLogOdds = Math.log(priorProbability / (1 - priorProbability));
  const atomicChecks = buildAtomicChecks(vector, lead);
  const posteriorLogOdds = atomicChecks.reduce((sum, item) => sum + item.contribution, priorLogOdds);
  const posteriorProbability = Number(logistic(posteriorLogOdds).toFixed(4));
  const confidence =
    posteriorProbability >= 0.78 ? 'high' : posteriorProbability >= 0.48 ? 'medium' : 'low';
  const highValueSignal = atomicChecks.some((item) => item.id === 'high-value-fit' && item.status === 'positive');

  const summary =
    posteriorProbability >= 0.8
      ? '高意向，适合直接推成交或高价值推荐。'
      : posteriorProbability >= 0.55
        ? '中高意向，适合重排推荐或补信息后继续推进。'
        : posteriorProbability >= 0.35
          ? '存在兴趣，但仍需更多信息和更长 nurture。'
          : '当前更像低意向浏览，不适合过早触发强成交动作。';

  return {
    priorProbability,
    posteriorProbability,
    confidence,
    highValueSignal,
    atomicChecks,
    summary,
  };
}
