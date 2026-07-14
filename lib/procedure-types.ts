export const PROCEDURE_GROUPS = [
  {
    category: 'Consultation & Examination',
    procedures: [
      'Dental Consultation',
      'Routine Dental Check-up',
      'Emergency Dental Consultation',
      'Follow-up Consultation',
      'Oral Cancer Screening',
      'Periodontal Assessment',
      'Orthodontic Assessment',
      'Implant Assessment',
    ],
  },
  {
    category: 'Imaging / X-rays',
    procedures: [
      'Periapical X-ray',
      'Bitewing X-ray',
      'Occlusal X-ray',
      'Panoramic X-ray (OPG)',
      'CBCT Scan',
      '3D Dental Scan',
      'Intraoral Photographs',
    ],
  },
  {
    category: 'Preventive Dentistry',
    procedures: [
      'Scaling and Polishing',
      'Deep Cleaning',
      'Fluoride Treatment',
      'Fissure Sealant',
      'Oral Hygiene Instruction',
      'Desensitising Treatment',
    ],
  },
  {
    category: 'Restorative',
    procedures: [
      'Composite Filling',
      'Temporary Filling',
      'Glass Ionomer Filling',
      'Amalgam Filling',
      'Tooth Bonding',
      'Core Build-up',
      'Crown Cementation',
      'Veneer Repair',
    ],
  },
  {
    category: 'Extraction / Oral Surgery',
    procedures: [
      'Simple Extraction',
      'Surgical Extraction',
      'Wisdom Tooth Extraction',
      'Incision and Drainage of Dental Abscess',
      'Suture Placement',
      'Frenectomy',
      'Dry Socket Treatment',
    ],
  },
  {
    category: 'Root Canal / Endodontics',
    procedures: [
      'Root Canal Treatment',
      'Pulpotomy',
      'Pulpectomy',
      'Root Canal Retreatment',
      'Temporary Root Canal Dressing',
    ],
  },
  {
    category: 'Crowns, Bridges & Dentures',
    procedures: [
      'Zirconia Crown',
      'Porcelain Crown',
      'Acrylic Crown',
      'Metal Crown',
      'Dental Bridge',
      'Flexible Denture',
      'Full Denture',
      'Partial Denture',
      'Denture Repair',
    ],
  },
  {
    category: 'Orthodontics & Stabilisation',
    procedures: [
      'Orthodontic Treatment',
      'Braces Adjustment',
      'Clear Aligner Review',
      'Retainer Fitting',
      'Tooth Stabilisation / Splinting',
      'Intermaxillary Fixation',
      'RTA-related Jaw Stabilisation',
    ],
  },
  {
    category: 'Periodontal Procedures',
    procedures: [
      'Periodontal Surgery',
      'Gingivectomy',
      'Crown Lengthening',
      'Gum Abscess Drainage',
      'Periodontal Maintenance',
    ],
  },
] as const;

export const PROCEDURE_TYPES = PROCEDURE_GROUPS.flatMap((group) => group.procedures);

export type ProcedureCategory = (typeof PROCEDURE_GROUPS)[number]['category'];

export type ProcedureType = (typeof PROCEDURE_TYPES)[number];

export type ConsultationProcedureStatus = 'pending' | 'completed' | 'cancelled';

export type ConsultationProcedure = {
  category: ProcedureCategory | string;
  procedure: ProcedureType | string;
  price?: number | string;
  status?: ConsultationProcedureStatus;
  updatedBy?: string;
  updatedByName?: string;
};

export function getProcedureCategory(procedure: string) {
  return PROCEDURE_GROUPS.find((group) =>
    (group.procedures as readonly string[]).includes(procedure)
  )?.category || PROCEDURE_GROUPS[0].category;
}
