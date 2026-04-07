import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { useTeamDetail, useAuth, useTheme, useSubscription } from '../../hooks';
import { ScreenContainer, ScreenHeader, Card, Avatar, Button } from '../../components';
import { TeamStatsTab } from './TeamStatsTab';
import { spacing, fontSize, borderRadius } from '../../theme';
import { api } from '../../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'TeamDetail'>;
type TabType = 'members' | 'stats' | 'events';

export function TeamDetailScreen({ route, navigation }: Props) {
  const { slug, initialTab } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const { bottom: bottomInset } = useSafeAreaInsets();

  const navigateBack = useCallback(() => navigation.goBack(), [navigation]);
  const { features } = useSubscription();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'members');

  const {
    team, isLoading, isRefreshing, isActing, error,
    isCaptain, isMember, activeMembers, invitations, joinRequests,
    fetchTeam, onRefresh,
    handleRequestToJoin, handleAcceptInvitation, handleDeclineInvitation,
    handleLeave, handleKickMember, handleTransferCaptain,
    handleAcceptJoinRequest, handleDeclineJoinRequest, handleDelete,
  } = useTeamDetail({ slug, isAuthenticated, userId: user?.id, navigateBack });

  const membersMax = features.team_members_max;
  const isMembersFull = membersMax !== -1 && (team?.members_count ?? 0) >= membersMax;

  const pickAvatar = useCallback(async () => {
    if (!team) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingAvatar(true);
    try {
      await api.uploadTeamAvatar(team.id, result.assets[0].uri);
      fetchTeam();
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setUploadingAvatar(false);
    }
  }, [team, fetchTeam, t]);

  const handleAvatarPress = useCallback(async () => {
    if (!team || !isCaptain) return;

    if (team.avatar) {
      Alert.alert(t('teams.avatarOptions'), undefined, [
        { text: t('teams.changeAvatar'), onPress: () => pickAvatar() },
        {
          text: t('teams.deleteAvatar'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteTeamAvatar(team.id);
              fetchTeam();
            } catch {
              Alert.alert(t('common.error'), t('common.tryAgain'));
            }
          },
        },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    } else {
      pickAvatar();
    }
  }, [team, isCaptain, pickAvatar, fetchTeam, t]);

  const handleUserPress = useCallback((username: string) => {
    navigation.navigate('UserProfile', { username });
  }, [navigation]);

  if (isLoading) {
    return (
      <ScreenContainer>
        <ScreenHeader title={t('teams.loading')} showBack onBack={navigateBack} />
        <ActivityIndicator style={{ marginTop: spacing.xl }} />
      </ScreenContainer>
    );
  }

  if (error || !team) {
    return (
      <ScreenContainer>
        <ScreenHeader title={t('teams.notFound')} showBack onBack={navigateBack} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error || t('teams.notFound')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  const tabs: { value: TabType; label: string }[] = [
    { value: 'members', label: t('teams.members') },
    { value: 'stats', label: t('teams.stats') },
  ];

  return (
    <ScreenContainer>
      <ScreenHeader
        title={team.name}
        showBack
        onBack={navigateBack}
        rightAction={isCaptain ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('TeamForm', { teamId: team.id })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="create-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        ) : undefined}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <Card style={styles.section}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={isCaptain ? handleAvatarPress : undefined}
              disabled={!isCaptain || uploadingAvatar}
              activeOpacity={0.7}
            >
              <Avatar uri={team.avatar} name={team.name} size="xl" />
              {isCaptain && (
                <View style={[styles.avatarBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="camera" size={14} color="#fff" />
                </View>
              )}
              {uploadingAvatar && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={[styles.teamName, { color: colors.textPrimary }]}>{team.name}</Text>
            {team.description && (
              <Text style={[styles.description, { color: colors.textSecondary }]}>{team.description}</Text>
            )}
            <View style={styles.metaRow}>
              <Ionicons
                name={team.visibility === 'public' ? 'globe-outline' : 'lock-closed-outline'}
                size={16}
                color={colors.textMuted}
              />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                {team.visibility === 'public' ? t('teams.public') : t('teams.private')}
              </Text>
              <Ionicons name="people-outline" size={16} color={colors.textMuted} style={{ marginLeft: spacing.md }} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                {t('teams.membersCount', { count: team.members_count })}
              </Text>
            </View>
          </View>
        </Card>

        {/* Actions — only show when there's something to display */}
        {!isMember && !team.has_pending_invitation && !team.has_pending_request && team.visibility === 'public' && isAuthenticated && (
          <Card style={styles.section}>
            <Button title={t('teams.requestToJoin')} onPress={handleRequestToJoin} loading={isActing} />
          </Card>
        )}
        {!isMember && team.has_pending_request && (
          <Card style={styles.section}>
            <View style={styles.pendingBadge}>
              <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.pendingText, { color: colors.textSecondary }]}>{t('teams.requestSent')}</Text>
            </View>
          </Card>
        )}
        {!isMember && team.has_pending_invitation && (
          <Card style={styles.section}>
            <View style={styles.invitationActions}>
              <Text style={[styles.invitationText, { color: colors.textPrimary }]}>{t('teams.invitedToTeam')}</Text>
              <View style={styles.invitationButtons}>
                <Button title={t('common.accept')} onPress={handleAcceptInvitation} loading={isActing} />
                <Button title={t('common.decline')} onPress={handleDeclineInvitation} variant="outline" />
              </View>
            </View>
          </Card>
        )}
        {isMember && !isCaptain && (
          <Card style={styles.section}>
            <Button title={t('teams.leaveTeam')} onPress={handleLeave} variant="outline" />
          </Card>
        )}
        {isCaptain && (
          <Card style={styles.section}>
            <View style={styles.captainActions}>
              {!isMembersFull ? (
                <Button
                  title={t('teams.invitePlayer')}
                  onPress={() => navigation.navigate('InviteMember', { teamId: team.id })}
                />
              ) : (
                <Button
                  title={t('teams.membersLimitReached')}
                  onPress={() => navigation.navigate('Paywall', { feature: 'team_members' })}
                  variant="outline"
                />
              )}
              <Button title={t('teams.deleteTeam')} onPress={handleDelete} variant="danger" />
            </View>
          </Card>
        )}

        {/* Tabs */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.value}
              style={[styles.tab, activeTab === tab.value && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab.value)}
            >
              <Text style={[styles.tabText, { color: activeTab === tab.value ? colors.primary : colors.textSecondary }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'members' && (
          <>
            {/* Members */}
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t('teams.members')} ({activeMembers.length}/{membersMax === -1 ? '\u221e' : membersMax})
              </Text>
              {activeMembers.map((member, index) => (
                <TouchableOpacity
                  key={`member-${member.id}-${member.user.id}-${index}`}
                  style={[styles.memberRow, { borderBottomColor: colors.border }]}
                  onPress={() => handleUserPress(member.user.username)}
                >
                  <Avatar uri={member.user.avatar} name={member.user.name} size="md" />
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.textPrimary }]}>{member.user.name}</Text>
                    <Text style={[styles.memberUsername, { color: colors.textMuted }]}>@{member.user.username}</Text>
                  </View>
                  {member.role === 'captain' && (
                    <Ionicons name="star" size={18} color={colors.warning || '#f59e0b'} />
                  )}
                  {isCaptain && member.role !== 'captain' && (
                    <View style={styles.memberActions}>
                      <TouchableOpacity onPress={() => handleTransferCaptain(member.user.id, member.user.name)}>
                        <Ionicons name="star-outline" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleKickMember(member.user.id, member.user.name)}>
                        <Ionicons name="close-circle-outline" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </Card>

            {/* Invitations (captain only) */}
            {isCaptain && invitations.length > 0 && (
              <Card style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  {t('teams.invited')} ({invitations.length})
                </Text>
                {invitations.map((inv, index) => (
                  <View key={`inv-${inv.id}-${index}`} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                    <Avatar uri={inv.user.avatar} name={inv.user.name} size="md" />
                    <View style={styles.memberInfo}>
                      <Text style={[styles.memberName, { color: colors.textPrimary }]}>{inv.user.name}</Text>
                      <Text style={[styles.memberUsername, { color: colors.textMuted }]}>{t('teams.pendingInvitation')}</Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}

            {/* Join Requests (captain only) */}
            {isCaptain && joinRequests.length > 0 && (
              <Card style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  {t('teams.joinRequests')} ({joinRequests.length})
                </Text>
                {joinRequests.map((req, index) => (
                  <View key={`req-${req.id}-${index}`} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                    <Avatar uri={req.user.avatar} name={req.user.name} size="md" />
                    <View style={styles.memberInfo}>
                      <Text style={[styles.memberName, { color: colors.textPrimary }]}>{req.user.name}</Text>
                    </View>
                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        style={[styles.requestBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleAcceptJoinRequest(req.id)}
                      >
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.requestBtn, { backgroundColor: colors.error }]}
                        onPress={() => handleDeclineJoinRequest(req.id)}
                      >
                        <Ionicons name="close" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </>
        )}

        {activeTab === 'stats' && (
          <TeamStatsTab slug={slug} onUserPress={handleUserPress} />
        )}

        <View style={{ height: 60 + bottomInset }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  section: { marginBottom: spacing.md },
  header: { alignItems: 'center', paddingVertical: spacing.md },
  teamName: { fontSize: fontSize.xl, fontWeight: '700', marginTop: spacing.sm },
  description: { fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.xs, paddingHorizontal: spacing.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  metaText: { fontSize: fontSize.sm },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, justifyContent: 'center', paddingVertical: spacing.sm },
  pendingText: { fontSize: fontSize.sm },
  invitationActions: { alignItems: 'center', gap: spacing.sm },
  invitationText: { fontSize: fontSize.sm, fontWeight: '600' },
  invitationButtons: { flexDirection: 'row', gap: spacing.sm },
  captainActions: { gap: spacing.sm },
  tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: spacing.md },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  tabText: { fontSize: fontSize.sm, fontWeight: '600' },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', marginBottom: spacing.sm },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: fontSize.sm, fontWeight: '600' },
  memberUsername: { fontSize: fontSize.xs },
  memberActions: { flexDirection: 'row', gap: spacing.sm },
  requestActions: { flexDirection: 'row', gap: spacing.xs },
  requestBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { alignItems: 'center', paddingVertical: spacing.xl * 2, gap: spacing.md },
  errorText: { fontSize: fontSize.md },
  avatarBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
});