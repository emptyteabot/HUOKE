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

export function runCommunityWorkflow(posts: CommunityRawPost[], runtimeMetrics?: CommunityRuntimeMetrics): CommunityWorkflowResult {
  const observation = runScoutRole(posts);
  const cleaned = runRagRole({
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
      principle: '质量、速度与成本不可同时最大化，必须按阶段路由模型。',
      lightweightModel: 'Qwen / DeepSeek',
      premiumModel: '顶级高成本推理模型',
      explanation:
        '高频初筛、状态判定、基础过滤全部降级到轻量模型；只有在复杂意图、多语言混杂或需要 AoT 拆解时，才升级到高成本模型。',
    },
  };
}

export { benchmarkCommunityExtractor };
