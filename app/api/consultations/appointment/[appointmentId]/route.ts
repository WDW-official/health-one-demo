import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Consultation from '@/lib/models/Consultation';
import { jsonError, jsonOk } from '../../../_lib/response';

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
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    await connectDB();

    const { appointmentId } = await params;
    const consultation = await Consultation.findOne({ appointmentId }).lean();

    if (!consultation) {
      return jsonError('Consultation not found', 404);
    }

    return jsonOk(toAppConsultation(consultation), {
      consultation: toAppConsultation(consultation),
    });
  } catch (error) {
    console.error('Get consultation by appointment error:', error);
    return jsonError('Failed to fetch consultation');
  }
}
