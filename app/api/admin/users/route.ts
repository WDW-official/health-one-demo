import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { verifyToken } from '@/lib/jwt';

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7);
}

function serializeUser(user: any) {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
    doctorId: user.doctorId,
    isSuperAdmin: user.isSuperAdmin,
    isActive: user.isActive !== false,
    mustChangePassword: Boolean(user.mustChangePassword),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request);
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== 'admin' || !payload.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const rawLimit = parseInt(searchParams.get('limit') || '10', 10);
    const rawSkip = parseInt(searchParams.get('skip') || '0', 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 10;
    const skip = Number.isFinite(rawSkip) ? Math.max(rawSkip, 0) : 0;
    const search = searchParams.get('search')?.trim();
    const query = search
      ? {
          $or: [
            { name: { $regex: escapeRegex(search), $options: 'i' } },
            { email: { $regex: escapeRegex(search), $options: 'i' } },
            { role: { $regex: escapeRegex(search), $options: 'i' } },
          ],
        }
      : {};

    const [users, total, activeTotal] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
      User.countDocuments({ ...query, isActive: { $ne: false } }),
    ]);

    const userTotal = await User.countDocuments();
    const activeUserTotal = await User.countDocuments({ isActive: { $ne: false } });

    return NextResponse.json({
      users: users.map(serializeUser),
      total,
      activeTotal,
      userTotal,
      activeUserTotal,
      limit,
      skip,
    });
  } catch (error) {
    console.error('List users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request);
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== 'admin' || !payload.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = (await request.json()) as {
      email?: string;
      password?: string;
      name?: string;
      role?: 'admin' | 'doctor';
      doctorId?: string;
      isSuperAdmin?: boolean;
    };

    const { email, password, name, role, doctorId, isSuperAdmin } = body;

    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Email, password, name, and role are required' },
        { status: 400 }
      );
    }

    if (!['admin', 'doctor'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin or doctor' },
        { status: 400 }
      );
    }

    if (role === 'doctor' && !doctorId) {
      return NextResponse.json(
        { error: 'doctorId is required for doctor users' },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email: String(email).toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const user = new User({
      email,
      password,
      name,
      role,
      doctorId: role === 'doctor' ? doctorId : null,
      isSuperAdmin: role === 'admin' ? Boolean(isSuperAdmin) : false,
      mustChangePassword: true,
    });

    await user.save();

    return NextResponse.json(
      {
        message: 'User created successfully',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          doctorId: user.doctorId,
          isSuperAdmin: user.isSuperAdmin,
          isActive: user.isActive,
          mustChangePassword: user.mustChangePassword,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
