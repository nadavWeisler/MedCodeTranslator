import React from 'react';
import { render } from '@testing-library/react-native';
import BrandMark from '../app/components/BrandMark';

describe('BrandMark', () => {
  it('renders the MedCode Clinical wordmark', () => {
    const { getByText } = render(<BrandMark />);
    expect(getByText(/MedCode/)).toBeTruthy();
    expect(getByText(/Clinical/)).toBeTruthy();
  });

  it('renders optional subtitle', () => {
    const { getByText } = render(<BrandMark subtitle="Trusted clinical coding reference" />);
    expect(getByText('Trusted clinical coding reference')).toBeTruthy();
  });
});
