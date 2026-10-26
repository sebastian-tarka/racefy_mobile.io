import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Button, Input } from '../../../components';
import { useAuth } from '../../../hooks/useAuth';
import { triggerHaptic } from '../../../hooks/useHaptics';
import { useTheme } from '../../../hooks/useTheme';
import { api } from '../../../services/api';
import { fontSize, spacing } from '../../../theme';
import { getErrorMessage } from '../../../utils/errors';

/** Password, then a confirmation dialog, then the account is gone and the user signed out. */
export function DeleteAccountForm() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { logout } = useAuth();
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.alert(t('common.error'), t('settings.passwordRequiredForDelete'));
      return;
    }

    Alert.alert(t('settings.deleteAccount'), t('settings.deleteAccountConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);

          try {
            await api.deleteAccount(deletePassword);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await logout();
          } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            if (getErrorMessage(error).includes('password')) {
              Alert.alert(t('common.error'), t('settings.incorrectPassword'));
            } else {
              Alert.alert(t('common.error'), t('settings.deleteAccountFailed'));
            }
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <View
      style={[
        styles.formSection,
        { backgroundColor: colors.cardBackground, borderBottomColor: colors.border },
      ]}
    >
      <Text style={[styles.dangerText, { color: colors.error }]}>
        {t('settings.deleteAccountWarning')}
      </Text>
      <Input
        label={t('settings.confirmPassword')}
        placeholder={t('settings.enterPasswordToDelete')}
        value={deletePassword}
        onChangeText={setDeletePassword}
        secureTextEntry
      />
      <Button
        title={t('settings.deleteAccountButton')}
        onPress={handleDeleteAccount}
        loading={isDeleting}
        variant="danger"
        style={styles.formButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  formSection: {
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  formButton: {
    marginTop: spacing.sm,
  },
  dangerText: {
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
});
