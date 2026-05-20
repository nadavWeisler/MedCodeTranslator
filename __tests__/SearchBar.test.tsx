import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import SearchBar from '../app/components/SearchBar';
import type { CodeEntry } from '../db/queries';

const SUGGESTIONS: CodeEntry[] = [
  { code: 'A10BA02', name_en: 'Metformin', name_he: 'מטפורמין' },
  { code: 'A10BB01', name_en: 'Glibenclamide', name_he: null },
];

function renderSearchBar(overrides: Partial<React.ComponentProps<typeof SearchBar>> = {}) {
  return render(
    <SearchBar
      value=""
      onChangeText={jest.fn()}
      placeholder="Search..."
      suggestions={[]}
      onSuggestionSelect={jest.fn()}
      schemeColor="#2563eb"
      lang="en"
      {...overrides}
    />
  );
}

describe('SearchBar', () => {
  it('renders without crashing', () => {
    expect(() => renderSearchBar()).not.toThrow();
  });

  it('renders the search input', () => {
    const { getByLabelText } = renderSearchBar();
    expect(getByLabelText('Search input')).toBeTruthy();
  });

  it('renders the placeholder text', () => {
    const { getByPlaceholderText } = renderSearchBar({ placeholder: 'Type a code…' });
    expect(getByPlaceholderText('Type a code…')).toBeTruthy();
  });

  it('calls onChangeText when user types', () => {
    const onChangeText = jest.fn();
    const { getByLabelText } = renderSearchBar({ onChangeText });
    fireEvent.changeText(getByLabelText('Search input'), 'met');
    expect(onChangeText).toHaveBeenCalledWith('met');
  });

  it('does NOT show dropdown when value has fewer than 2 chars', () => {
    const { queryByText } = renderSearchBar({
      value: 'm',
      suggestions: SUGGESTIONS,
    });
    expect(queryByText('Metformin')).toBeNull();
  });

  it('does NOT show dropdown when not focused (no suggestions visible)', () => {
    // Initially not focused — dropdown should not appear
    const { queryByText } = renderSearchBar({
      value: 'met',
      suggestions: SUGGESTIONS,
    });
    expect(queryByText('Metformin')).toBeNull();
  });

  it('shows dropdown with suggestions when focused and value >= 2 chars', async () => {
    const { getByLabelText, getByText } = renderSearchBar({
      value: 'met',
      suggestions: SUGGESTIONS,
    });
    const input = getByLabelText('Search input');
    await act(async () => { fireEvent(input, 'focus'); });
    expect(getByText('Metformin')).toBeTruthy();
    expect(getByText('A10BA02')).toBeTruthy();
  });

  it('calls onSuggestionSelect with correct item when suggestion tapped', async () => {
    const onSuggestionSelect = jest.fn();
    const { getByLabelText, getByText } = renderSearchBar({
      value: 'met',
      suggestions: SUGGESTIONS,
      onSuggestionSelect,
    });
    await act(async () => { fireEvent(getByLabelText('Search input'), 'focus'); });
    fireEvent.press(getByText('Metformin'));
    expect(onSuggestionSelect).toHaveBeenCalledWith(SUGGESTIONS[0]);
  });

  it('shows clear button when value is non-empty', () => {
    const { getByLabelText } = renderSearchBar({ value: 'met' });
    expect(getByLabelText('Clear search')).toBeTruthy();
  });

  it('does NOT show clear button when value is empty', () => {
    const { queryByLabelText } = renderSearchBar({ value: '' });
    expect(queryByLabelText('Clear search')).toBeNull();
  });

  it('calls onChangeText with empty string when clear button pressed', () => {
    const onChangeText = jest.fn();
    const { getByLabelText } = renderSearchBar({ value: 'met', onChangeText });
    fireEvent.press(getByLabelText('Clear search'));
    expect(onChangeText).toHaveBeenCalledWith('');
  });

  it('hides dropdown after blur (with delay)', async () => {
    jest.useFakeTimers();
    const { getByLabelText, queryByText } = renderSearchBar({
      value: 'met',
      suggestions: SUGGESTIONS,
    });
    const input = getByLabelText('Search input');
    await act(async () => { fireEvent(input, 'focus'); });
    await act(async () => { fireEvent(input, 'blur'); });
    act(() => { jest.advanceTimersByTime(300); });
    expect(queryByText('Metformin')).toBeNull();
    jest.useRealTimers();
  });
});
