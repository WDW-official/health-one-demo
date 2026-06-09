import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import User from '@/lib/models/User';
import { connectDB } from '@/lib/mongodb';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { token, password } = await request.json();
    const resetToken = String(token || '').trim();
    const nextPassword = String(password || '');

    if (!resetToken || !nextPassword) {
      return NextResponse.json(
        { error: 'Reset token and new password are required' },
        { status: 400 }
      );
    }

    if (nextPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const user = await User.findOne({
      resetPasswordToken: hashToken(resetToken),
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpires +password');

    if (!user) {
      return NextResponse.json(
        { error: 'Reset link is invalid or has expired' },
        { status: 400 }
      );
    }

    user.password = nextPassword;
    user.mustChangePassword = false;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return NextResponse.json(
      { message: 'Password reset successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Unable to reset password right now' },
      { status: 500 }
    );
  }
}
