import { buildShareUrl, formatCodeDescription } from '../app/services/share';

describe('buildShareUrl', () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
    });
  });

  it('builds a URL with scheme, query, language, and code', () => {
    const url = buildShareUrl({
      scheme: 'icd10',
      lang: 'en',
      query: 'diabetes',
      code: 'E11',
    });

    expect(url).toContain('scheme=icd10');
    expect(url).toContain('lang=en');
    expect(url).toContain('q=diabetes');
    expect(url).toContain('code=E11');
    expect(url).toContain('/MedCodeTranslator/app');
  });

  it('omits empty query and code parameters', () => {
    const url = buildShareUrl({
      scheme: 'atc5',
      lang: 'he',
    });

    expect(url).toContain('scheme=atc5');
    expect(url).toContain('lang=he');
    expect(url).not.toContain('q=');
    expect(url).not.toContain('code=');
  });
});

describe('formatCodeDescription', () => {
  it('uses English label by default', () => {
    expect(
      formatCodeDescription(
        { code: 'E11', name_en: 'Type 2 diabetes mellitus', name_he: null },
        'en'
      )
    ).toBe('E11 — Type 2 diabetes mellitus');
  });

  it('uses Hebrew label when available and language is Hebrew', () => {
    expect(
      formatCodeDescription(
        { code: 'E11', name_en: 'Type 2 diabetes mellitus', name_he: 'סוכרת סוג 2' },
        'he'
      )
    ).toBe('E11 — סוכרת סוג 2');
  });
});
