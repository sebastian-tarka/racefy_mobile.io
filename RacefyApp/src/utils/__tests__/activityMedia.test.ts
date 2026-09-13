import { mergeActivityPhotos, mergeActivityVideos } from '../activityMedia';
import type { Activity, Photo, Post, Video } from '../../types/api';

const photo = (id: number, order?: number): Photo =>
  ({ id, order, url: `https://cdn/${id}.jpg` }) as Photo;

const video = (id: number, order?: number): Video =>
  ({ id, order, url: `https://cdn/${id}.mp4` }) as Video;

const post = (photos: Photo[], activityPhotos?: Photo[]): Post =>
  ({
    photos,
    videos: [],
    activity: activityPhotos ? ({ photos: activityPhotos } as Activity) : undefined,
  }) as unknown as Post;

describe('mergeActivityPhotos', () => {
  it('reads the activity side when the post side is empty — the normal case after the move', () => {
    const merged = mergeActivityPhotos(post([], [photo(17, 0), photo(19, 1), photo(20, 2)]));
    expect(merged.map((p) => p.id)).toEqual([17, 19, 20]);
  });

  it('still reads the post side, which the mediaOwner fallback can write to', () => {
    const merged = mergeActivityPhotos(post([photo(5)], undefined));
    expect(merged.map((p) => p.id)).toEqual([5]);
  });

  it('orders the merged set by `order`, not by which side it came from', () => {
    const merged = mergeActivityPhotos(post([photo(90, 3)], [photo(17, 0), photo(20, 2)]));
    expect(merged.map((p) => p.id)).toEqual([17, 20, 90]);
  });

  it('keeps one copy when the same row arrives on both sides mid-rollout', () => {
    const merged = mergeActivityPhotos(post([photo(17, 0)], [photo(17, 0), photo(19, 1)]));
    expect(merged.map((p) => p.id)).toEqual([17, 19]);
  });

  it('keeps API order for rows without an explicit one', () => {
    const merged = mergeActivityPhotos(post([], [photo(31), photo(12), photo(24)]));
    expect(merged.map((p) => p.id)).toEqual([31, 12, 24]);
  });

  it('puts ordered rows before unordered ones rather than dropping either', () => {
    const merged = mergeActivityPhotos(post([photo(88)], [photo(17, 0)]));
    expect(merged.map((p) => p.id)).toEqual([17, 88]);
  });

  it('returns an empty list when neither side has anything', () => {
    expect(mergeActivityPhotos(post([], []))).toEqual([]);
  });
});

describe('mergeActivityVideos', () => {
  it('merges both sides the same way photos do', () => {
    const carrier = {
      photos: [],
      videos: [video(3, 1)],
      activity: { videos: [video(2, 0)] } as Activity,
    } as unknown as Post;
    expect(mergeActivityVideos(carrier).map((v) => v.id)).toEqual([2, 3]);
  });
});
