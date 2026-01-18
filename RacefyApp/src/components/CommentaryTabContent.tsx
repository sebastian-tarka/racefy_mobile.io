import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CommentaryFeed } from './CommentaryFeed';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import { api } from '../services/api';
import { logger } from '../services/logger';
import type { Event, CommentarySettings } from '../types/api';

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
  const [commentarySettings, setCommentarySettings] = useState<CommentarySettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const isOrganizer = user?.id === event.created_by;
  const isOngoing = event.status === 'ongoing';

  // Fetch commentary settings to get the interval_minutes
  useEffect(() => {
    let isMounted = true;

    const fetchSettings = async () => {
      try {
        const settings = await api.getCommentarySettings(event.id);
        if (isMounted) {
          setCommentarySettings(settings);
        }
      } catch (error) {
        // Silently fail - we'll use default interval
        logger.error('api', 'Failed to fetch commentary settings', { error, eventId: event.id });
      } finally {
        if (isMounted) {
          setIsLoadingSettings(false);
        }
      }
    };

    fetchSettings();

    return () => {
      isMounted = false;
    };
  }, [event.id]);

  // Convert interval_minutes to milliseconds (default to 30 seconds if not available)
  const refreshInterval = commentarySettings?.interval_minutes
    ? commentarySettings.interval_minutes * 60 * 1000
    : 30000;

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

  // Show loading indicator while fetching settings
  if (isLoadingSettings) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('commentary.loadingSettings', 'Loading commentary settings...')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CommentaryFeed
        eventId={event.id}
        autoRefresh={isOngoing}
        refreshInterval={refreshInterval}
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
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
