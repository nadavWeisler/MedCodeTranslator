jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { NoteField } from '../app/components/CodeListsPanel';

describe('NoteField', () => {
  it('follows a restored note instead of committing the previous draft', () => {
    const onCommit = jest.fn();
    const { getByPlaceholderText, rerender } = render(
      <NoteField value="saved" placeholder="Code note" textAlign="left" onCommit={onCommit} />
    );
    const input = getByPlaceholderText('Code note');
    fireEvent.changeText(input, 'newer draft');

    rerender(
      <NoteField value="loaded from file" placeholder="Code note" textAlign="left" onCommit={onCommit} />
    );

    expect(getByPlaceholderText('Code note').props.value).toBe('loaded from file');
    fireEvent(getByPlaceholderText('Code note'), 'endEditing');
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('commits a note the user edited when the stored value did not change', () => {
    const onCommit = jest.fn();
    const { getByPlaceholderText } = render(
      <NoteField value="saved" placeholder="Code note" textAlign="left" onCommit={onCommit} />
    );
    fireEvent.changeText(getByPlaceholderText('Code note'), 'edited');
    fireEvent(getByPlaceholderText('Code note'), 'endEditing');
    expect(onCommit).toHaveBeenCalledWith('edited');
  });
});
