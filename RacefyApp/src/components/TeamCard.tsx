import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Card } from './Card';
import { Avatar } from './Avatar';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize } from '../theme';
import type { Team } from '../types/api';

interface TeamCardProps {
  team: Team;
  onPress: () => void;
}

export function TeamCard({ team, onPress }: TeamCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Card style={styles.card}>
      <TouchableOpacity style={styles.content} onPress={onPress} activeOpacity={0.7}>
        <Avatar uri={team.avatar} name={team.name} size="lg" />
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {team.name}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="star" size={14} color={colors.warning || '#f59e0b'} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
              {team.captain.name}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textMuted }]}>
              {t('teams.membersCount', { count: team.members_count })}
            </Text>
            <Ionicons
              name={team.visibility === 'public' ? 'globe-outline' : 'lock-closed-outline'}
              size={14}
              color={colors.textMuted}
              style={{ marginLeft: spacing.sm }}
            />
            <Text style={[styles.metaText, { color: colors.textMuted }]}>
              {team.visibility === 'public' ? t('teams.public') : t('teams.private')}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1 },
  name: { fontSize: fontSize.md, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { fontSize: fontSize.sm },
});
