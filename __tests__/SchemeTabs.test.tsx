import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SchemeTabs, { SCHEMES, SCHEME_GROUPS, getSchemeGroup } from '../app/components/SchemeTabs';
import type { SchemeKey } from '../db/database';

describe('SchemeTabs', () => {
  it('renders all 12 scheme tabs', () => {
    const { getAllByRole } = render(
      <SchemeTabs active="atc5" onChange={jest.fn()} />
    );
    const tabs = getAllByRole('tab');
    expect(tabs).toHaveLength(SCHEMES.length);
  });

  it('renders the short labels of all schemes', () => {
    const { getByText } = render(
      <SchemeTabs active="atc5" onChange={jest.fn()} />
    );
    for (const scheme of SCHEMES) {
      expect(getByText(scheme.shortLabel)).toBeTruthy();
    }
  });

  it('marks the active tab as selected', () => {
    const { getAllByRole } = render(
      <SchemeTabs active="icd10" onChange={jest.fn()} />
    );
    const tabs = getAllByRole('tab');
    const icd10Tab = tabs.find(t => t.props.accessibilityState?.selected === true);
    expect(icd10Tab).toBeTruthy();
  });

  it('calls onChange with the correct scheme key when a tab is pressed', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <SchemeTabs active="atc5" onChange={onChange} />
    );
    fireEvent.press(getByText('ICD-10'));
    expect(onChange).toHaveBeenCalledWith('icd10');
  });

  it('calls onChange for every scheme', () => {
    for (const scheme of SCHEMES) {
      const onChange = jest.fn();
      const { getByText } = render(
        <SchemeTabs active="atc5" onChange={onChange} />
      );
      fireEvent.press(getByText(scheme.shortLabel));
      expect(onChange).toHaveBeenCalledWith(scheme.key);
    }
  });

  it('shows the active scheme full label when not compact', () => {
    const { getByText } = render(
      <SchemeTabs active="loinc" onChange={jest.fn()} />
    );
    expect(getByText(/LOINC \(Labs\)/)).toBeTruthy();
  });

  it('does not show full label in compact mode', () => {
    const { queryByText } = render(
      <SchemeTabs active="loinc" onChange={jest.fn()} compact />
    );
    expect(queryByText(/LOINC \(Labs\)/)).toBeNull();
  });

  it('shows hint label when provided', () => {
    const { getByText } = render(
      <SchemeTabs active="atc5" onChange={jest.fn()} hintLabel="Search by code or name" />
    );
    expect(getByText('Search by code or name')).toBeTruthy();
  });

  it('groups schemes by clinical family', () => {
    const { getByText } = render(
      <SchemeTabs active="icd10" onChange={jest.fn()} compact />
    );

    for (const group of SCHEME_GROUPS) {
      expect(getByText(group.label)).toBeTruthy();
    }
    expect(getSchemeGroup('icd9').label).toBe('Diagnoses');
    expect(getSchemeGroup('icd10').label).toBe('Diagnoses');
  });
});
