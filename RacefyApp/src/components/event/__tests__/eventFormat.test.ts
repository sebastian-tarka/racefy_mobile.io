import { pickEventCoverUrl } from '../eventFormat';
import type { Event } from '../../../types/api';

jest.mock('../../../config/api', () => ({
  fixStorageUrl: (url: string | null | undefined) => (url ? `fixed:${url}` : null),
}));

const T = 'https://cdn/cover/thumb.webp';
const M = 'https://cdn/cover/medium.webp';
const L = 'https://cdn/cover/large.webp';
const MOB = 'https://cdn/cover/mobile.webp';
const ORIG = 'https://cdn/cover/original.jpg';

describe('pickEventCoverUrl', () => {
  it('prefers the mobile variant of an AI cover', () => {
    expect(
      pickEventCoverUrl({
        cover_variants: { medium: M, large: L, mobile: MOB },
        cover_image_url: ORIG,
      }),
    ).toBe(`fixed:${MOB}`);
  });

  it('takes medium, then large, then any other size, for ordinary covers', () => {
    expect(pickEventCoverUrl({ cover_variants: { thumb: T, medium: M, large: L } })).toBe(
      `fixed:${M}`,
    );
    expect(pickEventCoverUrl({ cover_variants: { thumb: T, large: L } })).toBe(`fixed:${L}`);
    expect(pickEventCoverUrl({ cover_variants: { thumb: T } })).toBe(`fixed:${T}`);
  });

  it('falls back to the full cover when variants are null or empty', () => {
    expect(pickEventCoverUrl({ cover_variants: null, cover_image_url: ORIG })).toBe(
      `fixed:${ORIG}`,
    );
    expect(pickEventCoverUrl({ cover_variants: {}, cover_image_url: ORIG })).toBe(`fixed:${ORIG}`);
  });

  it('ignores variants that are storage paths, not URLs (raw model from /home)', () => {
    expect(
      pickEventCoverUrl({
        cover_variants: {
          thumb: 'events/41/variants/x-thumb.webp',
          medium: 'events/41/variants/x-medium.webp',
          large: 'events/41/variants/x-large.webp',
        },
        cover_image_url: ORIG,
      }),
    ).toBe(`fixed:${ORIG}`);
  });

  it('keeps root-relative variant URLs, which fixStorageUrl resolves', () => {
    expect(
      pickEventCoverUrl({
        cover_variants: { medium: '/storage/events/41/variants/x-medium.webp' },
        cover_image_url: ORIG,
      }),
    ).toBe('fixed:/storage/events/41/variants/x-medium.webp');
  });

  it('accepts the slim home-section shape with only cover_image_url', () => {
    expect(pickEventCoverUrl({ cover_image_url: ORIG })).toBe(`fixed:${ORIG}`);
    expect(pickEventCoverUrl({})).toBeNull();
  });

  it('uses the first post photo as the last resort', () => {
    const post = { photos: [{ url: 'https://cdn/photo1.jpg' }] } as unknown as Event['post'];
    expect(pickEventCoverUrl({ cover_image_url: null, post })).toBe('fixed:https://cdn/photo1.jpg');
  });
});
