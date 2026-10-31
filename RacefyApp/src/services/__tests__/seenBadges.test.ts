import { getSeenBadges, markBadgeSeen, subscribeSeenBadges } from '../seenBadges';
import { api } from '../api';
import { logger } from '../logger';
import type { BadgeReward } from '../../types/api';

jest.mock('../api', () => ({ api: { markBadgeViewed: jest.fn() } }));
jest.mock('../logger', () => ({ logger: { debug: jest.fn() } }));

const mockedApi = api as jest.Mocked<typeof api>;

const reward = (id: string, is_new = true) =>
  ({ id, reward_type: 'badge', is_new }) as unknown as BadgeReward;

const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => jest.clearAllMocks());

it('marks a new badge seen at once and reports it to the server', () => {
  mockedApi.markBadgeViewed.mockResolvedValueOnce(undefined);
  const listener = jest.fn();
  const unsubscribe = subscribeSeenBadges(listener);

  markBadgeSeen(reward('badge_1'));

  expect(getSeenBadges().has('badge_1')).toBe(true);
  expect(listener).toHaveBeenCalledTimes(1);
  expect(mockedApi.markBadgeViewed).toHaveBeenCalledWith('badge_1');
  unsubscribe();
});

it('reports a badge only once', () => {
  mockedApi.markBadgeViewed.mockResolvedValue(undefined);
  markBadgeSeen(reward('badge_2'));
  markBadgeSeen(reward('badge_2'));
  expect(mockedApi.markBadgeViewed).toHaveBeenCalledTimes(1);
});

it('ignores a badge that is not new', () => {
  markBadgeSeen(reward('badge_3', false));
  expect(getSeenBadges().has('badge_3')).toBe(false);
  expect(mockedApi.markBadgeViewed).not.toHaveBeenCalled();
});

it('keeps the badge seen locally when the server call fails', async () => {
  mockedApi.markBadgeViewed.mockRejectedValueOnce(new Error('HTTP 404'));
  markBadgeSeen(reward('badge_4'));
  await flush();
  expect(getSeenBadges().has('badge_4')).toBe(true);
  expect(logger.debug).toHaveBeenCalled();
});
