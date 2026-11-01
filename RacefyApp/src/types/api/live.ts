import type { Comment } from './posts';
import type { SportType } from './sports';
import type { User } from './user';

// ============ LIVE BROADCASTING ============
//
// NOTE ON NAMING: `useLiveActivity` / `LiveActivityStats` elsewhere in this app
// mean the user's OWN in-progress GPS recording. Everything below is the
// *spectator-facing broadcast* of such a recording, so it is named
// `LiveBroadcast*` to keep the two apart.
//
// Shapes verified against the local API on 2026-07-22; divergences from
// docs/api/mobile/LIVE_IMPLEMENTATION_GUIDE.md are called out inline.

export type LiveVisibility = 'followers' | 'public' | 'selected';

/**
 * Realtime transport, from `GET /config/app`. Server-controlled: the driver can
 * be flipped without shipping a new build, so BOTH modes must keep working.
 */
export interface RealtimeConfig {
  driver: 'polling' | 'reverb';
  poll_interval_ms: number;
  reverb: {
    key: string;
    host: string;
    port: number;
    scheme: string;
  } | null;
}

export interface LiveBroadcastStats {
  distance: number; // meters
  duration: number; // seconds
  elevation_gain: number; // meters
  /**
   * m/s. The API returns this as a STRING ("3.29"), not the number the docs
   * show — parse before doing arithmetic.
   */
  avg_speed: string | number;
  /**
   * min/km. Observed `null` for the entire duration of a broadcast, so treat
   * null as an ordinary steady state, not a value that is about to arrive.
   */
  current_pace: number | null;
}

/**
 * `position` is `[lng, lat]` — GeoJSON order, longitude FIRST. Verified.
 * `null` means the athlete is inside a privacy zone: render "position hidden"
 * and NEVER fall back to the last known point.
 */
export type LivePosition = [number, number] | null;

export interface LiveBroadcast {
  id: number;
  slug?: string;
  sport_type_id: number;
  sport_type?: SportType;
  user: User;
  event_id: number | null;
  live_visibility: LiveVisibility;
  status: string;
  started_at: string;
  position: LivePosition;
  /**
   * Whether the athlete accepts messages. Lets a spectator hide the composer
   * up front instead of discovering the refusal by being rejected.
   * Optional so an older backend degrades to the attempt-then-hide path.
   */
  allow_live_comments?: boolean;
  /**
   * Whether a spectator may record a voice cheer: the athlete's
   * `voice_incoming` consent AND the server-wide switch. Absent on an older
   * backend, which has no voice endpoint either — hide the mic then.
   */
  allow_voice_messages?: boolean;
  stats: LiveBroadcastStats;
  /** Owner-only; present on the athlete's own broadcast in `selected` mode. */
  live_share_token?: string | null;
}

/**
 * The route covered before the spectator joined, for back-filling the map.
 *
 * `MultiLineString`, not `LineString`, because stretches that fall inside the
 * athlete's privacy zones are removed server-side: the remaining pieces must
 * stay separate, or the map draws a straight chord across the hidden area and
 * gives away roughly where it is.
 *
 * Optional throughout — an API that predates `?include=track` simply omits it,
 * and the feed degrades to stitching the trail live.
 */
export interface LiveTrack {
  type: 'MultiLineString';
  /** Segments of `[lng, lat]` pairs — GeoJSON order, longitude FIRST. */
  coordinates: [number, number][][];
  point_count?: number;
  /** True when the server thinned the track: fine to draw, not to measure. */
  simplified?: boolean;
}

/** Compact duplicate of the broadcast returned alongside it by `GET /live/{id}`. */
export interface LiveBroadcastSnapshot {
  activity_id: number;
  sport_type_id: number;
  status: string;
  live_visibility: LiveVisibility;
  started_at: string;
  position: LivePosition;
  stats: LiveBroadcastStats;
  /** Only present when the request asked for it (`?include=track`). */
  track?: LiveTrack | null;
}

export interface LiveBroadcastDetailResponse {
  data: LiveBroadcast;
  snapshot: LiveBroadcastSnapshot;
}

/**
 * `GET /live` — note this is NOT the app's usual `PaginatedResponse`: there are
 * no `links`, and `meta` carries only these three keys.
 */
export interface LiveBroadcastListResponse {
  data: LiveBroadcast[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
  };
}

export interface LiveBroadcastListParams {
  /** "Is THIS athlete live?" — use instead of filtering the paginated global list. */
  user_id?: number;
  event_id?: number;
  page?: number;
  per_page?: number;
}

/** A live message. Stored as a polymorphic comment, so it persists after the activity ends. */
export interface LiveMessage extends Comment {
  is_live: boolean;
  live_visibility: 'private' | 'public';
  /** Set once TTS has played it to the athlete — use it to never read a message twice. */
  audio_played_at: string | null;
  /**
   * Where the athlete was when the message arrived, captured server-side at
   * send time. All three are null for messages from before this was recorded
   * (no backfill) and for messages sent before the first GPS fix.
   */
  live_distance?: number | null; // metres into the activity
  live_duration?: number | null; // seconds into the activity
  /** [lng, lat]. Null for non-owners while inside a privacy zone — never filtered for the owner. */
  live_position?: [number, number] | null;
  /** Absent on an older backend — read as `text`. */
  message_type?: LiveMessageType;
  /** Voice only. Survives the audio file's purge, so the archive can still say "12 s". */
  audio_duration_ms?: number | null;
  /**
   * Voice only. A temporary SIGNED url (2 h): no Bearer needed, so it can go
   * straight into a player. Null once the file was purged (retention) — the
   * transcript in `content` is what is left.
   */
  audio_url?: string | null;
}

export type LiveMessageType = 'text' | 'voice';

/** A live message pinned on the finished route — only messages that carry a position. */
export interface LiveMessagePin {
  id: number;
  coordinate: [number, number]; // [lng, lat]
  /** For a voice message: the transcript, possibly empty. */
  content: string;
  authorName: string;
  kind: LiveMessageType;
}

export interface SendLiveMessageRequest {
  content: string; // max 280 chars (422 above that)
  /** Defaults to false = private 1:1 to the athlete. */
  public?: boolean;
}

/** `POST /live/{activity}/messages/voice` — multipart, built by the API client. */
export interface SendLiveVoiceMessageRequest {
  /** Local file uri of an m4a/AAC recording. */
  uri: string;
  /** Client-measured length; the server re-measures and uses this as the fallback. */
  durationMs: number;
  public?: boolean;
}

/** `live.voice` block of `GET /config/app` — absent on a backend without voice cheers. */
export interface LiveVoiceConfig {
  enabled: boolean;
  max_seconds: number;
  max_bytes: number;
}

/** Body for `POST /recording/start`'s optional `live` object and the toggle endpoint. */
export interface LiveBroadcastSettings {
  enabled: boolean;
  /** Omit to use the athlete's `live.transmission_visibility` preference. */
  visibility?: LiveVisibility;
}

export interface ToggleLiveResponse {
  message: string;
  data: LiveBroadcast & {
    /** Owner-only. Builds the share link for `selected` mode. */
    live_share_token?: string | null;
  };
}

export interface LiveTtsResponse {
  audio_base64: string;
  model: string;
  voice: string;
  character_count: number;
}

/** Live section of `PUT /profile/preferences`. These are consents, not cosmetics. */
export interface LivePreferences {
  allow_live_comments: boolean;
  transmission_visibility: LiveVisibility;
  tts_incoming: boolean;
  /** Play spectators' recorded voice cheers (not tier-gated, unlike TTS). */
  voice_incoming: boolean;
}
