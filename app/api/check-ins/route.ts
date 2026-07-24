import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Appointment from '@/lib/models/Appointment';
import CheckIn from '@/lib/models/CheckIn';
import Doctor from '@/lib/models/Doctor';
import Patient from '@/lib/models/Patient';
import { ensureAppointmentNumber } from '@/lib/appointment-number';
import { jsonCreated, jsonError, jsonOk } from '../_lib/response';
import { buildHospitalQuery, getPagination, getRequestUser, withHospitalId } from '../_lib/request-auth';
import { getApiErrorMessage } from '../_lib/error-message';

function normalizeCheckIn(doc: any) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...plain,
    id: plain.id || String(plain._id),
  };
}

function getDayRange(dateValue?: string | null) {
  const date = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

function getRangeFromParams(searchParams: URLSearchParams) {
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const date = searchParams.get('date');

  if (startDate || endDate) {
    const range: any = {};
    if (startDate) {
      const start = /^\d{4}-\d{2}-\d{2}$/.test(startDate)
        ? new Date(`${startDate}T00:00:00`)
        : new Date(startDate);
      if (!Number.isNaN(start.getTime())) range.$gte = start;
    }
    if (endDate) {
      const end = /^\d{4}-\d{2}-\d{2}$/.test(endDate)
        ? new Date(`${endDate}T00:00:00`)
        : new Date(endDate);
      if (!Number.isNaN(end.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        end.setDate(end.getDate() + 1);
      }
      if (!Number.isNaN(end.getTime())) range.$lt = end;
    }
    return Object.keys(range).length ? range : undefined;
  }

  if (date) {
    const range = getDayRange(date);
    return range ? { $gte: range.start, $lt: range.end } : undefined;
  }

  return undefined;
}

async function findTodayAppointment(patientId: string, doctorId: string, hospitalId?: string | null) {
  const today = getDayRange();
  if (!today) return null;

  const appointment = await Appointment.findOne({
    hospitalId: hospitalId || null,
    patientId,
    doctorId,
    status: 'scheduled',
    dateTime: {
      $gte: today.start,
      $lt: today.end,
    },
  })
    .sort({ dateTime: 1 })
    .lean();

  return appointment ? ensureAppointmentNumber(appointment) : null;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const { limit, skip } = getPagination(searchParams, 20, 200);
    const user = getRequestUser(request);
    const status = searchParams.get('status');
    const patientId = searchParams.get('patientId');
    const doctorId = searchParams.get('doctorId');
    const search = searchParams.get('search')?.trim();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query: any = buildHospitalQuery(user);

    if (status && status !== 'all') query.status = status;
    if (patientId) query.patientId = patientId;

    if (user.role === 'doctor') {
      if (doctorId && doctorId !== user.doctorId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (user.doctorId) query.doctorId = user.doctorId;
    } else if (doctorId) {
      query.doctorId = doctorId;
    }

    const checkedInAt = getRangeFromParams(searchParams);
    if (checkedInAt) query.checkedInAt = checkedInAt;

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query = {
        ...query,
        $or: [
          { patientName: { $regex: escaped, $options: 'i' } },
          { patientMrn: { $regex: escaped, $options: 'i' } },
          { checkedInByName: { $regex: escaped, $options: 'i' } },
          { appointmentNumber: { $regex: escaped, $options: 'i' } },
        ],
      };
    }

    const checkIns = (await CheckIn.find(query)
      .lean()
      .limit(limit)
      .skip(skip)
      .sort({ checkedInAt: -1 })) as any[];

    const total = await CheckIn.countDocuments(query);
    const normalized = checkIns.map(normalizeCheckIn);

    return jsonOk(normalized, { checkIns: normalized, total, limit, skip });
  } catch (error) {
    console.error('Get check-ins error:', error);
    return jsonError('Failed to fetch check-ins');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const required = ['patientId', 'doctorId'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }

    if (user.role === 'doctor' && user.doctorId && body.doctorId !== user.doctorId) {
      return NextResponse.json({ error: 'Doctors can only check in patients for themselves' }, { status: 403 });
    }

    const [patient, doctor] = await Promise.all([
      Patient.findOne(buildHospitalQuery(user, { _id: body.patientId })),
      Doctor.findOne(buildHospitalQuery(user, { _id: body.doctorId })),
    ]);

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    let appointment: any = null;
    if (body.appointmentId) {
      appointment = await Appointment.findOne(buildHospitalQuery(user, { _id: body.appointmentId })).lean();
      if (!appointment) {
        return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
      }

      if (appointment.patientId !== body.patientId || appointment.doctorId !== body.doctorId) {
        return NextResponse.json(
          { error: 'Appointment does not match the selected patient and doctor' },
          { status: 400 }
        );
      }

      const appointmentDate = new Date(appointment.dateTime);
      const today = getDayRange();
      if (
        !today ||
        appointmentDate < today.start ||
        appointmentDate >= today.end
      ) {
        return NextResponse.json(
          { error: "Patients can only be checked in to today's appointment" },
          { status: 400 }
        );
      }

      appointment = await ensureAppointmentNumber(appointment);
    } else {
      appointment = await findTodayAppointment(body.patientId, body.doctorId, user.hospitalId || null);
    }

    const today = getDayRange();
    const activeDuplicate = today
      ? await CheckIn.findOne({
          hospitalId: user.hospitalId || null,
          patientId: body.patientId,
          checkedInAt: { $gte: today.start, $lt: today.end },
          status: { $in: ['waiting', 'with_doctor'] },
        }).lean()
      : null;

    if (activeDuplicate) {
      return NextResponse.json(
        { error: 'This patient already has an active check-in today' },
        { status: 409 }
      );
    }

    const checkIn = new CheckIn({
      ...withHospitalId(user, {}),
      patientId: body.patientId,
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientMrn: patient.mrn,
      doctorId: body.doctorId,
      doctorName: doctor.name,
      appointmentId: appointment ? String(appointment._id || appointment.id) : null,
      appointmentNumber: appointment?.appointmentNumber || null,
      checkedInByUserId: user.id,
      checkedInByName: user.name,
      checkedInAt: body.checkedInAt ? new Date(body.checkedInAt) : new Date(),
      status: body.status || 'waiting',
      notes: body.notes || '',
    });

    await checkIn.save();

    const normalized = normalizeCheckIn(checkIn);
    return jsonCreated(normalized, { message: 'Patient checked in successfully', checkIn: normalized });
  } catch (error) {
    console.error('Create check-in error:', error);
    return jsonError(getApiErrorMessage(error, 'Failed to create check-in'), 400);
  }
}
