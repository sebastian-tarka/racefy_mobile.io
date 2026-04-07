import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { emitRefresh } from '../services/refreshEvents';
import type { Team } from '../types/api';

interface UseTeamDetailParams {
  slug: string;
  isAuthenticated: boolean;
  userId?: number;
  navigateBack: () => void;
}

export function useTeamDetail({ slug, isAuthenticated, userId, navigateBack }: UseTeamDetailParams) {
  const { t } = useTranslation();

  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const derived = useMemo(() => {
    if (!team) {
      return { isCaptain: false, isMember: false, canEdit: false, activeMembers: [], invitations: [], joinRequests: [] };
    }
    // Fallback: check captain.id against current user if is_captain not set by API
    const captainById = userId ? team.captain?.id === userId : false;
    const isCaptain = team.is_captain || captainById;
    const isMember = team.is_member || isCaptain;
    return {
      isCaptain,
      isMember,
      canEdit: isCaptain,
      activeMembers: (team.members || []).filter(m => m.status === 'active'),
      invitations: team.invitations || [],
      joinRequests: team.join_requests || [],
    };
  }, [team, userId]);

  const fetchTeam = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getTeam(slug);
      setTeam(data);
    } catch {
      setError(t('teams.failedToLoad'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [slug, t]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchTeam();
  }, [fetchTeam]);

  const handleRequestToJoin = useCallback(async () => {
    if (!team) return;
    setIsActing(true);
    try {
      await api.requestToJoinTeam(team.id);
      Alert.alert(t('common.success'), t('teams.requestSent'));
      await fetchTeam();
    } catch {
      Alert.alert(t('common.error'), t('teams.requestFailed'));
    } finally {
      setIsActing(false);
    }
  }, [team, fetchTeam, t]);

  const handleAcceptInvitation = useCallback(async () => {
    if (!team) return;
    setIsActing(true);
    try {
      await api.acceptTeamInvitation(team.id);
      await fetchTeam();
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setIsActing(false);
    }
  }, [team, fetchTeam, t]);

  const handleDeclineInvitation = useCallback(async () => {
    if (!team) return;
    setIsActing(true);
    try {
      await api.declineTeamInvitation(team.id);
      emitRefresh('teams');
      navigateBack();
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setIsActing(false);
    }
  }, [team, navigateBack, t]);

  const handleLeave = useCallback(async () => {
    if (!team) return;
    Alert.alert(t('teams.confirmLeaveTeam'), t('teams.confirmLeaveTeamDescription'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('teams.leaveTeam'),
        style: 'destructive',
        onPress: async () => {
          setIsActing(true);
          try {
            await api.leaveTeam(team.id);
            emitRefresh('teams');
            navigateBack();
          } catch {
            Alert.alert(t('common.error'), t('common.tryAgain'));
          } finally {
            setIsActing(false);
          }
        },
      },
    ]);
  }, [team, navigateBack, t]);

  const handleKickMember = useCallback(async (userId: number, userName: string) => {
    if (!team) return;
    Alert.alert(t('teams.confirmKick'), t('teams.confirmKickDescription', { name: userName }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('teams.kickMember'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.kickTeamMember(team.id, userId);
            await fetchTeam();
          } catch {
            Alert.alert(t('common.error'), t('common.tryAgain'));
          }
        },
      },
    ]);
  }, [team, fetchTeam, t]);

  const handleTransferCaptain = useCallback(async (userId: number, userName: string) => {
    if (!team) return;
    Alert.alert(
      t('teams.confirmTransferCaptain'),
      t('teams.confirmTransferCaptainDescription', { name: userName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('teams.transferCaptain'),
          onPress: async () => {
            try {
              await api.transferTeamCaptain(team.id, userId);
              await fetchTeam();
            } catch {
              Alert.alert(t('common.error'), t('common.tryAgain'));
            }
          },
        },
      ],
    );
  }, [team, fetchTeam, t]);

  const handleAcceptJoinRequest = useCallback(async (membershipId: number) => {
    if (!team) return;
    try {
      await api.acceptJoinRequest(team.id, membershipId);
      await fetchTeam();
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    }
  }, [team, fetchTeam, t]);

  const handleDeclineJoinRequest = useCallback(async (membershipId: number) => {
    if (!team) return;
    try {
      await api.declineJoinRequest(team.id, membershipId);
      await fetchTeam();
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    }
  }, [team, fetchTeam, t]);

  const handleDelete = useCallback(async () => {
    if (!team) return;
    Alert.alert(t('teams.confirmDeleteTeam'), t('teams.confirmDeleteTeamDescription'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('teams.deleteTeam'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteTeam(team.id);
            emitRefresh('teams');
            navigateBack();
          } catch {
            Alert.alert(t('common.error'), t('common.tryAgain'));
          }
        },
      },
    ]);
  }, [team, navigateBack, t]);

  return {
    team,
    isLoading,
    isRefreshing,
    isActing,
    error,
    ...derived,
    fetchTeam,
    onRefresh,
    handleRequestToJoin,
    handleAcceptInvitation,
    handleDeclineInvitation,
    handleLeave,
    handleKickMember,
    handleTransferCaptain,
    handleAcceptJoinRequest,
    handleDeclineJoinRequest,
    handleDelete,
  };
}
