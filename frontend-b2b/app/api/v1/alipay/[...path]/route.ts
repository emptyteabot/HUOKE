import { proxyToM2m } from '../../../../../lib/m2m/proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

async function backendPath(context: RouteContext) {
  const params = await context.params;
  const suffix = (params.path || []).map(encodeURIComponent).join('/');
  return `/api/v1/alipay/${suffix}`;
}

export async function GET(request: Request, context: RouteContext) {
  return proxyToM2m(request, await backendPath(context));
}

export async function POST(request: Request, context: RouteContext) {
  return proxyToM2m(request, await backendPath(context));
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
