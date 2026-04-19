import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const INTERNAL_COOKIE = 'leadpulse_internal_access';
const SOFT_HIDDEN_ROUTES = new Set([
  '/platform',
  '/integrations',
  '/use-cases',
  '/compare',
  '/demo',
  '/security',
  '/agents',
  '/proof',
  '/investors',
  '/cases',
]);

function internalAccessKey() {
  return (
    process.env.LEADPULSE_INTERNAL_ACCESS_KEY ||
    process.env.LEADPULSE_AUTOMATION_KEY ||
    ''
  ).trim();
}

function cleanRedirectUrl(request: NextRequest) {
  const url = externalUrl(request, request.nextUrl.pathname);
  url.search = request.nextUrl.search;
  url.searchParams.delete('access');
  return url;
}

function secureCookie(request: NextRequest) {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const isLocal = host.includes('127.0.0.1') || host.includes('localhost');
  return forwardedProto === 'https' || !isLocal;
}

function externalUrl(request: NextRequest, pathname: string) {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = request.headers.get('host');
  const publicHost = forwardedHost || host || '';
  const externalProto =
    publicHost && !publicHost.includes('127.0.0.1') && !publicHost.includes('localhost')
      ? 'https'
      : forwardedProto || 'http';

  if (forwardedHost) {
    const url = new URL(`${externalProto}://${forwardedHost}${pathname}`);
    return url;
  }

  if (host && !host.includes('127.0.0.1') && !host.includes('localhost')) {
    return new URL(`${externalProto}://${host}${pathname}`);
  }

  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  return url;
}

export function middleware(request: NextRequest) {
  if (SOFT_HIDDEN_ROUTES.has(request.nextUrl.pathname) || request.nextUrl.pathname.startsWith('/experiments')) {
    const secret = internalAccessKey();
    const currentCookie = request.cookies.get(INTERNAL_COOKIE)?.value;
    const access = request.nextUrl.searchParams.get('access');
    const hasInternalAccess = Boolean(secret) && (currentCookie === secret || access === secret);

    if (!hasInternalAccess) {
      const url = externalUrl(request, '/');
      return NextResponse.redirect(url);
    }
  }

  const secret = internalAccessKey();
  if (!secret) {
    const host = request.headers.get('host') || '';
    const isLocal =
      host.includes('127.0.0.1') ||
      host.includes('localhost');

    if (isLocal) {
      return NextResponse.next();
    }

    return new NextResponse('LeadPulse internal access key missing.', {
      status: 503,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
      },
    });
  }

  const currentCookie = request.cookies.get(INTERNAL_COOKIE)?.value;
  if (currentCookie === secret) {
    return NextResponse.next();
  }

  const access = request.nextUrl.searchParams.get('access');
  if (access && access === secret) {
    const response = NextResponse.redirect(cleanRedirectUrl(request));
    response.cookies.set(INTERNAL_COOKIE, secret, {
      httpOnly: true,
      sameSite: 'lax',
      secure: secureCookie(request),
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  }

  const loginUrl = externalUrl(request, '/internal-login');
  const cleanUrl = cleanRedirectUrl(request);
  loginUrl.searchParams.set('next', `${cleanUrl.pathname}${cleanUrl.search}`);
  return NextResponse.rewrite(loginUrl);
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/ops',
    '/ops/:path*',
    '/platform',
    '/integrations',
    '/use-cases',
    '/compare',
    '/demo',
    '/security',
    '/proof',
    '/agents',
    '/cases',
    '/investors',
    '/experiments',
    '/experiments/:path*',
  ],
};
