import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { triggerHaptic } from '../../../hooks/useHaptics';
import { useTheme } from '../../../hooks/useTheme';
import { fontSize, spacing } from '../../../theme';
import type { NotificationChannelSettings, UserPreferences } from '../../../types/api';

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

export const SettingsRow = React.memo(function SettingsRow({
  icon,
  label,
  value,
  onPress,
  rightElement,
  danger,
}: SettingsRowProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    triggerHaptic();
    onPress?.();
  };

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={handlePress}
      disabled={!onPress && !rightElement}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.rowLeft}>
        <Ionicons
          name={icon}
          size={22}
          color={danger ? colors.error : colors.textSecondary}
          style={styles.rowIcon}
        />
        <Text
          style={[
            styles.rowLabel,
            { color: colors.textPrimary },
            danger && { color: colors.error },
          ]}
        >
          {label}
        </Text>
      </View>
      <View style={styles.rowRight}>
        {value && <Text style={[styles.rowValue, { color: colors.textSecondary }]}>{value}</Text>}
        {rightElement}
        {onPress && !rightElement && (
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        )}
      </View>
    </TouchableOpacity>
  );
});

// Notification row with email and push toggles
type LiveNotificationType = 'activity_started' | 'activity_live_started';

interface LiveNotificationRowProps {
  type: LiveNotificationType;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  settings: NotificationChannelSettings;
  onChange: (type: LiveNotificationType, value: boolean) => void;
}

/**
 * A category with one switch instead of two (design + mobile spec).
 *
 * To someone silencing a category, "stop telling me" does not mean "stop
 * telling me through one of two channels I have never heard of" — so push and
 * websocket move together and neither is named. There is no email row because
 * the backend never sends these by mail.
 */
export const LiveNotificationRow = React.memo(function LiveNotificationRow({
  type,
  icon,
  label,
  description,
  settings,
  onChange,
}: LiveNotificationRowProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.notificationRow, { borderBottomColor: colors.border }]}>
      <View style={styles.notificationHeader}>
        <Ionicons
          name={icon}
          size={20}
          color={colors.textSecondary}
          style={styles.notificationIcon}
        />
        <View style={styles.notificationLabelContainer}>
          <Text style={[styles.notificationLabel, { color: colors.textPrimary }]}>{label}</Text>
          {description && (
            <Text style={[styles.notificationDescription, { color: colors.textSecondary }]}>
              {description}
            </Text>
          )}
        </View>
        <Switch
          value={settings.push}
          onValueChange={(value) => {
            triggerHaptic();
            onChange(type, value);
          }}
          trackColor={{ false: colors.border, true: colors.primaryLight }}
          thumbColor={settings.push ? colors.primary : colors.white}
        />
      </View>
    </View>
  );
});

type ChannelNotificationType = keyof UserPreferences['notifications'];

interface NotificationRowProps {
  type: ChannelNotificationType;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  settings: NotificationChannelSettings;
  /** One handler for every row and channel, so the memo holds. */
  onChange: (type: ChannelNotificationType, channel: 'email' | 'push', value: boolean) => void;
}

export const NotificationRow = React.memo(function NotificationRow({
  type,
  icon,
  label,
  description,
  settings,
  onChange,
}: NotificationRowProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.notificationRow, { borderBottomColor: colors.border }]}>
      <View style={styles.notificationHeader}>
        <Ionicons
          name={icon}
          size={20}
          color={colors.textSecondary}
          style={styles.notificationIcon}
        />
        <View style={styles.notificationLabelContainer}>
          <Text style={[styles.notificationLabel, { color: colors.textPrimary }]}>{label}</Text>
          {description && (
            <Text style={[styles.notificationDescription, { color: colors.textSecondary }]}>
              {description}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.notificationToggles}>
        <View style={styles.toggleItem}>
          <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>Email</Text>
          <Switch
            value={settings.email}
            onValueChange={(value) => {
              triggerHaptic();
              onChange(type, 'email', value);
            }}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={settings.email ? colors.primary : colors.white}
          />
        </View>
        <View style={styles.toggleItem}>
          <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>Push</Text>
          <Switch
            value={settings.push}
            onValueChange={(value) => {
              triggerHaptic();
              onChange(type, 'push', value);
            }}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={settings.push ? colors.primary : colors.white}
          />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowIcon: {
    marginRight: spacing.md,
  },
  rowLabel: {
    fontSize: fontSize.md,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowValue: {
    fontSize: fontSize.md,
  },
  notificationRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  notificationIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  notificationLabelContainer: {
    flex: 1,
  },
  notificationLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  notificationDescription: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  notificationToggles: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xl,
    marginTop: spacing.xs,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleLabel: {
    fontSize: fontSize.sm,
  },
});
