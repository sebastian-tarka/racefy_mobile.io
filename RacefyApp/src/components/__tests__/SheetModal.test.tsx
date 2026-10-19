import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SheetModal } from '../SheetModal';

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({ colors: { cardBackground: '#fff', border: '#ccc' } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

describe('SheetModal', () => {
  it('renders its content when visible', () => {
    render(
      <SheetModal visible onClose={jest.fn()}>
        <Text>Sheet body</Text>
      </SheetModal>,
    );
    expect(screen.getByText('Sheet body')).toBeTruthy();
  });

  it('renders nothing when hidden', () => {
    render(
      <SheetModal visible={false} onClose={jest.fn()}>
        <Text>Sheet body</Text>
      </SheetModal>,
    );
    expect(screen.queryByText('Sheet body')).toBeNull();
  });

  it('closes on a backdrop tap but not on a tap inside the sheet', () => {
    const onClose = jest.fn();
    const { UNSAFE_root } = render(
      <SheetModal visible onClose={onClose}>
        <Text>Sheet body</Text>
      </SheetModal>,
    );
    fireEvent.press(screen.getByText('Sheet body'));
    expect(onClose).not.toHaveBeenCalled();

    // The outermost touchable is the backdrop.
    const touchables = UNSAFE_root.findAll(
      (n: any) => typeof n.props.onPress === 'function' && n.props.onPress === onClose,
    );
    fireEvent.press(touchables[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
