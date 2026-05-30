import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CodeList from '../app/components/CodeList';
import type { ScoredEntry } from '@medcode/core';

const t = (key: string, opts?: Record<string, unknown>): string => {
  const map: Record<string, string> = {
    empty_state_title: 'Search medical codes',
    empty_state_body: 'Type a code or name above',
    no_results: 'No results found',
    did_you_mean: 'Did you mean?',
    results_count: `${opts?.count ?? 0} results`,
    results_title_active: 'Results',
    results_title_idle: 'Start searching',
  };
  return map[key] ?? key;
};

const S = (code: string, name_en: string): ScoredEntry => ({
  code, name_en, name_he: null, score: 1.0, matchMethod: 'exact',
});

const ENTRIES: ScoredEntry[] = [
  S('E11', 'Type 2 diabetes mellitus'),
  S('E11.9', 'Type 2 diabetes without complications'),
];

const FUZZY: ScoredEntry[] = [
  S('E10', 'Type 1 diabetes mellitus'),
];

describe('CodeList', () => {
  it('shows empty state when query is empty', () => {
    const { getByText } = render(
      <CodeList entries={[]} query="" lang="en" t={t}
        schemeColor="#2563eb" resultCount={0} />
    );
    expect(getByText('Search medical codes')).toBeTruthy();
    expect(getByText('Type a code or name above')).toBeTruthy();
  });

  it('shows no-results state when query set but no entries', () => {
    const { getByText } = render(
      <CodeList entries={[]} query="xyz" lang="en" t={t}
        schemeColor="#2563eb" resultCount={0} />
    );
    expect(getByText('No results found')).toBeTruthy();
  });

  it('shows "did you mean" section when fuzzyMatches provided with no results', () => {
    const { getByText } = render(
      <CodeList entries={[]} query="diabbetes" lang="en" t={t}
        schemeColor="#2563eb" resultCount={0}
        fuzzyMatches={FUZZY} onFuzzySelect={jest.fn()} />
    );
    expect(getByText('Did you mean?')).toBeTruthy();
    expect(getByText('Type 1 diabetes mellitus')).toBeTruthy();
  });

  it('calls onFuzzySelect when a fuzzy suggestion is pressed', () => {
    const onFuzzySelect = jest.fn();
    const { getByText } = render(
      <CodeList entries={[]} query="diabbetes" lang="en" t={t}
        schemeColor="#2563eb" resultCount={0}
        fuzzyMatches={FUZZY} onFuzzySelect={onFuzzySelect} />
    );
    fireEvent.press(getByText('Type 1 diabetes mellitus'));
    expect(onFuzzySelect).toHaveBeenCalledWith(FUZZY[0]);
  });

  it('renders entries in the results list', () => {
    const { getByText } = render(
      <CodeList entries={ENTRIES} query="diabetes" lang="en" t={t}
        schemeColor="#059669" resultCount={2} />
    );
    expect(getByText('Type 2 diabetes mellitus')).toBeTruthy();
    expect(getByText('Type 2 diabetes without complications')).toBeTruthy();
  });

  it('groups sibling decimal codes under their shared root code', () => {
    const entries: ScoredEntry[] = [
      S('F20.0', 'Paranoid schizophrenia'),
      S('F20.1', 'Disorganized schizophrenia'),
    ];
    const { getByText } = render(
      <CodeList entries={entries} query="schizophrenia" lang="en" t={t}
        schemeColor="#059669" resultCount={2} />
    );

    expect(getByText('F20')).toBeTruthy();
    expect(getByText('Paranoid schizophrenia')).toBeTruthy();
    expect(getByText('Disorganized schizophrenia')).toBeTruthy();
  });

  it('shows result count badge', () => {
    const { getByText } = render(
      <CodeList entries={ENTRIES} query="diabetes" lang="en" t={t}
        schemeColor="#059669" resultCount={2} />
    );
    expect(getByText('2 results')).toBeTruthy();
  });

  it('calls onEntrySelect when a result card is pressed', () => {
    const onEntrySelect = jest.fn();
    const { getByText } = render(
      <CodeList entries={ENTRIES} query="diabetes" lang="en" t={t}
        schemeColor="#059669" resultCount={2}
        onEntrySelect={onEntrySelect} />
    );
    fireEvent.press(getByText('Type 2 diabetes mellitus'));
    expect(onEntrySelect).toHaveBeenCalledWith(ENTRIES[0]);
  });

  it('renders Hebrew name when lang=he and name_he is set', () => {
    const heEntries: ScoredEntry[] = [
      { code: 'E11', name_en: 'Type 2 diabetes', name_he: 'סוכרת סוג 2', score: 1.0, matchMethod: 'exact' },
    ];
    const { getByText } = render(
      <CodeList entries={heEntries} query="סוכרת" lang="he" t={t}
        schemeColor="#059669" resultCount={1} />
    );
    expect(getByText('סוכרת סוג 2')).toBeTruthy();
  });

  it('shows ICD version translation details for the selected result', () => {
    const { getByText } = render(
      <CodeList entries={[S('250.00', 'Diabetes mellitus without complication')]} query="250.00" lang="en" t={t}
        schemeColor="#7c3aed" resultCount={1}
        selectedCode="250.00"
        selectedCrosswalkRows={[{
          sourceScheme: 'icd9',
          targetScheme: 'icd10',
          sourceCode: '250.00',
          targetCode: 'E11.9',
          targetName: 'Type 2 diabetes mellitus without complications',
          cardinality: '1:1',
          sourceLabel: 'ICD-9-CM',
          targetLabel: 'ICD-10-CM',
          mappingSource: 'CMS GEM',
        }]}
        crosswalkScheme="icd9" />
    );

    expect(getByText('ICD family translation')).toBeTruthy();
    expect(getByText('ICD-9-CM -> ICD-10-CM · CMS GEM')).toBeTruthy();
    expect(getByText('E11.9')).toBeTruthy();
    expect(getByText('Type 2 diabetes mellitus without complications')).toBeTruthy();
  });
});
