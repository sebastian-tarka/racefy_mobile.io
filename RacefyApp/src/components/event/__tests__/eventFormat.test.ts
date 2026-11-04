import { pickEventCoverUrl } from '../eventFormat';
import type { Event } from '../../../types/api';

jest.mock('../../../config/api', () => ({
  fixStorageUrl: (url: string | null | undefined) => (url ? `fixed:${url}` : null),
}));

describe('pickEventCoverUrl', () => {
  it('prefers the mobile variant of an AI cover', () => {
    expect(
      pickEventCoverUrl({
        cover_variants: { medium: 'M', large: 'L', mobile: 'MOB' },
        cover_image_url: 'orig',
      }),
    ).toBe('fixed:MOB');
  });

  it('takes medium, then large, for ordinary covers', () => {
    expect(pickEventCoverUrl({ cover_variants: { thumb: 'T', medium: 'M', large: 'L' } })).toBe(
      'fixed:M',
    );
    expect(pickEventCoverUrl({ cover_variants: { thumb: 'T', large: 'L' } })).toBe('fixed:L');
    expect(pickEventCoverUrl({ cover_variants: { thumb: 'T' } })).toBe('fixed:T');
  });

  it('falls back to the full cover when variants are null or empty', () => {
    expect(pickEventCoverUrl({ cover_variants: null, cover_image_url: 'orig' })).toBe('fixed:orig');
    expect(pickEventCoverUrl({ cover_variants: {}, cover_image_url: 'orig' })).toBe('fixed:orig');
  });

  it('accepts the slim home-section shape with only cover_image_url', () => {
    expect(pickEventCoverUrl({ cover_image_url: 'orig' })).toBe('fixed:orig');
    expect(pickEventCoverUrl({})).toBeNull();
  });

  it('uses the first post photo as the last resort', () => {
    const post = { photos: [{ url: 'photo1' }] } as unknown as Event['post'];
    expect(pickEventCoverUrl({ cover_image_url: null, post })).toBe('fixed:photo1');
  });
});
