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

export const EYE_CLINIC_PROCEDURE_GROUPS = [
  {
    category: 'Eye Consultation & Examination',
    procedures: [
      'Comprehensive Eye Examination',
      'Visual Acuity Test',
      'Refraction Test',
      'Slit Lamp Examination',
      'Dilated Fundus Examination',
      'Glaucoma Screening',
      'Diabetic Eye Screening',
      'Emergency Eye Consultation',
    ],
  },
  {
    category: 'Optical Services',
    procedures: [
      'Prescription Glasses Assessment',
      'Contact Lens Fitting',
      'Low Vision Assessment',
      'Optical Dispensing',
      'Lens Power Verification',
    ],
  },
  {
    category: 'Eye Procedures',
    procedures: [
      'Foreign Body Removal',
      'Eye Irrigation',
      'Chalazion Treatment',
      'Minor Eyelid Procedure',
      'Lacrimal Syringing',
      'Ocular Dressing',
    ],
  },
] as const;

export const FAMILY_MEDICAL_PROCEDURE_GROUPS = [
  {
    category: 'General Consultation',
    procedures: [
      'General Medical Consultation',
      'Family Medicine Review',
      'Follow-up Medical Consultation',
      'Emergency Medical Consultation',
      'Chronic Disease Review',
      'Health Screening',
    ],
  },
  {
    category: 'Nursing & Vitals',
    procedures: [
      'Vital Signs Assessment',
      'Blood Pressure Check',
      'Blood Sugar Check',
      'Wound Dressing',
      'Injection Administration',
      'Nebulization',
    ],
  },
  {
    category: 'Minor Procedures',
    procedures: [
      'Minor Wound Suturing',
      'Incision and Drainage',
      'Ear Syringing',
      'Catheter Care',
      'Sample Collection',
      'ECG Recording',
    ],
  },
] as const;

export const SMALL_HOSPITAL_PROCEDURE_GROUPS = [
  ...FAMILY_MEDICAL_PROCEDURE_GROUPS,
  {
    category: 'Small Hospital Services',
    procedures: [
      'Ward Review',
      'Admission Assessment',
      'Discharge Review',
      'Observation Care',
      'Pre-operative Assessment',
      'Post-operative Review',
    ],
  },
] as const;

export const SPECIALTY_PROCEDURE_GROUPS = {
  dental: PROCEDURE_GROUPS,
  eye_clinic: EYE_CLINIC_PROCEDURE_GROUPS,
  family_medical: FAMILY_MEDICAL_PROCEDURE_GROUPS,
  small_hospital: SMALL_HOSPITAL_PROCEDURE_GROUPS,
} as const;

export const PROCEDURE_TYPES = Object.values(SPECIALTY_PROCEDURE_GROUPS).flatMap((groups) =>
  groups.flatMap((group) => group.procedures)
);

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
  return Object.values(SPECIALTY_PROCEDURE_GROUPS).flat().find((group) =>
    (group.procedures as readonly string[]).includes(procedure)
  )?.category || PROCEDURE_GROUPS[0].category;
}

export function getProcedureGroupsForClinicType(clinicType?: string) {
  return SPECIALTY_PROCEDURE_GROUPS[clinicType as keyof typeof SPECIALTY_PROCEDURE_GROUPS] || PROCEDURE_GROUPS;
}
