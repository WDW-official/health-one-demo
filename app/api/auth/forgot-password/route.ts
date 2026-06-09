import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { sendClinicEmail } from '@/lib/email';
import User from '@/lib/models/User';
import { connectDB } from '@/lib/mongodb';

const RESET_TOKEN_EXPIRES_MS = 60 * 60 * 1000;

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getResetUrl(request: NextRequest, token: string) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  return `${origin}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { email } = await request.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return NextResponse.json(
        { message: 'If that email exists, a password reset link has been sent.' },
        { status: 200 }
      );
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = hashToken(resetToken);
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_EXPIRES_MS);
    await user.save();

    const resetUrl = getResetUrl(request, resetToken);

    await sendClinicEmail({
      to: user.email,
      subject: 'Reset your Health One password',
      text: `Use this link to reset your password. It expires in 1 hour: ${resetUrl}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
          <h1 style="font-size:20px">Reset your password</h1>
          <p>We received a request to reset your Health One password.</p>
          <p>
            <a href="${resetUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;padding:12px 18px;border-radius:8px;text-decoration:none">
              Reset password
            </a>
          </p>
          <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json(
      { message: 'If that email exists, a password reset link has been sent.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Unable to send reset email right now' },
      { status: 500 }
    );
  }
}
