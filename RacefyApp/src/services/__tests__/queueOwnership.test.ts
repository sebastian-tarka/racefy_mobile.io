import { isOwnedBy, isVisibleTo } from '../queueOwnership';

describe('isOwnedBy — who may send or migrate an entry without being asked', () => {
  it('is true only when both ids are known and equal', () => {
    expect(isOwnedBy(7, 7)).toBe(true);
    expect(isOwnedBy(7, 99)).toBe(false);
  });

  it('never matches on an unknown id, on either side', () => {
    expect(isOwnedBy(null, 7)).toBe(false);
    expect(isOwnedBy(undefined, 7)).toBe(false);
    expect(isOwnedBy(7, null)).toBe(false);
    expect(isOwnedBy(null, null)).toBe(false);
  });
});

describe('isVisibleTo — what the "not sent yet" screen lists, counts, exports and discards', () => {
  it("shows the viewer's own entries and hides another account's", () => {
    expect(isVisibleTo(7, 7)).toBe(true);
    expect(isVisibleTo(7, 99)).toBe(false);
    expect(isVisibleTo(7, null)).toBe(false);
  });

  it('shows entries whose owner was never recorded, or nobody could ever recover them', () => {
    expect(isVisibleTo(null, 7)).toBe(true);
    expect(isVisibleTo(undefined, 7)).toBe(true);
  });
});
