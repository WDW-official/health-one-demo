import { NextRequest, NextResponse } from 'next/server';

import { getPagination, hasSuperAdminAccess } from '@/app/api/_lib/request-auth';
import { connectDB } from '@/lib/mongodb';
import SubscriptionPayment from '@/lib/models/SubscriptionPayment';

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
    amountKobo: payment.amountKobo,
    currency: payment.currency,
    paymentProvider: payment.paymentProvider,
    providerReference: payment.providerReference,
    providerTransactionId: payment.providerTransactionId,
    status: payment.status,
    paidAt: payment.paidAt,
    renewalStartsAt: payment.renewalStartsAt,
    renewalEndsAt: payment.renewalEndsAt,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    if (!hasSuperAdminAccess(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const { limit, skip } = getPagination(searchParams, 20, 100);
    const status = searchParams.get('status')?.trim();
    const paymentProvider = searchParams.get('paymentProvider')?.trim();
    const hospitalId = searchParams.get('hospitalId')?.trim();
    const search = searchParams.get('search')?.trim();
    const query: Record<string, unknown> = {};
    const andConditions: Record<string, unknown>[] = [];

    if (status && status !== 'all') {
      query.status = status;
    }

    if (paymentProvider === 'paystack') {
      andConditions.push({
        $or: [
          { paymentProvider: 'paystack' },
          { paymentProvider: { $exists: false } },
          { paymentProvider: '' },
        ],
      });
    } else if (paymentProvider && paymentProvider !== 'all') {
      query.paymentProvider = paymentProvider;
    }

    if (hospitalId && hospitalId !== 'all') {
      query.hospitalId = hospitalId;
    }

    if (search) {
      andConditions.push({
        $or: [
        { hospitalName: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
        { hospitalSlug: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
        { providerReference: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
        { paymentProvider: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
        ],
      });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    const [payments, total] = await Promise.all([
      SubscriptionPayment.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      SubscriptionPayment.countDocuments(query),
    ]);

    return NextResponse.json({
      payments: payments.map(serializePayment),
      data: payments.map(serializePayment),
      total,
      limit,
      skip,
    });
  } catch (error) {
    console.error('List subscription payments error:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription payments' }, { status: 500 });
  }
}
