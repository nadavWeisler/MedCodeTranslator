import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ComplianceFooter from '../app/components/ComplianceFooter';

const LINKS = [
  { key: 'home', label: 'Home', onPress: jest.fn() },
  { key: 'about', label: 'About & sources', onPress: jest.fn() },
  { key: 'terms', label: 'Terms', onPress: jest.fn() },
  { key: 'privacy', label: 'Privacy', onPress: jest.fn() },
];

const BODY = 'MedCode Clinical is an informational reference tool.';
const PHI = 'Do not enter patient-identifiable or protected health information (PHI).';
const UPDATED = 'Dataset last updated: 2026-07-06';

function renderFooter() {
  LINKS.forEach(link => link.onPress.mockClear());
  return render(
    <ComplianceFooter
      title="For reference only"
      body={BODY}
      phiWarning={PHI}
      updatedLabel={UPDATED}
      links={LINKS}
    />
  );
}

describe('ComplianceFooter', () => {
  it('collapses to the title chip by default and hides disclaimer content', () => {
    const { getByText, getByLabelText, queryByText } = renderFooter();

    expect(getByText('For reference only')).toBeTruthy();
    expect(getByLabelText('For reference only').props.accessibilityState).toEqual(
      expect.objectContaining({ expanded: false })
    );
    expect(queryByText(BODY)).toBeNull();
    expect(queryByText(PHI)).toBeNull();
    expect(queryByText(UPDATED)).toBeNull();
    expect(queryByText('Home')).toBeNull();
    expect(queryByText('About & sources')).toBeNull();
    expect(queryByText('Terms')).toBeNull();
    expect(queryByText('Privacy')).toBeNull();
  });

  it('expands on tap to show disclaimer, PHI warning, dataset date, and nav links', () => {
    const { getByLabelText, getByText } = renderFooter();

    fireEvent.press(getByLabelText('For reference only'));

    expect(getByLabelText('For reference only').props.accessibilityState).toEqual(
      expect.objectContaining({ expanded: true })
    );
    expect(getByText(BODY)).toBeTruthy();
    expect(getByText(PHI)).toBeTruthy();
    expect(getByText(UPDATED)).toBeTruthy();
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('About & sources')).toBeTruthy();
    expect(getByText('Terms')).toBeTruthy();
    expect(getByText('Privacy')).toBeTruthy();
  });

  it('collapses again on a second header tap', () => {
    const { getByLabelText, queryByText } = renderFooter();
    const header = getByLabelText('For reference only');

    fireEvent.press(header);
    fireEvent.press(header);

    expect(header.props.accessibilityState).toEqual(
      expect.objectContaining({ expanded: false })
    );
    expect(queryByText(BODY)).toBeNull();
    expect(queryByText('Home')).toBeNull();
  });

  it('invokes nav callbacks from the expanded links', () => {
    const { getByLabelText, getByText } = renderFooter();

    fireEvent.press(getByLabelText('For reference only'));
    fireEvent.press(getByText('About & sources'));

    expect(LINKS[1].onPress).toHaveBeenCalledTimes(1);
    expect(LINKS[0].onPress).not.toHaveBeenCalled();
  });
});
