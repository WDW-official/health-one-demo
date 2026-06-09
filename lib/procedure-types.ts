export const PROCEDURE_TYPES = [
  'Periapical X-ray',
  'Occlusal X-ray',
  'Scaling/Polishing',
  'Composite Filling',
  'Temporary Filling',
  'Extraction',
  'Surgical Extraction',
  'Root Canal Treatment',
  'Flexible Denture',
  'Full Denture',
  'Zirconia Crowns',
  'Porcelain Crowns',
  'Acrylic Crowns',
  'Metal Crowns',
  'Orthodontic Treatment',
  'Inter Maxillary Fixation (RTA)',
  'Pulpectomy',
  'Tooth Stabilisation/Splinting',
  'Periodontal Surgery',
] as const;

export type ProcedureType = (typeof PROCEDURE_TYPES)[number];
