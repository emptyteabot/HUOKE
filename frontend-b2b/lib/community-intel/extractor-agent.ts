import type { CommunityBenchmarkResult, CommunityLeadSignal, CommunityRawPost, CommunitySource, ExtractionFailureBucket } from './types';

const commercialKeywords = [
  'pay',
  'paid',
  'pricing',
  'customer',
  'client',
  'revenue',
  'sales',
  'lead',
  'growth',
  'conversion',
  'book',
  'close',
  'appointment',
  '推广',
  '获客',
  '客户',
  '成交',
  '营收',
  '收入',
  '线索',
  '转化',
  '预约',
  '付费',
  '定价',
  '报价',
];

const painKeywords = [
  'no users',
  'no customer',
  'hard to sell',
  'need leads',
  'bookings',
  'conversion',
  'launch',
  'distribution',
  '没客户',
  '不会卖',
  '不会获客',
  '流量',
  '转化低',
  '没预约',
  '没人买',
  '冷启动',
  '上线',
  '销售',
];

const monetizationKeywords = [
  'subscription',
  'price',
  'plan',
  'monthly',
  'agency',
  'service',
  'consulting',
  '套餐',
  '订阅',
  '价格',
  '方案',
  '咨询',
  '代运营',
  '训练营',
];

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function stripNoise(text: string) {
  return normalizeWhitespace(
    text
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/[#*_`>|[\]()]/g, ' ')
      .replace(/@\w+/g, ' ')
      .replace(/[\u0000-\u001f]/g, ' '),
  );
}

function detectLanguage(text: string): 'zh' | 'en' | 'mixed' | 'unknown' {
  const zh = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const en = (text.match(/[a-zA-Z]/g) || []).length;
  if (!zh && !en) return 'unknown';
  if (zh > 0 && en > 0) return 'mixed';
  return zh > 0 ? 'zh' : 'en';
}

function estimateTokens(text: string) {
  const cjkCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const latinCount = (text.match(/[a-zA-Z0-9]/g) || []).length;
  const promptTokens = Math.max(8, Math.ceil(cjkCount / 1.8 + latinCount / 4));
  const completionTokens = Math.max(20, Math.ceil(promptTokens * 0.38));
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

function scoreByKeywords(text: string, keywords: string[]) {
  const lowered = text.toLowerCase();
  return keywords.filter((keyword) => lowered.includes(keyword.toLowerCase()));
}

function detectFailureBucket(args: {
  normalizedText: string;
  source: CommunitySource;
  language: CommunityLeadSignal['language'];
  commercialSignals: string[];
  warnings: string[];
}): ExtractionFailureBucket | undefined {
  if (!args.normalizedText) return 'empty_text';
  if (args.normalizedText.length < 24) return 'too_short';
  if (args.source === 'unknown') return 'unsupported_source';
  if (args.language === 'unknown') return 'language_unclear';
  if (args.warnings.includes('noise_heavy')) return 'noise_heavy';
  if (args.commercialSignals.length === 0) return 'no_commercial_signal';
  return undefined;
}

export function extractCommunityLeadSignal(post: CommunityRawPost): CommunityLeadSignal {
  const rawText = [post.title || '', post.body || '', ...(post.comments || []).slice(0, 3)].join(' ');
  const normalizedText = stripNoise(rawText);
  const language = detectLanguage(normalizedText);
  const tokenEstimate = estimateTokens(normalizedText);
  const warnings: string[] = [];

  if (rawText.length > 0 && normalizedText.length / rawText.length < 0.45) {
    warnings.push('noise_heavy');
  }

  const commercialSignals = scoreByKeywords(normalizedText, commercialKeywords);
  const painSignals = scoreByKeywords(normalizedText, painKeywords);
  const monetizationSignals = scoreByKeywords(normalizedText, monetizationKeywords);

  const intentBase =
    Math.min(commercialSignals.length, 5) * 0.14 +
    Math.min(painSignals.length, 4) * 0.11 +
    Math.min(monetizationSignals.length, 4) * 0.08 +
    (post.metrics?.replies ? Math.min(post.metrics.replies, 20) / 20 * 0.08 : 0) +
    (post.metrics?.likes ? Math.min(post.metrics.likes, 50) / 50 * 0.05 : 0);

  const commercialIntentScore = Number(Math.min(intentBase, 0.95).toFixed(4));
  const failureBucket = detectFailureBucket({
    normalizedText,
    source: post.source,
    language,
    commercialSignals,
    warnings,
  });

  const contactability =
    commercialIntentScore >= 0.68
      ? 'high'
      : commercialIntentScore >= 0.38
        ? 'medium'
        : 'low';

  const outreachHooks = [
    ...painSignals.slice(0, 2).map((item) => `围绕“${item}”切入，先讲结果而不是功能。`),
    ...monetizationSignals.slice(0, 1).map((item) => `围绕“${item}”解释收费与回本路径。`),
  ].slice(0, 3);

  return {
    postId: post.id,
    source: post.source,
    normalizedText,
    language,
    commercialIntentScore,
    tokenEstimate,
    productNeedSignals: commercialSignals.slice(0, 6),
    painSignals: painSignals.slice(0, 6),
    monetizationSignals: monetizationSignals.slice(0, 6),
    outreachHooks,
    contactability,
    recommendedQueue:
      !failureBucket && commercialIntentScore >= 0.55
        ? 'extract_pass'
        : failureBucket && failureBucket !== 'no_commercial_signal'
          ? 'human_review'
          : 'watch',
    success: !failureBucket || failureBucket === 'no_commercial_signal',
    failureBucket,
    warnings,
  };
}

export function benchmarkCommunityExtractor(posts: CommunityRawPost[]): CommunityBenchmarkResult {
  const results = posts.map(extractCommunityLeadSignal);
  const successCount = results.filter((item) => item.success).length;
  const failureCount = results.length - successCount;
  const sourceSet = [...new Set(results.map((item) => item.source))];

  const failureBuckets = results.reduce<Record<string, number>>((accumulator, item) => {
    if (item.failureBucket) {
      accumulator[item.failureBucket] = (accumulator[item.failureBucket] || 0) + 1;
    }
    return accumulator;
  }, {});

  return {
    totalPosts: results.length,
    successCount,
    failureCount,
    successRate: results.length ? Number((successCount / results.length).toFixed(4)) : 0,
    avgPromptTokens: results.length
      ? Number((results.reduce((sum, item) => sum + item.tokenEstimate.promptTokens, 0) / results.length).toFixed(2))
      : 0,
    avgEstimatedTotalTokens: results.length
      ? Number((results.reduce((sum, item) => sum + item.tokenEstimate.totalTokens, 0) / results.length).toFixed(2))
      : 0,
    sourceBreakdown: sourceSet.map((source) => {
      const subset = results.filter((item) => item.source === source);
      const subsetSuccess = subset.filter((item) => item.success).length;
      return {
        source,
        count: subset.length,
        successRate: subset.length ? Number((subsetSuccess / subset.length).toFixed(4)) : 0,
      };
    }),
    failureBuckets,
    samples: results.slice(0, 8),
  };
}
