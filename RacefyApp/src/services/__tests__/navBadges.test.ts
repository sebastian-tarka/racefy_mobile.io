import {
  clearNavBadges,
  getNavBadges,
  markNavSectionSeen,
  refreshNavBadges,
  subscribeNavBadges,
} from '../navBadges';
import { api } from '../api';
import type { BadgesResponse } from '../../types/api';

jest.mock('../api', () => ({
  api: { getBadges: jest.fn(), markBadgeSectionSeen: jest.fn() },
}));
jest.mock('../logger', () => ({ logger: { debug: jest.fn() } }));

const mockedApi = api as jest.Mocked<typeof api>;

const badges = (sections: Partial<BadgesResponse['sections']> = {}): BadgesResponse => ({
  notifications_unread: 0,
  messages_unread: 0,
  team_invitations: 0,
  team_join_requests: 0,
  drafts: 0,
  follow_requests: 0,
  sections: { events: 0, ai_reports: 0, activities: 0, goals: 0, feedback: 0, ...sections },
  workout_session_active: false,
});

const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  jest.clearAllMocks();
  clearNavBadges();
});

it('loads badges and tells subscribers', async () => {
  const listener = jest.fn();
  const unsubscribe = subscribeNavBadges(listener);
  mockedApi.getBadges.mockResolvedValueOnce(badges({ events: 3 }));

  await refreshNavBadges();

  expect(getNavBadges()?.sections.events).toBe(3);
  expect(listener).toHaveBeenCalled();
  unsubscribe();
});

it('shares one request between concurrent refreshes', async () => {
  mockedApi.getBadges.mockResolvedValue(badges());
  await Promise.all([refreshNavBadges(), refreshNavBadges()]);
  expect(mockedApi.getBadges).toHaveBeenCalledTimes(1);
});

it('keeps the last badges when a refresh fails', async () => {
  mockedApi.getBadges.mockResolvedValueOnce(badges({ goals: 2 }));
  await refreshNavBadges();
  mockedApi.getBadges.mockRejectedValueOnce(new Error('offline'));
  await refreshNavBadges();
  expect(getNavBadges()?.sections.goals).toBe(2);
});

it('clears a section at once and takes the server answer', async () => {
  mockedApi.getBadges.mockResolvedValueOnce(badges({ events: 3, goals: 1 }));
  await refreshNavBadges();
  mockedApi.markBadgeSectionSeen.mockResolvedValueOnce(badges({ goals: 1, feedback: 4 }));

  markNavSectionSeen('events');

  expect(getNavBadges()?.sections.events).toBe(0);
  expect(mockedApi.markBadgeSectionSeen).toHaveBeenCalledWith('events');
  await flush();
  expect(getNavBadges()?.sections.feedback).toBe(4);
});

it('does not report a section with nothing new', async () => {
  mockedApi.getBadges.mockResolvedValueOnce(badges({ events: 0 }));
  await refreshNavBadges();
  markNavSectionSeen('events');
  expect(mockedApi.markBadgeSectionSeen).not.toHaveBeenCalled();
});

it('does nothing before the first load', () => {
  markNavSectionSeen('events');
  expect(mockedApi.markBadgeSectionSeen).not.toHaveBeenCalled();
});
