import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Consultation from '@/lib/models/Consultation';
import { jsonError, jsonOk } from '../../../_lib/response';
import { buildHospitalQuery, getPagination, getRequestUser } from '../../../_lib/request-auth';

function toAppConsultation(doc: any) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...plain,
    prescription: plain.prescription ?? plain.prescriptions ?? '',
    prescriptions: plain.prescriptions ?? plain.prescription ?? '',
    nextVisitDate: plain.nextVisitDate ?? plain.followUpDate ?? null,
    followUpDate: plain.followUpDate ?? plain.nextVisitDate ?? null,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ doctorId: string }> }
) {
  try {
    await connectDB();

    const { doctorId } = await params;
    const user = getRequestUser(request);
    const { limit, skip } = getPagination(new URL(request.url).searchParams, 20, 200);

    if (user?.role === 'doctor' && user.doctorId && user.doctorId !== doctorId) {
      return jsonError('Forbidden', 403);
    }

    const query = buildHospitalQuery(user, { doctorId });

    const consultations = await Consultation.find(query)
      .lean()
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const normalized = consultations.map(toAppConsultation);
    const total = await Consultation.countDocuments(query);
    return jsonOk(normalized, { consultations: normalized, total, limit, skip });
  } catch (error) {
    console.error('Get consultations by doctor error:', error);
    return jsonError('Failed to fetch consultations');
  }
}
