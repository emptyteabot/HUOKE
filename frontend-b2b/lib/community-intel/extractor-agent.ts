import { scoreLeadIntentWithLlm } from '../llm-intent';
import type { CommunityBenchmarkResult, CommunityLeadSignal, CommunityRawPost, CommunitySource, ExtractionFailureBucket } from './types';

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
  const completionTokens = Math.max(32, Math.ceil(promptTokens * 0.45));
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

function failureFor(args: {
  normalizedText: string;
  source: CommunitySource;
  language: CommunityLeadSignal['language'];
  score: number;
  toxic: boolean;
}): ExtractionFailureBucket | undefined {
  if (!args.normalizedText) return 'empty_text';
  if (args.normalizedText.length < 24) return 'too_short';
  if (args.source === 'unknown') return 'unsupported_source';
  if (args.language === 'unknown') return 'language_unclear';
  if (args.toxic || args.score <= 0) return 'no_commercial_signal';
  return undefined;
}

export async function extractCommunityLeadSignal(post: CommunityRawPost): Promise<CommunityLeadSignal> {
  const rawText = [post.title || '', post.body || '', ...(post.comments || []).slice(0, 3)].join(' ');
  const normalizedText = stripNoise(rawText);
  const language = detectLanguage(normalizedText);
  const tokenEstimate = estimateTokens(normalizedText);
  const warnings: string[] = [];

  if (rawText.length > 0 && normalizedText.length / rawText.length < 0.45) {
    warnings.push('noise_heavy');
  }

  const decision = await scoreLeadIntentWithLlm({
    source: post.source,
    sourceUrl: post.url,
    author: post.author || post.authorHandle,
    keyword: (post.tags || []).join(', '),
    content: normalizedText,
  });

  const commercialIntentScore = Number((decision.lead_score / 100).toFixed(4));
  const failureBucket = failureFor({
    normalizedText,
    source: post.source,
    language,
    score: decision.lead_score,
    toxic: decision.is_toxic_vendor_or_peer || !decision.is_target_buyer,
  });

  const contactability =
    decision.lead_score >= 78
      ? 'high'
      : decision.lead_score >= 45
        ? 'medium'
        : 'low';

  const painSummary = decision.pain_point_summary || '';
  const nextAction = decision.next_action_dm || '';

  return {
    postId: post.id,
    source: post.source,
    normalizedText,
    language,
    commercialIntentScore,
    tokenEstimate,
    productNeedSignals: decision.is_target_buyer ? [painSummary || 'LLM buyer intent approved'].filter(Boolean) : [],
    painSignals: painSummary ? [painSummary] : [],
    monetizationSignals: nextAction ? [nextAction] : [],
    outreachHooks: nextAction ? [nextAction] : [],
    contactability,
    recommendedQueue:
      !failureBucket && decision.lead_score >= 55
        ? 'extract_pass'
        : failureBucket && failureBucket !== 'no_commercial_signal'
          ? 'human_review'
          : 'watch',
    success: !failureBucket || failureBucket === 'no_commercial_signal',
    failureBucket,
    warnings,
  };
}

export async function benchmarkCommunityExtractor(posts: CommunityRawPost[]): Promise<CommunityBenchmarkResult> {
  const results = await Promise.all(posts.map(extractCommunityLeadSignal));
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
