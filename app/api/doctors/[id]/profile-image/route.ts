import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Doctor from '@/lib/models/Doctor';
import { jsonError, jsonOk } from '../../../_lib/response';

async function updateDoctorImage(
  request: NextRequest,
  params: Promise<{ id: string }>
) {
  try {
    await connectDB();

    const { id } = await params;

    const { imageUrl } = await request.json();
    if (!imageUrl) {
      return jsonError('imageUrl is required', 400);
    }

    const doctor = await Doctor.findByIdAndUpdate(
      id,
      { profileImage: imageUrl },
      { new: true, runValidators: true }
    ).lean();

    if (!doctor) {
      return jsonError('Doctor not found', 404);
    }

    return jsonOk(doctor, { message: 'Doctor image updated successfully', doctor });
  } catch (error) {
    console.error('Update doctor image error:', error);
    return jsonError('Failed to update doctor image');
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return updateDoctorImage(request, params);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return updateDoctorImage(request, params);
}
