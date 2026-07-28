import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';

import { getRequestUser } from '@/app/api/_lib/request-auth';
import { normalizeClinicTypes } from '@/lib/clinic-config';
import { connectDB } from '@/lib/mongodb';
import Hospital from '@/lib/models/Hospital';
import SubscriptionPayment from '@/lib/models/SubscriptionPayment';
import { getPlanSettings } from '@/lib/plan-access';
import { getSubscriptionPlan } from '@/lib/subscription-plans';
import { buildSubscriptionLifecycleUpdate } from '@/lib/subscription-lifecycle';

function serializeHospital(hospital: any) {
  return {
    id: String(hospital._id),
    name: hospital.name,
    slug: hospital.slug,
    clinicTypes: normalizeClinicTypes(hospital.clinicTypes),
    email: hospital.email,
    phone: hospital.phone,
    address: hospital.address,
    logoUrl: hospital.logoUrl,
    brandColor: hospital.brandColor,
    subscriptionPlan: hospital.subscriptionPlan,
    subscriptionStatus: hospital.subscriptionStatus,
    trialEndsAt: hospital.trialEndsAt,
    currentPeriodEndsAt: hospital.currentPeriodEndsAt,
    isActive: hospital.isActive !== false,
    settings: hospital.settings || {},
    createdAt: hospital.createdAt,
    updatedAt: hospital.updatedAt,
  };
}

function parseDurationDays(value: unknown) {
  const days = Number(value);
  if (!Number.isFinite(days) || days <= 0) return null;
  return Math.min(Math.round(days), 3650);
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function createManualReference(hospitalId: string) {
  return `manual-${hospitalId}-${Date.now()}`;
}

function isValidStatus(value: unknown) {
  return ['trial', 'active', 'past_due', 'suspended', 'cancelled'].includes(String(value));
}

async function reconcileHospitalSubscription(hospital: any) {
  if (!hospital) return hospital;
  const lifecycleUpdate = buildSubscriptionLifecycleUpdate(hospital);
  if (!lifecycleUpdate) return hospital;

  return Hospital.findByIdAndUpdate(hospital._id, lifecycleUpdate, {
    new: true,
    runValidators: true,
  }).lean();
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getRequestUser(request);
    if (!user || user.role !== 'admin' || !user.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid hospital ID' }, { status: 400 });
    }

    const body = await request.json();
    const update: Record<string, unknown> = {};
    const nextStatus =
      body.subscriptionStatus !== undefined ? String(body.subscriptionStatus) : undefined;

    if (body.subscriptionPlan !== undefined) {
      const planId = String(body.subscriptionPlan || 'clinic').trim();
      const planSettings = getPlanSettings(planId);
      update.subscriptionPlan = planId;
      update['settings.planLimits'] = planSettings.planLimits;
      update['settings.enabledFeatures'] = planSettings.enabledFeatures;
    }

    if (body.subscriptionStatus !== undefined) {
      if (!isValidStatus(nextStatus)) {
        return NextResponse.json({ error: 'Invalid subscription status' }, { status: 400 });
      }
      update.subscriptionStatus = nextStatus;
    }

    if (body.clinicTypes !== undefined) {
      update.clinicTypes = normalizeClinicTypes(body.clinicTypes);
    }

    if (body.trialEndsAt !== undefined) {
      update.trialEndsAt = body.trialEndsAt || null;
    }

    if (body.currentPeriodEndsAt !== undefined) {
      update.currentPeriodEndsAt = body.currentPeriodEndsAt || null;
    }

    const trialDays = parseDurationDays(body.trialDays);
    const subscriptionDays = parseDurationDays(body.subscriptionDays);

    if (nextStatus === 'trial') {
      update.currentPeriodEndsAt = null;
    }

    if (nextStatus === 'active') {
      update.trialEndsAt = null;
    }

    if (nextStatus === 'trial' && trialDays) {
      update.trialEndsAt = addDays(trialDays);
    }

    if (nextStatus === 'active' && subscriptionDays) {
      update.currentPeriodEndsAt = addDays(subscriptionDays);
    }

    await connectDB();

    const previousHospital = await Hospital.findById(id).lean();
    if (!previousHospital) {
      return NextResponse.json({ error: 'Hospital not found' }, { status: 404 });
    }

    const hospital = await Hospital.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).lean();

    if (!hospital) {
      return NextResponse.json({ error: 'Hospital not found' }, { status: 404 });
    }
    const reconciledHospital = await reconcileHospitalSubscription(hospital);

    if (nextStatus === 'active' && subscriptionDays && reconciledHospital) {
      const plan = getSubscriptionPlan(String(reconciledHospital.subscriptionPlan || 'clinic'));
      const now = new Date();
      const previousExpiry = previousHospital.currentPeriodEndsAt
        ? new Date(previousHospital.currentPeriodEndsAt)
        : null;
      const renewalStartsAt =
        previousExpiry && Number.isFinite(previousExpiry.getTime()) && previousExpiry.getTime() > now.getTime()
          ? previousExpiry
          : now;
      const renewalEndsAt = reconciledHospital.currentPeriodEndsAt || addDays(subscriptionDays);

      await SubscriptionPayment.create({
        hospitalId: String(reconciledHospital._id),
        hospitalName: reconciledHospital.name,
        hospitalSlug: reconciledHospital.slug,
        planId: plan?.id || String(reconciledHospital.subscriptionPlan || 'clinic'),
        planName: plan?.name || String(reconciledHospital.subscriptionPlan || 'Clinic'),
        durationDays: subscriptionDays,
        maxUsers: plan?.maxUsers || 0,
        features: plan?.features || [],
        amount: plan?.amount || 0,
        amountKobo: plan?.amountKobo || 0,
        currency: plan?.currency || 'NGN',
        paymentProvider: 'manual',
        providerReference: createManualReference(String(reconciledHospital._id)),
        providerTransactionId: 'manual',
        status: 'paid',
        paidAt: now,
        verifiedAt: now,
        renewalStartsAt,
        renewalEndsAt,
        metadata: {
          manualRenewal: true,
          updatedByUserId: user.id,
          updatedByName: user.name,
          previousStatus: previousHospital.subscriptionStatus,
          previousPlan: previousHospital.subscriptionPlan,
        },
      });
    }

    return NextResponse.json({
      message: 'Hospital subscription updated',
      hospital: serializeHospital(reconciledHospital),
    });
  } catch (error) {
    console.error('Update hospital subscription error:', error);
    return NextResponse.json({ error: 'Failed to update hospital subscription' }, { status: 500 });
  }
}
