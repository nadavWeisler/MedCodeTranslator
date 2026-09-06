import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SchemeTabs, {
  SCHEMES,
  SCHEME_GROUPS,
  getSchemeGroup,
  isPrimaryScheme,
  collapseToPrimaryScheme,
} from '../app/components/SchemeTabs';

describe('SchemeTabs', () => {
  it('renders only primary scheme tabs by default', () => {
    const { getAllByRole, queryByText } = render(
      <SchemeTabs active="atc5" onChange={jest.fn()} onToggleShowAll={jest.fn()} />
    );
    const tabs = getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(queryByText('LOINC')).toBeNull();
    expect(queryByText('ICD-9')).toBeNull();
  });

  it('renders all scheme tabs when showAll is true', () => {
    const { getAllByRole } = render(
      <SchemeTabs active="atc5" onChange={jest.fn()} showAll onToggleShowAll={jest.fn()} />
    );
    const tabs = getAllByRole('tab');
    expect(tabs).toHaveLength(SCHEMES.length);
  });

  it('renders the short labels of all schemes when expanded', () => {
    const { getByText, queryByText } = render(
      <SchemeTabs active="atc5" onChange={jest.fn()} showAll onToggleShowAll={jest.fn()} />
    );
    for (const scheme of SCHEMES) {
      expect(getByText(scheme.shortLabel)).toBeTruthy();
    }
    expect(queryByText('CPT')).toBeNull();
    expect(SCHEMES.map(scheme => scheme.key)).not.toContain('cpt');
  });

  it('marks the active tab as selected', () => {
    const { getAllByRole } = render(
      <SchemeTabs active="icd10" onChange={jest.fn()} onToggleShowAll={jest.fn()} />
    );
    const tabs = getAllByRole('tab');
    const icd10Tab = tabs.find(t => t.props.accessibilityState?.selected === true);
    expect(icd10Tab).toBeTruthy();
  });

  it('calls onChange with the correct scheme key when a tab is pressed', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <SchemeTabs active="atc5" onChange={onChange} onToggleShowAll={jest.fn()} />
    );
    fireEvent.press(getByText('ICD-10'));
    expect(onChange).toHaveBeenCalledWith('icd10');
  });

  it('calls onToggleShowAll when the toggle is pressed', () => {
    const onToggleShowAll = jest.fn();
    const { getByLabelText } = render(
      <SchemeTabs
        active="atc5"
        onChange={jest.fn()}
        onToggleShowAll={onToggleShowAll}
        showAllLabel="Show all systems"
      />
    );
    fireEvent.press(getByLabelText('Show all systems'));
    expect(onToggleShowAll).toHaveBeenCalled();
  });

  it('shows the active scheme full label when not compact', () => {
    const { getAllByText } = render(
      <SchemeTabs active="loinc" onChange={jest.fn()} showAll onToggleShowAll={jest.fn()} />
    );
    expect(getAllByText('LOINC').length).toBeGreaterThanOrEqual(1);
  });

  it('does not show scheme summary section in compact mode', () => {
    const { queryByText } = render(
      <SchemeTabs active="loinc" onChange={jest.fn()} showAll hintLabel="Search by code or name" compact onToggleShowAll={jest.fn()} />
    );
    expect(queryByText('Search by code or name')).toBeNull();
  });

  it('shows hint label when provided', () => {
    const { getByText } = render(
      <SchemeTabs active="atc5" onChange={jest.fn()} hintLabel="Search by code or name" onToggleShowAll={jest.fn()} />
    );
    expect(getByText('Search by code or name')).toBeTruthy();
  });

  it('groups schemes by clinical family when expanded', () => {
    const { getByText } = render(
      <SchemeTabs active="icd10" onChange={jest.fn()} showAll compact onToggleShowAll={jest.fn()} />
    );

    for (const group of SCHEME_GROUPS) {
      expect(getByText(group.label)).toBeTruthy();
    }
    expect(getSchemeGroup('icd9').label).toBe('Diagnoses');
    expect(getSchemeGroup('icd10').label).toBe('Diagnoses');
  });
});

describe('scheme helpers', () => {
  it('identifies primary schemes', () => {
    expect(isPrimaryScheme('icd10')).toBe(true);
    expect(isPrimaryScheme('atc5')).toBe(true);
    expect(isPrimaryScheme('icd11')).toBe(false);
  });

  it('collapses non-primary schemes to their primary counterpart', () => {
    expect(collapseToPrimaryScheme('icd11')).toBe('icd10');
    expect(collapseToPrimaryScheme('atc3')).toBe('atc5');
    expect(collapseToPrimaryScheme('loinc')).toBe('icd10');
  });
});
