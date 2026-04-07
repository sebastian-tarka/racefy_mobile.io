import { useCallback, useEffect, useState } from 'react';
import { Alert, Clipboard } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import type { EventTeam } from '../types/api';

interface UseEventTeamsParams {
  eventId: number;
  isTeamEvent: boolean;
  isAuthenticated: boolean;
  isRegistered: boolean;
}

export function useEventTeams({ eventId, isTeamEvent, isAuthenticated, isRegistered }: UseEventTeamsParams) {
  const { t } = useTranslation();

  const [teams, setTeams] = useState<EventTeam[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [createdTeam, setCreatedTeam] = useState<EventTeam | null>(null);

  const myTeam = teams.find(team => team.is_captain || team.is_member);
  const isInTeam = !!myTeam;
  const isCaptain = myTeam?.is_captain ?? false;

  const fetchTeams = useCallback(async () => {
    if (!isTeamEvent) return;
    setIsLoading(true);
    try {
      const data = await api.getEventTeams(eventId);
      setTeams(data);
    } catch {
      // Silent
    } finally {
      setIsLoading(false);
    }
  }, [eventId, isTeamEvent]);

  useEffect(() => {
    if (isTeamEvent) fetchTeams();
  }, [fetchTeams, isTeamEvent]);

  const handleCreateTeam = useCallback(async (name: string) => {
    setIsActing(true);
    try {
      const team = await api.createEventTeam(eventId, name);
      setCreatedTeam(team);
      await fetchTeams();
      return team;
    } catch {
      Alert.alert(t('common.error'), t('teams.createFailed'));
      return null;
    } finally {
      setIsActing(false);
    }
  }, [eventId, fetchTeams, t]);

  const handleJoinTeam = useCallback(async (code: string) => {
    setIsActing(true);
    try {
      // Find team by code from loaded teams
      const team = teams.find(t => t.code === code.toUpperCase());
      if (!team) {
        Alert.alert(t('common.error'), t('teams.invalidCode'));
        return false;
      }
      await api.joinEventTeam(eventId, team.id, code);
      await fetchTeams();
      return true;
    } catch {
      Alert.alert(t('common.error'), t('teams.joinFailed'));
      return false;
    } finally {
      setIsActing(false);
    }
  }, [eventId, teams, fetchTeams, t]);

  const handleLeaveTeam = useCallback(async () => {
    if (!myTeam) return;
    Alert.alert(t('teams.confirmLeaveTeam'), t('teams.confirmLeaveTeamDescription'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('teams.leaveTeam'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.leaveEventTeam(eventId, myTeam.id);
            await fetchTeams();
          } catch {
            Alert.alert(t('common.error'), t('common.tryAgain'));
          }
        },
      },
    ]);
  }, [eventId, myTeam, fetchTeams, t]);

  const handleDeleteTeam = useCallback(async () => {
    if (!myTeam) return;
    Alert.alert(t('teams.confirmDeleteTeam'), t('teams.confirmDeleteTeamDescription'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('teams.deleteTeam'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteEventTeam(eventId, myTeam.id);
            await fetchTeams();
          } catch {
            Alert.alert(t('common.error'), t('common.tryAgain'));
          }
        },
      },
    ]);
  }, [eventId, myTeam, fetchTeams, t]);

  const handleKickMember = useCallback(async (userId: number) => {
    if (!myTeam) return;
    try {
      await api.removeEventTeamMember(eventId, myTeam.id, userId);
      await fetchTeams();
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    }
  }, [eventId, myTeam, fetchTeams, t]);

  const handleTransferCaptain = useCallback(async (userId: number) => {
    if (!myTeam) return;
    try {
      await api.transferEventTeamCaptain(eventId, myTeam.id, userId);
      await fetchTeams();
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    }
  }, [eventId, myTeam, fetchTeams, t]);

  const clearCreatedTeam = useCallback(() => setCreatedTeam(null), []);

  return {
    teams,
    myTeam,
    isInTeam,
    isCaptain,
    isLoading,
    isActing,
    createdTeam,
    fetchTeams,
    handleCreateTeam,
    handleJoinTeam,
    handleLeaveTeam,
    handleDeleteTeam,
    handleKickMember,
    handleTransferCaptain,
    clearCreatedTeam,
    canCreateTeam: isAuthenticated && isRegistered && !isInTeam,
    canJoinTeam: isAuthenticated && isRegistered && !isInTeam,
  };
}
