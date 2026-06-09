import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import CheckIn from '@/lib/models/CheckIn';
import { jsonError, jsonOk } from '../../_lib/response';
import { getRequestUser } from '../../_lib/request-auth';
import { getApiErrorMessage } from '../../_lib/error-message';

function normalizeCheckIn(doc: any) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...plain,
    id: plain.id || String(plain._id),
  };
}

export async function PATCH(
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
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid check-in ID' }, { status: 400 });
    }

    const body = await request.json();
    const updates: any = {};

    if (body.status) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes;

    const existing = await CheckIn.findById(id).lean();
    if (!existing) {
      return NextResponse.json({ error: 'Check-in not found' }, { status: 404 });
    }

    if (user.role === 'doctor' && user.doctorId && existing.doctorId !== user.doctorId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const checkIn = await CheckIn.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).lean();

    const normalized = normalizeCheckIn(checkIn);
    return jsonOk(normalized, { message: 'Check-in updated successfully', checkIn: normalized });
  } catch (error) {
    console.error('Update check-in error:', error);
    return jsonError(getApiErrorMessage(error, 'Failed to update check-in'), 400);
  }
}
