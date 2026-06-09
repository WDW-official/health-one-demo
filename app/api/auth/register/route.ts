import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { generateToken } from '@/lib/jwt';
import { getRequestUser } from '../../_lib/request-auth';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const existingUserCount = await User.countDocuments();
    const requester = getRequestUser(request);

    if (existingUserCount > 0 && !(requester?.role === 'admin' && requester.isSuperAdmin)) {
      return NextResponse.json(
        { error: 'Only superadmins can register users' },
        { status: 403 }
      );
    }

    const { email, password, name, role, doctorId, isSuperAdmin } = await request.json();

    // Validate inputs
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Email, password, name, and role are required' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['admin', 'doctor'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin or doctor' },
        { status: 400 }
      );
    }

    // If role is doctor, doctorId must be provided
    if (role === 'doctor' && !doctorId) {
      return NextResponse.json(
        { error: 'doctorId is required for doctor role' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Create new user
    const user = new User({
      email,
      password,
      name,
      role,
      doctorId: role === 'doctor' ? doctorId : null,
      isSuperAdmin: role === 'admin' ? existingUserCount === 0 || Boolean(isSuperAdmin) : false,
      mustChangePassword: existingUserCount > 0,
    });

    await user.save();

    // Generate token
    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      doctorId: user.doctorId,
      isSuperAdmin: user.isSuperAdmin,
    });

    return NextResponse.json(
      {
        message: 'User registered successfully',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          doctorId: user.doctorId,
          isSuperAdmin: user.isSuperAdmin,
          mustChangePassword: user.mustChangePassword,
        },
        token,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
