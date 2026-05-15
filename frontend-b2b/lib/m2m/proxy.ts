import { SITE_URL } from '../site';

const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8008';

export function m2mBackendUrl() {
  return String(process.env.LEADPULSE_M2M_BACKEND_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
}

export function publicMcpDiscovery() {
  const toolNames = [
    'leadpulse.score_lead',
    'leadpulse.check_fit',
    'leadpulse.extract_budget',
    'leadpulse.start_interview',
    'leadpulse.next_question',
    'leadpulse.submit_answer',
    'leadpulse.get_availability',
    'leadpulse.hold_slot',
    'leadpulse.cancel_hold',
    'leadpulse.book_discovery_call',
    'leadpulse.qualify_and_book',
    'leadpulse.get_pipeline_policy',
    'leadpulse.get_service_offer',
    'leadpulse.normalize_contact',
    'leadpulse.create_lead',
    'leadpulse.append_context',
    'leadpulse.health',
    'leadpulse.get_tool_manifest',
  ];

  return {
    name: 'LeadPulse M2M Acquisition Gateway',
    version: '2.0.0',
    protocolVersion: '2025-11-25',
    description:
      'LeadPulse V2 exposes one M2M pipeline: dynamic budget interview -> qualified budget -> availability -> discovery-call booking.',
    transport: {
      type: 'streamable_http',
      url: `${SITE_URL}/api/mcp`,
    },
    capabilities: {
      tools: true,
      structuredOutput: true,
    },
    endpoints: {
      mcp: `${SITE_URL}/api/mcp`,
      tools: `${SITE_URL}/api/v2/tools`,
      scoring: `${SITE_URL}/api/v2/scoring`,
      availability: `${SITE_URL}/api/v2/availability`,
      booking: `${SITE_URL}/api/v2/booking`,
      dynamicInterview: `${SITE_URL}/api/v2/funnel/next-question`,
    },
    tools: toolNames.map((name) => ({
      name,
      description: 'See /api/v2/tools for strict Pydantic inputSchema.',
    })),
  };
}

export async function proxyToM2m(request: Request, backendPath: string) {
  const url = new URL(request.url);
  const target = new URL(`${m2mBackendUrl()}${backendPath}`);
  target.search = url.search;

  const headers = new Headers();
  for (const name of ['content-type', 'authorization', 'accept', 'user-agent']) {
    const value = request.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }
  headers.set('x-forwarded-host', url.host);
  headers.set('x-forwarded-proto', url.protocol.replace(':', ''));

  let body: BodyInit | undefined;
  if (!['GET', 'HEAD'].includes(request.method)) {
    body = await request.text();
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
    });
  } catch (error) {
    return Response.json(
      {
        error: 'LeadPulse M2M backend unavailable',
        detail: error instanceof Error ? error.message : String(error),
        backend: m2mBackendUrl(),
      },
      { status: 503 },
    );
  }

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('transfer-encoding');
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
