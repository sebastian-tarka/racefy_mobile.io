import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { spacing } from '../../theme';

export function ImpersonationBanner() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isImpersonating, impersonatedUser, user, stopImpersonation } = useAuth();

  if (!isImpersonating || !impersonatedUser) return null;

  const handleExit = () => {
    Alert.alert(
      t('admin.impersonate.exitConfirm.title'),
      t('admin.impersonate.exitConfirm.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.impersonate.exitConfirm.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await stopImpersonation();
            } catch (error) {
              Alert.alert(t('common.error'), t('admin.impersonate.exitError'));
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.warning }]}>
      <View style={styles.content}>
        <Ionicons name="eye" size={18} color={colors.background} />
        <View style={styles.textContainer}>
          <Text style={[styles.text, { color: colors.background }]}>
            {t('admin.impersonate.banner.impersonating')}{' '}
            <Text style={styles.bold}>{impersonatedUser.username}</Text>
          </Text>
          <Text style={[styles.subtext, { color: colors.background }]}>
            {t('admin.impersonate.banner.admin')}: {user?.username}
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={handleExit} style={styles.exitButton}>
        <Text style={[styles.exitText, { color: colors.background }]}>
          {t('admin.impersonate.banner.exit')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
  subtext: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.9,
  },
  bold: {
    fontWeight: '700',
  },
  exitButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  exitText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
