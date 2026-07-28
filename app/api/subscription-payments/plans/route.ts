import { NextResponse } from 'next/server';

import { SUBSCRIPTION_PLANS } from '@/lib/subscription-plans';

export async function GET() {
  return NextResponse.json({ plans: SUBSCRIPTION_PLANS });
}
