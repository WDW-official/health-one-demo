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
  const payload = token ? verifyToken(token) : null;
  if (!payload) return null;

  const activeHospitalId = request.headers.get('x-healthone-hospital-id');
  const activeHospitalSlug = request.headers.get('x-healthone-hospital-slug');

  if (isPlatformUser(payload) && activeHospitalId) {
    return {
      ...payload,
      activeHospitalId,
      activeHospitalSlug: activeHospitalSlug || null,
    };
  }

  return payload;
}

export function hasSuperAdminAccess(request: NextRequest) {
  const user = getRequestUser(request);
  return Boolean(user?.role === 'admin' && user.isSuperAdmin);
}

export function isPlatformUser(user: JWTPayload | null | undefined) {
  return Boolean(user?.role === 'admin' && user.isSuperAdmin);
}

export function getUserHospitalId(user: JWTPayload | null | undefined) {
  return user?.activeHospitalId || user?.hospitalId || null;
}

export function buildHospitalQuery<T extends Record<string, unknown>>(
  user: JWTPayload | null | undefined,
  query: T = {} as T
): T & { hospitalId?: string | null } {
  if (isPlatformUser(user) && !user?.activeHospitalId) {
    return {
      ...query,
      hospitalId: null,
    };
  }

  const hospitalId = getUserHospitalId(user);
  return {
    ...query,
    hospitalId,
  };
}

export function withHospitalId<T extends Record<string, unknown>>(
  user: JWTPayload | null | undefined,
  data: T
): T & { hospitalId?: string | null } {
  if (isPlatformUser(user) && !user?.activeHospitalId) {
    return {
      ...data,
      hospitalId: null,
    };
  }

  return {
    ...data,
    hospitalId: getUserHospitalId(user),
  };
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
