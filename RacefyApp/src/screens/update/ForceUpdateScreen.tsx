import React from 'react';
import {Alert, Linking, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../hooks/useTheme';
import {useAppVersion} from '../../hooks/useAppVersion';
import {BrandLogo, Button} from '../../components';
import {logger} from '../../services/logger';
import {borderRadius, fontSize, spacing} from '../../theme';

/**
 * Full-screen blocker shown when the running native app version is below
 * the server-provided `minimum_version`. The user has no way out except
 * tapping "Update", which opens the store URL.
 *
 * Backend-provided `title` / `message` are already localized via the
 * `Accept-Language` header — they take precedence over local i18n keys
 * which only act as a fallback.
 */
export function ForceUpdateScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { update, currentAppVersion } = useAppVersion();

  const handleUpdate = async () => {
    if (!update?.update_url) {
      Alert.alert(t('common.error'), t('update.openStoreFailed'));
      return;
    }
    try {
      const supported = await Linking.canOpenURL(update.update_url);
      if (!supported) {
        Alert.alert(t('common.error'), t('update.openStoreFailed'));
        return;
      }
      await Linking.openURL(update.update_url);
    } catch (error) {
      logger.error('general', 'Failed to open update URL', { error, url: update.update_url });
      Alert.alert(t('common.error'), t('update.openStoreFailed'));
    }
  };

  const title = t('update.requiredTitle');
  const message = update?.force_update_message || t('update.requiredMessage');

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.content}>
        <BrandLogo category="logo-full" width={160} height={44} />

        <View style={[styles.iconContainer, { backgroundColor: isDark ? '#7c2d12' : '#fef2f2' }]}>
          <Ionicons name="cloud-download-outline" size={48} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>

        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

        {update?.current_version && (
          <View style={[styles.versionRow, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.versionItem}>
              <Text style={[styles.versionLabel, { color: colors.textMuted }]}>
                {t('update.installedVersion')}
              </Text>
              <Text style={[styles.versionValue, { color: colors.textPrimary }]}>
                {currentAppVersion}
              </Text>
            </View>
            <View style={[styles.versionDivider, { backgroundColor: colors.border }]} />
            <View style={styles.versionItem}>
              <Text style={[styles.versionLabel, { color: colors.textMuted }]}>
                {t('update.latestVersion')}
              </Text>
              <Text style={[styles.versionValue, { color: colors.primary }]}>
                {update.current_version}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Button title={t('update.updateNow')} onPress={handleUpdate} fullWidth />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxxl,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
    maxWidth: 320,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.xl,
    gap: spacing.lg,
  },
  versionItem: {
    alignItems: 'center',
  },
  versionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginBottom: 2,
  },
  versionValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  versionDivider: {
    width: 1,
    height: 28,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 320,
  },
});