import React, {useCallback} from 'react';
import {ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View,} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTheme} from '../../hooks/useTheme';
import {useUnsyncedActivities} from '../../hooks/useUnsyncedActivities';
import {exportGpxAndShare} from '../../utils/gpxExport';
import {getUnsyncedActivity, type UnsyncedActivityMeta} from '../../services/unsyncedActivities';
import {Button, ScreenContainer, ScreenHeader} from '../../components';
import {spacing} from '../../theme';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'UnsyncedActivities'>;

function formatDistanceKm(meters: number): string {
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatFailedAt(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleString(locale);
  } catch {
    return iso;
  }
}

export function UnsyncedActivitiesScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const { items, isLoading, retryingId, refresh, retry, discard } =
    useUnsyncedActivities();

  const onRetry = useCallback(async (entry: UnsyncedActivityMeta) => {
    const outcome = await retry(entry.activityId);
    if (outcome.ok) {
      Alert.alert(t('unsynced.retrySuccessTitle'), t('unsynced.retrySuccessBody'));
    } else {
      Alert.alert(t('unsynced.retryFailedTitle'), outcome.error);
    }
  }, [retry, t]);

  const onExport = useCallback(async (entry: UnsyncedActivityMeta) => {
    const full = await getUnsyncedActivity(entry.activityId);
    if (!full) {
      Alert.alert(t('unsynced.exportFailedTitle'), t('unsynced.exportMissing'));
      return;
    }
    const ok = await exportGpxAndShare({
      activityId: full.activityId,
      name: full.title || `Racefy activity ${full.activityId}`,
      startedAt: full.startedAt,
      sportType: full.sportTypeName,
      points: full.points,
    });
    if (!ok) {
      Alert.alert(t('unsynced.exportFailedTitle'), t('unsynced.exportFailedBody'));
    }
  }, [t]);

  const onDiscard = useCallback((entry: UnsyncedActivityMeta) => {
    Alert.alert(
      t('unsynced.discardConfirmTitle'),
      t('unsynced.discardConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('unsynced.discard'),
          style: 'destructive',
          onPress: () => discard(entry.activityId),
        },
      ],
    );
  }, [discard, t]);

  const renderItem = useCallback(({ item }: { item: UnsyncedActivityMeta }) => {
    const isRetrying = retryingId === item.activityId;

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.cardBackground, borderColor: colors.border },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.title || t('unsynced.untitled', { id: item.activityId })}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {item.sportTypeName ? `${item.sportTypeName} • ` : ''}
              {formatFailedAt(item.failedAt, i18n.language)}
            </Text>
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.warningLight, borderColor: colors.warning },
            ]}
          >
            <Ionicons name="cloud-offline" size={14} color={colors.warning} />
            <Text style={[styles.badgeText, { color: colors.warning }]}>
              {t('unsynced.statusFailed')}
            </Text>
          </View>
        </View>

        <View style={styles.stats}>
          <Stat
            label={t('unsynced.statDistance')}
            value={formatDistanceKm(item.distance)}
            colors={colors}
          />
          <Stat
            label={t('unsynced.statDuration')}
            value={formatDuration(item.duration)}
            colors={colors}
          />
          <Stat
            label={t('unsynced.statPoints')}
            value={String(item.pointsCount)}
            colors={colors}
          />
        </View>

        {item.lastError && (
          <Text style={[styles.errorText, { color: colors.error }]} numberOfLines={2}>
            {item.lastError}
          </Text>
        )}
        {item.retryCount > 0 && (
          <Text style={[styles.retryText, { color: colors.textMuted }]}>
            {t('unsynced.retryCount', { count: item.retryCount })}
          </Text>
        )}

        <View style={styles.actions}>
          <Button
            title={t('unsynced.retry')}
            onPress={() => onRetry(item)}
            loading={isRetrying}
            disabled={isRetrying}
            style={styles.actionPrimary}
          />
          <Button
            title={t('unsynced.exportGpx')}
            variant="outline"
            onPress={() => onExport(item)}
            disabled={isRetrying || item.pointsCount === 0}
            style={styles.actionSecondary}
          />
          <Button
            title={t('unsynced.discard')}
            variant="ghost"
            onPress={() => onDiscard(item)}
            disabled={isRetrying}
            style={styles.actionSecondary}
          />
        </View>
      </View>
    );
  }, [colors, i18n.language, onDiscard, onExport, onRetry, retryingId, t]);

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('unsynced.screenTitle')}
        showBack
        onBack={() => navigation.goBack()}
      />
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {t('unsynced.emptyTitle')}
          </Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
            {t('unsynced.emptyBody')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.activityId)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.primary} />
          }
        />
      )}
    </ScreenContainer>
  );
}

function Stat({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  emptyBody: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginLeft: spacing.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  stats: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  errorText: {
    fontSize: 12,
    marginTop: spacing.sm,
  },
  retryText: {
    fontSize: 11,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm as unknown as number,
  },
  actionPrimary: {
    flex: 1.2,
  },
  actionSecondary: {
    flex: 1,
  },
});