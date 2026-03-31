export type CommunitySource = 'reddit' | 'discord' | 'x' | 'xiaohongshu' | 'zhihu' | 'douyin' | 'unknown';

export type CommunityRawPost = {
  id: string;
  source: CommunitySource;
  url?: string;
  author?: string;
  authorHandle?: string;
  title?: string;
  body?: string;
  comments?: string[];
  tags?: string[];
  languageHint?: string;
  createdAt?: string;
  metrics?: {
    likes?: number;
    replies?: number;
    views?: number;
    saves?: number;
  };
};

export type TokenEstimate = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type ExtractionFailureBucket =
  | 'empty_text'
  | 'too_short'
  | 'noise_heavy'
  | 'unsupported_source'
  | 'language_unclear'
  | 'no_commercial_signal';

export type CommunityLeadSignal = {
  postId: string;
  source: CommunitySource;
  normalizedText: string;
  language: 'zh' | 'en' | 'mixed' | 'unknown';
  commercialIntentScore: number;
  tokenEstimate: TokenEstimate;
  productNeedSignals: string[];
  painSignals: string[];
  monetizationSignals: string[];
  outreachHooks: string[];
  contactability: 'high' | 'medium' | 'low';
  recommendedQueue: 'watch' | 'extract_pass' | 'human_review';
  success: boolean;
  failureBucket?: ExtractionFailureBucket;
  warnings: string[];
};

export type CommunityBenchmarkResult = {
  totalPosts: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgPromptTokens: number;
  avgEstimatedTotalTokens: number;
  sourceBreakdown: Array<{
    source: CommunitySource;
    count: number;
    successRate: number;
  }>;
  failureBuckets: Record<string, number>;
  samples: CommunityLeadSignal[];
};

export type CommunityObservationMessage = {
  postId: string;
  source: CommunitySource;
  rawText: string;
  captureWeight: number;
  warnings: string[];
};

export type CommunityScoutResult = {
  messages: CommunityObservationMessage[];
  dropped: Array<{
    postId: string;
    reason: string;
  }>;
};

export type AtomicReasoningNode = {
  id: string;
  question: string;
  answer: string;
  weight: number;
};

export type ModelTier = 'lightweight_open_source' | 'premium_reasoning';

export type CommunityIntentScore = {
  postId: string;
  prior: number;
  posterior: number;
  confidence: 'low' | 'medium' | 'high';
  semanticScore: number;
  bayesDelta: number;
  atomicNodes: AtomicReasoningNode[];
  modelTier: ModelTier;
};

export type CommunityRouterDecision = {
  postId: string;
  route: 'milvus_hybrid_match' | 'tool_call_collect_more' | 'nurture_hold';
  reason: string;
  retrievalMode: 'hybrid' | 'ask_more' | 'hold';
  destinationRole: 'recommendation_agent' | 'tool_call_agent' | 'nurture_agent';
};

export type CommunityDeterministicGuardrail = {
  postId: string;
  allowSend: boolean;
  allowBilling: boolean;
  blockedReasons: string[];
  executionOwner: 'hardcoded_api';
};

export type CommunityOutreachDraft = {
  postId: string;
  channel: 'reddit' | 'discord' | 'x' | 'xiaohongshu' | 'zhihu' | 'douyin' | 'unknown';
  hook: string;
  cta: string;
  requiresHumanReview: boolean;
};

export type CommunityWorkflowResult = {
  observation: CommunityScoutResult;
  cleaned: CommunityLeadSignal[];
  intentScores: CommunityIntentScore[];
  routes: CommunityRouterDecision[];
  outreachDrafts: CommunityOutreachDraft[];
  guardrails: CommunityDeterministicGuardrail[];
  circuitBreaker: CommunityCircuitBreakerDecision;
  spoQueue: CommunitySPOItem[];
  closedLoop: CommunityClosedLoopItem[];
  modelTiering: {
    principle: string;
    lightweightModel: string;
    premiumModel: string;
    explanation: string;
  };
};

export type CommunityRuntimeMetrics = {
  bounceRate?: number;
  conversionRateDrop?: number;
  lowConfidenceRate?: number;
  loopCount?: number;
  abnormalExitRate?: number;
};

export type CommunityCircuitBreakerDecision = {
  triggered: boolean;
  mode: 'auto' | 'semi_auto' | 'human_arbiter';
  reason: string;
  thresholds: {
    minConfidencePosterior: number;
    maxLoopCount: number;
    maxBounceRate: number;
    maxConversionDrop: number;
  };
};

export type CommunitySPOItem = {
  postId: string;
  negativeFeatures: string[];
  retryHint: string;
};

export type CommunityClosedLoopItem = {
  postId: string;
  judgment: {
    level: 'high' | 'medium' | 'low';
    probability: number;
    reasons: string[];
  };
  feedback: {
    explanation: string;
    userFacingMessage: string;
  };
  action: {
    rankingAction: 'boost' | 'ask_more' | 'hold';
    nextStep: string;
    leadPriority: 'high' | 'medium' | 'low';
  };
};
