import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import SourceChip from '../app/components/SourceChip';
import CodeList from '../app/components/CodeList';
import type { ProvenanceChip } from '../scripts/lib/provenance';
import type { CrossSchemeScoredEntry } from '@medcode/core';

const t = (key: string, opts?: Record<string, unknown>): string => {
  const map: Record<string, string> = {
    source_chip_cms: 'CMS',
    source_chip_unofficial_translation: 'Unofficial translation, not validated',
    source_chip_hand_entered: 'Hand-entered',
    source_chip_a11y: `Source: ${opts?.label ?? ''}`,
    source_chip_link_a11y: `Source: ${opts?.label ?? ''}. Opens the authoritative page.`,
    source_chip_browser_a11y: `${opts?.label ?? ''}. Opens the reference page. This record was not retrieved from that page.`,
    source_chip_translation_link_a11y: `${opts?.label ?? ''}. Opens the official English source.`,
    empty_state_title: 'Begin your code lookup',
    empty_state_body: 'Enter a diagnosis code.',
    no_results: 'No results found',
    results_count: `${opts?.count ?? 0} results`,
    match_exact: 'exact',
    terminology_english_only: 'English only',
  };
  return map[key] ?? key;
};

const cmsChip: ProvenanceChip = {
  dataset: 'icd10',
  provenanceKey: 'cms-icd10cm-fy2025',
  kind: 'retrieved',
  labelKey: 'source_chip_cms',
  authoritative: true,
  href: 'https://www.cms.gov/medicare/coding-billing/icd-10-codes',
  translated: false,
};

const translationChip: ProvenanceChip = {
  dataset: 'icd10',
  provenanceKey: 'cms-icd10cm-fy2025',
  kind: 'hand-entered',
  labelKey: 'source_chip_unofficial_translation',
  authoritative: false,
  href: 'https://www.cms.gov/medicare/coding-billing/icd-10-codes',
  translated: true,
};

describe('SourceChip', () => {
  it('exposes an authoritative source as a link', () => {
    const { getByRole, getByText } = render(<SourceChip chip={cmsChip} lang="en" t={t} />);
    const link = getByRole('link');
    expect(getByText('CMS')).toBeTruthy();
    expect(link.props.accessibilityLabel).toBe('Source: CMS. Opens the authoritative page.');
  });

  it('aligns the chip for RTL', () => {
    const { getByRole, getByText } = render(<SourceChip chip={translationChip} lang="he" t={t} />);
    const link = getByRole('link');
    const style = StyleSheet.flatten(link.props.style);
    expect(style.alignSelf).toBe('flex-end');
    expect(style.textAlign).toBe('right');
    expect(getByText('Unofficial translation, not validated')).toBeTruthy();
  });

  it('does not link a hand-entered chip', () => {
    const handEntered: ProvenanceChip = {
      ...cmsChip,
      dataset: 'icd9_to_icd10_gem',
      provenanceKey: 'agent-authored-icd9-icd10-gem',
      kind: 'agent-authored',
      labelKey: 'source_chip_hand_entered',
      authoritative: false,
      href: null,
    };
    const { getByLabelText, queryByRole } = render(<SourceChip chip={handEntered} lang="en" t={t} />);
    expect(queryByRole('link')).toBeNull();
    expect(getByLabelText('Source: Hand-entered')).toBeTruthy();
  });
});

describe('result provenance chips', () => {
  const entry: CrossSchemeScoredEntry = {
    code: 'E11.9',
    name_en: 'Type 2 diabetes mellitus without complications',
    name_he: 'סוכרת סוג 2 ללא סיבוכים',
    score: 1,
    matchMethod: 'exact',
    scheme: 'icd10',
  };

  it('shows the English label beside the Hebrew translation chip', () => {
    const { getByText } = render(
      <CodeList
        entries={[entry]}
        query="E11.9"
        lang="he"
        t={t}
        schemeColor="#2563eb"
        resultCount={1}
      />
    );
    expect(getByText('סוכרת סוג 2 ללא סיבוכים')).toBeTruthy();
    expect(getByText('Type 2 diabetes mellitus without complications')).toBeTruthy();
    expect(getByText('Unofficial translation, not validated')).toBeTruthy();
    expect(getByText('CMS')).toBeTruthy();
  });
});
