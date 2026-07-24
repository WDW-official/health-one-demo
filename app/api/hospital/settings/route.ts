import { NextRequest, NextResponse } from 'next/server';

import { connectDB } from '@/lib/mongodb';
import Hospital from '@/lib/models/Hospital';
import { getRequestUser, getUserHospitalId, isPlatformUser } from '@/app/api/_lib/request-auth';
import { normalizeClinicTypes } from '@/lib/clinic-config';

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

function isValidHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function clampLogoSize(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 48;
  return Math.min(Math.max(Math.round(numeric), 32), 96);
}

function isHospitalAccessBlocked(hospital: any) {
  return (
    !hospital ||
    hospital.isActive === false ||
    ['suspended', 'cancelled'].includes(String(hospital.subscriptionStatus))
  );
}

export async function GET(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hospitalId = getUserHospitalId(user);
    if (!hospitalId) {
      if (isPlatformUser(user)) {
        return NextResponse.json({ hospital: null });
      }

      return NextResponse.json({ error: 'Hospital context is required' }, { status: 400 });
    }

    await connectDB();

    const hospital = await Hospital.findById(hospitalId).lean();
    if (!hospital) {
      return NextResponse.json({ error: 'Hospital not found' }, { status: 404 });
    }

    if (isHospitalAccessBlocked(hospital)) {
      return NextResponse.json(
        { error: 'This hospital account is suspended. Contact Health One to restore access.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ hospital: serializeHospital(hospital) });
  } catch (error) {
    console.error('Fetch hospital settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch hospital settings' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hospitalId = getUserHospitalId(user);
    if (!hospitalId) {
      return NextResponse.json({ error: 'Hospital context is required' }, { status: 400 });
    }

    const body = await request.json();
    const brandColor = String(body.brandColor || '').trim();
    const branding = {
      logoSize: clampLogoSize(body.settings?.branding?.logoSize),
    };

    if (brandColor && !isValidHexColor(brandColor)) {
      return NextResponse.json({ error: 'Brand color must be a valid hex color' }, { status: 400 });
    }

    await connectDB();

    const update = {
      address: String(body.address || '').trim(),
      logoUrl: String(body.logoUrl || '').trim(),
      ...(brandColor ? { brandColor } : {}),
      'settings.branding': branding,
    };

    const hospital = await Hospital.findByIdAndUpdate(hospitalId, update, {
      new: true,
      runValidators: true,
    }).lean();

    if (!hospital) {
      return NextResponse.json({ error: 'Hospital not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Hospital settings updated',
      hospital: serializeHospital(hospital),
    });
  } catch (error) {
    console.error('Update hospital settings error:', error);
    return NextResponse.json({ error: 'Failed to update hospital settings' }, { status: 500 });
  }
}
