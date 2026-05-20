import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CodeList from '../app/components/CodeList';
import type { CodeEntry } from '../db/queries';

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

const ENTRIES: CodeEntry[] = [
  { code: 'E11', name_en: 'Type 2 diabetes mellitus', name_he: null },
  { code: 'E11.9', name_en: 'Type 2 diabetes without complications', name_he: null },
];

const FUZZY: CodeEntry[] = [
  { code: 'E10', name_en: 'Type 1 diabetes mellitus', name_he: null },
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
    const heEntries: CodeEntry[] = [
      { code: 'E11', name_en: 'Type 2 diabetes', name_he: 'סוכרת סוג 2' },
    ];
    const { getByText } = render(
      <CodeList entries={heEntries} query="סוכרת" lang="he" t={t}
        schemeColor="#059669" resultCount={1} />
    );
    expect(getByText('סוכרת סוג 2')).toBeTruthy();
  });
});
