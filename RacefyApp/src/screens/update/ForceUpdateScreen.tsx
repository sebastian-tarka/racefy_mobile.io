import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAppVersion } from '../../hooks/useAppVersion';
import { useAppConfig } from '../../contexts/AppConfigContext';
import { BrandLogo, Button } from '../../components';
import { openUpdateUrl } from '../../utils/externalLinks';
import { borderRadius, fontSize, spacing } from '../../theme';

/**
 * Full-screen blocker shown when the running native app version is below
 * the server-provided `minimum_version`. The only way out is the new version.
 *
 * Where that version comes from is the server's `update_url` (Admin → App
 * version) and nothing else: a store page once the app is listed, until then a
 * TestFlight invitation, an APK or a build page. The screen opens whatever it is
 * given and never assumes a store. Because it blocks the whole app it must not
 * become a dead end either:
 *  - the link is shown and can be copied, for the phone that fails to open it;
 *  - without a link the button asks the server again instead of failing.
 *
 * The backend-provided message is already localized via `Accept-Language` and
 * takes precedence over the local i18n text, which is only a fallback.
 */
export function ForceUpdateScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { update, currentAppVersion } = useAppVersion();
  const { refresh } = useAppConfig();
  const [copied, setCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const updateUrl = update?.update_url?.trim() || null;

  const handleUpdate = async () => {
    if (!(await openUpdateUrl(updateUrl))) {
      Alert.alert(t('common.error'), t('update.openFailed'));
    }
  };

  const handleCopy = async () => {
    if (!updateUrl) return;
    await Clipboard.setStringAsync(updateUrl);
    setCopied(true);
  };

  // The admin may have added the link, or lowered the minimum, in the meantime.
  const handleCheckAgain = async () => {
    setIsChecking(true);
    try {
      await refresh();
    } finally {
      setIsChecking(false);
    }
  };

  const title = t('update.requiredTitle');
  const message = update?.force_update_message || t('update.requiredMessage');

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}
    >
      <View style={styles.content}>
        <BrandLogo category="logo-full" width={160} height={44} />

        <View style={[styles.iconContainer, { backgroundColor: isDark ? '#7c2d12' : '#fef2f2' }]}>
          <Ionicons name="cloud-download-outline" size={48} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>

        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

        {update?.current_version && (
          <View
            style={[
              styles.versionRow,
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
            ]}
          >
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

        {updateUrl ? (
          <View style={styles.buttonContainer}>
            <Button title={t('update.updateNow')} onPress={handleUpdate} fullWidth />
            <Text style={[styles.linkHint, { color: colors.textMuted }]}>
              {t('update.linkHint')}
            </Text>
            <Text
              style={[styles.link, { color: colors.textSecondary }]}
              numberOfLines={3}
              selectable
            >
              {updateUrl}
            </Text>
            <Button
              title={copied ? t('update.linkCopied') : t('update.copyLink')}
              onPress={handleCopy}
              variant="ghost"
              fullWidth
            />
          </View>
        ) : (
          <View style={styles.buttonContainer}>
            <Text style={[styles.linkHint, { color: colors.textMuted }]}>{t('update.noLink')}</Text>
            <Button
              title={t('update.checkAgain')}
              onPress={handleCheckAgain}
              loading={isChecking}
              variant="outline"
              fullWidth
            />
          </View>
        )}
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
    gap: spacing.sm,
  },
  linkHint: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  link: {
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
});
