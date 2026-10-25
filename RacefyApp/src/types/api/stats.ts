// ============ STATISTICS ============

export interface UserStats {
  activities: {
    total: number;
    this_month: number;
    total_distance: number;
    total_duration: number;
  };
  posts: {
    total: number;
    total_likes: number;
  };
  events: {
    registered: number;
    attended: number;
  };
  social: {
    followers: number;
    following: number;
  };
}

export type ActivityStatsPeriod =
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'last_year';

export interface ActivityStats {
  period: {
    period: ActivityStatsPeriod;
    from: string;
    to: string;
  } | null;
  count: number;
  totals: {
    distance: number;
    duration: number;
    elevation_gain: number;
    calories: number;
  };
  averages: {
    distance: number;
    duration: number;
    speed: number;
    heart_rate: number;
  };
  bests: {
    longest_distance: ActivityBest | null;
    longest_duration: ActivityBest | null;
    fastest_speed: ActivityBest | null;
  };
  /**
   * Per-sport breakdown. The API moved from a map keyed by sport-type id to a
   * list of self-describing entries (sorted by distance), so both shapes are
   * accepted and `normalizeSportTypeStats` flattens them — see
   * docs/api/mobile/API_ENDPOINTS.md → "GET /stats/activities — periods".
   */
  by_sport_type: Record<string, SportTypeStat> | SportTypeStat[];
}

export interface SportTypeStat {
  /** Absent on the old map shape, where the key carried the id. */
  sport_type_id?: number;
  name?: string;
  slug?: string;
  icon?: string;
  count: number;
  distance: number;
  duration: number;
  elevation_gain?: number;
}

export interface ActivityBest {
  id: number;
  title: string;
  distance?: number;
  duration?: number;
  max_speed?: number;
  date: string;
}

export interface WeeklyStats {
  week_start: string;
  week_end: string;
  totals: {
    count: number;
    distance: number;
    duration: number;
  };
  daily: Record<
    string,
    {
      count: number;
      distance: number;
      duration: number;
    }
  >;
}

// ============ MILESTONES ============

export interface MilestoneSingle {
  type: string;
  threshold: number;
  achieved: boolean;
  activity_id: number | null;
  first_date: string | null;
  progress: number;
}

export interface MilestoneTotal {
  type: string;
  threshold: number;
  achieved: boolean;
  current: number;
  achieved_date: string | null;
  progress: number;
}

export interface MilestoneStreak {
  type: string;
  threshold: number;
  achieved: boolean;
  best_streak: number;
  current_streak: number;
  current_streak_start: string | null;
}

export interface MilestonesData {
  sport_type_id: number | null;
  distance_single: MilestoneSingle[];
  distance_total: MilestoneTotal[];
  elevation_single: MilestoneSingle[];
  elevation_total: MilestoneTotal[];
  activity_count: MilestoneTotal[];
  consistency: MilestoneStreak[];
}
