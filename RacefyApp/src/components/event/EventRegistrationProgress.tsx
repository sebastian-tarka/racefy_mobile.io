import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Card } from '../Card';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, fontSize, spacing } from '../../theme';
import type { Event } from '../../types/api';

/**
 * "Registration open · Closes …" box with a fill bar and spots counter.
 * Shown for upcoming events that have a participant cap and/or a registration window.
 */
export function EventRegistrationProgress({ event }: { event: Event }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const eligibility = event.registration_eligibility;
  const isOpen = eligibility?.can_register ?? event.is_registration_open ?? false;
  const closesAt = eligibility?.closes_at ?? event.registration_closes_at;
  const opensAt = eligibility?.opens_at ?? event.registration_opens_at;

  const max = event.max_participants;
  const taken = event.participants_count;
  const hasCap = max != null && max > 0;
  const left = hasCap ? Math.max(0, max - taken) : null;
  const pct = hasCap ? Math.min(100, Math.round((taken / max) * 100)) : 0;

  const statusText = isOpen
    ? t('eventDetail.registrationOpen', 'Registration open')
    : opensAt && new Date(opensAt) > new Date()
      ? t('eventDetail.registrationNotOpened', 'Registration not open yet')
      : t('eventDetail.registrationClosed', 'Registration closed');

  const subline = isOpen
    ? closesAt
      ? t('eventDetail.closesOn', {
          date: format(new Date(closesAt), 'EEE d MMM · HH:mm'),
          defaultValue: `Closes ${format(new Date(closesAt), 'EEE d MMM · HH:mm')}`,
        })
      : null
    : opensAt && new Date(opensAt) > new Date()
      ? t('eventDetail.opensOn', {
          date: format(new Date(opensAt), 'EEE d MMM · HH:mm'),
          defaultValue: `Opens ${format(new Date(opensAt), 'EEE d MMM · HH:mm')}`,
        })
      : null;

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={[styles.status, { color: colors.textPrimary }]}>{statusText}</Text>
          {subline ? (
            <Text style={[styles.subline, { color: colors.textMuted }]}>{subline}</Text>
          ) : null}
        </View>
        <View
          style={[
            styles.statusIcon,
            { backgroundColor: (isOpen ? colors.success : colors.textMuted) + '20' },
          ]}
        >
          <Ionicons
            name={isOpen ? 'checkmark' : 'lock-closed'}
            size={16}
            color={isOpen ? colors.success : colors.textMuted}
          />
        </View>
      </View>

      {hasCap && (
        <>
          <View style={styles.spotsRow}>
            <Text style={[styles.spotsText, { color: colors.textSecondary }]}>
              {t('eventDetail.ofSpots', {
                taken,
                max,
                defaultValue: `${taken} of ${max} spots`,
              })}
            </Text>
            <Text style={[styles.spotsLeft, { color: colors.primary }]}>
              {t('eventDetail.spotsLeft', { count: left ?? 0, defaultValue: `${left} left` })}
            </Text>
          </View>
          <View style={[styles.track, { backgroundColor: colors.borderLight }]}>
            <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
          </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    marginRight: spacing.md,
  },
  status: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  subline: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spotsText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  spotsLeft: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  track: {
    height: 8,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
});
