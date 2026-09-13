import { resolveNotificationTarget } from '../notificationRouting';

describe('resolveNotificationTarget', () => {
  describe('the two ways in agree', () => {
    // The push payload sends every value as a string; the in-app list sends
    // real JSON. The same notification has to land on the same screen.
    const live = { type: 'activity_live_started', url: '/live/258' };

    it('routes a live broadcast from a push payload', () => {
      expect(resolveNotificationTarget({ ...live, data: { activity_id: '258' } })).toEqual({
        screen: 'LiveSpectator',
        params: { activityId: 258 },
      });
    });

    it('routes the same one from the notifications list', () => {
      expect(resolveNotificationTarget({ ...live, data: { activity_id: 258 } })).toEqual({
        screen: 'LiveSpectator',
        params: { activityId: 258 },
      });
    });
  });

  it('prefers the id over the path, so a route rename cannot break it', () => {
    expect(
      resolveNotificationTarget({
        type: 'activity_live_started',
        url: '/some/renamed/path/258',
        data: { activity_id: 258 },
      }),
    ).toEqual({ screen: 'LiveSpectator', params: { activityId: 258 } });
  });

  it('sends a started session to the activity, not to the live screen', () => {
    expect(
      resolveNotificationTarget({ type: 'activity_started', data: { activity_id: '77' } }),
    ).toEqual({ screen: 'ActivityDetail', params: { activityId: 77 } });
  });

  it('understands /live/{id} from a url alone', () => {
    expect(resolveNotificationTarget({ url: '/live/12' })).toEqual({
      screen: 'LiveSpectator',
      params: { activityId: 12 },
    });
  });

  it.each([
    ['/@sebastian_tarka', { screen: 'UserProfile', params: { username: 'sebastian_tarka' } }],
    ['/posts/9', { screen: 'PostDetail', params: { postId: 9, focusComments: false } }],
    ['/activities/4', { screen: 'ActivityDetail', params: { activityId: 4 } }],
    ['/events/5', { screen: 'EventDetail', params: { eventId: 5 } }],
    ['/goals/6', { screen: 'GoalDetail', params: { goalId: 6 } }],
    ['/goals', { screen: 'Goals' }],
    ['/messages?conversation=3', { screen: 'Chat', params: { conversationId: 3 } }],
    ['/messages', { screen: 'ConversationsList' }],
  ])('parses %s', (url, expected) => {
    expect(resolveNotificationTarget({ url })).toEqual(expected);
  });

  it('opens comments when the url asks for them', () => {
    expect(resolveNotificationTarget({ url: '/posts/9#comments' })).toEqual({
      screen: 'PostDetail',
      params: { postId: 9, focusComments: true },
    });
  });

  it('falls back to the type when there is no url', () => {
    expect(
      resolveNotificationTarget({
        type: 'comments',
        data: { commentable_type: 'post', post_id: 2 },
      }),
    ).toEqual({ screen: 'PostDetail', params: { postId: 2, focusComments: true } });
  });

  it('falls back to the type when the url is one nobody taught it', () => {
    expect(
      resolveNotificationTarget({
        type: 'boosts',
        url: '/something/new',
        data: { activity_id: 31 },
      }),
    ).toEqual({ screen: 'ActivityDetail', params: { activityId: 31 } });
  });

  it('sends a goal notification without an id to the goals list', () => {
    expect(resolveNotificationTarget({ type: 'goal_achieved', data: {} })).toEqual({
      screen: 'Goals',
    });
  });

  it('returns nothing for a type it does not know, rather than guessing', () => {
    expect(resolveNotificationTarget({ type: 'something_new', data: {} })).toBeNull();
  });

  it('returns nothing when the id is unusable', () => {
    expect(
      resolveNotificationTarget({ type: 'activity_live_started', data: { activity_id: 'abc' } }),
    ).toBeNull();
  });
});
