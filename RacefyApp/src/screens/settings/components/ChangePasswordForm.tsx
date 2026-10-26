import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Button, Input } from '../../../components';
import { triggerHaptic } from '../../../hooks/useHaptics';
import { useTheme } from '../../../hooks/useTheme';
import { api } from '../../../services/api';
import { spacing } from '../../../theme';
import { isApiError } from '../../../utils/errors';

/** Current + new + confirmation; `onDone` folds the form away after a change. */
export function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const handlePasswordChange = async () => {
    const errors: Record<string, string> = {};

    if (!currentPassword) {
      errors.currentPassword = t('settings.currentPasswordRequired');
    }
    if (!newPassword) {
      errors.newPassword = t('settings.newPasswordRequired');
    } else if (newPassword.length < 8) {
      errors.newPassword = t('auth.validation.passwordMinLength');
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = t('auth.validation.passwordsNotMatch');
    }

    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsChangingPassword(true);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await api.updatePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('common.success'), t('settings.passwordChanged'));
      onDone();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (isApiError(error) && error.errors?.current_password) {
        setPasswordErrors({ currentPassword: t('settings.incorrectPassword') });
      } else {
        Alert.alert(t('common.error'), t('settings.passwordChangeFailed'));
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <View
      style={[
        styles.formSection,
        { backgroundColor: colors.cardBackground, borderBottomColor: colors.border },
      ]}
    >
      <Input
        label={t('settings.currentPassword')}
        placeholder={t('settings.currentPasswordPlaceholder')}
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        error={passwordErrors.currentPassword}
      />
      <Input
        label={t('settings.newPassword')}
        placeholder={t('settings.newPasswordPlaceholder')}
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        error={passwordErrors.newPassword}
      />
      <Input
        label={t('auth.confirmPassword')}
        placeholder={t('auth.confirmPasswordPlaceholder')}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        error={passwordErrors.confirmPassword}
      />
      <Button
        title={t('settings.updatePassword')}
        onPress={handlePasswordChange}
        loading={isChangingPassword}
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
});
