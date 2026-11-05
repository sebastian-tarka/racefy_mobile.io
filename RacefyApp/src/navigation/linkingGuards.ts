/**
 * Deep links are untrusted input. Any app or web page can make the phone open
 * `racefy://…`, and whatever the path and query say arrives in a screen's
 * `route.params` as strings — typed as numbers and objects by TypeScript, checked
 * by nobody. React Navigation also decodes `%2F`, so an "id" can smuggle a whole
 * path: `messages/..%2F..%2Fprofile` used to reach the API as
 * `/conversations/../../profile`, with the signed-in user's token.
 *
 * Everything a link may carry is therefore checked here, before a screen sees it.
 */

/** An id as a link may carry it: decimal digits of a positive integer, nothing else. */
export function linkId(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : undefined;
  }
  if (typeof value !== 'string' || !/^[1-9]\d{0,14}$/.test(value)) return undefined;
  return Number(value);
}

type LinkRoute = { name: string; params?: object; state?: { routes: readonly LinkRoute[] } };

/**
 * Clean the navigation state React Navigation built from a link:
 *  - `Chat` keeps only a valid `conversationId`. The other params of that screen
 *    (`conversation`, `participant`) are objects the app passes to itself; from a
 *    link they could only be attacker-written strings, so they are dropped;
 *  - a `Chat` link without a valid id opens the conversation list instead.
 *
 * A new linked screen with params gets its rule here.
 */
export function sanitizeLinkState<S extends { routes: readonly LinkRoute[] }>(
  state: S | undefined,
): S | undefined {
  if (!state) return state;

  const routes = state.routes.map((route): LinkRoute => {
    if (route.name === 'Chat') {
      const conversationId = linkId(
        (route.params as { conversationId?: unknown } | undefined)?.conversationId,
      );
      return conversationId
        ? { ...route, params: { conversationId } }
        : { name: 'ConversationsList' };
    }
    return route.state ? { ...route, state: sanitizeLinkState(route.state) } : route;
  });

  return { ...state, routes } as S;
}
