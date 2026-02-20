import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar } from './Avatar';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize } from '../theme';
import type { EventRegistration } from '../types/api';

interface ParticipantAvatarsStackProps {
  participants: EventRegistration[];
  /** Maximum number of visible avatars before "+N" overflow. Default: 6 */
  maxVisible?: number;
  /** Called with the username when an avatar is tapped. Pass undefined to disable tapping. */
  onParticipantPress?: (username: string) => void;
}

/**
 * Horizontally overlapping avatar stack used to preview event participants.
 * Reusable wherever a compact participant summary is needed.
 */
export function ParticipantAvatarsStack({
  participants,
  maxVisible = 6,
  onParticipantPress,
}: ParticipantAvatarsStackProps) {
  const { colors } = useTheme();
  const visible = participants.slice(0, maxVisible);
  const overflow = participants.length - maxVisible;

  return (
    <View style={styles.row}>
      {visible.map((registration, index) => (
        <TouchableOpacity
          key={`avatar-${index}-${registration.id ?? 'no-id'}-${registration.user_id ?? 'no-user'}`}
          style={[styles.avatarWrapper, index > 0 && styles.overlap]}
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
        </TouchableOpacity>
      ))}

      {overflow > 0 && (
        <View
          style={[
            styles.avatarWrapper,
            styles.overlap,
            styles.overflowBubble,
            { backgroundColor: colors.border },
          ]}
        >
          <Text style={[styles.overflowText, { color: colors.textPrimary }]}>
            +{overflow}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    borderRadius: 20,
  },
  overlap: {
    marginLeft: -spacing.sm,
  },
  overflowBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overflowText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});