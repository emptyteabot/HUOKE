import { evaluateLeadPulseIntelligence } from '.';
import type { IntelligenceEvaluation, LeadContext, ObservationEvent } from './types';

export type IntakeSourceKind = 'design_partner' | 'booking_request' | 'payment_intent';
export type IntakePriority = 'high' | 'medium' | 'low';

function isoOffset(seconds = 0) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function sessionIdFor(sourceKind: IntakeSourceKind, payload: Record<string, string>) {
  const identity = String(payload.email || payload.company || payload.name || 'anonymous')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  return `${sourceKind}-${identity || 'session'}`;
}

export function contactKeyFromLead(email?: string, company?: string, fallback?: string) {
  return String(email || company || fallback || '')
    .trim()
    .toLowerCase();
}

function buildLeadContext(sourceKind: IntakeSourceKind, payload: Record<string, string>): LeadContext {
  return {
    email: String(payload.email || '').trim() || undefined,
    company: String(payload.company || '').trim() || undefined,
    selectedPlan:
      sourceKind === 'payment_intent'
        ? String(payload.plan || '').trim() || undefined
        : undefined,
    requestedAction:
      sourceKind === 'booking_request'
        ? 'book_diagnostic'
        : sourceKind === 'payment_intent'
          ? 'start_subscription'
          : 'apply_design_partner',
    budgetHint: String(payload.monthlyRevenue || payload.amount || '').trim() || undefined,
    segment: String(payload.segment || '').trim() || undefined,
    channel: String(payload.channel || payload.paymentMethod || '').trim() || undefined,
  };
}

function buildBaseEvents(sessionId: string, sourceKind: IntakeSourceKind, payload: Record<string, string>): ObservationEvent[] {
  if (sourceKind === 'payment_intent') {
    const plan = String(payload.plan || 'pro').trim().toLowerCase();
    return [
      { sessionId, timestamp: isoOffset(0), type: 'page_view', path: `/pay?plan=${plan}`, label: '定价页' },
      { sessionId, timestamp: isoOffset(1), type: 'scroll_depth', path: `/pay?plan=${plan}`, numericValue: 82 },
      { sessionId, timestamp: isoOffset(2), type: 'hover_dwell', path: `/pay?plan=${plan}`, label: '确认订阅意向', numericValue: 1800 },
      { sessionId, timestamp: isoOffset(3), type: 'click', path: `/pay?plan=${plan}`, label: '确认订阅意向', value: `/pay?plan=${plan}` },
    ];
  }

  if (sourceKind === 'booking_request') {
    return [
      { sessionId, timestamp: isoOffset(0), type: 'page_view', path: '/book', label: '预约页' },
      { sessionId, timestamp: isoOffset(1), type: 'scroll_depth', path: '/book', numericValue: 68 },
      { sessionId, timestamp: isoOffset(2), type: 'hover_dwell', path: '/book', label: '预约诊断', numericValue: 1400 },
      { sessionId, timestamp: isoOffset(3), type: 'click', path: '/book', label: '预约诊断', value: '/book' },
    ];
  }

  return [
    { sessionId, timestamp: isoOffset(0), type: 'page_view', path: '/register', label: 'Design Partner 申请' },
    { sessionId, timestamp: isoOffset(1), type: 'scroll_depth', path: '/register', numericValue: 61 },
    { sessionId, timestamp: isoOffset(2), type: 'hover_dwell', path: '/register', label: '申请 Design Partner', numericValue: 1200 },
    { sessionId, timestamp: isoOffset(3), type: 'click', path: '/register', label: '申请 Design Partner', value: '/register' },
  ];
}

function buildFormEvents(sessionId: string, path: string, payload: Record<string, string>) {
  const fields = Object.entries(payload)
    .filter(([, value]) => String(value || '').trim())
    .slice(0, 10);

  return fields.map(
    ([field, value], index): ObservationEvent => ({
      sessionId,
      timestamp: isoOffset(4 + index),
      type: field === 'bottleneck' || field === 'context' || field === 'notes' ? 'search_query' : 'form_update',
      path,
      label: field,
      value: String(value).trim(),
      metadata: { field },
    }),
  );
}

function routeActionHint(
  sourceKind: IntakeSourceKind,
  evaluation: IntelligenceEvaluation,
  fallback: string,
) {
  const missingFieldsLabel = evaluation.routing.missingFields.join('、');

  if (evaluation.routing.destination === 'closer_agent') {
    if (sourceKind === 'payment_intent') {
      return '高意向，直接确认首笔款项、写入账单和安排 onboarding。';
    }
    if (sourceKind === 'booking_request') {
      return '高意向，优先锁定诊断时间，并在会后直接推进付费。';
    }
    return '高意向，优先推进诊断或主力方案，不再只做泛资格判断。';
  }

  if (evaluation.routing.destination === 'recommendation_agent') {
    return '中高意向，先按需求与阶段重排推荐与方案，再推进预约或支付。';
  }

  if (evaluation.routing.destination === 'tool_call_agent') {
    return `先补齐 ${missingFieldsLabel || '关键信息'}，再决定推预约还是推方案。`;
  }

  return fallback;
}

function priorityOrder(priority: IntakePriority) {
  if (priority === 'high') return 3;
  if (priority === 'medium') return 2;
  return 1;
}

function mergePriority(basePriority: IntakePriority, evaluation: IntelligenceEvaluation): IntakePriority {
  let smartPriority: IntakePriority = 'low';
  if (evaluation.routing.destination === 'closer_agent' || evaluation.reasoning.posteriorProbability >= 0.8) {
    smartPriority = 'high';
  } else if (
    evaluation.routing.destination === 'recommendation_agent' ||
    evaluation.reasoning.posteriorProbability >= 0.55
  ) {
    smartPriority = 'medium';
  }

  return priorityOrder(smartPriority) > priorityOrder(basePriority) ? smartPriority : basePriority;
}

export function evaluateIntakeSubmission(args: {
  sourceKind: IntakeSourceKind;
  payload: Record<string, string>;
  fallbackNextAction: string;
  basePriority: IntakePriority;
}) {
  const sessionId = sessionIdFor(args.sourceKind, args.payload);
  const lead = buildLeadContext(args.sourceKind, args.payload);
  const baseEvents = buildBaseEvents(sessionId, args.sourceKind, args.payload);
  const path =
    args.sourceKind === 'payment_intent'
      ? `/pay?plan=${String(args.payload.plan || 'pro').trim().toLowerCase()}`
      : args.sourceKind === 'booking_request'
        ? '/book'
        : '/register';
  const formEvents = buildFormEvents(sessionId, path, args.payload);

  const evaluation = evaluateLeadPulseIntelligence({
    events: [...baseEvents, ...formEvents],
    lead,
  });

  const nextAction = routeActionHint(args.sourceKind, evaluation, args.fallbackNextAction);
  const priority = mergePriority(args.basePriority, evaluation);

  return {
    evaluation,
    lead,
    contactKey: contactKeyFromLead(lead.email, lead.company, sessionId),
    nextAction,
    priority,
    recordFields: {
      intelligenceProbability: String(evaluation.reasoning.posteriorProbability),
      intelligenceConfidence: evaluation.reasoning.confidence,
      intelligenceRoute: evaluation.routing.destination,
      intelligenceSummary: evaluation.reasoning.summary,
      intelligenceGuardrailApproved: evaluation.guardrails.approved ? 'true' : 'false',
      intelligenceHighValue: evaluation.reasoning.highValueSignal ? 'true' : 'false',
      intelligenceAction: evaluation.routing.suggestedAction,
    },
  };
}
