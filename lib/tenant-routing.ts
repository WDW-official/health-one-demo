import type { User } from './types';

export const RESERVED_TENANT_SLUGS = new Set([
  'api',
  'dashboard',
  'login',
  'forgot-password',
  'reset-password',
  'platform',
  '_next',
  'favicon.ico',
]);

export function slugifyHospitalName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function getHospitalDashboardPath(user?: Pick<User, 'hospitalSlug' | 'isSuperAdmin'> | null) {
  if (user?.hospitalSlug && !RESERVED_TENANT_SLUGS.has(user.hospitalSlug)) {
    return `/${user.hospitalSlug}/dashboard`;
  }

  return '/dashboard';
}

export function withHospitalDashboardPath(
  href: string,
  user?: Pick<User, 'hospitalSlug' | 'isSuperAdmin'> | null
) {
  if (!href.startsWith('/dashboard')) return href;
  const dashboardPath = getHospitalDashboardPath(user);
  return href.replace('/dashboard', dashboardPath);
}
