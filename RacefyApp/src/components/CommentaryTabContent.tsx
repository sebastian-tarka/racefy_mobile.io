import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CommentaryFeed } from './CommentaryFeed';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import type { Event } from '../types/api';

interface CommentaryTabContentProps {
  event: Event;
  onOpenSettings?: () => void;
}

export function CommentaryTabContent({
  event,
  onOpenSettings,
}: CommentaryTabContentProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();

  const isOrganizer = user?.id === event.created_by;
  const isOngoing = event.status === 'ongoing';

  const renderHeader = () => {
    if (!isOrganizer) return null;

    return (
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={[
            styles.settingsButton,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
          onPress={onOpenSettings}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={20} color={colors.primary} />
          <Text style={[styles.settingsText, { color: colors.primary }]}>
            {t('commentary.settings')}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <CommentaryFeed
        eventId={event.id}
        autoRefresh={isOngoing}
        refreshInterval={30000}
        showTokenUsage={isOrganizer}
        ListHeaderComponent={renderHeader()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingBottom: spacing.md,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  settingsText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});
