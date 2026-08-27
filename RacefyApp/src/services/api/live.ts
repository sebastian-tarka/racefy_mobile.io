import type * as Types from '../../types/api';
import type { ApiBase } from './base';

type Constructable<T = object> = new (...args: any[]) => T;

/**
 * Live broadcasting — spectating an athlete's in-progress activity.
 *
 * Naming: this is deliberately `LiveBroadcast*`, not `LiveActivity*`, because
 * `useLiveActivity` already means the user's own GPS recording in this app.
 *
 * Contract notes verified against the API (2026-07-22):
 * - `position` is `[lng, lat]`, or `null` inside a privacy zone.
 * - `stats.avg_speed` arrives as a string.
 * - A `404` from any of these endpoints is an ordinary state ("ended" or "not
 *   allowed to watch"), not a failure — and its body is not always the
 *   documented `api.live.not_found` envelope, so never parse the message.
 */
export function LiveMixin<TBase extends Constructable<ApiBase>>(Base: TBase) {
  return class LiveMixin extends Base {
    // ============ DISCOVERY ============

    /**
     * Broadcasts the user is allowed to watch. Paginated (default 20).
     *
     * Pass `user_id` to ask "is this athlete live right now?" rather than
     * filtering the global list client-side — an athlete past page 1 would
     * otherwise be silently missed. Filters only narrow: visibility and
     * blocking still apply, so `user_id` cannot reveal a broadcast the user
     * was not already allowed to see.
     */
    async getLiveBroadcasts(
      params?: Types.LiveBroadcastListParams,
    ): Promise<Types.LiveBroadcastListResponse> {
      const qs = new URLSearchParams();
      if (params?.user_id != null) qs.append('user_id', String(params.user_id));
      if (params?.event_id != null) qs.append('event_id', String(params.event_id));
      if (params?.page != null) qs.append('page', String(params.page));
      if (params?.per_page != null) qs.append('per_page', String(params.per_page));
      const suffix = qs.toString() ? `?${qs.toString()}` : '';

      return this.request<Types.LiveBroadcastListResponse>(`/live${suffix}`);
    }

    /**
     * Snapshot for a joining spectator.
     *
     * Returns null on 404, which means "ended, or you may not watch it" — both
     * are normal outcomes the UI renders as "broadcast ended", not as an error.
     *
     * `includeTrack` asks for the route covered so far (`snapshot.track`), which
     * is what stops a joining spectator from staring at an empty map. Ask for it
     * ONCE per broadcast: it is orders of magnitude larger than the snapshot,
     * and the polling transport hits this same endpoint every few seconds.
     */
    async getLiveBroadcast(
      activityId: number,
      options?: { includeTrack?: boolean },
    ): Promise<Types.LiveBroadcastDetailResponse | null> {
      const suffix = options?.includeTrack ? '?include=track' : '';
      try {
        return await this.request<Types.LiveBroadcastDetailResponse>(
          `/live/${activityId}${suffix}`,
        );
      } catch (error: any) {
        if (isNotFound(error)) return null;
        throw error;
      }
    }

    /** Redeem a `selected`-mode share token. Throws on 403 (invalid/expired link). */
    async joinLiveBroadcast(
      activityId: number,
      token: string,
    ): Promise<Types.LiveBroadcastDetailResponse> {
      return this.request<Types.LiveBroadcastDetailResponse>(
        `/live/${activityId}/join?token=${encodeURIComponent(token)}`,
      );
    }

    // ============ ATHLETE CONTROLS ============

    /**
     * Turn broadcasting on or off for an in-progress activity (owner only).
     *
     * Disabling is idempotent, so this is safe to call on an activity that is
     * not broadcasting. For `selected` visibility the response carries
     * `live_share_token`, which is the only place that token is exposed.
     */
    async toggleLiveBroadcast(
      activityId: number,
      settings: Types.LiveBroadcastSettings,
    ): Promise<Types.ToggleLiveResponse> {
      return this.request<Types.ToggleLiveResponse>(`/recording/${activityId}/live`, {
        method: 'POST',
        body: JSON.stringify(settings),
      });
    }

    // ============ MESSAGES ============

    /**
     * Messages on a broadcast. Spectators receive public messages only; the
     * athlete receives all of them — same path, different scope server-side.
     *
     * @param after - Last seen message id, for incremental polling.
     */
    async getLiveMessages(activityId: number, after?: number): Promise<Types.LiveMessage[]> {
      const suffix = after != null ? `?after=${after}` : '';
      const response = await this.request<Types.ApiResponse<Types.LiveMessage[]>>(
        `/live/${activityId}/messages${suffix}`,
      );
      return response.data ?? [];
    }

    /**
     * Send a message to the athlete. Throttled to 30/min.
     *
     * `403` means the athlete disabled live comments — a separate consent from
     * broadcasting itself. Hide the composer rather than letting someone type
     * and then rejecting them.
     */
    async sendLiveMessage(
      activityId: number,
      data: Types.SendLiveMessageRequest,
    ): Promise<Types.LiveMessage> {
      const response = await this.request<Types.ApiResponse<Types.LiveMessage>>(
        `/live/${activityId}/messages`,
        { method: 'POST', body: JSON.stringify(data) },
      );
      return response.data;
    }

    /** Promote your own private message to public. */
    async promoteLiveMessage(commentId: number): Promise<Types.LiveMessage> {
      const response = await this.request<Types.ApiResponse<Types.LiveMessage>>(
        `/live/messages/${commentId}/public`,
        { method: 'PATCH' },
      );
      return response.data;
    }

    /**
     * Fetch TTS audio for a message. Athlete only, throttled to 60/min.
     *
     * The three failure modes mean different things and must not be collapsed:
     * `403 ai_tts_not_available` (free tier → upgrade prompt), `402
     * monthly_limit_reached` (temporary cost cap, NOT a permissions problem),
     * `404` (not the athlete on this broadcast).
     */
    async getLiveMessageTts(commentId: number): Promise<Types.LiveTtsResponse> {
      const response = await this.request<Types.LiveTtsResponse & { data?: Types.LiveTtsResponse }>(
        `/live/messages/${commentId}/tts`,
        { method: 'POST' },
      );
      // Some AI endpoints wrap in `data`, others return the payload flat.
      return response.data ?? response;
    }
  };
}

/**
 * A missing broadcast is reported inconsistently: the documented
 * `api.live.not_found` body for one that exists but is not watchable, and a raw
 * Laravel ModelNotFound exception for an id that does not exist at all. Both are
 * the same thing to the UI, so match loosely rather than on the message.
 */
function isNotFound(error: any): boolean {
  if (error?.status === 404) return true;
  const msg = (error?.message || '').toLowerCase();
  return (
    msg.includes('not found') ||
    msg.includes('no query results') ||
    msg.includes('api.live.not_found')
  );
}
