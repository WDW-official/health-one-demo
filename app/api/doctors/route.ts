import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Doctor from '@/lib/models/Doctor';
import { hasSuperAdminAccess } from '../_lib/request-auth';
import { jsonCreated, jsonError, jsonOk } from '../_lib/response';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const rawLimit = parseInt(searchParams.get('limit') || '10', 10);
    const rawSkip = parseInt(searchParams.get('skip') || '0', 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 10;
    const skip = Number.isFinite(rawSkip) ? Math.max(rawSkip, 0) : 0;
    const search = searchParams.get('search')?.trim();
    const query: any = { isActive: true };

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { specialization: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
        { licenseNumber: { $regex: escaped, $options: 'i' } },
      ];
    }

    const doctors = await Doctor.find(query)
      .lean()
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Doctor.countDocuments(query);

    return jsonOk(doctors, { doctors, total, limit, skip });
  } catch (error) {
    console.error('Get doctors error:', error);
    return jsonError('Failed to fetch doctors');
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!hasSuperAdminAccess(request)) {
      return NextResponse.json({ error: 'Only superadmins can create doctors' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();

    // Validate required fields
    const required = ['name', 'email', 'phone', 'specialization', 'licenseNumber', 'yearsOfExperience'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Check if doctor exists
    const existing = await Doctor.findOne({
      $or: [{ email: body.email }, { licenseNumber: body.licenseNumber }],
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Doctor with this email or license already exists' },
        { status: 409 }
      );
    }

    const doctor = new Doctor(body);
    await doctor.save();

    return jsonCreated(doctor.toObject(), { message: 'Doctor created successfully', doctor: doctor.toObject() });
  } catch (error) {
    console.error('Create doctor error:', error);
    return jsonError('Failed to create doctor');
  }
}
