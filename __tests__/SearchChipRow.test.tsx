import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SearchChipRow from '../app/components/SearchChipRow';

describe('SearchChipRow', () => {
  it('renders nothing when queries are empty', () => {
    const { toJSON } = render(
      <SearchChipRow
        title="Try searching"
        queries={[]}
        schemeColor="#2563eb"
        isRTL={false}
        onSelect={jest.fn()}
      />
    );
    expect(toJSON()).toBeNull();
  });

  it('calls onSelect when a chip is pressed', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <SearchChipRow
        title="Try searching"
        queries={['metformin']}
        schemeColor="#2563eb"
        isRTL={false}
        onSelect={onSelect}
      />
    );
    fireEvent.press(getByText('metformin'));
    expect(onSelect).toHaveBeenCalledWith('metformin');
  });
});
