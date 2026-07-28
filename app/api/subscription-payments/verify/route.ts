import { NextRequest, NextResponse } from 'next/server';

import { getRequestUser, getUserHospitalId } from '@/app/api/_lib/request-auth';
import { connectDB } from '@/lib/mongodb';
import SubscriptionPayment from '@/lib/models/SubscriptionPayment';
import { verifyPaystackTransaction } from '@/lib/paystack';
import { applySubscriptionRenewal, markSubscriptionPaymentFailed } from '@/lib/subscription-renewal';

function serializePayment(payment: any) {
  return {
    id: String(payment._id),
    hospitalId: payment.hospitalId,
    hospitalName: payment.hospitalName,
    hospitalSlug: payment.hospitalSlug,
    planId: payment.planId,
    planName: payment.planName,
    durationDays: payment.durationDays,
    maxUsers: payment.maxUsers,
    features: payment.features || [],
    amount: payment.amount,
    currency: payment.currency,
    providerReference: payment.providerReference,
    status: payment.status,
    paidAt: payment.paidAt,
    renewalStartsAt: payment.renewalStartsAt,
    renewalEndsAt: payment.renewalEndsAt,
    createdAt: payment.createdAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reference = request.nextUrl.searchParams.get('reference')?.trim();
    if (!reference) {
      return NextResponse.json({ error: 'Payment reference is required' }, { status: 400 });
    }

    await connectDB();

    const payment = await SubscriptionPayment.findOne({ providerReference: reference });
    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    const hospitalId = getUserHospitalId(user);
    const canAccessPayment = user.isSuperAdmin || (hospitalId && hospitalId === payment.hospitalId);
    if (!canAccessPayment) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (payment.status === 'paid') {
      return NextResponse.json({ payment: serializePayment(payment), renewed: true });
    }

    const paystackData = await verifyPaystackTransaction(reference);
    const isSuccessful = paystackData.status === 'success';
    const isExpectedAmount = Number(paystackData.amount) === Number(payment.amountKobo);
    const isExpectedCurrency = String(paystackData.currency || '').toUpperCase() === payment.currency;

    if (!isSuccessful || !isExpectedAmount || !isExpectedCurrency) {
      if (['abandoned', 'failed', 'reversed'].includes(String(paystackData.status))) {
        await markSubscriptionPaymentFailed(reference, {
          paystackStatus: paystackData.status,
          paystackAmount: paystackData.amount,
          paystackCurrency: paystackData.currency,
        });
      }
      return NextResponse.json(
        { error: 'Payment was not successful or did not match the selected plan' },
        { status: 400 }
      );
    }

    const renewedPayment = await applySubscriptionRenewal(payment, paystackData);

    return NextResponse.json({
      message: 'Subscription renewed successfully',
      payment: serializePayment(renewedPayment),
      renewed: true,
    });
  } catch (error: any) {
    console.error('Verify subscription payment error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to verify subscription payment' },
      { status: 500 }
    );
  }
}
