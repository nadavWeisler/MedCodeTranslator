import type { SchemeKey } from '@medcode/core';

/** Curated per-scheme example queries that work well with bundled datasets. */
export const SEARCH_EXAMPLES: Partial<Record<SchemeKey, string[]>> = {
  icd10: ['diabetes', 'hypertension', 'E11.9'],
  icd9: ['diabetes', 'HIV', 'typhoid'],
  icd11: ['diabetes', 'hypertension', 'asthma'],
  atc1: ['alimentary', 'cardiovascular', 'antiinfectives'],
  atc2: ['antibacterials', 'analgesics', 'antidiabetics'],
  atc3: ['insulin', 'beta blocking', 'antidepressants'],
  atc4: ['penicillins', 'statins', 'proton pump'],
  atc5: ['metformin', 'aspirin', 'amoxicillin'],
  cvx: ['influenza', 'COVID', 'MMR'],
  loinc: ['glucose', 'hemoglobin', 'potassium'],
  hcpcs: ['wheelchair', 'ambulance', 'splint'],
};

export function getSearchExamples(scheme: SchemeKey): string[] {
  return SEARCH_EXAMPLES[scheme] ?? ['diabetes', 'aspirin', 'glucose'];
}
