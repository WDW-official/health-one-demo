import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Patient from '@/lib/models/Patient';
import { jsonCreated, jsonError, jsonOk } from '../_lib/response';
import { buildHospitalQuery, getPagination, getRequestUser, getUserHospitalId, withHospitalId } from '../_lib/request-auth';
import { getApiErrorMessage } from '../_lib/error-message';
import {
  formatPatientMrn,
  getHospitalMrnPrefix,
  getNextPatientMrnForHospital,
  normalizePatientMrn,
} from '@/lib/patient-mrn';

function normalizePatient(doc: any) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...plain,
    id: plain.id || String(plain._id),
    mrn: plain.mrn || `ARC${String(String(plain._id).slice(-6)).toUpperCase()}`,
  };
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const { limit, skip } = getPagination(searchParams, 10, 100);
    const doctorId = searchParams.get('doctorId'); // Filter by assigned doctor for admin views only
    const user = getRequestUser(request);

    let query: any = buildHospitalQuery(user, { isActive: true });

    if (user?.role !== 'doctor' && doctorId) {
      query.assignedDoctorId = doctorId;
    }

    // Partial search across the most common identity fields
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchTerms = search.split(/\s+/).filter(Boolean);
      query = {
        ...query,
        $and: [
          {
            $or: [
              { mrn: { $regex: escaped, $options: 'i' } },
              { firstName: { $regex: escaped, $options: 'i' } },
              { lastName: { $regex: escaped, $options: 'i' } },
              { email: { $regex: escaped, $options: 'i' } },
              { phone: { $regex: escaped, $options: 'i' } },
            ],
          },
          ...searchTerms.slice(1).map((term) => ({
            $or: [
              { mrn: { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
              { firstName: { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
              { lastName: { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
            ],
          })),
        ],
      };
    }

    const patients = (await Patient.find(query)
      .lean()
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 })) as any[];

    const total = await Patient.countDocuments(query);

    const prefix = await getHospitalMrnPrefix(getUserHospitalId(user));
    const normalized = patients.map((patient) => ({
      ...normalizePatient(patient),
      mrn: patient.mrn || formatPatientMrn(prefix, 0),
    }));
    return jsonOk(normalized, { patients: normalized, total, limit, skip });
  } catch (error) {
    console.error('Get patients error:', error);
    return jsonError('Failed to fetch patients');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can create patients' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const hospitalId = getUserHospitalId(user);
    const mrnPrefix = await getHospitalMrnPrefix(hospitalId);

    // Validate required fields
    const required = ['firstName', 'lastName', 'dateOfBirth', 'email', 'phone', 'emergencyContactName', 'emergencyContactPhone'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Check if patient with email/phone already exists
    const existing = await Patient.findOne(buildHospitalQuery(user, {
      $or: [{ email: body.email }, { phone: body.phone }],
    }));

    if (existing) {
      return NextResponse.json(
        { error: 'Patient with this email or phone already exists' },
        { status: 409 }
      );
    }

    // Create new patient. MRN must follow the highest existing MRN, not patient count.
    const patient = new Patient({
      ...withHospitalId(user, body),
      mrn: normalizePatientMrn(body.mrn, mrnPrefix) || (await getNextPatientMrnForHospital(Patient, hospitalId)),
    });
    await patient.save();

    const normalized = normalizePatient(patient);
    return jsonCreated(normalized, { message: 'Patient created successfully', patient: normalized });
  } catch (error) {
    console.error('Create patient error:', error);
    return jsonError(getApiErrorMessage(error, 'Failed to create patient'), 400);
  }
}
