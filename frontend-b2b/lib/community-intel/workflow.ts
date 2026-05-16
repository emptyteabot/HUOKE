import { buildClosedLoop } from './closed-loop';
import { buildSPOQueue, evaluateCommunityCircuitBreaker } from './circuit-breaker';
import { benchmarkCommunityExtractor } from './extractor-agent';
import { runCommunityDeterministicGuardrails } from './guardrails';
import { runIntentScoringAgent } from './intent-scoring-agent';
import { runOutreachRole } from './outreach-role';
import { runRagRole } from './rag-role';
import { runRouterAgent } from './router-agent';
import { runScoutRole } from './scout-role';
import type { CommunityRawPost, CommunityRuntimeMetrics, CommunityWorkflowResult } from './types';

export async function runCommunityWorkflow(posts: CommunityRawPost[], runtimeMetrics?: CommunityRuntimeMetrics): Promise<CommunityWorkflowResult> {
  const observation = runScoutRole(posts);
  const cleaned = await runRagRole({
    posts,
    messages: observation.messages,
  });
  const intentScores = runIntentScoringAgent(cleaned);
  const routes = runRouterAgent({
    signals: cleaned,
    scores: intentScores,
  });
  const outreachDrafts = runOutreachRole({
    signals: cleaned,
    routes,
  });
  const guardrails = runCommunityDeterministicGuardrails({
    routes,
    drafts: outreachDrafts,
  });
  const circuitBreaker = evaluateCommunityCircuitBreaker({
    scores: intentScores,
    routes,
    runtimeMetrics,
  });
  const spoQueue = buildSPOQueue({
    signals: cleaned,
    scores: intentScores,
    routes,
    breaker: circuitBreaker,
  });

  const safeGuardrails = circuitBreaker.triggered
    ? guardrails.map((item) => ({
        ...item,
        allowSend: false,
        blockedReasons: [...item.blockedReasons, '系统已触发基于置信度的熔断，自动降级为半自动模式。'],
      }))
    : guardrails;
  const closedLoop = buildClosedLoop({
    signals: cleaned,
    scores: intentScores,
    routes,
    guardrails: safeGuardrails,
  });

  return {
    observation,
    cleaned,
    intentScores,
    routes,
    outreachDrafts,
    guardrails: safeGuardrails,
    circuitBreaker,
    spoQueue,
    closedLoop,
    modelTiering: {
      principle: '社区线索筛选统一使用真实 LLM 语义判定，后续路由只消费 LLM 结果。',
      lightweightModel: 'Geekspace OpenAI-compatible API',
      premiumModel: 'gpt-5.5',
      explanation:
        '获客、毒性同行拦截、痛点摘要和最终意图分数均来自同一条 LLM 判定链路。',
    },
  };
}

export { benchmarkCommunityExtractor };
