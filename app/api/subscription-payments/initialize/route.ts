import { NextRequest, NextResponse } from 'next/server';

import { getRequestUser, getUserHospitalId } from '@/app/api/_lib/request-auth';
import { connectDB } from '@/lib/mongodb';
import Hospital from '@/lib/models/Hospital';
import SubscriptionPayment from '@/lib/models/SubscriptionPayment';
import { createPaystackReference, initializePaystackTransaction } from '@/lib/paystack';
import { getSubscriptionPlan } from '@/lib/subscription-plans';

function getAppUrl(request: NextRequest) {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    request.nextUrl.origin
  ).replace(/\/$/, '');
}

export async function POST(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hospitalId = getUserHospitalId(user);
    if (!hospitalId) {
      return NextResponse.json({ error: 'Hospital context is required' }, { status: 400 });
    }

    const body = await request.json();
    const plan = getSubscriptionPlan(String(body.planId || ''));
    if (!plan) {
      return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 });
    }

    await connectDB();

    const hospital = await Hospital.findById(hospitalId).lean();
    if (!hospital) {
      return NextResponse.json({ error: 'Hospital not found' }, { status: 404 });
    }

    const email = String(hospital.email || user.email || '').trim().toLowerCase();
    if (!email) {
      return NextResponse.json(
        { error: 'Hospital email is required before Paystack payment can be initialized' },
        { status: 400 }
      );
    }

    const reference = createPaystackReference(String(hospital._id));
    const callbackUrl = `${getAppUrl(request)}/${hospital.slug}/dashboard/settings/billing?reference=${reference}`;

    const payment = await SubscriptionPayment.create({
      hospitalId: String(hospital._id),
      hospitalName: hospital.name,
      hospitalSlug: hospital.slug,
      planId: plan.id,
      planName: plan.name,
      durationDays: plan.durationDays,
      maxUsers: plan.maxUsers,
      features: plan.features,
      amount: plan.amount,
      amountKobo: plan.amountKobo,
      currency: plan.currency,
      paymentProvider: 'paystack',
      providerReference: reference,
      status: 'pending',
      metadata: {
        initializedByUserId: user.id,
        initializedByName: user.name,
      },
    });

    const initialized = await initializePaystackTransaction({
      email,
      amount: plan.amountKobo,
      currency: plan.currency,
      reference,
      callback_url: callbackUrl,
      metadata: {
        paymentId: String(payment._id),
        hospitalId: String(hospital._id),
        hospitalSlug: hospital.slug,
        planId: plan.id,
        maxUsers: plan.maxUsers,
        features: plan.features,
        durationDays: plan.durationDays,
      },
    });

    payment.authorizationUrl = initialized.authorization_url;
    payment.accessCode = initialized.access_code;
    await payment.save();

    return NextResponse.json({
      payment: {
        id: String(payment._id),
        reference,
        amount: plan.amount,
        currency: plan.currency,
        durationDays: plan.durationDays,
        maxUsers: plan.maxUsers,
        features: plan.features,
        status: payment.status,
      },
      authorizationUrl: initialized.authorization_url,
      accessCode: initialized.access_code,
      reference,
    });
  } catch (error: any) {
    console.error('Initialize subscription payment error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to initialize subscription payment' },
      { status: 500 }
    );
  }
}
