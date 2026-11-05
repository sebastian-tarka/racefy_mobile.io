import { getStateFromPath, type LinkingOptions } from '@react-navigation/native';
import { linkId, sanitizeLinkState } from '../linkingGuards';
import type { RootStackParamList } from '../types';

describe('linkId', () => {
  it.each([
    ['5', 5],
    ['247', 247],
    [12, 12],
  ])('accepts %p', (value, id) => {
    expect(linkId(value)).toBe(id);
  });

  it.each([
    '../../profile',
    '5/../../profile',
    '5?x=1',
    '5 ',
    '05',
    '0',
    '-3',
    '1.5',
    '1e3',
    '0x10',
    '',
    '9999999999999999999',
    0,
    -1,
    1.5,
    NaN,
    Infinity,
    null,
    undefined,
    {},
    ['5'],
  ])('refuses %p', (value) => {
    expect(linkId(value)).toBeUndefined();
  });
});

describe('sanitizeLinkState', () => {
  it('keeps a Chat link with a valid id, as a number', () => {
    const state = {
      routes: [{ name: 'Chat', params: { conversationId: '42' }, path: '/messages/42' }],
    };

    expect(sanitizeLinkState(state)?.routes[0]).toMatchObject({
      name: 'Chat',
      params: { conversationId: 42 },
    });
  });

  it('drops every other param a link tries to pass to Chat', () => {
    const state = {
      routes: [
        {
          name: 'Chat',
          params: { conversationId: '42', conversation: '{"id":1}', participant: 'x', extra: '1' },
        },
      ],
    };

    expect(sanitizeLinkState(state)?.routes[0].params).toEqual({ conversationId: 42 });
  });

  it('sends a Chat link without a valid id to the conversation list', () => {
    const state = { routes: [{ name: 'Chat', params: { conversationId: '../../profile' } }] };

    expect(sanitizeLinkState(state)?.routes).toEqual([{ name: 'ConversationsList' }]);
    expect(sanitizeLinkState({ routes: [{ name: 'Chat' }] })?.routes).toEqual([
      { name: 'ConversationsList' },
    ]);
  });

  it('leaves other screens alone, nested ones included', () => {
    const state = {
      routes: [
        {
          name: 'Auth',
          state: { routes: [{ name: 'ResetPassword', params: { token: 't', email: 'a@b.c' } }] },
        },
      ],
    };

    expect(sanitizeLinkState(state)).toEqual(state);
    expect(sanitizeLinkState(undefined)).toBeUndefined();
  });
});

describe('with the real link parser', () => {
  // The same shape as `linking.config` in AppNavigator.
  const config: LinkingOptions<RootStackParamList>['config'] = {
    screens: {
      Auth: { screens: { ResetPassword: 'reset-password' } },
      Chat: 'messages/:conversationId',
      ConversationsList: 'messages',
    },
  };
  const open = (path: string) =>
    sanitizeLinkState(getStateFromPath<RootStackParamList>(path, config));

  it('opens a conversation by its id', () => {
    expect(open('messages/42')?.routes[0]).toMatchObject({
      name: 'Chat',
      params: { conversationId: 42 },
    });
  });

  it.each([
    'messages/..%2F..%2Fprofile',
    'messages/..%2F..%2Fadmin%2Fusers%3F',
    'messages/42%2F..%2F..%2Fprofile',
    'messages/abc',
  ])('does not let %s reach the Chat screen', (path) => {
    const routes = open(path)?.routes ?? [];

    expect(routes.some((route) => route.name === 'Chat')).toBe(false);
  });

  it('strips query params from a Chat link', () => {
    expect(open('messages/42?conversation=x&participant=y')?.routes[0].params).toEqual({
      conversationId: 42,
    });
  });

  it('still opens the password reset link with its token', () => {
    const auth = open('reset-password?token=abc&email=a%40b.c')?.routes[0];

    expect(auth?.state?.routes[0]).toMatchObject({
      name: 'ResetPassword',
      params: { token: 'abc', email: 'a@b.c' },
    });
  });
});
