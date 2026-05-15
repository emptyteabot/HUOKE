import { publicMcpDiscovery, proxyToM2m } from '../../../lib/m2m/proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const response = await proxyToM2m(request, '/.well-known/mcp.json');
  if (response.status !== 503) {
    return response;
  }

  return Response.json(publicMcpDiscovery(), {
    headers: {
      'Cache-Control': 'public, max-age=60',
    },
  });
}
