import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import type { UserProfile, ConversationParticipant, FollowStatusValue } from '../types/api';

interface UseUserProfileOptions {
  username: string;
}

interface UseUserProfileReturn {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  isFollowing: boolean;
  followStatus: FollowStatusValue;
  isFollowLoading: boolean;
  isMessageLoading: boolean;
  fetchProfile: () => Promise<UserProfile | null>;
  handleFollowToggle: () => Promise<void>;
  handleStartConversation: () => Promise<{ conversationId: number; participant: ConversationParticipant } | null>;
}

export function useUserProfile({ username }: UseUserProfileOptions): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStatus, setFollowStatus] = useState<FollowStatusValue>(null);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isMessageLoading, setIsMessageLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getUserByUsername(username);
      setProfile(data);

      // Fetch follow status to get detailed status info
      try {
        const status = await api.getFollowStatus(data.id);
        setIsFollowing(status.is_following);
        setFollowStatus(status.follow_status ?? null);
      } catch (statusErr) {
        // Fallback to is_following from profile if getFollowStatus fails
        logger.warn('api', 'Failed to fetch follow status, using profile data', { error: statusErr });
        setIsFollowing(data.is_following ?? false);
        setFollowStatus(data.is_following ? 'accepted' : null);
      }

      return data;
    } catch (err) {
      logger.error('api', 'Failed to fetch profile:', { err });
      setError('Failed to load profile');
      return null;
    }
  }, [username]);

  const handleFollowToggle = useCallback(async () => {
    if (!profile) return;

    setIsFollowLoading(true);
    try {
      if (followStatus === 'pending') {
        // Cancel pending request
        await api.unfollowUser(profile.id);
        setIsFollowing(false);
        setFollowStatus(null);
      } else if (followStatus === 'accepted' || isFollowing) {
        // Unfollow accepted follow
        await api.unfollowUser(profile.id);
        setIsFollowing(false);
        setFollowStatus(null);
        setProfile((prev) =>
          prev ? { ...prev, followers_count: prev.followers_count - 1 } : prev
        );
      } else {
        // Send new follow request
        await api.followUser(profile.id);
        setFollowStatus('pending');
        // Don't increment follower count until request is accepted
      }
    } catch (err) {
      logger.error('api', 'Failed to toggle follow:', { err });
    } finally {
      setIsFollowLoading(false);
    }
  }, [profile, isFollowing, followStatus]);

  const handleStartConversation = useCallback(async () => {
    if (!profile) return null;

    setIsMessageLoading(true);
    try {
      const response = await api.startConversation(profile.id);
      return {
        conversationId: response.data.id,
        participant: {
          id: profile.id,
          name: profile.name,
          username: profile.username,
          avatar: profile.avatar,
        },
      };
    } catch (err) {
      logger.error('api', 'Failed to start conversation:', { err });
      return null;
    } finally {
      setIsMessageLoading(false);
    }
  }, [profile]);

  // Initial load
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      await fetchProfile();
      setIsLoading(false);
    };
    loadProfile();
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    error,
    isFollowing,
    followStatus,
    isFollowLoading,
    isMessageLoading,
    fetchProfile,
    handleFollowToggle,
    handleStartConversation,
  };
}