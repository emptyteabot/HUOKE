import type {
  CommunityCircuitBreakerDecision,
  CommunityIntentScore,
  CommunityLeadSignal,
  CommunityRuntimeMetrics,
  CommunityRouterDecision,
  CommunitySPOItem,
} from './types';

const thresholds = {
  minConfidencePosterior: 0.46,
  maxLoopCount: 3,
  maxBounceRate: 0.72,
  maxConversionDrop: 0.4,
};

function byId<T extends { postId: string }>(items: T[], postId: string) {
  return items.find((item) => item.postId === postId);
}

export function evaluateCommunityCircuitBreaker(args: {
  scores: CommunityIntentScore[];
  routes: CommunityRouterDecision[];
  runtimeMetrics?: CommunityRuntimeMetrics;
}): CommunityCircuitBreakerDecision {
  const avgPosterior =
    args.scores.length > 0
      ? args.scores.reduce((sum, item) => sum + item.posterior, 0) / args.scores.length
      : 0;

  const lowConfidenceRate =
    args.scores.length > 0
      ? args.scores.filter((item) => item.posterior < thresholds.minConfidencePosterior).length / args.scores.length
      : 0;

  const toolCallLoops = args.routes.filter((item) => item.route === 'tool_call_collect_more').length;
  const bounceRate = args.runtimeMetrics?.bounceRate || 0;
  const conversionRateDrop = args.runtimeMetrics?.conversionRateDrop || 0;
  const abnormalExitRate = args.runtimeMetrics?.abnormalExitRate || 0;
  const loopCount = args.runtimeMetrics?.loopCount || toolCallLoops;

  if (
    avgPosterior < thresholds.minConfidencePosterior ||
    lowConfidenceRate > 0.65 ||
    bounceRate > thresholds.maxBounceRate ||
    abnormalExitRate > 0.6 ||
    conversionRateDrop > thresholds.maxConversionDrop ||
    loopCount > thresholds.maxLoopCount
  ) {
    const reasons = [
      avgPosterior < thresholds.minConfidencePosterior ? '整体置信度跌破安全阈值' : '',
      lowConfidenceRate > 0.65 ? '低置信样本占比过高' : '',
      bounceRate > thresholds.maxBounceRate ? '跳出率异常飙升' : '',
      abnormalExitRate > 0.6 ? '异常退出率过高' : '',
      conversionRateDrop > thresholds.maxConversionDrop ? '推荐转化率断崖式下跌' : '',
      loopCount > thresholds.maxLoopCount ? 'LLM 工具链可能陷入死循环' : '',
    ].filter(Boolean);

    return {
      triggered: true,
      mode: 'semi_auto',
      reason: reasons.join('；'),
      thresholds,
    };
  }

  return {
    triggered: false,
    mode: 'auto',
    reason: '当前置信度与运行指标仍在安全区间内。',
    thresholds,
  };
}

export function buildSPOQueue(args: {
  signals: CommunityLeadSignal[];
  scores: CommunityIntentScore[];
  routes: CommunityRouterDecision[];
  breaker: CommunityCircuitBreakerDecision;
}): CommunitySPOItem[] {
  if (!args.breaker.triggered) return [];

  return args.scores
    .filter((score) => score.posterior < thresholds.minConfidencePosterior || score.modelTier === 'premium_reasoning')
    .slice(0, 20)
    .map((score) => {
      const signal = byId(args.signals, score.postId);
      const route = byId(args.routes, score.postId);
      const negativeFeatures = [
        signal?.failureBucket || '',
        signal?.warnings.includes('noise_heavy') ? 'noise_heavy' : '',
        score.posterior < thresholds.minConfidencePosterior ? 'low_confidence' : '',
        route?.route === 'tool_call_collect_more' ? 'tool_call_loop_risk' : '',
        signal?.language === 'mixed' ? 'mixed_language' : '',
      ].filter(Boolean);

      return {
        postId: score.postId,
        negativeFeatures,
        retryHint:
          '夜间批处理中提取负向特征，回写到 prompt / filtering / routing 配置，避免白天继续放大错误样本。',
      };
    });
}
