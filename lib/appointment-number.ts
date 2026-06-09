import Appointment from '@/lib/models/Appointment';
import Patient from '@/lib/models/Patient';

export function normalizeAppointment(doc: any) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...plain,
    id: plain.id || String(plain._id),
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function getNextAppointmentNumber(patientId: string, patientMrn?: string) {
  const patientCode = patientMrn || patientId;
  const prefix = `${patientCode}-APT-`;
  const escapedPrefix = escapeRegExp(prefix);
  const appointments = await Appointment.find({
    patientId,
    appointmentNumber: { $regex: `^${escapedPrefix}\\d+$` },
  })
    .select('appointmentNumber')
    .lean();

  const highest = appointments.reduce((max, appointment: any) => {
    const match = String(appointment.appointmentNumber || '').match(/-APT-(\d+)$/);
    const value = match ? Number.parseInt(match[1], 10) : 0;
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  return `${prefix}${String(highest + 1).padStart(3, '0')}`;
}

export async function ensureAppointmentNumber(doc: any) {
  const appointment = normalizeAppointment(doc);
  if (!appointment || appointment.appointmentNumber) return appointment;

  const patient = await Patient.findById(appointment.patientId).select('mrn').lean();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const appointmentNumber = await getNextAppointmentNumber(
      appointment.patientId,
      (patient as any)?.mrn
    );

    try {
      const result = await Appointment.updateOne(
        {
          _id: appointment._id,
          $or: [
            { appointmentNumber: { $exists: false } },
            { appointmentNumber: null },
            { appointmentNumber: '' },
          ],
        },
        { $set: { appointmentNumber } }
      );

      if (result.modifiedCount > 0) {
        return { ...appointment, appointmentNumber };
      }

      const current = await Appointment.findById(appointment._id).lean();
      return normalizeAppointment(current) || appointment;
    } catch (error: any) {
      if (error?.code !== 11000) {
        throw error;
      }
    }
  }

  return appointment;
}

export async function ensureAppointmentNumbers(docs: any[]) {
  const normalized = [];

  for (const doc of docs) {
    normalized.push(await ensureAppointmentNumber(doc));
  }

  return normalized;
}
