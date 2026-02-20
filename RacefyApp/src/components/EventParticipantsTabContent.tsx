import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Card } from './Card';
import { Avatar } from './Avatar';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize } from '../theme';
import type { EventRegistration } from '../types/api';

interface EventParticipantsTabContentProps {
  participants: EventRegistration[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onParticipantPress?: (username: string) => void;
  onScroll?: (event: any) => void;
}

export function EventParticipantsTabContent({
  participants,
  isRefreshing,
  onRefresh,
  onParticipantPress,
  onScroll,
}: EventParticipantsTabContentProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { bottom: bottomInset } = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('eventDetail.participants')} ({participants.length})
        </Text>
        {participants.map((registration, index) => (
          <TouchableOpacity
            key={`participant-detail-${index}-${registration.id ?? 'no-id'}-${registration.user_id ?? 'no-user'}`}
            style={[styles.participantRow, { borderBottomColor: colors.border }]}
            onPress={() => {
              if (registration.user?.username) {
                onParticipantPress?.(registration.user.username);
              }
            }}
            disabled={!onParticipantPress}
            activeOpacity={onParticipantPress ? 0.7 : 1}
          >
            <Avatar
              uri={registration.user?.avatar}
              name={registration.user?.name || '?'}
              size="md"
            />
            <View style={styles.participantInfo}>
              <Text style={[styles.participantName, { color: colors.textPrimary }]}>
                {registration.user?.name}
              </Text>
              {registration.user?.username && (
                <Text style={[styles.participantUsername, { color: colors.textMuted }]}>
                  @{registration.user.username}
                </Text>
              )}
            </View>
            <View style={styles.participantMeta}>
              <Text style={[styles.registrationNumber, { color: colors.textSecondary }]}>
                #{registration.registration_number}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </Card>
      <View style={{ height: 100 + bottomInset }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  section: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  participantInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  participantName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  participantUsername: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  participantMeta: {
    alignItems: 'flex-end',
  },
  registrationNumber: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
});
