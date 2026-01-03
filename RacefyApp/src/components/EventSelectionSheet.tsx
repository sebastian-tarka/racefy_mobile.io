import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import type { Event } from '../types/api';

interface EventSelectionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (event: Event | null) => void;
  events: Event[];
  selectedEvent: Event | null;
  isLoading?: boolean;
}

export function EventSelectionSheet({
  visible,
  onClose,
  onSelect,
  events,
  selectedEvent,
  isLoading = false,
}: EventSelectionSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.container,
                {
                  backgroundColor: colors.cardBackground,
                  paddingBottom: Math.max(insets.bottom, spacing.lg),
                  maxHeight: '70%',
                },
              ]}
            >
              {/* Handle */}
              <View style={styles.handleContainer}>
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
              </View>

              {/* Title */}
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  {t('eventSelection.title')}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {t('eventSelection.subtitle')}
                </Text>
              </View>

              {/* Loading */}
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : (
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                  {/* No Event Option */}
                  <TouchableOpacity
                    style={[
                      styles.eventItem,
                      { backgroundColor: colors.background },
                      !selectedEvent && {
                        borderColor: colors.primary,
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => {
                      onSelect(null);
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.eventIcon,
                        { backgroundColor: colors.textMuted + '20' },
                      ]}
                    >
                      <Ionicons name="remove-circle-outline" size={24} color={colors.textMuted} />
                    </View>
                    <View style={styles.eventInfo}>
                      <Text style={[styles.eventTitle, { color: colors.textPrimary }]}>
                        {t('eventSelection.noEvent')}
                      </Text>
                      <Text style={[styles.eventSubtitle, { color: colors.textSecondary }]}>
                        {t('eventSelection.noEventDescription')}
                      </Text>
                    </View>
                    {!selectedEvent && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>

                  {/* Event List */}
                  {events.length === 0 && !isLoading && (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
                      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        {t('eventSelection.noOngoingEvents')}
                      </Text>
                      <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                        {t('eventSelection.noOngoingEventsHint')}
                      </Text>
                    </View>
                  )}

                  {events.map((event) => {
                    const isSelected = selectedEvent?.id === event.id;
                    return (
                      <TouchableOpacity
                        key={event.id}
                        style={[
                          styles.eventItem,
                          { backgroundColor: colors.background },
                          isSelected && {
                            borderColor: colors.primary,
                            borderWidth: 2,
                          },
                        ]}
                        onPress={() => {
                          onSelect(event);
                          onClose();
                        }}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.eventIcon,
                            { backgroundColor: colors.primary + '20' },
                          ]}
                        >
                          <Ionicons
                            name={event.sport_type?.icon as any || 'fitness-outline'}
                            size={24}
                            color={colors.primary}
                          />
                        </View>
                        <View style={styles.eventInfo}>
                          <Text
                            style={[styles.eventTitle, { color: colors.textPrimary }]}
                            numberOfLines={1}
                          >
                            {event.post?.title || t('eventDetail.untitled')}
                          </Text>
                          <Text style={[styles.eventSubtitle, { color: colors.textSecondary }]}>
                            {event.location_name}
                          </Text>
                          <View style={styles.eventMeta}>
                            <View style={[styles.statusBadge, { backgroundColor: colors.ongoing?.bg || colors.primary + '20' }]}>
                              <Text style={[styles.statusText, { color: colors.ongoing?.text || colors.primary }]}>
                                {t('status.ongoing')}
                              </Text>
                            </View>
                            <Text style={[styles.eventDate, { color: colors.textMuted }]}>
                              {formatDate(event.starts_at)} - {formatDate(event.ends_at)}
                            </Text>
                          </View>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* Cancel Button */}
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.background }]}
                onPress={onClose}
              >
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  scrollView: {
    maxHeight: 400,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  eventIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  eventSubtitle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  eventDate: {
    fontSize: fontSize.xs,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  cancelButton: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  cancelText: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
});
