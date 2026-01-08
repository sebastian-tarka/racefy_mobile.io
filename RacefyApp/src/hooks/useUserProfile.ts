import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import type { UserProfile, ConversationParticipant } from '../types/api';

interface UseUserProfileOptions {
  username: string;
}

interface UseUserProfileReturn {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  isFollowing: boolean;
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
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isMessageLoading, setIsMessageLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getUserByUsername(username);
      setProfile(data);
      setIsFollowing(data.is_following ?? false);
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
      if (isFollowing) {
        await api.unfollowUser(profile.id);
        setIsFollowing(false);
        setProfile((prev) =>
          prev ? { ...prev, followers_count: prev.followers_count - 1 } : prev
        );
      } else {
        await api.followUser(profile.id);
        setIsFollowing(true);
        setProfile((prev) =>
          prev ? { ...prev, followers_count: prev.followers_count + 1 } : prev
        );
      }
    } catch (err) {
      logger.error('api', 'Failed to toggle follow:', { err });
    } finally {
      setIsFollowLoading(false);
    }
  }, [profile, isFollowing]);

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
    isFollowLoading,
    isMessageLoading,
    fetchProfile,
    handleFollowToggle,
    handleStartConversation,
  };
}