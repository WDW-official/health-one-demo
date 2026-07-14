import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Billing from '@/lib/models/Billing';
import { getPagination, getRequestUser } from '../_lib/request-auth';
import { jsonError, jsonOk } from '../_lib/response';
import { toAppBilling } from './_helpers';

export async function GET(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const { limit, skip } = getPagination(searchParams, 50, 200);
    const query: any = {};

    const status = searchParams.get('status');
    const patientId = searchParams.get('patientId');
    const doctorId = searchParams.get('doctorId');
    const consultationId = searchParams.get('consultationId');
    const hmoProvider = searchParams.get('hmoProvider');
    const hmoClaimStatus = searchParams.get('hmoClaimStatus');

    if (status) query.paymentStatus = status;
    if (patientId) query.patientId = patientId;
    if (consultationId) query.consultationId = consultationId;
    if (hmoProvider) query.hmoProvider = hmoProvider;
    if (hmoClaimStatus) query.hmoClaimStatus = hmoClaimStatus;

    if (user.role === 'doctor') {
      query.doctorId = user.doctorId;
    } else if (doctorId) {
      query.doctorId = doctorId;
    }

    const [billing, total, receivables] = await Promise.all([
      Billing.find(query).lean().limit(limit).skip(skip).sort({ createdAt: -1 }),
      Billing.countDocuments(query),
      Billing.aggregate([
        {
          $match: {
            hmoProvider: { $nin: ['', null] },
            hmoOutstandingAmount: { $gt: 0 },
            hmoClaimStatus: { $ne: 'Paid' },
          },
        },
        {
          $group: {
            _id: '$hmoProvider',
            amount: { $sum: '$hmoOutstandingAmount' },
            bills: { $sum: 1 },
          },
        },
        { $sort: { amount: -1 } },
      ]),
    ]);

    const normalized = billing.map(toAppBilling);
    return jsonOk(normalized, {
      billing: normalized,
      total,
      limit,
      skip,
      hmoReceivables: receivables.map((item) => ({
        provider: item._id,
        amount: item.amount,
        bills: item.bills,
      })),
    });
  } catch (error) {
    console.error('Get billing error:', error);
    return jsonError('Failed to fetch billing records');
  }
}
