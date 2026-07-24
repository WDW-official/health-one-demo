import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Billing from '@/lib/models/Billing';
import { buildReceiptNumber, calculateBillingStatus, roundMoney } from '@/lib/billing-utils';
import { buildHospitalQuery, getRequestUser } from '../../../_lib/request-auth';
import { jsonError, jsonOk } from '../../../_lib/response';
import { syncConsultationBillingSnapshot, toAppBilling } from '../../_helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getRequestUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can record payments' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid billing ID' }, { status: 400 });
    }

    const body = await request.json();
    const amountPaid = roundMoney(Number(body.amountPaid) || 0);
    if (amountPaid <= 0) {
      return NextResponse.json({ error: 'Amount paid must be greater than zero' }, { status: 400 });
    }
    if (!body.paymentMethod) {
      return NextResponse.json({ error: 'Payment method is required' }, { status: 400 });
    }

    const bill = await Billing.findOne(buildHospitalQuery(user, { _id: id }));
    if (!bill) {
      return NextResponse.json({ error: 'Billing record not found' }, { status: 404 });
    }

    const receiptNumber = buildReceiptNumber(bill.invoiceNumber, bill.payments.length);
    bill.payments.push({
      amountPaid,
      paymentMethod: body.paymentMethod,
      paymentReference: body.paymentReference || '',
      receiptNumber,
      recordedByUserId: user.id,
      recordedByName: user.name,
      paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
      notes: body.notes || '',
    });

    bill.amountPaid = roundMoney(
      bill.payments.reduce((sum: number, payment: any) => sum + (Number(payment.amountPaid) || 0), 0)
    );
    bill.balance = roundMoney(Math.max((bill.totalAmount || 0) - (bill.hmoAmountCovered || 0) - bill.amountPaid, 0));
    bill.hmoPatientAmount = roundMoney(Math.max((bill.totalAmount || 0) - (bill.hmoAmountCovered || 0), 0));
    bill.paymentStatus = calculateBillingStatus({
      totalAmount: bill.totalAmount || 0,
      amountPaid: bill.amountPaid,
      hmoAmountCovered: bill.hmoAmountCovered || 0,
      hmoOutstandingAmount: bill.hmoOutstandingAmount || 0,
      hmoClaimStatus: bill.hmoClaimStatus || 'Not Applicable',
      currentStatus: bill.paymentStatus,
    });

    await bill.save();
    await syncConsultationBillingSnapshot(bill);

    return jsonOk(toAppBilling(bill), {
      message: 'Payment recorded successfully',
      billing: toAppBilling(bill),
      receiptNumber,
    });
  } catch (error) {
    console.error('Record payment error:', error);
    return jsonError('Failed to record payment', 400);
  }
}
