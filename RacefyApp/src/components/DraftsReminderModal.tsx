import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
  type ViewToken,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LazyRoutePreview as RoutePreview } from './LeafletMap';
import { fixStorageUrl } from '../config/api';
import { useTheme } from '../hooks/useTheme';
import { useUnits } from '../hooks/useUnits';
import { borderRadius, fontSize, msFont, spacing } from '../theme';
import { api } from '../services/api';
import { logger } from '../services/logger';
import type { Activity, DraftPost } from '../types/api';
import { formatTime } from '../utils/formatters';
import { pickRouteMapUrl } from '../utils/imageVariants';

type PostVisibility = 'public' | 'followers' | 'private';

const VISIBILITIES: { value: PostVisibility; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'public', icon: 'globe-outline' },
  { value: 'followers', icon: 'people-outline' },
  { value: 'private', icon: 'lock-closed-outline' },
];

const OPENNESS: Record<PostVisibility, number> = { private: 0, followers: 1, public: 2 };

function stricter(a: PostVisibility, b?: PostVisibility | null): PostVisibility {
  return b && OPENNESS[b] < OPENNESS[a] ? b : a;
}

interface DraftsReminderModalProps {
  visible: boolean;
  onClose: () => void;
  drafts: DraftPost[];
  /** Publishes with the visibility picked on the page (the activity's own, unless changed). */
  onPublish: (postId: number, visibility: PostVisibility) => Promise<any>;
  onEdit: (draft: DraftPost) => void;
  onViewAll: () => void;
}

/**
 * "You have unpublished activities" — one draft per page, swiped sideways.
 *
 * A draft here is almost always an activity the athlete recorded and has not
 * posted, so each page shows what makes it recognisable at a glance — the
 * route, the date and the three numbers — instead of a stack of text cards
 * clipped by a fixed-height scroll box. Publish sits on every page; with
 * several drafts "Publish all" does it in one go.
 */
export function DraftsReminderModal({
  visible,
  onClose,
  drafts,
  onPublish,
  onEdit,
  onViewAll,
}: DraftsReminderModalProps) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const { formatDistance, formatPaceFromDistanceTime, getPaceUnit } = useUnits();
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [publishingAll, setPublishingAll] = useState(false);
  const [pageWidth, setPageWidth] = useState(0);
  const [page, setPage] = useState(0);
  /** Visibility picked per draft; absent = what the draft already has. */
  const [choice, setChoice] = useState<Record<number, PostVisibility>>({});
  /**
   * GET /posts/drafts loads the bare activity — no sport, no route images — so
   * the page on screen (and the next one) fetch the full activity once.
   */
  const [details, setDetails] = useState<Record<number, Activity | null>>({});
  const requested = useRef(new Set<number>());

  useEffect(() => {
    if (!visible) return;
    for (const draft of drafts.slice(page, page + 2)) {
      const id = draft.activity?.id;
      if (id == null || requested.current.has(id)) continue;
      requested.current.add(id);
      api
        .getActivity(id)
        .then((full) => setDetails((prev) => ({ ...prev, [id]: full })))
        .catch((error) => {
          logger.debug('general', 'Draft activity details failed', { activityId: id, error });
          setDetails((prev) => ({ ...prev, [id]: null }));
        });
    }
  }, [visible, drafts, page]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first?.index != null) setPage(first.index);
  }).current;

  /**
   * What the draft would publish as today: an activity post is shown only to
   * viewers who may see both the post and its activity, so the stricter of the
   * two is what counts (older drafts can have a private post on a public activity).
   */
  const visibilityOf = (draft: DraftPost): PostVisibility =>
    choice[draft.id] ?? stricter(draft.visibility, draft.activity?.visibility);

  const handlePublish = async (draft: DraftPost) => {
    const postId = draft.id;
    setPublishingId(postId);
    try {
      await onPublish(postId, visibilityOf(draft));
    } catch {
      Alert.alert(t('common.error'), t('drafts.publishFailed'));
    } finally {
      setPublishingId(null);
    }
  };

  const publishAll = () =>
    Alert.alert(
      t('drafts.confirmPublishTitle'),
      t('drafts.confirmPublishAll', { count: drafts.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('drafts.publishAll', { count: drafts.length }),
          onPress: async () => {
            setPublishingAll(true);
            try {
              // One at a time: the parent drops each one from the list as it goes.
              for (const draft of [...drafts]) await onPublish(draft.id, visibilityOf(draft));
            } catch {
              Alert.alert(t('common.error'), t('drafts.publishFailed'));
            } finally {
              setPublishingAll(false);
            }
          },
        },
      ],
    );

  const handleEdit = (draft: DraftPost) => {
    onClose();
    onEdit(draft);
  };

  const handleViewAll = () => {
    onClose();
    onViewAll();
  };

  const onListLayout = (e: LayoutChangeEvent) => setPageWidth(e.nativeEvent.layout.width);

  const formatDate = useCallback(
    (iso: string) =>
      new Date(iso).toLocaleDateString(i18n.language, {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
      }),
    [i18n.language],
  );

  const renderDraft = ({ item }: { item: DraftPost }) => {
    const activityId = item.activity?.id;
    const activity = (activityId != null ? details[activityId] : null) ?? item.activity;
    const loadingDetails = activityId != null && !(activityId in details);
    const hasRoute = !!(
      activity?.route_preview_url ||
      activity?.route_map_url ||
      activity?.route_svg
    );
    const seconds = activity ? (activity.moving_time ?? activity.duration) : 0;
    const stats = activity
      ? [
          activity.distance > 0
            ? { label: t('drafts.stat.distance'), value: formatDistance(activity.distance) }
            : null,
          seconds > 0 ? { label: t('drafts.stat.time'), value: formatTime(seconds) } : null,
          activity.distance > 0 && seconds > 0
            ? {
                label: getPaceUnit(),
                value: formatPaceFromDistanceTime(activity.distance, seconds),
              }
            : null,
        ].filter((s): s is { label: string; value: string } => s != null)
      : [];
    const busy = publishingId === item.id || publishingAll;
    const visibility = visibilityOf(item);

    return (
      <View style={{ width: pageWidth }}>
        <View
          style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}
        >
          {hasRoute && activity ? (
            <View style={styles.map}>
              <RoutePreview
                routePreviewUrl={fixStorageUrl(activity.route_preview_url)}
                routeMapUrl={fixStorageUrl(pickRouteMapUrl(activity))}
                routeSvg={activity.route_svg}
                trackData={undefined}
                activityId={activity.id}
                height={168}
                backgroundColor={colors.cardBackground}
                showStartMarker={activity.gps_track?.show_start_marker ?? true}
                showFinishMarker={activity.gps_track?.show_finish_marker ?? true}
                startPoint={activity.gps_track?.start_point ?? null}
                finishPoint={activity.gps_track?.finish_point ?? null}
              />
            </View>
          ) : loadingDetails ? (
            <View
              style={[styles.map, styles.mapLoading, { backgroundColor: colors.cardBackground }]}
            >
              <ActivityIndicator color={colors.textMuted} />
            </View>
          ) : null}

          <View style={styles.cardBody}>
            <View style={styles.metaRow}>
              <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                {[activity?.sport_type?.name, formatDate(activity?.started_at ?? item.created_at)]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {item.ai_generation?.is_ai_generated && (
                <View style={[styles.aiBadge, { backgroundColor: colors.aiLight }]}>
                  <Ionicons name="sparkles" size={11} color={colors.ai} />
                  <Text style={[styles.aiBadgeText, { color: colors.ai }]}>
                    {t('drafts.aiShort')}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
              {item.title || activity?.title || t('drafts.untitled')}
            </Text>

            {stats.length > 0 && (
              <View style={styles.statsRow}>
                {stats.map((s) => (
                  <View key={s.label} style={styles.stat}>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>{s.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                      {s.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {!!item.content && (
              <Text style={[styles.content, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.content}
              </Text>
            )}

            <View
              style={[styles.visibilityRow, { backgroundColor: colors.cardBackground }]}
              accessibilityRole="radiogroup"
              accessibilityLabel={t('drafts.visibilityLabel')}
            >
              {VISIBILITIES.map(({ value, icon }) => {
                const active = visibility === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.visibilityOption,
                      active && { backgroundColor: colors.background, borderColor: colors.primary },
                    ]}
                    onPress={() => setChoice((prev) => ({ ...prev, [item.id]: value }))}
                    disabled={busy}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Ionicons
                      name={icon}
                      size={15}
                      color={active ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.visibilityText,
                        { color: active ? colors.primary : colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {t(`visibility.${value}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.editButton, { borderColor: colors.border }]}
                onPress={() => handleEdit(item)}
                disabled={busy}
              >
                <Ionicons name="create-outline" size={18} color={colors.textPrimary} />
                <Text style={[styles.editText, { color: colors.textPrimary }]}>
                  {t('drafts.editThenPublish')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.publishButton, { backgroundColor: colors.primary }]}
                onPress={() => void handlePublish(item)}
                disabled={busy}
              >
                {publishingId === item.id ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={18} color={colors.onPrimary} />
                    <Text style={[styles.publishText, { color: colors.onPrimary }]}>
                      {t('drafts.publish')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const count = drafts.length;
  const current = Math.min(page, Math.max(0, count - 1));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.cardBackground }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t('drafts.reminderCount', { count })}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t('drafts.reminderHint')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel={t('common.close')}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View onLayout={onListLayout}>
            {pageWidth > 0 && (
              <FlatList
                data={drafts}
                keyExtractor={(d) => String(d.id)}
                renderItem={renderDraft}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
                getItemLayout={(_, index) => ({
                  length: pageWidth,
                  offset: pageWidth * index,
                  index,
                })}
              />
            )}
          </View>

          {count > 1 && (
            <View style={styles.pager}>
              {drafts.map((d, i) => (
                <View
                  key={d.id}
                  style={[
                    styles.dot,
                    {
                      width: i === current ? 18 : 6,
                      backgroundColor: i === current ? colors.primary : colors.border,
                    },
                  ]}
                />
              ))}
              <Text style={[styles.pagerText, { color: colors.textSecondary }]}>
                {t('drafts.pageOf', { index: current + 1, total: count })}
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            {count > 1 && (
              <TouchableOpacity
                style={[styles.publishAll, { borderColor: colors.primary }]}
                onPress={publishAll}
                disabled={publishingAll || publishingId != null}
              >
                {publishingAll ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.publishAllText, { color: colors.primary }]}>
                    {t('drafts.publishAll', { count })}
                  </Text>
                )}
              </TouchableOpacity>
            )}
            <View style={styles.footerRow}>
              <TouchableOpacity onPress={handleViewAll} style={styles.footerLink}>
                <Text style={[styles.footerLinkText, { color: colors.primary }]}>
                  {t('drafts.viewAllShort')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.footerLink}>
                <Text style={[styles.footerLinkText, { color: colors.textSecondary }]}>
                  {t('drafts.dismissReminder')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    maxHeight: '92%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  headerText: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: fontSize.sm,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  closeButton: {
    padding: spacing.xs,
  },
  card: {
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  map: {
    height: 168,
  },
  mapLoading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  meta: {
    flex: 1,
    fontSize: fontSize.sm,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  aiBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  stat: {
    gap: 1,
  },
  statValue: {
    fontSize: msFont(18),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: fontSize.xs,
  },
  content: {
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  visibilityRow: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    padding: 3,
    gap: 3,
  },
  visibilityOption: {
    flex: 1,
    height: 38,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  visibilityText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  editButton: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
  },
  editText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  publishButton: {
    flex: 1.6,
    height: 48,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
  },
  publishText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  pagerText: {
    fontSize: fontSize.xs,
    marginLeft: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  footer: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  publishAll: {
    height: 48,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishAllText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerLink: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
  },
  footerLinkText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
