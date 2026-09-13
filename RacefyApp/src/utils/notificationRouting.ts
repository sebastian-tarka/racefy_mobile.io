import { pushId } from './pushPayload';

/** Ids and hints a notification can carry, from push (`data`) or from the list. */
export interface NotificationRouteData {
  post_id?: number | string;
  activity_id?: number | string;
  event_id?: number | string;
  conversation_id?: number | string;
  goal_id?: number | string;
  report_id?: number | string;
  week_id?: number | string;
  likeable_type?: string;
  likeable_id?: number | string;
  commentable_type?: string;
  commentable_id?: number | string;
  actor_username?: string;
}

/** Where a notification leads. Screen names match `RootStackParamList`. */
export type NotificationTarget =
  | { screen: 'UserProfile'; params: { username: string } }
  | { screen: 'PostDetail'; params: { postId: number; focusComments?: boolean } }
  | { screen: 'ActivityDetail'; params: { activityId: number } }
  | { screen: 'LiveSpectator'; params: { activityId: number } }
  | { screen: 'EventDetail'; params: { eventId: number } }
  | { screen: 'Chat'; params: { conversationId: number } }
  | { screen: 'ConversationsList' }
  | { screen: 'GoalDetail'; params: { goalId: number } }
  | { screen: 'Goals' }
  | { screen: 'AiActivityReportDetail'; params: { reportId: number } }
  | { screen: 'AiActivityReports' }
  | { screen: 'WeekFeedback'; params: { weekId: number } }
  | { screen: 'TrainingWeeksList' }
  | { screen: 'Main'; params: { screen: 'Profile'; params: { initialTab: 'stats' } } };

interface Input {
  type?: string | null;
  url?: string | null;
  data?: NotificationRouteData | null;
}

/**
 * One place that decides where a notification leads.
 *
 * There are two ways into this app from a notification — the push handler and
 * the in-app list — and each used to carry its own routing. They drifted: the
 * list's URL parser never learned `/live/{id}`, so a live broadcast tapped from
 * the list produced an error alert while the same notification tapped from the
 * lock screen worked. A new type had to be added in two places to work in both.
 *
 * Pure on purpose: it answers "which screen, with what params" and leaves
 * navigating to the caller, which is what makes the decision testable.
 */
export function resolveNotificationTarget({ type, url, data }: Input): NotificationTarget | null {
  const d = data ?? {};

  // ── 1. Types whose id in the payload is authoritative ──────────────────
  // Routing on the id rather than the path means a route rename cannot break
  // the notification, and the id is right there in every one of these.
  const activityId = pushId(d.activity_id);
  if (type === 'activity_live_started' && activityId) {
    return { screen: 'LiveSpectator', params: { activityId } };
  }
  if (type === 'activity_started' && activityId) {
    return { screen: 'ActivityDetail', params: { activityId } };
  }
  if (type === 'weekly_summary') {
    return { screen: 'Main', params: { screen: 'Profile', params: { initialTab: 'stats' } } };
  }

  // ── 2. The URL the backend sent ────────────────────────────────────────
  const fromUrl = url ? targetFromUrl(url) : null;
  if (fromUrl) return fromUrl;

  // ── 3. Type, using whatever ids came with it ───────────────────────────
  return targetFromType(type, d);
}

/** Web paths the backend puts in `url` / `deep_link_path`. */
function targetFromUrl(url: string): NotificationTarget | null {
  if (/^\/@[\w.-]+$/.test(url)) {
    return { screen: 'UserProfile', params: { username: url.slice(2) } };
  }

  const post = url.match(/^\/posts\/(\d+)/);
  if (post) {
    return {
      screen: 'PostDetail',
      params: {
        postId: Number(post[1]),
        focusComments: url.includes('#comments') || url.includes('comments=true'),
      },
    };
  }

  const live = url.match(/^\/live\/(\d+)/);
  if (live) return { screen: 'LiveSpectator', params: { activityId: Number(live[1]) } };

  const activity = url.match(/^\/activities\/(\d+)/);
  if (activity) return { screen: 'ActivityDetail', params: { activityId: Number(activity[1]) } };

  const event = url.match(/^\/events\/(\d+)/);
  if (event) return { screen: 'EventDetail', params: { eventId: Number(event[1]) } };

  const goal = url.match(/^\/goals\/(\d+)/);
  if (goal) return { screen: 'GoalDetail', params: { goalId: Number(goal[1]) } };
  if (url === '/goals') return { screen: 'Goals' };

  const conversation =
    url.match(/^\/messages\?(?:.*&)?conversation=(\d+)/) ?? url.match(/^\/messages\/(\d+)$/);
  if (conversation) {
    return { screen: 'Chat', params: { conversationId: Number(conversation[1]) } };
  }
  if (url.startsWith('/messages')) return { screen: 'ConversationsList' };

  return null;
}

function targetFromType(
  type: string | null | undefined,
  d: NotificationRouteData,
): NotificationTarget | null {
  switch (type) {
    case 'likes':
    case 'comments':
    case 'mentions': {
      const focusComments = type === 'comments' || type === 'mentions';
      const isPost =
        d.likeable_type === 'post' || d.commentable_type === 'post' || d.post_id != null;
      if (isPost) {
        const postId = pushId(d.post_id ?? d.likeable_id ?? d.commentable_id);
        return postId ? { screen: 'PostDetail', params: { postId, focusComments } } : null;
      }
      const activityId = pushId(d.activity_id ?? d.likeable_id ?? d.commentable_id);
      return activityId ? { screen: 'ActivityDetail', params: { activityId } } : null;
    }

    case 'follows':
      return d.actor_username
        ? { screen: 'UserProfile', params: { username: d.actor_username } }
        : null;

    case 'messages': {
      const conversationId = pushId(d.conversation_id);
      return conversationId
        ? { screen: 'Chat', params: { conversationId } }
        : { screen: 'ConversationsList' };
    }

    case 'event_reminders': {
      const eventId = pushId(d.event_id);
      return eventId ? { screen: 'EventDetail', params: { eventId } } : null;
    }

    case 'activity_reactions':
    case 'boosts':
    case 'activity_started': {
      const activityId = pushId(d.activity_id);
      return activityId ? { screen: 'ActivityDetail', params: { activityId } } : null;
    }

    case 'activity_live_started': {
      const activityId = pushId(d.activity_id);
      return activityId ? { screen: 'LiveSpectator', params: { activityId } } : null;
    }

    case 'points_awarded': {
      const eventId = pushId(d.event_id);
      return eventId ? { screen: 'EventDetail', params: { eventId } } : null;
    }

    case 'reshares':
    case 'ai_post_ready': {
      const postId = pushId(d.post_id);
      return postId ? { screen: 'PostDetail', params: { postId } } : null;
    }

    case 'activity_report_ready': {
      const reportId = pushId(d.report_id);
      return reportId
        ? { screen: 'AiActivityReportDetail', params: { reportId } }
        : { screen: 'AiActivityReports' };
    }

    case 'goal_achieved':
    case 'goal_period_completed':
    case 'goal_pace_warning': {
      const goalId = pushId(d.goal_id);
      return goalId ? { screen: 'GoalDetail', params: { goalId } } : { screen: 'Goals' };
    }

    case 'training_week_feedback': {
      const weekId = pushId(d.week_id);
      return weekId
        ? { screen: 'WeekFeedback', params: { weekId } }
        : { screen: 'TrainingWeeksList' };
    }

    default:
      return null;
  }
}
