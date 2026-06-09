import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Consultation from '@/lib/models/Consultation';
import { jsonError, jsonOk } from '../../_lib/response';

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

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const now = new Date();
    const consultations = await Consultation.find({
      followUpDate: { $gte: now.toISOString() },
    })
      .lean()
      .sort({ followUpDate: 1 });

    const normalized = consultations.map(toAppConsultation);
    return jsonOk(normalized, { consultations: normalized, total: normalized.length });
  } catch (error) {
    console.error('Get upcoming followups error:', error);
    return jsonError('Failed to fetch follow-up consultations');
  }
}
