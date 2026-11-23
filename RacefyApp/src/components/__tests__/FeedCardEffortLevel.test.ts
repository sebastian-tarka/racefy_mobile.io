import { getEffortLevel } from '../FeedCard.utils';

// jest.mock is hoisted above the import by babel-jest.
jest.mock('../../services/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('getEffortLevel', () => {
  it('gives no effort badge to an activity without distance (strength training)', () => {
    // The API sends distance: null for strength sessions — pace would be Infinity → "Easy".
    expect(getEffortLevel('Strength Training', null as unknown as number, 435)).toBeNull();
    expect(getEffortLevel('Strength Training', 0, 435)).toBeNull();
  });

  it('grades a run by pace', () => {
    expect(getEffortLevel('Running', 5000, 5000 * 0.3)).toEqual({ label: 'Hard', emoji: '😤' });
    expect(getEffortLevel('Running', 5000, 5000 * 0.8)).toEqual({ label: 'Easy', emoji: '😊' });
  });
});
