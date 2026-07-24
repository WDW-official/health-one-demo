import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Patient from '@/lib/models/Patient';
import { jsonError, jsonOk } from '../../_lib/response';
import { buildHospitalQuery, getRequestUser } from '../../_lib/request-auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const user = getRequestUser(request);

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patients = await Patient.find(buildHospitalQuery(user, {
      isActive: true,
      $or: [
        { mrn: { $regex: escaped, $options: 'i' } },
        { firstName: { $regex: escaped, $options: 'i' } },
        { lastName: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
      ],
    }))
      .sort({ createdAt: -1 })
      .limit(20);

    return jsonOk(patients, { patients, count: patients.length });
  } catch (error) {
    console.error('Patient search error:', error);
    return jsonError('Search failed');
  }
}
