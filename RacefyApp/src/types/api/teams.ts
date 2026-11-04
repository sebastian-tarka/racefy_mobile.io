import type { EventRegistration } from './events';
import type { ImageVariants } from './media';
import type { SportType } from './sports';
import type { User } from './user';

// ============ STANDALONE TEAMS ============

export interface Team {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  avatar: string | null;
  /** `thumb` 50 / `small` 100 / `medium` 200 square crops; null until generated. */
  avatar_variants?: ImageVariants | null;
  visibility: 'public' | 'private';
  captain: User;
  members_count: number;
  is_captain: boolean;
  is_member: boolean;
  has_pending_invitation?: boolean;
  has_pending_request?: boolean;
  members?: TeamMember[];
  invitations?: TeamMember[];
  join_requests?: TeamMember[];
  created_at: string;
}

export interface TeamMember {
  id: number;
  user: User;
  role: 'captain' | 'member';
  status: 'active' | 'invited' | 'pending_request' | 'declined';
  invited_by: User | null;
  responded_at: string | null;
  joined_at: string;
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
  visibility?: 'public' | 'private';
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  visibility?: 'public' | 'private';
}

// ============ EVENT TEAMS ============

export interface EventTeam {
  id: number;
  name: string;
  code?: string;
  captain: User;
  members_count: number;
  is_full: boolean;
  is_captain?: boolean;
  is_member?: boolean;
  members?: EventRegistration[];
  created_at: string;
}

// ============ TEAM STATS ============

export interface TeamActivityTotals {
  activities_count: number;
  active_members: number;
  /** meters */
  total_distance: number;
  /** seconds */
  total_duration: number;
  /** meters */
  total_elevation: number;
  /** kcal */
  total_calories: number;
  /** meters — longest single activity */
  longest_distance: number;
  /** seconds — longest single activity */
  longest_duration: number;
  by_sport_type: TeamSportTypeStat[];
}

interface TeamSportTypeStat {
  sport_type_id: number;
  activities_count: number;
  total_distance: number;
  total_duration: number;
}

export type StatsPeriod =
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'last_year';

export interface TeamSummaryResponse {
  team_id: number;
  team_name: string;
  members_count: number;
  all_time: TeamActivityTotals;
  period: TeamActivityTotals;
  period_label: StatsPeriod;
}

export type RankingSortBy = 'distance' | 'duration' | 'elevation' | 'activities';

export interface TeamMemberRank {
  rank: number;
  user: {
    id: number;
    name: string;
    username: string;
    avatar: string | null;
    avatar_variants?: ImageVariants | null;
  };
  activities_count: number;
  total_distance: number;
  total_duration: number;
  total_elevation: number;
  total_calories: number;
}

export interface TeamRankingResponse {
  team_id: number;
  team_name: string;
  sort_by: RankingSortBy;
  ranking: TeamMemberRank[];
}

export type TrendGranularity = 'weekly' | 'monthly';

export interface TrendDataPoint {
  /** "2026-W13" or "2026-03" */
  period: string;
  activities_count: number;
  active_members: number;
  total_distance: number;
  total_duration: number;
  total_elevation: number;
  total_calories: number;
}

/** GET /stats/trends — one bucket per week or month, zero-filled. */
export interface ActivityTrendPoint {
  /** "2026-W13" or "2026-03" */
  period: string;
  activities_count: number;
  total_distance: number;
  total_duration: number;
  total_elevation: number;
  total_calories: number;
}

export interface ActivityTrendsResponse {
  granularity: TrendGranularity;
  trends: ActivityTrendPoint[];
}

export interface TeamTrendsResponse {
  team_id: number;
  team_name: string;
  granularity: TrendGranularity;
  trends: TrendDataPoint[];
}

// ============ TEAM ACTIVITY BOARD ============

/**
 * One row of `GET /teams/{slug}/activities` (`PublicActivityResource`): a finished
 * activity of an active member that the viewer may see. No start/finish
 * coordinates, no health data; the route only as a picture.
 */
export interface TeamBoardActivity {
  id: number;
  title: string | null;
  description?: string | null;
  sport_type?: SportType;
  started_at: string;
  ended_at?: string | null;
  /** seconds */
  duration: number;
  /** Duration without standing still (seconds); null without a GPS track. */
  moving_time?: number | null;
  /** meters */
  distance: number;
  /** meters */
  elevation_gain: number | null;
  avg_speed?: number | null;
  max_speed?: number | null;
  /** Server-side formatted values (always metric); `pace.value` is null when pace does not apply. */
  formatted?: {
    duration?: string | null;
    pace?: { value: string | null; unit: string } | null;
  };
  likes_count: number;
  comments_count: number;
  user?: User;
  has_gps_track?: boolean;
  route_svg?: string | null;
  route_map_url?: string | null;
  route_preview_url?: string | null;
  created_at?: string;
}

export interface TeamActivitiesParams {
  sport_type_id?: number | null;
  /** 1–50, default 15 */
  per_page?: number;
  page?: number;
}

export type LeaderboardSortBy = 'distance' | 'duration' | 'elevation' | 'activities' | 'members';

export interface TeamLeaderboardEntry {
  rank: number;
  team_id: number;
  team_name: string;
  team_slug: string;
  team_avatar: string | null;
  team_avatar_variants?: ImageVariants | null;
  members_count: number;
  active_members: number;
  activities_count: number;
  total_distance: number;
  total_duration: number;
  total_elevation: number;
}

export interface TeamLeaderboardResponse {
  data: TeamLeaderboardEntry[];
  total: number;
}
