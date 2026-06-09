import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';

import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getRequestUser } from '../../../_lib/request-auth';

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const requester = getRequestUser(request);

    if (!requester || requester.role !== 'admin' || !requester.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const body = (await request.json()) as { isActive?: boolean };

    if (typeof body.isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be true or false' }, { status: 400 });
    }

    if (requester.id === id && body.isActive === false) {
      return NextResponse.json(
        { error: 'You cannot deactivate your own account' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findByIdAndUpdate(
      id,
      { isActive: body.isActive },
      { new: true, runValidators: true }
    ).lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: body.isActive ? 'User activated' : 'User deactivated',
      user: serializeUser(user),
    });
  } catch (error) {
    console.error('Update user status error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
