import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SearchBar from '../app/components/SearchBar';

function renderSearchBar(overrides: Partial<React.ComponentProps<typeof SearchBar>> = {}) {
  return render(
    <SearchBar
      value=""
      onChangeText={jest.fn()}
      placeholder="Search..."
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
});
