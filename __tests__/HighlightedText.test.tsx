import React from 'react';
import { render } from '@testing-library/react-native';
import HighlightedText, { mergeHighlightRanges } from '../app/components/HighlightedText';

describe('mergeHighlightRanges', () => {
  it('merges overlapping ranges', () => {
    expect(mergeHighlightRanges([[0, 3], [2, 5]])).toEqual([[0, 5]]);
  });

  it('keeps separate ranges when non-adjacent', () => {
    expect(mergeHighlightRanges([[0, 2], [5, 7]])).toEqual([[0, 2], [5, 7]]);
  });
});

describe('HighlightedText', () => {
  it('renders plain text when no highlights', () => {
    const { getByText } = render(<HighlightedText text="Metformin" />);
    expect(getByText('Metformin')).toBeTruthy();
  });

  it('renders highlighted segments', () => {
    const { getByText } = render(
      <HighlightedText text="Metformin" highlights={[[0, 3]]} />
    );
    expect(getByText('Metf')).toBeTruthy();
    expect(getByText('ormin')).toBeTruthy();
  });
});
