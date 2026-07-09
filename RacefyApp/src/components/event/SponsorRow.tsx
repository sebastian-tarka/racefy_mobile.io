import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { fontSize, spacing } from '../../theme';
import type { EventSponsor } from '../../types/api';

/** "PRESENTED BY {sponsor}" row. */
export function SponsorRow({ sponsor }: { sponsor: EventSponsor | null | undefined }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!sponsor?.name) return null;

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.textMuted }]}>
        {t('eventDetail.presentedBy', 'Presented by').toUpperCase()}
      </Text>
      <Text style={[styles.name, { color: colors.textPrimary }]}>{sponsor.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
