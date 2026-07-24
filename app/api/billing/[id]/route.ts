import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Billing from '@/lib/models/Billing';
import { calculateBillingStatus, roundMoney } from '@/lib/billing-utils';
import { buildHospitalQuery, getRequestUser } from '../../_lib/request-auth';
import { jsonError, jsonOk } from '../../_lib/response';
import { syncConsultationBillingSnapshot, toAppBilling } from '../_helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const bill = await Billing.findOne(
      buildHospitalQuery(
        user,
        Types.ObjectId.isValid(id)
          ? { $or: [{ _id: id }, { consultationId: id }] }
          : { consultationId: id }
      )
    ).lean();
    if (!bill) {
      return NextResponse.json({ error: 'Billing record not found' }, { status: 404 });
    }

    if (user.role === 'doctor' && bill.doctorId !== user.doctorId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return jsonOk(toAppBilling(bill), { billing: toAppBilling(bill) });
  } catch (error) {
    console.error('Get billing detail error:', error);
    return jsonError('Failed to fetch billing record');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getRequestUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can update billing records' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid billing ID' }, { status: 400 });
    }

    const body = await request.json();
    const current = await Billing.findOne(buildHospitalQuery(user, { _id: id }));
    if (!current) {
      return NextResponse.json({ error: 'Billing record not found' }, { status: 404 });
    }

    const hmoAmountCovered = roundMoney(body.hmoAmountCovered ?? current.hmoAmountCovered ?? 0);
    const amountPaid = roundMoney(current.amountPaid || 0);
    const balance = roundMoney(Math.max((current.totalAmount || 0) - hmoAmountCovered - amountPaid, 0));
    const hmoOutstandingAmount = roundMoney(body.hmoOutstandingAmount ?? current.hmoOutstandingAmount ?? 0);
    const hmoClaimStatus = body.hmoClaimStatus ?? current.hmoClaimStatus ?? 'Not Applicable';
    const paymentStatus = body.paymentStatus || calculateBillingStatus({
      totalAmount: current.totalAmount || 0,
      amountPaid,
      hmoAmountCovered,
      hmoOutstandingAmount,
      hmoClaimStatus,
      currentStatus: current.paymentStatus,
    });

    const update = {
      hmoProvider: body.hmoProvider ?? current.hmoProvider,
      hmoPlan: body.hmoPlan ?? current.hmoPlan,
      hmoApprovalCode: body.hmoApprovalCode ?? current.hmoApprovalCode,
      hmoApprovalStatus: body.hmoApprovalStatus ?? current.hmoApprovalStatus,
      hmoAmountCovered,
      hmoPatientAmount: roundMoney(body.hmoPatientAmount ?? Math.max((current.totalAmount || 0) - hmoAmountCovered, 0)),
      hmoOutstandingAmount,
      hmoClaimSubmissionDate: body.hmoClaimSubmissionDate || null,
      hmoClaimPaymentDate: body.hmoClaimPaymentDate || null,
      hmoClaimStatus,
      paymentStatus,
      balance,
      notes: body.notes ?? current.notes,
    };

    const bill = await Billing.findOneAndUpdate(buildHospitalQuery(user, { _id: id }), update, {
      new: true,
      runValidators: true,
    }).lean();

    await syncConsultationBillingSnapshot(bill);

    return jsonOk(toAppBilling(bill), {
      message: 'Billing record updated successfully',
      billing: toAppBilling(bill),
    });
  } catch (error) {
    console.error('Update billing error:', error);
    return jsonError('Failed to update billing record', 400);
  }
}
