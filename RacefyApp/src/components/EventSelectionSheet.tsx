import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { msFont, spacing } from '../theme';
import type { SportTypeWithIcon } from '../hooks/useSportTypes';
import type { Event } from '../types/api';

const ROUTE_BLUE = '#2563EB';

interface EventSelectionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (event: Event | null) => void;
  events: Event[];
  selectedEvent: Event | null;
  isLoading?: boolean;
  /** Resolves the discipline icon; without it the rows fall back to a generic one. */
  sportTypes?: SportTypeWithIcon[];
  /**
   * Set once an activity is recorded (finish screen, GPX import with a known
   * sport): events of another discipline cannot be pinned — that would silently
   * rewrite the type of a recorded activity.
   */
  lockedSportId?: number | null;
  /** Empty-state way out to the events catalogue. */
  onBrowse?: () => void;
}

const sportIdOf = (event: Event) => event.sport_type_id ?? event.sport_type?.id ?? null;

/**
 * Event picker (design "Racefy v2" → racefy-event-pin.jsx, EventSheet):
 * RoutesDrawer's shape with the event accent. "No event" always sits on top —
 * unpinning must be as easy as pinning.
 */
export function EventSelectionSheet({
  visible,
  onClose,
  onSelect,
  events,
  selectedEvent,
  isLoading = false,
  sportTypes,
  lockedSportId,
  onBrowse,
}: EventSelectionSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  const pick = (event: Event | null) => {
    onSelect(event);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.container, { backgroundColor: colors.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: colors.eventSoft }]}>
              <Ionicons name="calendar-outline" size={16} color={colors.event} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t('eventPin.pinTitle')}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {t('eventPin.pinSub')}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.closeButton,
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
              ]}
              onPress={onClose}
              accessibilityLabel={t('common.close')}
            >
              <Ionicons name="close" size={16} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              style={[
                styles.row,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: !selectedEvent ? colors.textPrimary : colors.border,
                },
              ]}
              onPress={() => pick(null)}
              activeOpacity={0.85}
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.background }]}>
                <Ionicons name="remove" size={18} color={colors.textSecondary} />
              </View>
              <View style={styles.rowBody}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                  {t('eventPin.none')}
                </Text>
                <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                  {t('eventPin.noneSub')}
                </Text>
              </View>
              {!selectedEvent && (
                <View style={[styles.check, { backgroundColor: colors.textPrimary }]}>
                  <Ionicons name="checkmark" size={15} color={colors.background} />
                </View>
              )}
            </TouchableOpacity>

            {/* Skeletons, not a spinner — the list has a known shape. */}
            {isLoading && (
              <>
                {[0, 1].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.skeleton,
                      { backgroundColor: colors.cardBackground, borderColor: colors.border },
                    ]}
                  />
                ))}
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                  {t('eventPin.loading')}
                </Text>
              </>
            )}

            {!isLoading &&
              events.map((event) => {
                const active = selectedEvent?.id === event.id;
                const sportId = sportIdOf(event);
                const sport = sportTypes?.find((s) => s.id === sportId);
                const blocked = lockedSportId != null && sportId !== lockedSportId;
                return (
                  <TouchableOpacity
                    key={event.id}
                    style={[
                      styles.row,
                      {
                        backgroundColor: colors.cardBackground,
                        borderColor: active ? colors.event : colors.border,
                        opacity: blocked ? 0.5 : 1,
                      },
                    ]}
                    onPress={() => pick(active ? null : event)}
                    disabled={blocked}
                    activeOpacity={0.85}
                    accessibilityState={{ selected: active, disabled: blocked }}
                  >
                    <View
                      style={[
                        styles.rowIcon,
                        { backgroundColor: active ? colors.event : colors.primary + '1A' },
                      ]}
                    >
                      <Ionicons
                        name={sport?.icon ?? 'fitness-outline'}
                        size={19}
                        color={active ? '#ffffff' : colors.primary}
                      />
                    </View>
                    <View style={styles.rowBody}>
                      <Text
                        style={[styles.rowTitle, { color: colors.textPrimary }]}
                        numberOfLines={2}
                      >
                        {event.post?.title || t('eventDetail.untitled')}
                      </Text>
                      <View style={styles.meta}>
                        <View style={styles.metaItem}>
                          <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                          <Text style={[styles.metaTime, { color: colors.textSecondary }]}>
                            {formatTime(event.starts_at)}
                          </Text>
                        </View>
                        {event.route?.geometry && (
                          <View style={styles.metaItem}>
                            <Ionicons name="git-branch-outline" size={12} color={ROUTE_BLUE} />
                            <Text style={[styles.metaText, { color: ROUTE_BLUE }]}>
                              {t('eventPin.hasRoute')}
                            </Text>
                          </View>
                        )}
                      </View>
                      {blocked && (
                        <Text style={[styles.blockedText, { color: colors.textMuted }]}>
                          {t('eventPin.wrongSport')}
                        </Text>
                      )}
                    </View>
                    {active && (
                      <View style={[styles.check, { backgroundColor: colors.event }]}>
                        <Ionicons name="checkmark" size={15} color="#ffffff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

            {!isLoading && events.length === 0 && (
              <View style={styles.empty}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.cardBackground }]}>
                  <Ionicons name="calendar-outline" size={21} color={colors.textMuted} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  {t('eventPin.noEvents')}
                </Text>
                <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
                  {t('eventPin.noEventsHint')}
                </Text>
                {onBrowse && (
                  <TouchableOpacity
                    style={[styles.browse, { backgroundColor: colors.textPrimary }]}
                    onPress={() => {
                      onClose();
                      onBrowse();
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.browseText, { color: colors.background }]}>
                      {t('eventPin.browse')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>

          <View
            style={[
              styles.footer,
              { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 20) },
            ]}
          >
            <TouchableOpacity
              style={[styles.done, { backgroundColor: colors.textPrimary }]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={[styles.doneText, { color: colors.background }]}>
                {selectedEvent ? t('common.done') : t('common.close')}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(10,26,20,0.45)', justifyContent: 'flex-end' },
  container: { borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '72%' },
  handleContainer: { alignItems: 'center', paddingTop: 10, paddingBottom: 2 },
  handle: { width: 38, height: 4, borderRadius: 2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    paddingBottom: 12,
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, minWidth: 0 },
  title: { fontSize: msFont(14.5), fontWeight: '700' },
  subtitle: { fontSize: msFont(11), marginTop: 1 },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: { flexGrow: 0 },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: msFont(13.5), fontWeight: '700', lineHeight: msFont(13.5) * 1.25 },
  rowSub: { fontSize: msFont(11), marginTop: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTime: { fontSize: msFont(11), fontVariant: ['tabular-nums'] },
  metaText: { fontSize: msFont(11) },
  blockedText: { fontSize: msFont(10.5), fontWeight: '600', marginTop: 3 },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeleton: { height: 62, borderRadius: 16, borderWidth: 1 },
  loadingText: { textAlign: 'center', fontSize: msFont(12), paddingVertical: 4 },
  empty: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: { fontSize: msFont(14), fontWeight: '700' },
  emptyHint: { fontSize: msFont(12), marginTop: 3, textAlign: 'center' },
  browse: {
    marginTop: 12,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseText: { fontSize: msFont(13), fontWeight: '600' },
  footer: { paddingHorizontal: spacing.md, paddingTop: 10, borderTopWidth: 1 },
  done: { height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  doneText: { fontSize: msFont(13.5), fontWeight: '700' },
});
