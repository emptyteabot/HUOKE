import { appendFile, mkdir } from 'fs/promises';
import path from 'path';

import { buildGuardrailReport } from './guardrails';
import { scoreIntentProbability } from './intent-reasoning';
import { buildObservationStateVector } from './observation';
import { routeLeadIntent } from './router';
import type { IntelligenceEvaluation, LeadContext, ObservationEvent } from './types';

const dataRoot = path.join(process.cwd(), '..', 'data', 'intelligence');

export function evaluateLeadPulseIntelligence(args: {
  events: ObservationEvent[];
  lead?: LeadContext;
}): IntelligenceEvaluation {
  const observation = buildObservationStateVector(args.events);
  const reasoning = scoreIntentProbability(observation, args.lead);
  const routing = routeLeadIntent({
    probability: reasoning.posteriorProbability,
    vector: observation,
    lead: args.lead,
  });
  const guardrails = buildGuardrailReport({
    lead: args.lead,
    route: routing,
  });

  return {
    observation,
    reasoning,
    routing,
    guardrails,
  };
}

export async function persistEvaluationSnapshot(snapshot: IntelligenceEvaluation) {
  await mkdir(dataRoot, { recursive: true });
  const filePath = path.join(dataRoot, 'evaluations.jsonl');
  await appendFile(filePath, `${JSON.stringify({ createdAt: new Date().toISOString(), ...snapshot })}\n`, 'utf-8');
}

export async function persistEvaluationSnapshotWithMeta(
  snapshot: IntelligenceEvaluation,
  meta: {
    sourceKind: string;
    sourceId: string;
    contactKey: string;
    lead?: LeadContext;
  },
) {
  await mkdir(dataRoot, { recursive: true });
  const filePath = path.join(dataRoot, 'evaluations.jsonl');
  await appendFile(
    filePath,
    `${JSON.stringify({
      createdAt: new Date().toISOString(),
      sourceKind: meta.sourceKind,
      sourceId: meta.sourceId,
      contactKey: meta.contactKey,
      lead: meta.lead || {},
      ...snapshot,
    })}\n`,
    'utf-8',
  );
}

export type {
  AtomicIntentCheck,
  GuardrailReport,
  IntelligenceEvaluation,
  IntentReasoningResult,
  LeadContext,
  ObservationEvent,
  ObservationEventType,
  ObservationStateVector,
  RouterDecision,
} from './types';
