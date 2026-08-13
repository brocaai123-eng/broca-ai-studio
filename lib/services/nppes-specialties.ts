/**
 * Common NUCC / CMS provider types for admin search.
 * File imports often store taxonomy codes; API imports store descriptions.
 * Search matches both.
 */

export interface ProviderType {
  id: string;
  label: string;
  /** Human phrases to match in specialty / taxonomy description */
  terms: string[];
  /** NUCC taxonomy code prefixes (match start of code) */
  codes: string[];
}

export const PROVIDER_TYPES: ProviderType[] = [
  { id: 'dentist', label: 'Dentist', terms: ['dentist', 'dentistry', 'dental'], codes: ['1223'] },
  { id: 'family-medicine', label: 'Family Medicine', terms: ['family medicine', 'family practice'], codes: ['207Q'] },
  { id: 'internal-medicine', label: 'Internal Medicine', terms: ['internal medicine'], codes: ['207R0'] },
  { id: 'oncology', label: 'Oncology', terms: ['oncology'], codes: ['207RX', '2085R0001', '207RH0003'] },
  { id: 'cardiology', label: 'Cardiology', terms: ['cardiology', 'cardiovascular'], codes: ['207RC'] },
  { id: 'pediatrics', label: 'Pediatrics', terms: ['pediatric'], codes: ['2080'] },
  { id: 'obgyn', label: 'OB/GYN', terms: ['obstetrics', 'gynecology'], codes: ['207V'] },
  { id: 'dermatology', label: 'Dermatology', terms: ['dermatology'], codes: ['207N'] },
  { id: 'orthopedics', label: 'Orthopedics', terms: ['orthopaedic', 'orthopedic'], codes: ['207X'] },
  { id: 'psychiatry', label: 'Psychiatry', terms: ['psychiatry', 'psychiatrist'], codes: ['2084P'] },
  { id: 'neurology', label: 'Neurology', terms: ['neurology'], codes: ['2084N'] },
  { id: 'ophthalmology', label: 'Ophthalmology', terms: ['ophthalmology'], codes: ['207W'] },
  { id: 'optometry', label: 'Optometrist', terms: ['optometrist', 'optometry'], codes: ['152W'] },
  { id: 'ent', label: 'ENT / Otolaryngology', terms: ['otolaryngology'], codes: ['207Y'] },
  { id: 'urology', label: 'Urology', terms: ['urology'], codes: ['2088'] },
  { id: 'gastroenterology', label: 'Gastroenterology', terms: ['gastroenterology'], codes: ['207RG'] },
  { id: 'endocrinology', label: 'Endocrinology', terms: ['endocrinology'], codes: ['207RE'] },
  { id: 'pulmonology', label: 'Pulmonology', terms: ['pulmonary'], codes: ['207RP'] },
  { id: 'nephrology', label: 'Nephrology', terms: ['nephrology'], codes: ['207RN'] },
  { id: 'rheumatology', label: 'Rheumatology', terms: ['rheumatology'], codes: ['207RR'] },
  { id: 'emergency', label: 'Emergency Medicine', terms: ['emergency medicine'], codes: ['207P'] },
  { id: 'anesthesiology', label: 'Anesthesiology', terms: ['anesthesiology'], codes: ['207L'] },
  { id: 'radiology', label: 'Radiology', terms: ['radiology', 'diagnostic radiology'], codes: ['2085'] },
  { id: 'general-surgery', label: 'General Surgery', terms: ['general surgery'], codes: ['2086'] },
  { id: 'plastic-surgery', label: 'Plastic Surgery', terms: ['plastic surgery'], codes: ['2082'] },
  { id: 'podiatry', label: 'Podiatrist', terms: ['podiatrist', 'podiatry', 'foot'], codes: ['213E'] },
  { id: 'chiropractor', label: 'Chiropractor', terms: ['chiropractor', 'chiropractic'], codes: ['111N'] },
  { id: 'physical-therapy', label: 'Physical Therapist', terms: ['physical therapist', 'physical therapy'], codes: ['2251'] },
  { id: 'occupational-therapy', label: 'Occupational Therapist', terms: ['occupational therapist'], codes: ['225X'] },
  { id: 'nurse-practitioner', label: 'Nurse Practitioner', terms: ['nurse practitioner'], codes: ['363L'] },
  { id: 'physician-assistant', label: 'Physician Assistant', terms: ['physician assistant'], codes: ['363A'] },
  { id: 'pharmacist', label: 'Pharmacist', terms: ['pharmacist', 'pharmacy'], codes: ['1835'] },
  { id: 'psychology', label: 'Psychologist', terms: ['psychologist', 'psychology'], codes: ['103T'] },
  { id: 'social-work', label: 'Social Worker', terms: ['social worker'], codes: ['1041'] },
  { id: 'hospital', label: 'Hospital / Clinic', terms: ['hospital', 'clinic'], codes: ['282N', '261Q'] },
  { id: 'primary-care', label: 'Primary Care / General Practice', terms: ['general practice', 'primary care'], codes: ['208D'] },
];

function looksLikeTaxonomyCode(value: string): boolean {
  return /^[0-9]{3}[A-Z0-9]{4,7}X$/i.test(value.trim());
}

export function findProviderType(input: string): ProviderType | undefined {
  const raw = input.trim();
  if (!raw) return undefined;
  const byId = PROVIDER_TYPES.find((t) => t.id === raw);
  if (byId) return byId;
  const lower = raw.toLowerCase();
  return PROVIDER_TYPES.find(
    (t) => t.label.toLowerCase() === lower || t.terms.some((term) => lower.includes(term) || term.includes(lower)),
  );
}

export function specialtyFromTaxonomyCode(code: string | null | undefined): string | null {
  const c = (code || '').trim().toUpperCase();
  if (!c) return null;
  const match = PROVIDER_TYPES.find((t) => t.codes.some((prefix) => c.startsWith(prefix.toUpperCase())));
  return match?.label || null;
}

export function friendlySpecialty(p: {
  specialty?: string | null;
  primary_taxonomy_code?: string | null;
  primary_taxonomy_desc?: string | null;
}): string {
  const desc = (p.primary_taxonomy_desc || '').trim();
  if (desc && !looksLikeTaxonomyCode(desc)) {
    return findProviderType(desc)?.label || desc;
  }
  const fromCode = specialtyFromTaxonomyCode(p.primary_taxonomy_code || p.specialty);
  if (fromCode) return fromCode;
  const spec = (p.specialty || '').trim();
  if (spec && !looksLikeTaxonomyCode(spec)) {
    return findProviderType(spec)?.label || spec;
  }
  return spec || 'Unknown type';
}

/** PostgREST `or()` clause matching specialty text and NUCC codes. */
export function specialtySearchOrClause(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const spec = findProviderType(raw);
  const parts: string[] = [];
  const terms = spec ? spec.terms : [raw];
  const codes = spec?.codes || (looksLikeTaxonomyCode(raw) ? [raw] : []);

  for (const term of terms) {
    const t = term.replace(/,/g, ' ');
    parts.push(`specialty.ilike.%${t}%`);
    parts.push(`primary_taxonomy_desc.ilike.%${t}%`);
  }
  for (const code of codes) {
    parts.push(`primary_taxonomy_code.ilike.${code}%`);
    parts.push(`specialty.ilike.${code}%`);
  }
  return parts.join(',');
}
