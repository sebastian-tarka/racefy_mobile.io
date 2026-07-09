import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, fontSize, spacing } from '../../theme';
import { PodiumTop3, StandingRow, type StandingRowModel, StatTile } from './EventLiveResults';

export interface ScoreboardTile {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  unit?: string;
  color?: string;
}

interface EventScoreboardProps {
  tiles: ScoreboardTile[];
  individualRows: StandingRowModel[];
  teamRows?: StandingRowModel[];
  currentUserId?: number;
  /** Section title above the standings list, e.g. "Live standings" / "Final standings". */
  listTitle: string;
  emptyText: string;
}

/** Tiles (2-up grid) + podium + Individual/Teams tabs + standings list. */
export function EventScoreboard({
  tiles,
  individualRows,
  teamRows = [],
  currentUserId,
  listTitle,
  emptyText,
}: EventScoreboardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [tab, setTab] = useState<'individual' | 'teams'>('individual');
  const hasTeams = teamRows.length > 0;
  const rows = tab === 'teams' && hasTeams ? teamRows : individualRows;

  return (
    <View style={styles.container}>
      {/* Stat tiles — 2 per row */}
      <View style={styles.tiles}>
        {tiles.map((tile) => (
          <View key={tile.label} style={styles.tileWrap}>
            <StatTile {...tile} />
          </View>
        ))}
      </View>

      {individualRows.length > 0 && (
        <>
          <Text style={[styles.podiumLabel, { color: colors.textMuted }]}>
            {t('eventDetail.podium', 'Podium').toUpperCase()}
          </Text>
          <PodiumTop3 rows={individualRows.slice(0, 3)} />
        </>
      )}

      <View style={styles.listHeader}>
        <Text style={[styles.listTitle, { color: colors.textMuted }]}>
          {listTitle.toUpperCase()}
        </Text>
        {hasTeams && (
          <View style={[styles.tabs, { backgroundColor: colors.borderLight }]}>
            {(['individual', 'teams'] as const).map((value) => (
              <TouchableOpacity
                key={value}
                style={[styles.tab, tab === value && { backgroundColor: colors.cardBackground }]}
                onPress={() => setTab(value)}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: tab === value ? colors.textPrimary : colors.textMuted },
                  ]}
                >
                  {value === 'individual'
                    ? t('eventDetail.individual', 'Individual')
                    : t('eventDetail.teams', 'Teams')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {rows.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>{emptyText}</Text>
      ) : (
        <View>
          {rows.map((row) => (
            <StandingRow
              key={`${tab}-${row.place}-${row.userId ?? row.name}`}
              row={row}
              isCurrentUser={currentUserId != null && row.userId === currentUserId}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tileWrap: {
    flexGrow: 1,
    flexBasis: '46%',
  },
  podiumLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  listTitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: borderRadius.full,
    padding: 3,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  empty: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
