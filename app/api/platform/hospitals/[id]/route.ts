import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';

import { getRequestUser } from '@/app/api/_lib/request-auth';
import { normalizeClinicTypes } from '@/lib/clinic-config';
import { connectDB } from '@/lib/mongodb';
import Hospital from '@/lib/models/Hospital';

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

function isValidStatus(value: unknown) {
  return ['trial', 'active', 'past_due', 'suspended', 'cancelled'].includes(String(value));
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
      update.subscriptionPlan = String(body.subscriptionPlan || 'trial').trim();
    }

    if (body.subscriptionStatus !== undefined) {
      if (!isValidStatus(nextStatus)) {
        return NextResponse.json({ error: 'Invalid subscription status' }, { status: 400 });
      }
      update.subscriptionStatus = nextStatus;
      if (body.subscriptionPlan === undefined) {
        update.subscriptionPlan = nextStatus;
      }
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

    const hospital = await Hospital.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).lean();

    if (!hospital) {
      return NextResponse.json({ error: 'Hospital not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Hospital subscription updated',
      hospital: serializeHospital(hospital),
    });
  } catch (error) {
    console.error('Update hospital subscription error:', error);
    return NextResponse.json({ error: 'Failed to update hospital subscription' }, { status: 500 });
  }
}
