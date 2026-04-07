import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Modal, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { Card } from './Card';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Input } from './Input';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize } from '../theme';
import type { EventTeam } from '../types/api';

interface EventTeamsTabContentProps {
  teams: EventTeam[];
  myTeam: EventTeam | undefined;
  isInTeam: boolean;
  isCaptain: boolean;
  isLoading: boolean;
  isActing: boolean;
  isRefreshing: boolean;
  canCreateTeam: boolean;
  canJoinTeam: boolean;
  createdTeam: EventTeam | null;
  onRefresh: () => void;
  onCreateTeam: (name: string) => Promise<EventTeam | null>;
  onJoinTeam: (code: string) => Promise<boolean>;
  onLeaveTeam: () => void;
  onDeleteTeam: () => void;
  onKickMember: (userId: number) => void;
  onTransferCaptain: (userId: number) => void;
  onClearCreatedTeam: () => void;
  onUserPress?: (username: string) => void;
  onScroll?: (event: any) => void;
}

export function EventTeamsTabContent({
  teams,
  myTeam,
  isInTeam,
  isCaptain,
  isLoading,
  isActing,
  isRefreshing,
  canCreateTeam,
  canJoinTeam,
  createdTeam,
  onRefresh,
  onCreateTeam,
  onJoinTeam,
  onLeaveTeam,
  onDeleteTeam,
  onKickMember,
  onTransferCaptain,
  onClearCreatedTeam,
  onUserPress,
  onScroll,
}: EventTeamsTabContentProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { bottom: bottomInset } = useSafeAreaInsets();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null);

  const handleCreate = async () => {
    if (!teamName.trim()) return;
    const result = await onCreateTeam(teamName.trim());
    if (result) {
      setTeamName('');
      setShowCreateModal(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    const ok = await onJoinTeam(joinCode.trim());
    if (ok) {
      setJoinCode('');
      setShowJoinModal(false);
    }
  };

  const copyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Alert.alert(t('common.copied'));
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Action buttons */}
        {(canCreateTeam || canJoinTeam) && (
          <View style={styles.actionRow}>
            {canCreateTeam && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowCreateModal(true)}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>{t('teams.createTeam')}</Text>
              </TouchableOpacity>
            )}
            {canJoinTeam && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.primary }]}
                onPress={() => setShowJoinModal(true)}
              >
                <Ionicons name="enter-outline" size={20} color={colors.primary} />
                <Text style={[styles.actionButtonText, { color: colors.primary }]}>{t('teams.joinTeam')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Created team code display */}
        {createdTeam?.code && (
          <Card style={styles.section}>
            <View style={styles.codeContainer}>
              <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>{t('teams.teamCreated')}</Text>
              <Text style={[styles.codeTitle, { color: colors.textPrimary }]}>{t('teams.teamCode')}</Text>
              <TouchableOpacity
                style={[styles.codeBox, { backgroundColor: colors.background, borderColor: colors.primary }]}
                onPress={() => copyCode(createdTeam.code!)}
              >
                <Text style={[styles.codeText, { color: colors.primary }]}>{createdTeam.code}</Text>
                <Ionicons name="copy-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.codeHint, { color: colors.textMuted }]}>{t('teams.shareCode')}</Text>
              <Button title={t('common.ok')} onPress={onClearCreatedTeam} />
            </View>
          </Card>
        )}

        {/* My team info */}
        {isInTeam && myTeam && (
          <Card style={styles.section}>
            <View style={styles.myTeamHeader}>
              <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
              <Text style={[styles.myTeamLabel, { color: colors.primary }]}>
                {isCaptain ? t('teams.youAreCaptain') : t('teams.youAreInThisTeam')}
              </Text>
            </View>
            {myTeam.code && isCaptain && (
              <TouchableOpacity
                style={[styles.codeBox, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => copyCode(myTeam.code!)}
              >
                <Text style={[styles.codeSmall, { color: colors.textPrimary }]}>{t('teams.teamCode')}: {myTeam.code}</Text>
                <Ionicons name="copy-outline" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            <View style={styles.myTeamActions}>
              {!isCaptain && (
                <Button title={t('teams.leaveTeam')} onPress={onLeaveTeam} variant="outline" />
              )}
              {isCaptain && (
                <Button title={t('teams.deleteTeam')} onPress={onDeleteTeam} variant="danger" />
              )}
            </View>
          </Card>
        )}

        {/* Teams list */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('teams.teams')} ({teams.length})
          </Text>
          {teams.length === 0 && !isLoading && (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('teams.noTeams')}</Text>
          )}
          {teams.map((team) => {
            const isExpanded = expandedTeamId === team.id;
            const isMyTeam = team.is_captain || team.is_member;
            return (
              <View key={team.id}>
                <TouchableOpacity
                  style={[styles.teamRow, { borderBottomColor: colors.border }, isMyTeam && { backgroundColor: colors.primary + '08' }]}
                  onPress={() => setExpandedTeamId(isExpanded ? null : team.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.teamInfo}>
                    <View style={styles.teamNameRow}>
                      <Ionicons name="shield" size={18} color={isMyTeam ? colors.primary : colors.textSecondary} />
                      <Text style={[styles.teamName, { color: colors.textPrimary }]}>{team.name}</Text>
                    </View>
                    <Text style={[styles.teamMeta, { color: colors.textMuted }]}>
                      {team.captain.name} {team.is_full ? `(${t('teams.teamFull')})` : `(${team.members_count})`}
                    </Text>
                  </View>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                {isExpanded && team.members && (
                  <View style={[styles.membersList, { backgroundColor: colors.background }]}>
                    {team.members.map((reg) => (
                      <TouchableOpacity
                        key={reg.id}
                        style={styles.memberRow}
                        onPress={() => reg.user?.username && onUserPress?.(reg.user.username)}
                        disabled={!onUserPress}
                      >
                        <Avatar uri={reg.user?.avatar} name={reg.user?.name || '?'} size="sm" />
                        <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                          {reg.user?.name}
                        </Text>
                        {reg.user_id === team.captain.id && (
                          <Ionicons name="star" size={14} color={colors.warning || '#f59e0b'} />
                        )}
                        {isCaptain && myTeam?.id === team.id && reg.user_id !== team.captain.id && (
                          <View style={styles.memberActions}>
                            <TouchableOpacity onPress={() => onTransferCaptain(reg.user_id)}>
                              <Ionicons name="star-outline" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => onKickMember(reg.user_id)}>
                              <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                            </TouchableOpacity>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </Card>
        <View style={{ height: 100 + bottomInset }} />
      </ScrollView>

      {/* Create Team Modal */}
      <Modal visible={showCreateModal} transparent animationType="fade" onRequestClose={() => setShowCreateModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCreateModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('teams.createNewTeam')}</Text>
            <Input
              label={t('teams.teamName')}
              placeholder={t('teams.teamNamePlaceholder')}
              value={teamName}
              onChangeText={setTeamName}
              maxLength={100}
            />
            <View style={styles.modalButtons}>
              <Button title={t('common.cancel')} onPress={() => setShowCreateModal(false)} variant="outline" />
              <Button title={t('teams.createTeam')} onPress={handleCreate} loading={isActing} disabled={!teamName.trim()} />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Join Team Modal */}
      <Modal visible={showJoinModal} transparent animationType="fade" onRequestClose={() => setShowJoinModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowJoinModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('teams.joinTeamModal')}</Text>
            <Input
              label={t('teams.teamCode')}
              placeholder={t('teams.teamCodePlaceholder')}
              value={joinCode}
              onChangeText={(text) => setJoinCode(text.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
            />
            <View style={styles.modalButtons}>
              <Button title={t('common.cancel')} onPress={() => setShowJoinModal(false)} variant="outline" />
              <Button title={t('teams.joinTeam')} onPress={handleJoin} loading={isActing} disabled={joinCode.length < 4} />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  actionButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: 8,
  },
  actionButtonText: { color: '#fff', fontWeight: '600', fontSize: fontSize.sm },
  section: { marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.sm },
  emptyText: { textAlign: 'center', paddingVertical: spacing.lg, fontSize: fontSize.sm },
  teamRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  teamInfo: { flex: 1 },
  teamNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  teamName: { fontSize: fontSize.md, fontWeight: '600' },
  teamMeta: { fontSize: fontSize.sm, marginTop: 2, marginLeft: 22 },
  membersList: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8, marginBottom: spacing.xs },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  memberName: { flex: 1, fontSize: fontSize.sm },
  memberActions: { flexDirection: 'row', gap: spacing.sm },
  codeContainer: { alignItems: 'center', paddingVertical: spacing.md },
  codeLabel: { fontSize: fontSize.sm, marginBottom: spacing.xs },
  codeTitle: { fontSize: fontSize.md, fontWeight: '600', marginBottom: spacing.sm },
  codeBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: 8, borderWidth: 2, marginBottom: spacing.sm,
  },
  codeText: { fontSize: 24, fontWeight: '700', letterSpacing: 4 },
  codeSmall: { fontSize: fontSize.sm },
  codeHint: { fontSize: fontSize.xs, marginBottom: spacing.md, textAlign: 'center' },
  myTeamHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  myTeamLabel: { fontSize: fontSize.sm, fontWeight: '600' },
  myTeamActions: { marginTop: spacing.sm, flexDirection: 'row', gap: spacing.sm },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: spacing.lg,
  },
  modalContent: { width: '100%', borderRadius: 12, padding: spacing.lg },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.md },
  modalButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, justifyContent: 'flex-end' },
});
