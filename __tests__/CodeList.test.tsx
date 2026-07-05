import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CodeList from '../app/components/CodeList';
import type { ScoredEntry } from '@medcode/core';

const t = (key: string, opts?: Record<string, unknown>): string => {
  const map: Record<string, string> = {
    empty_state_title: 'Begin your code lookup',
    empty_state_body: 'Enter a diagnosis code, medication name, lab test, or procedure term.',
    no_results: 'No results found',
    did_you_mean: 'Did you mean?',
    results_count: `${opts?.count ?? 0} results`,
    results_title_active: 'Results',
    match_exact: 'exact',
    terminology_english_only: 'English only',
    recent_searches_title: 'Recent searches',
    example_searches_title: 'Try searching',
    conversions_title: 'Related codes in other systems',
    conversions_subtitle: 'Mappings for {{code}}',
    conversions_count: `${opts?.count ?? 0} mapping(s)`,
    conversion_open_a11y: `Open code ${opts?.code ?? ''} in its coding system`,
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
        schemeColor="#2563eb" resultCount={0}
        exampleSearches={['metformin', 'aspirin']}
        onQuickSearch={jest.fn()} />
    );
    expect(getByText('Begin your code lookup')).toBeTruthy();
    expect(getByText('Enter a diagnosis code, medication name, lab test, or procedure term.')).toBeTruthy();
    expect(getByText('Try searching')).toBeTruthy();
    expect(getByText('metformin')).toBeTruthy();
  });

  it('shows recent searches and calls onQuickSearch when a chip is pressed', () => {
    const onQuickSearch = jest.fn();
    const { getByText } = render(
      <CodeList entries={[]} query="" lang="en" t={t}
        schemeColor="#2563eb" resultCount={0}
        recentSearches={['diabetes', 'hypertension']}
        exampleSearches={['E11.9']}
        onQuickSearch={onQuickSearch} />
    );
    expect(getByText('Recent searches')).toBeTruthy();
    fireEvent.press(getByText('diabetes'));
    expect(onQuickSearch).toHaveBeenCalledWith('diabetes');
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

  it('shows english-only chip when lang is not en and name_he is missing', () => {
    const { getAllByText } = render(
      <CodeList entries={ENTRIES} query="diabetes" lang="he" t={t}
        schemeColor="#059669" resultCount={2} />
    );
    expect(getAllByText('English only').length).toBeGreaterThan(0);
  });

  it('shows conversions panel for the selected result', () => {
    const onOpenConversion = jest.fn();
    const { getByText } = render(
      <CodeList entries={[S('250.00', 'Diabetes mellitus without complication')]} query="250.00" lang="en" t={t}
        schemeColor="#7c3aed" resultCount={1}
        selectedKey="250.00"
        conversionGroups={[{
          targetScheme: 'icd10',
          targetLabel: 'ICD-10-CM',
          conversions: [{
            sourceScheme: 'icd9',
            targetScheme: 'icd10',
            sourceCode: '250.00',
            targetCode: 'E11.9',
            targetName: 'Type 2 diabetes mellitus without complications',
            isCommon: true,
            cardinality: '1:1',
            mappingSource: 'CMS GEM',
            relation: 'crosswalk',
          }],
          commonConversions: [{
            sourceScheme: 'icd9',
            targetScheme: 'icd10',
            sourceCode: '250.00',
            targetCode: 'E11.9',
            targetName: 'Type 2 diabetes mellitus without complications',
            isCommon: true,
            cardinality: '1:1',
            mappingSource: 'CMS GEM',
            relation: 'crosswalk',
          }],
          hiddenCount: 0,
        }]}
        onOpenConversion={onOpenConversion} />
    );

    expect(getByText('Related codes in other systems')).toBeTruthy();
    expect(getByText('E11.9')).toBeTruthy();
    expect(getByText('Type 2 diabetes mellitus without complications')).toBeTruthy();
    fireEvent.press(getByText('E11.9'));
    expect(onOpenConversion).toHaveBeenCalledWith('icd10', 'E11.9');
  });
});
