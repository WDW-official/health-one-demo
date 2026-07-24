import { NextRequest, NextResponse } from 'next/server';
import { RESERVED_TENANT_SLUGS } from '@/lib/tenant-routing';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const [, firstSegment, secondSegment, ...rest] = pathname.split('/');

  if (!firstSegment || RESERVED_TENANT_SLUGS.has(firstSegment)) {
    return NextResponse.next();
  }

  if (secondSegment === 'dashboard') {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/dashboard${rest.length ? `/${rest.join('/')}` : ''}`;

    const response = NextResponse.rewrite(rewriteUrl);
    response.headers.set('x-hospital-slug', firstSegment);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
