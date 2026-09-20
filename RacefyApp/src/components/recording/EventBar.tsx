import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { msFont, spacing } from '../../theme';
import type { Event } from '../../types/api';

interface Props {
  /** The pinned event, or null when nothing is pinned. */
  event: Event | null;
  /** How many ongoing events the athlete could pin — the count is the discovery mechanism. */
  count: number;
  sportName?: string | null;
  sportIcon?: keyof typeof Ionicons.glyphMap;
  /** While recording: the "×" becomes a lock and `onClear` is expected to refuse. */
  locked?: boolean;
  disabled?: boolean;
  onOpen: () => void;
  onClear: () => void;
  onBrowse?: () => void;
}

/**
 * The event bar on the pre-start card (design "Racefy v2" → racefy-event-pin.jsx,
 * variant b): full width, above the sport rail. A third SetupChip would leave
 * ~110 pt per chip at 390 pt — the title truncates to two words and the "×"
 * loses its target — and replacing the route chip would make the control come
 * and go depending on whether the event has a route.
 */
export function EventBar({
  event,
  count,
  sportName,
  sportIcon,
  locked,
  disabled,
  onOpen,
  onClear,
  onBrowse,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  // Nothing to pin: the bar stays, muted, so the control never moves.
  if (!event && count === 0) {
    return (
      <View
        style={[styles.bar, { backgroundColor: colors.background, borderColor: colors.border }]}
      >
        <View style={[styles.iconSm, { backgroundColor: colors.cardBackground }]}>
          <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
        </View>
        <Text style={[styles.mutedText, { color: colors.textSecondary }]} numberOfLines={1}>
          {t('eventPin.noEvents')}
        </Text>
        {onBrowse && (
          <TouchableOpacity onPress={onBrowse} hitSlop={HIT}>
            <Text style={[styles.browseText, { color: colors.textSecondary }]}>
              {t('eventPin.browse')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (!event) {
    return (
      <TouchableOpacity
        style={[
          styles.bar,
          styles.dashed,
          { backgroundColor: colors.cardBackground, borderColor: colors.event + '66' },
        ]}
        onPress={onOpen}
        disabled={disabled}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t('eventPin.pinCta')}
      >
        <View style={[styles.iconSm, { backgroundColor: colors.eventSoft }]}>
          <Ionicons name="calendar-outline" size={15} color={colors.event} />
        </View>
        <Text style={[styles.ctaText, { color: colors.textPrimary }]} numberOfLines={1}>
          {t('eventPin.pinCta')}
        </Text>
        <View style={[styles.countPill, { backgroundColor: colors.eventSoft }]}>
          <Text style={[styles.countText, { color: colors.eventDeep }]}>{count}</Text>
        </View>
        <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.bar,
        styles.pinned,
        { backgroundColor: colors.eventSoft, borderColor: colors.event },
      ]}
      onPress={locked ? onClear : onOpen}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityLabel={`${t('eventPin.eventLabel')}: ${event.post?.title ?? ''}`}
    >
      <View style={[styles.iconMd, { backgroundColor: colors.event }]}>
        <Ionicons name="calendar" size={16} color="#ffffff" />
      </View>
      <View style={styles.pinnedBody}>
        <View style={styles.metaRow}>
          <Text style={[styles.label, { color: colors.eventDeep }]}>
            {t('eventPin.eventLabel')}
          </Text>
          {sportName && (
            <View style={styles.metaItem}>
              {sportIcon && <Ionicons name={sportIcon} size={11} color={colors.eventDeep} />}
              <Text style={[styles.metaText, { color: colors.eventDeep }]} numberOfLines={1}>
                {sportName}
              </Text>
            </View>
          )}
          {event.route?.geometry && (
            <Ionicons name="git-branch-outline" size={11} color={colors.eventDeep} />
          )}
        </View>
        {/* Long titles truncate to one line — the sheet carries the full name. */}
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {event.post?.title || t('eventDetail.untitled')}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.clear, { backgroundColor: colors.event + '24' }]}
        onPress={onClear}
        disabled={disabled}
        hitSlop={HIT}
        accessibilityLabel={t(locked ? 'eventPin.cantUnpin' : 'eventPin.unpin')}
      >
        <Ionicons name={locked ? 'lock-closed' : 'close'} size={15} color={colors.eventDeep} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

const styles = StyleSheet.create({
  bar: {
    marginBottom: spacing.sm,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dashed: { borderStyle: 'dashed' },
  pinned: { paddingVertical: 7, paddingLeft: 10, paddingRight: 8 },
  iconSm: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconMd: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutedText: { flex: 1, fontSize: msFont(12.5), fontWeight: '600' },
  browseText: { fontSize: msFont(12), fontWeight: '600' },
  ctaText: { flex: 1, fontSize: msFont(13), fontWeight: '600' },
  countPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  countText: { fontSize: msFont(11), fontWeight: '600', fontVariant: ['tabular-nums'] },
  pinnedBody: { flex: 1, minWidth: 0 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1, opacity: 0.8 },
  label: { fontSize: msFont(9.5), fontWeight: '700', letterSpacing: 1.1 },
  metaText: { fontSize: msFont(10), fontWeight: '600', flexShrink: 1 },
  title: { fontSize: msFont(13), fontWeight: '700', marginTop: 1 },
  clear: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
