import { evaluateLeadPulseIntelligence, persistEvaluationSnapshot } from '../../../../lib/intelligence';
import type { LeadContext, ObservationEvent } from '../../../../lib/intelligence';

type EvaluationPayload = {
  events?: ObservationEvent[];
  lead?: LeadContext;
};

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as EvaluationPayload;
    if (!payload.events || payload.events.length === 0) {
      return Response.json({ error: '至少需要一批 observation events。' }, { status: 400 });
    }

    const evaluation = evaluateLeadPulseIntelligence({
      events: payload.events.slice(0, 100),
      lead: payload.lead,
    });

    await persistEvaluationSnapshot(evaluation);

    return Response.json({
      ok: true,
      ...evaluation,
    });
  } catch (error) {
    console.error('LeadPulse intelligence evaluation failed:', error);
    return Response.json({ error: '意图评估失败。' }, { status: 500 });
  }
}
