import { NextRequest, NextResponse } from 'next/server';

import { connectDB } from '@/lib/mongodb';
import SubscriptionPayment from '@/lib/models/SubscriptionPayment';
import { verifyPaystackWebhookSignature } from '@/lib/paystack';
import { applySubscriptionRenewal, markSubscriptionPaymentFailed } from '@/lib/subscription-renewal';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!verifyPaystackWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid Paystack signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const reference = String(event?.data?.reference || '').trim();
    if (!reference) {
      return NextResponse.json({ received: true });
    }

    await connectDB();

    const payment = await SubscriptionPayment.findOne({ providerReference: reference });
    if (!payment) {
      return NextResponse.json({ received: true });
    }

    const paystackData = event.data || {};
    const isExpectedAmount = Number(paystackData.amount) === Number(payment.amountKobo);
    const isExpectedCurrency = String(paystackData.currency || '').toUpperCase() === payment.currency;

    if (event.event === 'charge.success' && paystackData.status === 'success' && isExpectedAmount && isExpectedCurrency) {
      await applySubscriptionRenewal(payment, paystackData);
      return NextResponse.json({ received: true, renewed: true });
    }

    if (payment.status !== 'paid') {
      await markSubscriptionPaymentFailed(reference, {
        paystackEvent: event.event,
        paystackStatus: paystackData.status,
        paystackAmount: paystackData.amount,
        paystackCurrency: paystackData.currency,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Paystack webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
