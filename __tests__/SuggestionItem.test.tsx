import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SuggestionItem from '../app/components/SuggestionItem';
import type { ScoredEntry } from '@medcode/core';

const MOCK_ENTRY: ScoredEntry = {
  code: 'A10BA02',
  name_en: 'Metformin',
  name_he: 'מטפורמין',
  score: 1.0,
  matchMethod: 'exact',
};

const MOCK_ENTRY_NO_HE: ScoredEntry = {
  code: 'J01CA04',
  name_en: 'Amoxicillin',
  name_he: null,
  score: 1.0,
  matchMethod: 'exact',
};

describe('SuggestionItem', () => {
  it('renders the code', () => {
    const { getByText } = render(
      <SuggestionItem item={MOCK_ENTRY} lang="en" onPress={jest.fn()} schemeColor="#2563eb" />
    );
    expect(getByText('A10BA02')).toBeTruthy();
  });

  it('renders English name when lang=en', () => {
    const { getByText } = render(
      <SuggestionItem item={MOCK_ENTRY} lang="en" onPress={jest.fn()} schemeColor="#2563eb" />
    );
    expect(getByText('Metformin')).toBeTruthy();
  });

  it('renders Hebrew name when lang=he and name_he is available', () => {
    const { getByText } = render(
      <SuggestionItem item={MOCK_ENTRY} lang="he" onPress={jest.fn()} schemeColor="#2563eb" />
    );
    expect(getByText('מטפורמין')).toBeTruthy();
  });

  it('falls back to English name when lang=he but name_he is null', () => {
    const { getByText } = render(
      <SuggestionItem item={MOCK_ENTRY_NO_HE} lang="he" onPress={jest.fn()} schemeColor="#2563eb" />
    );
    expect(getByText('Amoxicillin')).toBeTruthy();
  });

  it('calls onPress with the item when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SuggestionItem item={MOCK_ENTRY} lang="en" onPress={onPress} schemeColor="#2563eb" />
    );
    fireEvent.press(getByText('Metformin'));
    expect(onPress).toHaveBeenCalledWith(MOCK_ENTRY);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not throw when schemeColor has alpha suffix', () => {
    expect(() =>
      render(<SuggestionItem item={MOCK_ENTRY} lang="en" onPress={jest.fn()} schemeColor="#2563eb" />)
    ).not.toThrow();
  });
});
