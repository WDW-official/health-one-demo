import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Patient from '@/lib/models/Patient';
import { jsonError, jsonOk } from '../../_lib/response';
import { getRequestUser } from '../../_lib/request-auth';

type ParsedRow = Record<string, string>;

const REQUIRED_FIELDS: string[] = [];

const HEADER_ALIASES: Record<string, string> = {
  id: 'legacyid',
  timestamp: 'createdat',
  emailaddress: 'email',
  name: 'name',
  dateofbirth: 'dateofbirth',
  familystatus: 'familystatus',
  sex: 'gender',
  phonenumber: 'phone',
  homeaddress: 'address',
  hmoprovider: 'insuranceprovider',
  hmo: 'insurancepolicynumber',
  status: 'legacystatus',
  notes: 'notes',
  proceduretype: 'proceduretype',
  nextappointment: 'nextappointment',
  followup: 'followup',
  whatsappfollowup: 'whatsappfollowup',
  sendbutton: 'sendbutton',
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function canonicalHeader(value: string) {
  const normalized = normalizeHeader(value);
  return HEADER_ALIASES[normalized] || normalized;
}

function parseDelimited(text: string, delimiter: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      currentRow.push(currentValue.trim());
      currentValue = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && nextChar === '\n') {
        i += 1;
      }

      currentRow.push(currentValue.trim());
      currentValue = '';

      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentValue += char;
  }

  currentRow.push(currentValue.trim());
  if (currentRow.some((cell) => cell.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

function parseSpreadsheet(text: string): ParsedRow[] {
  const delimiter = text.includes('\t') && !text.includes(',') ? '\t' : ',';
  const rows = parseDelimited(text, delimiter);

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map(canonicalHeader);
  return rows.slice(1).map((row) => {
    const entry: ParsedRow = {};
    headers.forEach((header, index) => {
      entry[header] = (row[index] || '').trim();
    });
    return entry;
  });
}

function toBoolean(value: string | undefined) {
  return ['true', '1', 'yes', 'y', 'active'].includes((value || '').trim().toLowerCase());
}

function parseDateValue(value: string | undefined) {
  const input = (value || '').trim();
  if (!input) return undefined;

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

function splitFullName(value: string | undefined) {
  const parts = (value || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: 'Unknown' };
  }

  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

function normalizeGender(value: string | undefined) {
  const input = (value || '').trim().toLowerCase();
  if (['m', 'male'].includes(input)) return 'male';
  if (['f', 'female'].includes(input)) return 'female';
  if (['other', 'nonbinary', 'non-binary'].includes(input)) return 'other';
  return input;
}

function normalizeFamilyStatus(value: string | undefined) {
  const input = (value || '').trim().toLowerCase();
  return input === 'family' ? 'family' : 'individual';
}

function buildMrn(value: string | undefined) {
  const input = (value || '').trim();
  if (!input) return undefined;
  return input.toUpperCase().startsWith('ARC') ? input.toUpperCase() : `ARC${input}`;
}

function getMrnNumber(mrn: string | undefined) {
  const match = (mrn || '').match(/^ARC(\d+)$/i);
  return match ? Number(match[1]) : 0;
}

function buildFallbackEmail() {
  return 'Not provided';
}

function buildFallbackPhone() {
  return 'Not provided';
}

function buildLegacyNotes(row: ParsedRow) {
  const notes = [
    row.notes && `Notes: ${row.notes}`,
    row.legacyid && `Legacy ID: ${row.legacyid}`,
    row.legacystatus && `Status: ${row.legacystatus}`,
    row.proceduretype && `Procedure Type: ${row.proceduretype}`,
    row.nextappointment && `Next Appointment: ${row.nextappointment}`,
    row.followup && `Follow-up: ${row.followup}`,
    row.whatsappfollowup && `WhatsApp Follow-up: ${row.whatsappfollowup}`,
    row.sendbutton && `Send Button: ${row.sendbutton}`,
  ].filter(Boolean);

  return notes.join('\n');
}

function buildPatientData(row: ParsedRow) {
  const splitName = splitFullName(row.name);
  const firstName = row.firstname || splitName.firstName;
  const lastName = row.lastname || splitName.lastName;
  const mrn = buildMrn(row.mrn || row.legacyid);
  const dateOfBirth = row.dateofbirth || '1900-01-01';
  const normalizedGender = normalizeGender(row.gender);
  const gender = ['male', 'female', 'other'].includes(normalizedGender) ? normalizedGender : 'other';
  const address = row.address || 'Not provided';
  const phone = row.phone || buildFallbackPhone();
  const legacyNotes = buildLegacyNotes(row);

  const patient = {
    mrn,
    firstName: firstName || 'Unknown',
    lastName: lastName || 'Patient',
    dateOfBirth,
    familyStatus: normalizeFamilyStatus(row.familystatus),
    gender,
    email: row.email || buildFallbackEmail(),
    phone,
    address,
    city: row.city || 'Not provided',
    state: row.state || 'Not provided',
    zipCode: row.zipcode || 'Not provided',
    insuranceProvider: row.insuranceprovider || undefined,
    insurancePolicyNumber: row.insurancepolicynumber || undefined,
    medicalHistory: [row.medicalhistory, legacyNotes].filter(Boolean).join('\n\n'),
    allergies: row.allergies || '',
    currentMedications: row.currentmedications || '',
    emergencyContactName: row.emergencycontactname || 'Not provided',
    emergencyContactPhone: row.emergencycontactphone || phone,
    assignedDoctorId: row.assigneddoctorid || undefined,
    assignedDoctorName: row.assigneddoctorname || undefined,
    isActive: row.isactive ? toBoolean(row.isactive) : true,
    createdAt: parseDateValue(row.createdat),
    updatedAt: parseDateValue(row.updatedat),
  };

  const missing = REQUIRED_FIELDS.filter((field) => {
    const key = normalizeHeader(field);
    if (field === 'firstName') return !firstName;
    if (field === 'lastName') return !lastName;
    if (field === 'gender') return !gender;
    if (field === 'phone') return !phone;
    if (field === 'address') return !address;
    return !row[key];
  });

  return { patient, missing };
}

async function importPatientRows(rows: ParsedRow[], firstRowNumber = 2) {
  const existing = await Patient.find({
    mrn: { $in: rows.map((row) => buildMrn(row.mrn || row.legacyid)).filter(Boolean) },
  })
    .select('mrn')
    .lean();

  const existingMrns = new Set(existing.map((patient: any) => (patient.mrn || '').trim().toUpperCase()));
  const highestExistingMrn = await Patient.find({ mrn: /^ARC\d+$/i })
    .select('mrn')
    .lean();
  const csvMrns = rows
    .map((row) => buildMrn(row.mrn || row.legacyid))
    .filter(Boolean) as string[];
  let nextMrnNumber = Math.max(
    0,
    ...highestExistingMrn.map((patient: any) => getMrnNumber(patient.mrn)),
    ...csvMrns.map(getMrnNumber)
  );

  const getNextMrn = () => {
    do {
      nextMrnNumber += 1;
    } while (existingMrns.has(`ARC${nextMrnNumber}`));

    return `ARC${nextMrnNumber}`;
  };

  const validPatients: any[] = [];
  const skipped: Array<{ row: number; reason: string }> = [];
  const remappedMrns: Array<{ row: number; name: string; csvId: string; newMrn: string }> = [];

  rows.forEach((row, index) => {
    const rowNumber = firstRowNumber + index;
    const { patient, missing } = buildPatientData(row);

    if (missing.length > 0) {
      skipped.push({ row: rowNumber, reason: `Missing required fields: ${missing.join(', ')}` });
      return;
    }

    let mrn = patient.mrn?.trim().toUpperCase();
    const email = patient.email.trim() || 'Not provided';
    const phone = patient.phone.trim() || 'Not provided';

    if (!mrn) {
      skipped.push({ row: rowNumber, reason: 'Missing Id/MRN' });
      return;
    }

    if (mrn && existingMrns.has(mrn)) {
      const newMrn = getNextMrn();
      remappedMrns.push({
        row: rowNumber,
        name: `${patient.firstName} ${patient.lastName}`.trim(),
        csvId: mrn,
        newMrn,
      });
      mrn = newMrn;
    }

    if (mrn) existingMrns.add(mrn);
    validPatients.push({
      ...patient,
      mrn,
      email,
      phone,
    });
  });

  if (validPatients.length === 0) {
    return {
      patientsToInsert: [],
      skipped,
      remappedMrns,
    };
  }

  const patientsToInsert = validPatients.map((patient) => ({
    ...patient,
    mrn: patient.mrn,
  }));

  await Patient.collection.insertMany(patientsToInsert, { ordered: true });

  return {
    patientsToInsert,
    skipped,
    remappedMrns,
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can import patients' }, { status: 403 });
    }

    await connectDB();

    const contentType = request.headers.get('content-type') || '';
    let rows: ParsedRow[] = [];
    let firstRowNumber = 2;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      const rawRows = Array.isArray(body?.rows) ? body.rows : [body?.row || body].filter(Boolean);
      rows = rawRows.map((row: Record<string, unknown>) => {
        const normalized: ParsedRow = {};
        Object.entries(row || {}).forEach(([key, value]) => {
          normalized[canonicalHeader(key)] = String(value ?? '').trim();
        });
        return normalized;
      });
      firstRowNumber = 1;
    } else {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'No spreadsheet file provided' }, { status: 400 });
      }

      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.csv') && !fileName.endsWith('.tsv') && !fileName.endsWith('.txt')) {
        return NextResponse.json(
          { error: 'Please upload a CSV or TSV file. Export Excel spreadsheets as CSV first.' },
          { status: 400 }
        );
      }

      const text = await file.text();
      rows = parseSpreadsheet(text);
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'The spreadsheet is empty or missing a header row.' }, { status: 400 });
    }

    const { patientsToInsert, skipped, remappedMrns } = await importPatientRows(rows, firstRowNumber);

    if (patientsToInsert.length === 0) {
      return NextResponse.json(
        { error: 'No valid patients found to import', skipped },
        { status: 400 }
      );
    }

    return jsonOk(
      {
        created: patientsToInsert.length,
        skipped: skipped.length,
        skippedRows: skipped,
        remappedMrns,
      },
      {
        message: `Imported ${patientsToInsert.length} patient${patientsToInsert.length !== 1 ? 's' : ''} successfully`,
        created: patientsToInsert.length,
        skipped: skipped.length,
        skippedRows: skipped,
        remappedMrns,
      }
    );
  } catch (error) {
    console.error('Import patients error:', error);
    return jsonError('Failed to import patients');
  }
}
