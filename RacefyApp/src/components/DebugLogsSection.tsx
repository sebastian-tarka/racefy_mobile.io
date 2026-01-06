/**
 * Debug Logs Section Component
 *
 * Settings section for viewing and sending debug logs.
 * Only visible when logging is enabled (development mode).
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import { triggerHaptic } from '../hooks/useHaptics';
import { logger } from '../services/logger';
import { api } from '../services/api';
import { spacing, fontSize } from '../theme';
import { Button } from './Button';

export function DebugLogsSection() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [logsCount, setLogsCount] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [lastSentRef, setLastSentRef] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't render if logging is disabled
  if (!logger.isEnabled()) {
    return null;
  }

  useEffect(() => {
    // Update logs count
    setLogsCount(logger.getLogsCount());
  }, []);

  const handleSendLogs = async () => {
    if (logsCount === 0) {
      Alert.alert(
        t('settings.debug.noLogs', 'No Logs'),
        t('settings.debug.noLogsMessage', 'There are no logs to send.')
      );
      return;
    }

    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setIsSending(true);

    try {
      const payload = logger.prepareLogsPayload();
      const response = await api.sendDebugLogs(payload);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLastSentRef(response.log_reference);

      Alert.alert(
        t('settings.debug.sent', 'Logs Sent'),
        t('settings.debug.sentMessage', 'Debug logs sent successfully.\n\nReference: {{ref}}', {
          ref: response.log_reference,
        })
      );

      logger.info('general', 'Debug logs sent to server', {
        reference: response.log_reference,
        logsCount: payload.logs.length,
      });
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      logger.error('api', 'Failed to send debug logs', { error: error.message });

      Alert.alert(
        t('common.error', 'Error'),
        t('settings.debug.sendFailed', 'Failed to send logs. Please try again.')
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleClearLogs = () => {
    Alert.alert(
      t('settings.debug.clearTitle', 'Clear Logs'),
      t('settings.debug.clearMessage', 'Are you sure you want to clear all logs?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.clear', 'Clear'),
          style: 'destructive',
          onPress: async () => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
            await logger.clearLogs();
            setLogsCount(0);
            setLastSentRef(null);
          },
        },
      ]
    );
  };

  const handleStartNewSession = async () => {
    triggerHaptic();
    await logger.startNewSession();
    setLogsCount(logger.getLogsCount());
    Alert.alert(
      t('settings.debug.newSession', 'New Session'),
      t('settings.debug.newSessionMessage', 'A new logging session has been started.')
    );
  };

  const config = logger.getConfig();
  const deviceInfo = logger.getDeviceInfo();

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {t('settings.debug.title', 'Debug Logs')}
      </Text>

      <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        {/* Stats Row */}
        <TouchableOpacity
          style={[styles.row, { borderBottomColor: colors.border }]}
          onPress={() => {
            triggerHaptic();
            setIsExpanded(!isExpanded);
            setLogsCount(logger.getLogsCount());
          }}
          activeOpacity={0.7}
        >
          <View style={styles.rowLeft}>
            <Ionicons
              name="bug-outline"
              size={22}
              color={colors.textSecondary}
              style={styles.rowIcon}
            />
            <View>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                {t('settings.debug.logsStored', 'Logs Stored')}
              </Text>
              <Text style={[styles.rowSubtext, { color: colors.textSecondary }]}>
                {t('settings.debug.sessionId', 'Session: {{id}}', {
                  id: logger.getSessionId().substring(0, 12),
                })}
              </Text>
            </View>
          </View>
          <View style={styles.rowRight}>
            <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>{logsCount}</Text>
            </View>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </View>
        </TouchableOpacity>

        {/* Expanded Details */}
        {isExpanded && (
          <View style={[styles.expandedContent, { borderBottomColor: colors.border }]}>
            {/* Config Info */}
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                {t('settings.debug.level', 'Log Level')}
              </Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {config.level.toUpperCase()}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                {t('settings.debug.categories', 'Categories')}
              </Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {config.categories === 'all' ? 'ALL' : config.categories.join(', ')}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                {t('settings.debug.device', 'Device')}
              </Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {deviceInfo.deviceModel} ({deviceInfo.platform})
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                {t('settings.debug.appVersion', 'App Version')}
              </Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {deviceInfo.appVersion}
              </Text>
            </View>

            {lastSentRef && (
              <View style={[styles.lastSentRow, { backgroundColor: colors.successLight }]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[styles.lastSentText, { color: colors.success }]}>
                  {t('settings.debug.lastRef', 'Last sent: {{ref}}', {
                    ref: lastSentRef.substring(0, 16),
                  })}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actions}>
              <Button
                title={isSending
                  ? t('settings.debug.sending', 'Sending...')
                  : t('settings.debug.sendLogs', 'Send Logs to Server')
                }
                onPress={handleSendLogs}
                loading={isSending}
                disabled={isSending || logsCount === 0}
                style={styles.actionButton}
              />
              <View style={styles.secondaryActions}>
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: colors.border }]}
                  onPress={handleStartNewSession}
                >
                  <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
                    {t('settings.debug.newSessionBtn', 'New Session')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: colors.error }]}
                  onPress={handleClearLogs}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                  <Text style={[styles.secondaryButtonText, { color: colors.error }]}>
                    {t('settings.debug.clearBtn', 'Clear')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  section: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
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
    fontWeight: '500',
  },
  rowSubtext: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  expandedContent: {
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: fontSize.sm,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  lastSentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  lastSentText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  actions: {
    marginTop: spacing.md,
  },
  actionButton: {
    marginBottom: spacing.sm,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: 8,
  },
  secondaryButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
});
