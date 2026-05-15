import { publicMcpDiscovery, proxyToM2m } from '../../../lib/m2m/proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(publicMcpDiscovery());
}

export async function POST(request: Request) {
  return proxyToM2m(request, '/api/mcp');
}
