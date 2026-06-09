import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { generateToken } from '@/lib/jwt';

const RESET_TOKEN_EXPIRES_MS = 60 * 60 * 1000;

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (user.isActive === false) {
      return NextResponse.json(
        { error: 'This account is inactive. Contact your superadmin.' },
        { status: 403 }
      );
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (user.mustChangePassword) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = hashToken(resetToken);
      user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_EXPIRES_MS);
      await user.save();

      return NextResponse.json(
        {
          message: 'Password reset required',
          passwordResetRequired: true,
          resetToken,
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
        { status: 200 }
      );
    }

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
        message: 'Login successful',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          doctorId: user.doctorId,
          isSuperAdmin: user.isSuperAdmin,
          isActive: user.isActive,
        },
        token,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
