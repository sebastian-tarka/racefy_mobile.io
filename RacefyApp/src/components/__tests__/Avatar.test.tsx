import React from 'react';
import { PixelRatio } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Avatar } from '../Avatar';
import { avatarSizes } from '../../theme';
import type { ImageVariants } from '../../types/api';

jest.mock('expo-image', () => {
  const ReactLib = require('react');
  return {
    Image: (props: { source: { uri: string } }) =>
      ReactLib.createElement('ExpoImage', { testID: 'avatar-image', uri: props.source.uri }),
  };
});
jest.mock('../TierBadge', () => ({ TierBadge: () => null }));
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({ colors: new Proxy({}, { get: () => '#000' }) }),
}));

const variants: ImageVariants = {
  thumb: 'https://cdn/a/thumb.webp',
  small: 'https://cdn/a/small.webp',
  medium: 'https://cdn/a/medium.webp',
};
const original = 'https://cdn/a/original.jpg';

/** The variant the ladder (thumb 50 / small 100 / medium 200) should pick for a size. */
function expectedFor(size: keyof typeof avatarSizes, ratio: number): string {
  const px = avatarSizes[size] * ratio;
  if (px <= 50) return variants.thumb!;
  if (px <= 100) return variants.small!;
  return variants.medium!;
}

afterEach(() => jest.restoreAllMocks());

describe('Avatar', () => {
  it('loads the smallest variant that covers the rendered size on this screen', () => {
    jest.spyOn(PixelRatio, 'get').mockReturnValue(2);
    render(<Avatar uri={original} variants={variants} name="Ala" size="sm" />);
    const uri = screen.getByTestId('avatar-image').props.uri;
    expect(uri).toBe(expectedFor('sm', 2));
    expect(uri).not.toBe(original);
  });

  it('goes up the ladder for big avatars and dense screens', () => {
    jest.spyOn(PixelRatio, 'get').mockReturnValue(3);
    render(<Avatar uri={original} variants={variants} name="Ala" size="xxl" />);
    expect(screen.getByTestId('avatar-image').props.uri).toBe(variants.medium);
  });

  it('falls back to the original when variants are null (not generated / anonymised)', () => {
    render(<Avatar uri={original} variants={null} name="Ala" size="md" />);
    expect(screen.getByTestId('avatar-image').props.uri).toBe(original);
  });

  it('works for call sites that pass no variants at all', () => {
    render(<Avatar uri={original} name="Ala" size="md" />);
    expect(screen.getByTestId('avatar-image').props.uri).toBe(original);
  });

  it('shows the initial when there is no avatar, even if a stale variants map is present', () => {
    render(<Avatar uri={null} variants={null} name="Ala" size="md" />);
    expect(screen.queryByTestId('avatar-image')).toBeNull();
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('still shows a variant when only the variants map is given', () => {
    jest.spyOn(PixelRatio, 'get').mockReturnValue(2);
    render(<Avatar variants={variants} name="Ala" size="sm" />);
    expect(screen.getByTestId('avatar-image').props.uri).toBe(expectedFor('sm', 2));
  });
});
