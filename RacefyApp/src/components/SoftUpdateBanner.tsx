import React, {useCallback, useEffect, useState} from 'react';
import {Alert, Linking, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../hooks/useTheme';
import {useAppVersion} from '../hooks/useAppVersion';
import {logger} from '../services/logger';
import {borderRadius, fontSize, spacing} from '../theme';

/**
 * Top-of-screen dismissable banner shown when a newer (but not mandatory)
 * app version is available. Dismissal is persisted **per target version**
 * — when the server bumps `current_version`, the banner reappears.
 */
const DISMISSED_KEY_PREFIX = '@racefy_dismissed_update_';

export function SoftUpdateBanner() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { softUpdate, update } = useAppVersion();
  const [isDismissed, setIsDismissed] = useState<boolean | null>(null);

  // Read dismissal state for the current target version.
  useEffect(() => {
    let cancelled = false;
    if (!softUpdate || !update) {
      setIsDismissed(null);
      return;
    }
    (async () => {
      try {
        const key = DISMISSED_KEY_PREFIX + update.current_version;
        const stored = await AsyncStorage.getItem(key);
        if (!cancelled) setIsDismissed(stored === '1');
      } catch (error) {
        logger.warn('general', 'Failed to read soft-update dismissal', { error });
        if (!cancelled) setIsDismissed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [softUpdate, update]);

  const handleDismiss = useCallback(async () => {
    if (!update) return;
    try {
      await AsyncStorage.setItem(DISMISSED_KEY_PREFIX + update.current_version, '1');
    } catch (error) {
      logger.warn('general', 'Failed to persist soft-update dismissal', { error });
    }
    setIsDismissed(true);
  }, [update]);

  const handleUpdate = useCallback(async () => {
    if (!update?.update_url) {
      Alert.alert(t('common.error'), t('update.openStoreFailed'));
      return;
    }
    try {
      await Linking.openURL(update.update_url);
    } catch (error) {
      logger.error('general', 'Failed to open store URL', { error });
      Alert.alert(t('common.error'), t('update.openStoreFailed'));
    }
  }, [update, t]);

  if (!softUpdate || !update || isDismissed !== false) {
    return null;
  }

  const message = update.update_message || t('update.softMessage');

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.primary,
          paddingTop: insets.top + spacing.sm,
        },
      ]}
      // Position absolute via parent — keep elevation high so it overlays
      // navigation headers.
      pointerEvents="box-none"
    >
      <View style={styles.row}>
        <Ionicons name="cloud-download-outline" size={20} color={colors.white} />
        <Text style={[styles.message, { color: colors.white }]} numberOfLines={2}>
          {message}
        </Text>
        <TouchableOpacity
          onPress={handleUpdate}
          style={[styles.actionButton, { backgroundColor: colors.white }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionText, { color: colors.primary }]}>
            {t('update.updateNow')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    zIndex: 9999,
    elevation: 9999,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  message: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  actionText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});