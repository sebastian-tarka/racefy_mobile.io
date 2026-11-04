import {
  buildMediaItems,
  fullUrlOf,
  photoMediaItem,
  previewUrlOf,
  videoMediaItem,
} from '../FeedCard.utils';
import type { Media, Photo, Post, Video } from '../../types/api';

jest.mock('../../config/api', () => ({
  fixStorageUrl: (url: string | null | undefined) => (url ? `fixed:${url}` : null),
}));

const photo = (id: number, overrides: Partial<Photo> = {}): Photo => ({
  id,
  user_id: 1,
  path: `photos/${id}.jpg`,
  filename: `${id}.jpg`,
  mime_type: 'image/jpeg',
  size: 3_000_000,
  width: 4000,
  height: 3000,
  caption: null,
  url: `https://s/photos/${id}.jpg`,
  variants: {
    thumb: `https://s/photos/${id}/thumb.webp`,
    small: `https://s/photos/${id}/small.webp`,
    medium: `https://s/photos/${id}/medium.webp`,
    large: `https://s/photos/${id}/large.webp`,
    xlarge: `https://s/photos/${id}/xlarge.webp`,
  },
  ...overrides,
});

const video = (id: number, overrides: Partial<Video> = {}): Video => ({
  id,
  url: `https://s/videos/${id}.mp4`,
  thumbnail_url: `https://s/videos/${id}.jpg`,
  thumbnail_variants: {
    thumb: `https://s/videos/${id}/thumb.webp`,
    small: `https://s/videos/${id}/small.webp`,
    medium: `https://s/videos/${id}/medium.webp`,
  },
  filename: `${id}.mp4`,
  mime_type: 'video/mp4',
  size: 10_000_000,
  width: 1920,
  height: 1080,
  duration: 12,
  caption: null,
  order: 0,
  created_at: '2026-11-04T10:00:00Z',
  ...overrides,
});

describe('photoMediaItem', () => {
  it('maps the three display sizes from the variants map', () => {
    const item = photoMediaItem(photo(1));
    expect(item).toMatchObject({
      id: 1,
      type: 'image',
      url: 'fixed:https://s/photos/1.jpg',
      thumbnailUrl: 'fixed:https://s/photos/1/medium.webp',
      previewUrl: 'fixed:https://s/photos/1/large.webp',
      fullUrl: 'fixed:https://s/photos/1/xlarge.webp',
    });
    expect(previewUrlOf(item)).toBe('fixed:https://s/photos/1/large.webp');
    expect(fullUrlOf(item)).toBe('fixed:https://s/photos/1/xlarge.webp');
  });

  it('leaves the sized URLs empty when variants are missing, so everything uses the original', () => {
    const item = photoMediaItem(photo(2, { variants: null }));
    expect(item.thumbnailUrl).toBeNull();
    expect(item.previewUrl).toBeNull();
    expect(item.fullUrl).toBeNull();
    expect(previewUrlOf(item)).toBe('fixed:https://s/photos/2.jpg');
    expect(fullUrlOf(item)).toBe('fixed:https://s/photos/2.jpg');

    const legacy = photoMediaItem({ ...photo(3), variants: undefined });
    expect(previewUrlOf(legacy)).toBe('fixed:https://s/photos/3.jpg');
  });

  it('steps down when the original was too small for the bigger variants', () => {
    const item = photoMediaItem(photo(4, { variants: { thumb: 'T', small: 'S', medium: 'M' } }));
    expect(item.thumbnailUrl).toBe('fixed:M');
    expect(item.previewUrl).toBe('fixed:M');
    expect(item.fullUrl).toBeNull();
    expect(fullUrlOf(item)).toBe('fixed:https://s/photos/4.jpg');
  });
});

describe('videoMediaItem', () => {
  it('uses the medium poster variant and keeps the aspect ratio', () => {
    const item = videoMediaItem(video(7));
    expect(item).toMatchObject({
      type: 'video',
      url: 'fixed:https://s/videos/7.mp4',
      thumbnailUrl: 'fixed:https://s/videos/7/medium.webp',
      aspectRatio: 1920 / 1080,
    });
    expect(item.fullUrl).toBeUndefined();
    expect(fullUrlOf(item)).toBe('fixed:https://s/videos/7.mp4');
  });

  it('falls back to thumbnail_url, then to nothing', () => {
    expect(videoMediaItem(video(8, { thumbnail_variants: null })).thumbnailUrl).toBe(
      'fixed:https://s/videos/8.jpg',
    );
    expect(
      videoMediaItem(video(9, { thumbnail_variants: null, thumbnail_url: null })).thumbnailUrl,
    ).toBeNull();
  });
});

describe('buildMediaItems', () => {
  const media: Media[] = [
    {
      id: 20,
      user_id: 1,
      type: 'image',
      path: 'm/20.jpg',
      filename: '20.jpg',
      mime_type: 'image/jpeg',
      size: 1,
      width: 1000,
      height: 500,
      duration: null,
      thumbnail_url: null,
      caption: null,
      url: 'https://s/m/20.jpg',
      variants: { medium: 'https://s/m/20/medium.webp', large: 'https://s/m/20/large.webp' },
    },
    {
      id: 21,
      user_id: 1,
      type: 'video',
      path: 'm/21.mp4',
      filename: '21.mp4',
      mime_type: 'video/mp4',
      size: 1,
      width: 1280,
      height: 720,
      duration: 5,
      thumbnail_url: 'https://s/m/21.jpg',
      caption: null,
      url: 'https://s/m/21.mp4',
      thumbnail_variants: { small: 'https://s/m/21/small.webp' },
    },
  ];

  it('keeps the order videos → photos → media and sizes each kind', () => {
    const post = { id: 1, videos: [video(7)], photos: [photo(1)], media } as unknown as Post;
    const items = buildMediaItems(post);
    expect(items.map((i) => `${i.type}:${i.id}`)).toEqual([
      'video:7',
      'image:1',
      'image:20',
      'video:21',
    ]);
    expect(items[2]).toMatchObject({
      thumbnailUrl: 'fixed:https://s/m/20/medium.webp',
      previewUrl: 'fixed:https://s/m/20/large.webp',
      fullUrl: 'fixed:https://s/m/20/large.webp',
      aspectRatio: 2,
    });
    expect(items[3]).toMatchObject({
      type: 'video',
      thumbnailUrl: 'fixed:https://s/m/21/small.webp',
      aspectRatio: 1280 / 720,
    });
  });

  it('returns an empty list for a post without media', () => {
    expect(buildMediaItems({ id: 2 } as unknown as Post)).toEqual([]);
  });
});
