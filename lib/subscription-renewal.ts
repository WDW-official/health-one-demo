import Hospital from '@/lib/models/Hospital';
import SubscriptionPayment from '@/lib/models/SubscriptionPayment';
import { getPlanSettings } from '@/lib/plan-access';

const DAY_MS = 24 * 60 * 60 * 1000;

function getCurrentSubscriptionEnd(hospital: any) {
  const currentPeriodEndsAt = hospital?.currentPeriodEndsAt ? new Date(hospital.currentPeriodEndsAt) : null;
  const trialEndsAt = hospital?.trialEndsAt ? new Date(hospital.trialEndsAt) : null;

  const candidates = [currentPeriodEndsAt, trialEndsAt].filter(
    (date): date is Date => Boolean(date && Number.isFinite(date.getTime()))
  );

  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => b.getTime() - a.getTime())[0];
}

export async function applySubscriptionRenewal(payment: any, paystackData?: Record<string, any>) {
  if (!payment) {
    throw new Error('Payment record not found');
  }

  if (payment.status === 'paid' && payment.renewalEndsAt) {
    return payment;
  }

  const hospital = await Hospital.findById(payment.hospitalId);
  if (!hospital) {
    throw new Error('Hospital not found');
  }

  const now = new Date();
  const currentEnd = getCurrentSubscriptionEnd(hospital);
  const startsAt = currentEnd && currentEnd.getTime() > now.getTime() ? currentEnd : now;
  const endsAt = new Date(startsAt.getTime() + Number(payment.durationDays) * DAY_MS);
  const planId = payment.planId || 'clinic';
  const planSettings = getPlanSettings(planId);

  hospital.subscriptionStatus = 'active';
  hospital.subscriptionPlan = planId;
  hospital.trialEndsAt = null;
  hospital.currentPeriodEndsAt = endsAt;
  hospital.isActive = true;
  hospital.settings = {
    ...(hospital.settings || {}),
    planLimits: planSettings.planLimits,
    enabledFeatures: planSettings.enabledFeatures,
  };
  hospital.markModified('settings');
  await hospital.save();

  payment.status = 'paid';
  payment.providerTransactionId = String(paystackData?.id || payment.providerTransactionId || '');
  payment.paidAt = paystackData?.paid_at ? new Date(paystackData.paid_at) : payment.paidAt || now;
  payment.verifiedAt = now;
  payment.renewalStartsAt = startsAt;
  payment.renewalEndsAt = endsAt;
  payment.metadata = {
    ...(payment.metadata || {}),
    paystackChannel: paystackData?.channel || payment.metadata?.paystackChannel || '',
  };
  await payment.save();

  return payment;
}

export async function markSubscriptionPaymentFailed(reference: string, metadata: Record<string, unknown> = {}) {
  return SubscriptionPayment.findOneAndUpdate(
    { providerReference: reference, status: { $ne: 'paid' } },
    {
      status: 'failed',
      verifiedAt: new Date(),
      metadata,
    },
    { new: true }
  );
}
