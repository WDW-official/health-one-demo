import { NextRequest } from 'next/server';
import { verifyToken, type JWTPayload } from '@/lib/jwt';

export function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7);
}

export function getRequestUser(request: NextRequest): JWTPayload | null {
  const token = getBearerToken(request);
  return token ? verifyToken(token) : null;
}

export function hasSuperAdminAccess(request: NextRequest) {
  const user = getRequestUser(request);
  return Boolean(user?.role === 'admin' && user.isSuperAdmin);
}

export function getPagination(
  searchParams: URLSearchParams,
  defaultLimit = 10,
  maxLimit = 100
) {
  const rawLimit = parseInt(searchParams.get('limit') || `${defaultLimit}`, 10);
  const rawSkip = parseInt(searchParams.get('skip') || '0', 10);

  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), maxLimit)
    : defaultLimit;
  const skip = Number.isFinite(rawSkip) ? Math.max(rawSkip, 0) : 0;

  return { limit, skip };
}
