import type { HospitalSubscriptionStatus } from './types';

export const SUBSCRIPTION_GRACE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

type SubscriptionRecord = {
  subscriptionStatus?: HospitalSubscriptionStatus | string | null;
  trialEndsAt?: Date | string | null;
  currentPeriodEndsAt?: Date | string | null;
  isActive?: boolean | null;
};

function toDate(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function getSubscriptionExpiry(record: SubscriptionRecord) {
  if (record.subscriptionStatus === 'trial') return toDate(record.trialEndsAt);
  if (record.subscriptionStatus === 'active') return toDate(record.currentPeriodEndsAt);
  return toDate(record.currentPeriodEndsAt) || toDate(record.trialEndsAt);
}

export function getSubscriptionLifecycle(record: SubscriptionRecord, now = new Date()) {
  const storedStatus = String(record.subscriptionStatus || 'trial') as HospitalSubscriptionStatus;
  const expiry = getSubscriptionExpiry(record);

  if (record.isActive === false || storedStatus === 'cancelled') {
    return {
      status: storedStatus,
      expiry,
      daysUntilExpiry: null,
      daysPastExpiry: null,
      graceDaysRemaining: null,
      shouldBlockAccess: true,
    };
  }

  if (storedStatus === 'suspended') {
    return {
      status: 'suspended' as HospitalSubscriptionStatus,
      expiry,
      daysUntilExpiry: null,
      daysPastExpiry: null,
      graceDaysRemaining: null,
      shouldBlockAccess: true,
    };
  }

  if (!expiry) {
    return {
      status: storedStatus,
      expiry,
      daysUntilExpiry: null,
      daysPastExpiry: null,
      graceDaysRemaining: null,
      shouldBlockAccess: false,
    };
  }

  const diffMs = expiry.getTime() - now.getTime();
  const graceEndsAt = new Date(expiry.getTime() + SUBSCRIPTION_GRACE_DAYS * DAY_MS);
  const graceDiffMs = graceEndsAt.getTime() - now.getTime();
  const isExpired = diffMs < 0;
  const isGraceOver = graceDiffMs < 0;
  const status = isGraceOver
    ? 'suspended'
    : isExpired
      ? 'past_due'
      : storedStatus;

  return {
    status: status as HospitalSubscriptionStatus,
    expiry,
    daysUntilExpiry: Math.ceil(diffMs / DAY_MS),
    daysPastExpiry: isExpired ? Math.ceil(Math.abs(diffMs) / DAY_MS) : 0,
    graceDaysRemaining: isExpired ? Math.max(0, Math.ceil(graceDiffMs / DAY_MS)) : null,
    shouldBlockAccess: status === 'suspended',
  };
}

export function buildSubscriptionLifecycleUpdate(record: SubscriptionRecord) {
  const lifecycle = getSubscriptionLifecycle(record);
  const currentStatus = String(record.subscriptionStatus || 'trial');

  if (lifecycle.status === currentStatus) return null;
  if (!['past_due', 'suspended', 'active'].includes(lifecycle.status)) return null;

  return {
    subscriptionStatus: lifecycle.status,
    subscriptionPlan: lifecycle.status,
  };
}
