import { persistObservationEvents } from '../../../lib/intelligence/observation';
import type { ObservationEvent, ObservationEventType } from '../../../lib/intelligence/types';

type RawObservationEvent = {
  sessionId?: string;
  visitorId?: string;
  timestamp?: string;
  type?: ObservationEventType;
  path?: string;
  label?: string;
  value?: string;
  numericValue?: number;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

type ObservationPayload = {
  events?: RawObservationEvent[];
};

function normalizeEvent(event: RawObservationEvent): ObservationEvent | null {
  if (!event.sessionId || !event.type) {
    return null;
  }

  return {
    sessionId: String(event.sessionId).trim(),
    visitorId: String(event.visitorId || '').trim() || undefined,
    timestamp: String(event.timestamp || new Date().toISOString()),
    type: event.type,
    path: String(event.path || '').trim() || undefined,
    label: String(event.label || '').trim() || undefined,
    value: String(event.value || '').trim() || undefined,
    numericValue: typeof event.numericValue === 'number' ? event.numericValue : undefined,
    metadata: event.metadata || undefined,
  };
}

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ObservationPayload;
    const normalized = (payload.events || []).map(normalizeEvent).filter(Boolean) as ObservationEvent[];

    if (normalized.length === 0) {
      return Response.json({ error: '缺少有效观测事件。' }, { status: 400 });
    }

    await persistObservationEvents(normalized.slice(0, 50));

    return Response.json({
      ok: true,
      accepted: normalized.length,
      sessionId: normalized[0]?.sessionId || '',
    });
  } catch (error) {
    console.error('LeadPulse observation ingest failed:', error);
    return Response.json({ error: '观测事件写入失败。' }, { status: 500 });
  }
}
