import { Dimensions, PixelRatio } from 'react-native';
import {
  AVATAR_LADDER,
  PHOTO_LADDER,
  pickBackgroundUrl,
  pickFullSizeUrl,
  pickRouteMapUrl,
  pickVariant,
  pickVariantForWidth,
} from '../imageVariants';
import type { ImageVariants } from '../../types/api';

const photo: ImageVariants = {
  thumb: 'https://cdn/photo/thumb.webp',
  small: 'https://cdn/photo/small.webp',
  medium: 'https://cdn/photo/medium.webp',
  large: 'https://cdn/photo/large.webp',
  xlarge: 'https://cdn/photo/xlarge.webp',
};

const avatar: ImageVariants = {
  thumb: 'https://cdn/avatar/thumb.webp',
  small: 'https://cdn/avatar/small.webp',
  medium: 'https://cdn/avatar/medium.webp',
};

let pixelRatio: jest.SpyInstance;

beforeEach(() => {
  pixelRatio = jest.spyOn(PixelRatio, 'get').mockReturnValue(3);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('pickVariant', () => {
  it('returns the first preferred key that exists', () => {
    expect(pickVariant(photo, ['xlarge', 'large'], 'orig')).toBe(photo.xlarge);
    expect(pickVariant({ large: '/L' }, ['xlarge', 'large'], 'orig')).toBe('/L');
  });

  it('falls back to the original when the map is null or lacks the keys', () => {
    expect(pickVariant(null, ['medium'], 'orig')).toBe('orig');
    expect(pickVariant(undefined, ['medium'], 'orig')).toBe('orig');
    expect(pickVariant({ thumb: '/T' }, ['medium', 'large'], 'orig')).toBe('orig');
  });

  it('returns null when nothing matches and there is no fallback', () => {
    expect(pickVariant(null, ['medium'], null)).toBeNull();
    expect(pickVariant({}, ['medium'], undefined)).toBeNull();
  });

  it('skips empty strings', () => {
    expect(pickVariant({ medium: '', large: '/L' }, ['medium', 'large'], 'orig')).toBe('/L');
  });

  it('skips values that are storage paths rather than URLs', () => {
    // `/home` serialises the raw model: `cover_variants` holds `events/41/variants/x.webp`.
    const paths = {
      medium: 'events/41/variants/x-medium.webp',
      large: 'events/41/variants/x-large.webp',
    };
    expect(pickVariant(paths, ['medium', 'large'], 'orig')).toBe('orig');
    expect(
      pickVariant({ ...paths, large: '/storage/x-large.webp' }, ['medium', 'large'], 'orig'),
    ).toBe('/storage/x-large.webp');
    expect(pickVariant({ medium: 'HTTPS://cdn/x.webp' }, ['medium'], 'orig')).toBe(
      'HTTPS://cdn/x.webp',
    );
  });
});

describe('pickVariantForWidth', () => {
  it('picks the smallest variant covering the size in device pixels', () => {
    // 32 pt × 3 = 96 px → small (100) is the first step ≥ 96
    expect(pickVariantForWidth(avatar, 32, AVATAR_LADDER, 'orig')).toBe(avatar.small);
    // 16 pt × 3 = 48 px → thumb (50)
    expect(pickVariantForWidth(avatar, 16, AVATAR_LADDER, 'orig')).toBe(avatar.thumb);
    // 48 pt × 3 = 144 px → medium (200)
    expect(pickVariantForWidth(avatar, 48, AVATAR_LADDER, 'orig')).toBe(avatar.medium);
  });

  it('accounts for the pixel ratio', () => {
    pixelRatio.mockReturnValue(1);
    expect(pickVariantForWidth(avatar, 48, AVATAR_LADDER, 'orig')).toBe(avatar.thumb);
    pixelRatio.mockReturnValue(2);
    expect(pickVariantForWidth(avatar, 48, AVATAR_LADDER, 'orig')).toBe(avatar.small);
  });

  it('takes the largest variant present when none is big enough (variants never upscale)', () => {
    // 120 pt × 3 = 360 px, but the original was only ~300 px wide → no medium/large
    expect(pickVariantForWidth({ thumb: '/T', small: '/S' }, 120, PHOTO_LADDER, 'orig')).toBe('/S');
  });

  it('skips missing steps and still finds a bigger one', () => {
    expect(pickVariantForWidth({ thumb: '/T', large: '/L' }, 100, PHOTO_LADDER, 'orig')).toBe('/L');
  });

  it('treats storage paths as missing steps', () => {
    // avatar_variants of a raw-serialised user (`/home` recent_activities)
    const raw = { thumb: 'avatars/1/x-thumb.webp', small: 'avatars/1/x-small.webp' };
    expect(pickVariantForWidth(raw, 32, AVATAR_LADDER, 'orig')).toBe('orig');
    expect(pickVariantForWidth({ ...raw, medium: '/M' }, 32, AVATAR_LADDER, 'orig')).toBe('/M');
  });

  it('falls back to the original when the map is null or empty', () => {
    expect(pickVariantForWidth(null, 40, AVATAR_LADDER, 'orig')).toBe('orig');
    expect(pickVariantForWidth({}, 40, AVATAR_LADDER, 'orig')).toBe('orig');
    expect(pickVariantForWidth(undefined, 40, AVATAR_LADDER, null)).toBeNull();
  });
});

describe('pickFullSizeUrl', () => {
  it('prefers xlarge, then large, then the original', () => {
    expect(pickFullSizeUrl(photo, 'orig')).toBe(photo.xlarge);
    expect(pickFullSizeUrl({ medium: '/M', large: '/L' }, 'orig')).toBe('/L');
    expect(pickFullSizeUrl({ medium: '/M' }, 'orig')).toBe('orig');
    expect(pickFullSizeUrl(null, 'orig')).toBe('orig');
  });
});

describe('pickRouteMapUrl / pickBackgroundUrl (window-wide images)', () => {
  beforeEach(() => {
    jest
      .spyOn(Dimensions, 'get')
      .mockReturnValue({ width: 390, height: 844, scale: 3, fontScale: 1 });
  });

  it('picks the route map variant that covers the window width', () => {
    // 390 pt × 3 = 1170 px → large (1024) is the biggest present
    const variants = { thumb: '/T', small: '/S', medium: '/M', large: '/L' };
    expect(pickRouteMapUrl({ route_map_url: 'orig', route_map_variants: variants })).toBe('/L');
    pixelRatio.mockReturnValue(1);
    // 390 px → medium (640)
    expect(pickRouteMapUrl({ route_map_url: 'orig', route_map_variants: variants })).toBe('/M');
  });

  it('falls back to route_map_url and tolerates a missing source', () => {
    expect(pickRouteMapUrl({ route_map_url: 'orig', route_map_variants: null })).toBe('orig');
    expect(pickRouteMapUrl({ route_map_url: null })).toBeNull();
    expect(pickRouteMapUrl(undefined)).toBeNull();
  });

  it('picks the background variant for the window width', () => {
    const variants = { small: '/S', medium: '/M', large: '/L' };
    // 1170 px → medium (1280)
    expect(pickBackgroundUrl({ background_image_url: 'orig', background_variants: variants })).toBe(
      '/M',
    );
    expect(pickBackgroundUrl({ background_image_url: 'orig', background_variants: null })).toBe(
      'orig',
    );
    expect(pickBackgroundUrl(null)).toBeNull();
  });
});
