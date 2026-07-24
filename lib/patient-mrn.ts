import Hospital from '@/lib/models/Hospital';

const DEFAULT_MRN_PREFIX = 'HOS';

export function buildHospitalAcronym(value?: string | null) {
  const input = String(value || '').trim();
  if (!input) return DEFAULT_MRN_PREFIX;

  const words = input
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean);

  const acronym =
    words.length > 1
      ? words.map((word) => word[0]).join('')
      : words[0]?.slice(0, 3) || DEFAULT_MRN_PREFIX;

  return acronym.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || DEFAULT_MRN_PREFIX;
}

export async function getHospitalMrnPrefix(hospitalId?: string | null) {
  if (!hospitalId) return DEFAULT_MRN_PREFIX;

  const hospital = await Hospital.findById(hospitalId).select('name slug').lean();
  return buildHospitalAcronym((hospital as any)?.name || (hospital as any)?.slug);
}

export function formatPatientMrn(prefix: string, value: number) {
  return `${buildHospitalAcronym(prefix)}${String(Math.max(0, value)).padStart(5, '0')}`;
}

export function getMrnSequenceNumber(mrn: string | undefined, prefix: string) {
  const normalizedPrefix = buildHospitalAcronym(prefix);
  const match = String(mrn || '').match(new RegExp(`^${normalizedPrefix}(\\d{5})$`, 'i'));
  return match ? Number(match[1]) : 0;
}

export function normalizePatientMrn(value: string | undefined, prefix: string) {
  const input = String(value || '').trim().toUpperCase();
  if (!input) return undefined;

  const normalizedPrefix = buildHospitalAcronym(prefix);
  const numeric = input.match(/\d+/)?.[0];
  if (!numeric) return input;

  return formatPatientMrn(normalizedPrefix, Number(numeric));
}

export async function getNextPatientMrnForHospital(
  patientModel: any,
  hospitalId?: string | null
) {
  const prefix = await getHospitalMrnPrefix(hospitalId);
  const pattern = new RegExp(`^${prefix}\\d{5}$`, 'i');
  const patients = await patientModel.find({ hospitalId: hospitalId || null, mrn: pattern }).select('mrn').lean();

  const highestNumber = patients.reduce((highest: number, patient: any) => {
    const mrnNumber = getMrnSequenceNumber(patient.mrn, prefix);
    return Number.isFinite(mrnNumber) && mrnNumber > highest ? mrnNumber : highest;
  }, 0);

  return formatPatientMrn(prefix, highestNumber + 1);
}
