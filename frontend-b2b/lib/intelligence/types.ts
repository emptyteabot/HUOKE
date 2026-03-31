export type ObservationEventType =
  | 'page_view'
  | 'scroll_depth'
  | 'hover_dwell'
  | 'click'
  | 'search_query'
  | 'form_update'
  | 'list_focus'
  | 'custom';

export type ObservationMetadata = Record<string, string | number | boolean | null | undefined>;

export type ObservationEvent = {
  sessionId: string;
  visitorId?: string;
  timestamp: string;
  type: ObservationEventType;
  path?: string;
  label?: string;
  value?: string;
  numericValue?: number;
  metadata?: ObservationMetadata;
};

export type ObservationStateVector = {
  sessionId: string;
  totalEvents: number;
  uniquePages: string[];
  highIntentPageVisits: number;
  pricingVisits: number;
  bookingVisits: number;
  paymentVisits: number;
  maxScrollDepth: number;
  hoverDwellMsTotal: number;
  hoverDwellMsMax: number;
  clickLabels: string[];
  clickSequence: string[];
  searchQueries: string[];
  semanticIntentSignals: string[];
  explicitPlanInterest: string[];
  completedFields: string[];
  engagementScore: number;
  completionScore: number;
};

export type LeadContext = {
  email?: string;
  company?: string;
  selectedPlan?: string;
  requestedAction?: string;
  budgetHint?: string;
  segment?: string;
  channel?: string;
};

export type AtomicIntentCheck = {
  id: string;
  title: string;
  rationale: string;
  contribution: number;
  status: 'positive' | 'neutral' | 'negative';
};

export type IntentReasoningResult = {
  priorProbability: number;
  posteriorProbability: number;
  confidence: 'low' | 'medium' | 'high';
  highValueSignal: boolean;
  atomicChecks: AtomicIntentCheck[];
  summary: string;
};

export type RetrievalMode = 'hybrid' | 'semantic' | 'structured' | 'none';

export type RouterDecision = {
  destination: 'closer_agent' | 'recommendation_agent' | 'tool_call_agent' | 'nurture_agent';
  reason: string;
  retrievalMode: RetrievalMode;
  suggestedAction:
    | 'handoff_to_closer'
    | 'rerank_catalog'
    | 'open_micro_prompt'
    | 'continue_nurture';
  missingFields: string[];
};

export type DeterministicOperationType =
  | 'stripe_subscription_prepare'
  | 'neon_lead_upsert'
  | 'billing_ledger_write'
  | 'followup_task_create'
  | 'recommendation_rerank_apply';

export type DeterministicOperation = {
  id: string;
  type: DeterministicOperationType;
  summary: string;
  requiredFields: string[];
  approved: boolean;
  owner: 'hardcoded_api' | 'sql_transaction' | 'payment_gateway';
};

export type GuardrailReport = {
  approved: boolean;
  blockedReasons: string[];
  operations: DeterministicOperation[];
};

export type IntelligenceEvaluation = {
  observation: ObservationStateVector;
  reasoning: IntentReasoningResult;
  routing: RouterDecision;
  guardrails: GuardrailReport;
};
