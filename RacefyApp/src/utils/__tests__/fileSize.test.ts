import { formatFileSize } from '../fileSize';

describe('formatFileSize', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [24_000, '24 KB'],
    [999_499, '999 KB'],
    [1_300_000, '1.3 MB'],
    [10_000_000, '10 MB'],
    [2_000_000_000, '2 GB'],
  ])('%d bytes → %s', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });

  it('returns an empty string for nonsense', () => {
    expect(formatFileSize(-1)).toBe('');
    expect(formatFileSize(Number.NaN)).toBe('');
  });
});
