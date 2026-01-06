import type { User, UserProfile, UserProfilePrivacy } from '../types/api';

type ProfileVisibility = UserProfilePrivacy['profile_visibility'];

/**
 * Check if the current user can view the profile's followers list
 */
export function canViewFollowersList(
  profile: UserProfile,
  currentUser: User | null,
  isFollowing: boolean
): boolean {
  // Own profile - always allowed
  if (currentUser?.id === profile.id) return true;

  const visibility = profile.privacy?.profile_visibility ?? 'public';

  switch (visibility) {
    case 'public':
      return true;
    case 'followers':
      return isFollowing;
    case 'private':
      return false;
    default:
      return true;
  }
}

/**
 * Check if the current user can view the profile's following list
 */
export function canViewFollowingList(
  profile: UserProfile,
  currentUser: User | null,
  isFollowing: boolean
): boolean {
  return canViewFollowersList(profile, currentUser, isFollowing);
}

/**
 * Check if the current user can view the profile's stats
 */
export function canViewStats(
  profile: UserProfile,
  currentUser: User | null,
  isFollowing: boolean
): boolean {
  // Own profile - always allowed
  if (currentUser?.id === profile.id) return true;

  // Check show_stats setting first
  if (profile.privacy?.show_stats === false) return false;

  // Then check profile visibility
  return canViewFollowersList(profile, currentUser, isFollowing);
}

/**
 * Check if the current user can view the profile's activities
 */
export function canViewActivities(
  profile: UserProfile,
  currentUser: User | null,
  isFollowing: boolean
): boolean {
  // Own profile - always allowed
  if (currentUser?.id === profile.id) return true;

  // Check show_activities setting first
  if (profile.privacy?.show_activities === false) return false;

  // Then check profile visibility
  return canViewFollowersList(profile, currentUser, isFollowing);
}

/**
 * Check if the current user can view the profile's posts
 */
export function canViewPosts(
  profile: UserProfile,
  currentUser: User | null,
  isFollowing: boolean
): boolean {
  // Own profile - always allowed
  if (currentUser?.id === profile.id) return true;

  // Posts follow profile visibility
  return canViewFollowersList(profile, currentUser, isFollowing);
}

/**
 * Check if the current user can send messages to this profile
 */
export function canSendMessage(
  profile: UserProfile,
  currentUser: User | null,
  isFollowing: boolean
): boolean {
  if (!currentUser) return false;
  // Own profile - no self messaging
  if (currentUser.id === profile.id) return false;

  const allowMessages = profile.privacy?.allow_messages ?? 'everyone';

  switch (allowMessages) {
    case 'everyone':
      return true;
    case 'followers':
      return isFollowing;
    case 'none':
      return false;
    default:
      return true;
  }
}

/**
 * Get visibility label for display
 */
export function getVisibilityLabel(visibility: ProfileVisibility): string {
  switch (visibility) {
    case 'public':
      return 'public';
    case 'followers':
      return 'followersOnly';
    case 'private':
      return 'private';
    default:
      return 'public';
  }
}
