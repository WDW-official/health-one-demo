import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Hospital from '@/lib/models/Hospital';
import User from '@/lib/models/User';
import { getPagination, hasSuperAdminAccess } from '@/app/api/_lib/request-auth';
import { jsonCreated, jsonOk } from '@/app/api/_lib/response';
import { normalizeClinicTypes } from '@/lib/clinic-config';
import { getPlanSettings } from '@/lib/plan-access';
import { buildSubscriptionLifecycleUpdate } from '@/lib/subscription-lifecycle';
import { RESERVED_TENANT_SLUGS, slugifyHospitalName } from '@/lib/tenant-routing';
import SubscriptionPayment from '@/lib/models/SubscriptionPayment';
import { getSubscriptionPlan } from '@/lib/subscription-plans';

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

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

function resolveSubscriptionDates(body: any) {
  const trialDays = parseDurationDays(body.trialDays);
  const subscriptionDays = parseDurationDays(body.subscriptionDays);
  const status = String(body.subscriptionStatus || 'trial');

  return {
    trialEndsAt:
      body.trialEndsAt !== undefined
        ? body.trialEndsAt || null
        : status === 'trial' && trialDays
          ? addDays(trialDays)
          : null,
    currentPeriodEndsAt:
      body.currentPeriodEndsAt !== undefined
        ? body.currentPeriodEndsAt || null
        : status === 'active' && subscriptionDays
          ? addDays(subscriptionDays)
          : null,
  };
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

export async function GET(request: NextRequest) {
  try {
    if (!hasSuperAdminAccess(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const { limit, skip } = getPagination(searchParams, 10, 100);
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status')?.trim();
    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { name: { $regex: escapeRegex(search), $options: 'i' } },
        { slug: { $regex: escapeRegex(search), $options: 'i' } },
        { email: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    if (status && status !== 'all') {
      query.subscriptionStatus = status;
    }

    const [hospitals, total, activeTotal] = await Promise.all([
      Hospital.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Hospital.countDocuments(query),
      Hospital.countDocuments({ ...query, isActive: { $ne: false } }),
    ]);
    const reconciledHospitals = await Promise.all(hospitals.map(reconcileHospitalSubscription));
    const serializedHospitals = reconciledHospitals
      .filter(Boolean)
      .map(serializeHospital);

    return jsonOk(serializedHospitals, {
      hospitals: serializedHospitals,
      total,
      activeTotal,
      limit,
      skip,
    });
  } catch (error) {
    console.error('List hospitals error:', error);
    return NextResponse.json({ error: 'Failed to fetch hospitals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!hasSuperAdminAccess(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const name = String(body.name || '').trim();
    const slug = slugifyHospitalName(String(body.slug || name));

    if (!name || !slug) {
      return NextResponse.json({ error: 'Hospital name is required' }, { status: 400 });
    }

    if (RESERVED_TENANT_SLUGS.has(slug)) {
      return NextResponse.json({ error: 'This hospital URL name is reserved' }, { status: 400 });
    }

    const existingHospital = await Hospital.findOne({ slug });
    if (existingHospital) {
      return NextResponse.json({ error: 'Hospital URL name already exists' }, { status: 409 });
    }

    const subscriptionDates = resolveSubscriptionDates(body);
    const subscriptionPlan = String(body.subscriptionPlan || 'clinic').trim();
    const planSettings = getPlanSettings(subscriptionPlan);

    const hospital = new Hospital({
      name,
      slug,
      clinicTypes: normalizeClinicTypes(body.clinicTypes),
      email: body.email || '',
      phone: body.phone || '',
      address: body.address || '',
      logoUrl: body.logoUrl || '',
      brandColor: body.brandColor || '#275cc2',
      subscriptionPlan,
      subscriptionStatus: body.subscriptionStatus || 'trial',
      trialEndsAt: subscriptionDates.trialEndsAt,
      currentPeriodEndsAt: subscriptionDates.currentPeriodEndsAt,
      settings: {
        ...(body.settings || {}),
        planLimits: planSettings.planLimits,
        enabledFeatures: planSettings.enabledFeatures,
      },
    });

    await hospital.save();

    if (hospital.subscriptionStatus === 'active' && subscriptionDates.currentPeriodEndsAt) {
      const plan = getSubscriptionPlan(subscriptionPlan);
      const now = new Date();

      await SubscriptionPayment.create({
        hospitalId: String(hospital._id),
        hospitalName: hospital.name,
        hospitalSlug: hospital.slug,
        planId: plan?.id || subscriptionPlan,
        planName: plan?.name || subscriptionPlan,
        durationDays: parseDurationDays(body.subscriptionDays) || plan?.durationDays || 30,
        maxUsers: plan?.maxUsers || 0,
        features: plan?.features || [],
        amount: plan?.amount || 0,
        amountKobo: plan?.amountKobo || 0,
        currency: plan?.currency || 'NGN',
        paymentProvider: 'manual',
        providerReference: createManualReference(String(hospital._id)),
        providerTransactionId: 'manual',
        status: 'paid',
        paidAt: now,
        verifiedAt: now,
        renewalStartsAt: now,
        renewalEndsAt: subscriptionDates.currentPeriodEndsAt,
        metadata: {
          manualRenewal: true,
          createdDuringOnboarding: true,
        },
      });
    }

    let adminUser = null;
    if (body.adminEmail && body.adminPassword && body.adminName) {
      const existingUser = await User.findOne({ email: String(body.adminEmail).toLowerCase() });
      if (existingUser) {
        return NextResponse.json(
          { error: 'Hospital created, but admin email already exists', hospital: serializeHospital(hospital) },
          { status: 409 }
        );
      }

      adminUser = new User({
        email: body.adminEmail,
        password: body.adminPassword,
        name: body.adminName,
        role: 'admin',
        hospitalId: String(hospital._id),
        hospitalSlug: hospital.slug,
        isSuperAdmin: false,
        mustChangePassword: true,
      });
      await adminUser.save();
    }

    return jsonCreated(serializeHospital(hospital), {
      hospital: serializeHospital(hospital),
      adminUser: adminUser
        ? {
            id: String(adminUser._id),
            email: adminUser.email,
            name: adminUser.name,
            role: adminUser.role,
            hospitalId: adminUser.hospitalId,
            hospitalSlug: adminUser.hospitalSlug,
          }
        : null,
    });
  } catch (error) {
    console.error('Create hospital error:', error);
    return NextResponse.json({ error: 'Failed to create hospital' }, { status: 500 });
  }
}
