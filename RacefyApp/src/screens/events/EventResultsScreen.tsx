import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Card, EmptyState, Loading, ScreenContainer } from '../../components';
import { EventScoreboard, resultToRow, type ScoreboardTile } from '../../components/event';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import { useEventResults } from '../../hooks/useEventResults';
import { borderRadius, fontSize, spacing } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EventResults'>;

export function EventResultsScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const units = useUnits();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { eventId } = route.params;

  const { individualResults, teamResults, isFinalized, rankingMode, aggregates, isLoading, error } =
    useEventResults(eventId, { enabled: true });

  const individualRows = useMemo(
    () => individualResults.map((r) => resultToRow(r, rankingMode, units)),
    [individualResults, rankingMode, units],
  );
  const teamRows = useMemo(
    () => teamResults.map((r) => resultToRow(r, rankingMode, units)),
    [teamResults, rankingMode, units],
  );

  const tiles: ScoreboardTile[] = [
    {
      icon: 'people',
      label: t('eventDetail.finishers', 'Finishers'),
      value: String(aggregates.finishers),
    },
    {
      icon: 'navigate',
      label: t('eventDetail.totalDist', 'Total dist'),
      value: units.formatDistanceShort(aggregates.totalDistance),
    },
    {
      icon: 'trending-up',
      label: t('eventDetail.totalClimb', 'Total climb'),
      value: units.formatElevation(aggregates.totalElevation),
    },
  ];

  const goToCommentary = useCallback(
    () => navigation.navigate('EventCommentary', { eventId }),
    [navigation, eventId],
  );

  const showEmpty = !isLoading && !error && individualRows.length === 0;

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.backButton,
            { backgroundColor: colors.cardBackground, borderColor: colors.border },
          ]}
          onPress={() => navigation.goBack()}
          hitSlop={HIT_SLOP}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t('eventDetail.finalResults', 'Final results')}
        </Text>
        <View style={[styles.completedPill, { backgroundColor: colors.borderLight }]}>
          <Text style={[styles.completedText, { color: colors.textSecondary }]}>
            {t('eventStatus.completed', 'Completed').toUpperCase()}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {isFinalized && (
          <View style={styles.finalizedRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            <Text style={[styles.finalizedText, { color: colors.primary }]}>
              {t('eventDetail.resultsFinalized', 'Results finalized · points awarded')}
            </Text>
          </View>
        )}

        {isLoading && individualRows.length === 0 ? (
          <Loading />
        ) : showEmpty ? (
          <EmptyState
            icon="trophy-outline"
            title={t('eventDetail.noResultsTitle', 'Results not final yet')}
            message={t(
              'eventDetail.noResultsMessage',
              'Final placements will appear once the organizer finalizes them.',
            )}
          />
        ) : (
          <EventScoreboard
            tiles={tiles}
            individualRows={individualRows}
            teamRows={teamRows}
            currentUserId={user?.id}
            listTitle={t('eventDetail.finalStandings', 'Final standings')}
            emptyText={t('eventDetail.noStandingsYet', 'No results.')}
          />
        )}

        {!showEmpty && (
          <TouchableOpacity activeOpacity={0.85} onPress={goToCommentary}>
            <Card style={styles.commentaryLink}>
              <Ionicons name="sparkles" size={18} color="#8b5cf6" />
              <Text style={[styles.commentaryText, { color: colors.textSecondary }]}>
                {t('commentary.raceCommentary', 'Race commentary')}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Card>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  completedPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  completedText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  finalizedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  finalizedText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  commentaryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  commentaryText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
});
