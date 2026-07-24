import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Hospital from '@/lib/models/Hospital';
import { verifyToken } from '@/lib/jwt';

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7);
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
    const token = getBearerToken(request);
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(payload.id).lean();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.isActive === false) {
      return NextResponse.json({ error: 'Account inactive' }, { status: 403 });
    }

    const activeHospitalId = request.headers.get('x-healthone-hospital-id');
    const hospitalId = activeHospitalId || user.hospitalId;
    if (hospitalId) {
      const hospital = await Hospital.findById(hospitalId).lean();
      if (isHospitalAccessBlocked(hospital)) {
        return NextResponse.json(
          { error: 'Hospital account suspended' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        role: user.role,
        doctorId: user.doctorId,
        hospitalId: user.hospitalId,
        hospitalSlug: user.hospitalSlug,
        isSuperAdmin: user.isSuperAdmin,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
