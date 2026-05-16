import { scoreLeadIntentWithLlm } from '../llm-intent';
import type { AtomicIntentCheck, IntentReasoningResult, LeadContext, ObservationStateVector } from './types';

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function highValueFit(lead: LeadContext = {}) {
  const segment = String(lead.segment || '').toLowerCase();
  const plan = String(lead.selectedPlan || '').toLowerCase();
  return ['agency', 'ai_agency', 'b2b_consulting', 'premium_training'].includes(segment) || plan === 'max';
}

function buildObservationNarrative(vector: ObservationStateVector, lead: LeadContext = {}) {
  return [
    'LeadPulse onsite buyer-intent evaluation.',
    `Session: ${vector.sessionId}`,
    `Unique pages: ${vector.uniquePages.join(', ') || 'none'}`,
    `High intent page visits: ${vector.highIntentPageVisits}`,
    `Pricing visits: ${vector.pricingVisits}`,
    `Booking visits: ${vector.bookingVisits}`,
    `Payment visits: ${vector.paymentVisits}`,
    `Max scroll depth: ${vector.maxScrollDepth}`,
    `Hover dwell total ms: ${vector.hoverDwellMsTotal}`,
    `Hover dwell max ms: ${vector.hoverDwellMsMax}`,
    `Click labels: ${vector.clickLabels.join(', ') || 'none'}`,
    `Click sequence: ${vector.clickSequence.join(' -> ') || 'none'}`,
    `Search queries: ${vector.searchQueries.join(' | ') || 'none'}`,
    `Semantic intent signals: ${vector.semanticIntentSignals.join(', ') || 'none'}`,
    `Explicit plan interest: ${vector.explicitPlanInterest.join(', ') || 'none'}`,
    `Completed fields: ${vector.completedFields.join(', ') || 'none'}`,
    `Engagement score: ${vector.engagementScore.toFixed(4)}`,
    `Completion score: ${vector.completionScore.toFixed(4)}`,
    `Lead email: ${lead.email || ''}`,
    `Lead company: ${lead.company || ''}`,
    `Selected plan: ${lead.selectedPlan || ''}`,
    `Requested action: ${lead.requestedAction || ''}`,
    `Budget hint: ${lead.budgetHint || ''}`,
    `Segment: ${lead.segment || ''}`,
    `Channel: ${lead.channel || ''}`,
  ].join('\n');
}

function buildAtomicChecks(args: {
  vector: ObservationStateVector;
  lead?: LeadContext;
  accepted: boolean;
  probability: number;
  painSummary: string;
}): AtomicIntentCheck[] {
  const lead = args.lead || {};
  const deepCommercialMotion = args.vector.pricingVisits > 0 || args.vector.bookingVisits > 0 || args.vector.paymentVisits > 0;
  const completenessCount = [lead.email, lead.company, lead.selectedPlan, lead.requestedAction].filter(Boolean).length;

  return [
    {
      id: 'llm-intent',
      title: 'LLM 商业意图判定',
      rationale: args.accepted
        ? args.painSummary || 'LLM 判定该访客具备明确商业购买意图。'
        : 'LLM 判定当前信号不足以证明真实商业购买意图。',
      contribution: args.accepted ? args.probability : -1 + args.probability,
      status: args.accepted ? 'positive' : 'negative',
    },
    {
      id: 'commercial-depth',
      title: '成交路径深度',
      rationale: deepCommercialMotion
        ? '已进入定价、预约或支付相关路径。'
        : '尚未进入更深的成交路径。',
      contribution: 0,
      status: deepCommercialMotion ? 'positive' : 'neutral',
    },
    {
      id: 'engagement-quality',
      title: '行为参与度',
      rationale:
        args.vector.engagementScore >= 0.65
          ? '页面交互与停留质量较强。'
          : args.vector.engagementScore >= 0.4
            ? '存在一定交互，但还不稳定。'
            : '交互较浅。',
      contribution: 0,
      status:
        args.vector.engagementScore >= 0.65
          ? 'positive'
          : args.vector.engagementScore >= 0.4
            ? 'neutral'
            : 'negative',
    },
    {
      id: 'data-completeness',
      title: '资料完整度',
      rationale:
        completenessCount >= 3 || args.vector.completionScore >= 0.6
          ? '联系方式、公司或方案信息较完整。'
          : '关键资料仍然不足。',
      contribution: 0,
      status: completenessCount >= 3 || args.vector.completionScore >= 0.6 ? 'positive' : 'negative',
    },
    {
      id: 'high-value-fit',
      title: '高价值适配',
      rationale: highValueFit(lead) ? '更像高客单或团队型机会。' : '暂未看到高价值适配信号。',
      contribution: 0,
      status: highValueFit(lead) ? 'positive' : 'neutral',
    },
  ];
}

export async function scoreIntentProbability(
  vector: ObservationStateVector,
  lead: LeadContext = {},
): Promise<IntentReasoningResult> {
  const decision = await scoreLeadIntentWithLlm({
    source: 'leadpulse_onsite_intelligence',
    sourceUrl: vector.uniquePages[0] || '',
    author: lead.email || lead.company || vector.sessionId,
    keyword: [lead.selectedPlan, lead.segment, lead.requestedAction].filter(Boolean).join(', '),
    content: buildObservationNarrative(vector, lead),
  });

  const accepted = decision.is_target_buyer && !decision.is_toxic_vendor_or_peer;
  const priorProbability = 0.18;
  const posteriorProbability = Number((clamp(decision.lead_score, 0, 100) / 100).toFixed(4));
  const confidence =
    posteriorProbability >= 0.78 ? 'high' : posteriorProbability >= 0.48 ? 'medium' : 'low';
  const summary = accepted
    ? decision.pain_point_summary || 'LLM 判定该访客存在明确商业购买意图。'
    : 'LLM 判定当前不应进入强成交流程。';

  return {
    priorProbability,
    posteriorProbability,
    confidence,
    highValueSignal: highValueFit(lead) || posteriorProbability >= 0.78,
    atomicChecks: buildAtomicChecks({
      vector,
      lead,
      accepted,
      probability: posteriorProbability,
      painSummary: decision.pain_point_summary,
    }),
    summary,
  };
}
