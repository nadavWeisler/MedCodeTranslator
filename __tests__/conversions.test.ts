import { normalizeIcd9Code, icd9LookupVariants } from '../db/queries';
import { groupConversions } from '../app/services/conversionConfig';

describe('normalizeIcd9Code', () => {
  it('converts 5-digit undotted codes to dotted form', () => {
    expect(normalizeIcd9Code('25000')).toBe('250.00');
  });

  it('converts 4-digit undotted codes to dotted form', () => {
    expect(normalizeIcd9Code('4019')).toBe('401.9');
  });

  it('leaves dotted codes unchanged', () => {
    expect(normalizeIcd9Code('250.00')).toBe('250.00');
  });
});

describe('icd9LookupVariants', () => {
  it('includes dotted, undotted, and normalized variants', () => {
    const variants = icd9LookupVariants('25000');
    expect(variants).toContain('25000');
    expect(variants).toContain('250.00');
  });
});

describe('groupConversions', () => {
  it('limits visible common conversions per target scheme and counts hidden rows', () => {
    const groups = groupConversions([
      {
        sourceScheme: 'icd10',
        targetScheme: 'icd11',
        sourceCode: 'E11.9',
        targetCode: '5A11',
        targetName: 'Type 2 diabetes mellitus',
        isCommon: true,
        mappingSource: 'WHO ICD-11 demo alignment',
        relation: 'mapping',
      },
      {
        sourceScheme: 'icd10',
        targetScheme: 'icd11',
        sourceCode: 'E11.9',
        targetCode: '5A12',
        targetName: 'Gestational diabetes mellitus',
        isCommon: false,
        mappingSource: 'WHO ICD-11 demo alignment',
        relation: 'mapping',
      },
      {
        sourceScheme: 'icd10',
        targetScheme: 'icd11',
        sourceCode: 'E11.9',
        targetCode: '5A10',
        targetName: 'Type 1 diabetes mellitus',
        isCommon: false,
        mappingSource: 'WHO ICD-11 demo alignment',
        relation: 'mapping',
      },
      {
        sourceScheme: 'icd10',
        targetScheme: 'icd11',
        sourceCode: 'E11.9',
        targetCode: '5A70',
        targetName: 'Hypothyroidism',
        isCommon: false,
        mappingSource: 'WHO ICD-11 demo alignment',
        relation: 'mapping',
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].commonConversions).toHaveLength(1);
    expect(groups[0].hiddenCount).toBe(3);
  });
});
