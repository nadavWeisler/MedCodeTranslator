import { findDescendantEntries } from '../app/services/codeLists/descendants';
import type { VocabEntry } from '../app/services/codeLists/types';
import { resolveCode, buildVocabIndex } from '../app/services/codeLists/vocabulary';

function entry(scheme: VocabEntry['scheme'], code: string, name_en: string, name_he: string | null = null): VocabEntry {
  return { scheme, code, name_en, name_he };
}

const ICD10: VocabEntry[] = [
  entry('icd10', 'F32.0', 'Mild depressive episode', 'דיכאון קל'),
  entry('icd10', 'F32.1', 'Moderate depressive episode'),
  entry('icd10', 'F32.81', 'Premenstrual dysphoric disorder'),
  entry('icd10', 'F32.89', 'Other depressive episodes'),
  entry('icd10', 'F32.9', 'Depressive episode, unspecified'),
  entry('icd10', 'F33.0', 'Recurrent mild depression'),
  entry('icd10', 'E11.9', 'Type 2 diabetes mellitus without complications'),
];

const ICD9: VocabEntry[] = [
  entry('icd9', '25000', 'Diabetes mellitus without complication, type II'),
  entry('icd9', '25001', 'Diabetes mellitus without complication, type I'),
  entry('icd9', '25010', 'Diabetes with ketoacidosis, type II'),
  entry('icd9', 'E8000', 'Railway accident'),
  entry('icd9', 'V1000', 'Personal history of malignancy'),
];

const ATC: VocabEntry[] = [
  entry('atc1', 'A', 'Alimentary tract and metabolism'),
  entry('atc3', 'A10B', 'Blood glucose lowering drugs, excl. insulins'),
  entry('atc4', 'A10BA', 'Biguanides'),
  entry('atc5', 'A10BA02', 'metformin'),
  entry('atc5', 'A10BA01', 'phenformin'),
  entry('atc5', 'N02BE01', 'paracetamol'),
];

const ICD11: VocabEntry[] = [
  entry('icd11', '8A80.0', 'Migraine without aura'),
  entry('icd11', '8A80.1', 'Migraine with aura'),
  entry('icd11', '5A11', 'Type 2 diabetes mellitus'),
];

const FLAT: VocabEntry[] = [
  entry('loinc', '2345-7', 'Glucose'),
  entry('loinc', '2345-70', 'Not a child'),
  entry('hcpcs', 'A0021', 'Ambulance'),
  entry('cvx', '141', 'Influenza'),
];

const ALL = [...ICD10, ...ICD9, ...ATC, ...ICD11, ...FLAT];

describe('descendant expansion', () => {
  it('expands an ICD-10 category that is not itself a vocabulary row', () => {
    const codes = findDescendantEntries(ALL, 'icd10', 'f32').map(item => item.code);
    expect(codes).toEqual(['F32.0', 'F32.1', 'F32.81', 'F32.89', 'F32.9']);
    expect(codes).not.toContain('F33.0');
  });

  it('expands only the more specific branch of an intermediate category', () => {
    const codes = findDescendantEntries(ALL, 'icd10', 'F328').map(item => item.code);
    expect(codes).toEqual(['F32.81', 'F32.89']);
  });

  it('does not invent descendants for a billable code, a short stem, or flat schemes', () => {
    expect(findDescendantEntries(ALL, 'icd10', 'F32.0')).toEqual([]);
    expect(findDescendantEntries(ALL, 'icd10', 'F3')).toEqual([]);
    expect(findDescendantEntries(ALL, 'loinc', '2345-7')).toEqual([]);
    expect(findDescendantEntries(ALL, 'hcpcs', 'A00')).toEqual([]);
    expect(findDescendantEntries(ALL, 'cvx', '14')).toEqual([]);
  });

  it('expands dotted and undotted ICD-9 categories and leaves full codes alone', () => {
    expect(findDescendantEntries(ALL, 'icd9', '250').map(item => item.code)).toEqual(['25000', '25001', '25010']);
    expect(findDescendantEntries(ALL, 'icd9', '250.0').map(item => item.code)).toEqual(['25000', '25001']);
    expect(findDescendantEntries(ALL, 'icd9', 'E800').map(item => item.code)).toEqual(['E8000']);
    expect(findDescendantEntries(ALL, 'icd9', 'V10').map(item => item.code)).toEqual(['V1000']);
    expect(findDescendantEntries(ALL, 'icd9', '25')).toEqual([]);
    expect(findDescendantEntries(ALL, 'icd9', '25000')).toEqual([]);
  });

  it('expands ATC codes into deeper levels only', () => {
    const codes = findDescendantEntries(ALL, 'atc4', 'A10BA').map(item => `${item.scheme}:${item.code}`);
    expect(codes).toEqual(['atc5:A10BA01', 'atc5:A10BA02']);
    expect(findDescendantEntries(ALL, 'atc1', 'A').map(item => item.code)).toEqual([
      'A10B',
      'A10BA',
      'A10BA01',
      'A10BA02',
    ]);
    expect(findDescendantEntries(ALL, 'atc5', 'A10BA02')).toEqual([]);
  });

  it('expands an ICD-11 stem that is missing from the demo vocabulary', () => {
    expect(findDescendantEntries(ALL, 'icd11', '8A80').map(item => item.code)).toEqual(['8A80.0', '8A80.1']);
  });

  it('resolves a category with a blank English description and an exact code with its stored description', () => {
    const index = buildVocabIndex(ALL);
    const category = resolveCode(index, 'icd10', 'F32');
    expect(category).toMatchObject({
      kind: 'category',
      item: { scheme: 'icd10', code: 'F32', description: '' },
    });
    expect(category?.descendants).toHaveLength(5);

    const exact = resolveCode(index, 'icd10', 'f32.0', '  episode  ');
    expect(exact).toMatchObject({
      kind: 'entry',
      item: { code: 'F32.0', description: 'Mild depressive episode', note: 'episode' },
      descendants: [],
    });
    expect(resolveCode(index, 'icd10', 'ZZZ99')).toBeNull();
    expect(resolveCode(index, 'loinc', '2345-7')?.descendants).toEqual([]);
  });
});
