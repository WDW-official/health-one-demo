import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Patient from '@/lib/models/Patient';
import { jsonError, jsonOk } from '../../../_lib/response';

async function updatePatientImage(
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

    const patient = await Patient.findByIdAndUpdate(
      id,
      { profileImage: imageUrl },
      { new: true, runValidators: true }
    ).lean();

    if (!patient) {
      return jsonError('Patient not found', 404);
    }

    return jsonOk(patient, { message: 'Patient image updated successfully', patient });
  } catch (error) {
    console.error('Update patient image error:', error);
    return jsonError('Failed to update patient image');
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return updatePatientImage(request, params);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return updatePatientImage(request, params);
}
