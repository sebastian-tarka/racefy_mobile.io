import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BadgeTile } from '../rewards/BadgeTile';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, msFont, spacing } from '../../theme';
import type { BadgeReward } from '../../types/api';

const COLUMNS = 4;
const LIMIT = 8;

interface Props {
  badges: BadgeReward[];
  onOpenAll: () => void;
  onOpenBadge: (reward: BadgeReward) => void;
}

/**
 * The badge cabinet (design "Racefy v2" → BadgeCabinet).
 *
 * A profile SECTION, not a sixth tab. The tab bar already carries five content
 * feeds that all answer "what have I done"; a cabinet answers "what have I
 * won", and sitting above the tabs — next to the rank block — is what lets it
 * pull anyone into the competition layer at all. As a tab it would be as
 * invisible as the leaderboard was.
 *
 * Renders nothing when there is nothing won: an empty cabinet on a new
 * account is a promise the profile cannot keep yet.
 */
export function BadgeCabinet({ badges, onOpenAll, onOpenBadge }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  if (badges.length === 0) return null;

  const shown = badges.slice(0, LIMIT);
  const fresh = badges.filter((b) => b.is_new).length;
  // Keep the last row left-aligned with the rest of the grid.
  const fillers = (COLUMNS - (shown.length % COLUMNS)) % COLUMNS;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {fresh > 0
            ? t('rewards.cabinet.labelWithNew', { count: badges.length, fresh })
            : t('rewards.cabinet.label', { count: badges.length })}
        </Text>
        <TouchableOpacity onPress={onOpenAll} hitSlop={8}>
          <Text style={[styles.link, { color: colors.primaryDark }]}>
            {t('rewards.cabinet.allRewards')}
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.cardBackground, borderColor: colors.border },
        ]}
      >
        <View style={styles.grid}>
          {shown.map((reward) => (
            <View key={reward.id} style={styles.cell}>
              <BadgeTile reward={reward} size="sm" onPress={onOpenBadge} />
            </View>
          ))}
          {Array.from({ length: fillers }).map((_, i) => (
            <View key={`filler-${i}`} style={styles.cell} />
          ))}
        </View>

        {badges.length > LIMIT && (
          <TouchableOpacity
            style={[styles.seeAll, { backgroundColor: colors.background }]}
            onPress={onOpenAll}
            activeOpacity={0.8}
          >
            <Text style={[styles.seeAllText, { color: colors.textSecondary }]}>
              {t('rewards.cabinet.seeAll', { count: badges.length })}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingBottom: spacing.sm,
  },
  label: {
    fontSize: msFont(10.5),
    fontWeight: '600',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  link: {
    fontSize: msFont(12),
    fontWeight: '600',
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.lg,
  },
  cell: {
    width: `${100 / COLUMNS}%`,
    paddingHorizontal: spacing.xs,
  },
  seeAll: {
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  seeAllText: {
    fontSize: msFont(12),
    fontWeight: '600',
  },
});
