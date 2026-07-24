import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Doctor from '@/lib/models/Doctor';
import { buildHospitalQuery, getPagination, getRequestUser, withHospitalId } from '../_lib/request-auth';
import { jsonCreated, jsonError, jsonOk } from '../_lib/response';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const { limit, skip } = getPagination(searchParams, 10, 100);
    const search = searchParams.get('search')?.trim();
    const user = getRequestUser(request);
    const query: any = buildHospitalQuery(user, { isActive: true });

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
    const user = getRequestUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can create doctors' }, { status: 403 });
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
    const existing = await Doctor.findOne(buildHospitalQuery(user, {
      $or: [{ email: body.email }, { licenseNumber: body.licenseNumber }],
    }));

    if (existing) {
      return NextResponse.json(
        { error: 'Doctor with this email or license already exists' },
        { status: 409 }
      );
    }

    const doctor = new Doctor(withHospitalId(user, body));
    await doctor.save();

    return jsonCreated(doctor.toObject(), { message: 'Doctor created successfully', doctor: doctor.toObject() });
  } catch (error) {
    console.error('Create doctor error:', error);
    return jsonError('Failed to create doctor');
  }
}
