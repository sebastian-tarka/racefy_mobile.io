import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import * as Application from 'expo-application';
import { Input, Button } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

type Units = 'metric' | 'imperial';

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

function SettingsRow({ icon, label, value, onPress, rightElement, danger }: SettingsRowProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <TouchableOpacity
      style={styles.row}
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
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        {value && <Text style={styles.rowValue}>{value}</Text>}
        {rightElement}
        {onPress && !rightElement && (
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export function SettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const [units, setUnits] = useState<Units>('metric');
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  // Delete account state
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const appVersion = Application.nativeApplicationVersion || '1.0.0';

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await api.getPreferences();
      setUnits(prefs.units);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setIsLoadingUnits(false);
    }
  };

  const handleUnitsChange = async (value: boolean) => {
    const newUnits: Units = value ? 'imperial' : 'metric';
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUnits(newUnits);

    try {
      await api.updatePreferences({ units: newUnits });
    } catch (error) {
      console.error('Failed to update preferences:', error);
      setUnits(units); // Revert on error
      Alert.alert(t('common.error'), t('settings.updateFailed'));
    }
  };

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await api.updatePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('common.success'), t('settings.passwordChanged'));
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (error?.errors?.current_password) {
        setPasswordErrors({ currentPassword: t('settings.incorrectPassword') });
      } else {
        Alert.alert(t('common.error'), t('settings.passwordChangeFailed'));
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.alert(t('common.error'), t('settings.passwordRequiredForDelete'));
      return;
    }

    Alert.alert(
      t('settings.deleteAccount'),
      t('settings.deleteAccountConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

            try {
              await api.deleteAccount(deletePassword);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await logout();
            } catch (error: any) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              if (error?.message?.includes('password')) {
                Alert.alert(t('common.error'), t('settings.incorrectPassword'));
              } else {
                Alert.alert(t('common.error'), t('settings.deleteAccountFailed'));
              }
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t('common.logout'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.logout'),
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Account Section */}
        <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
        <View style={styles.section}>
          <SettingsRow
            icon="person-outline"
            label={t('settings.editProfile')}
            onPress={() => navigation.navigate('EditProfile')}
          />
          <SettingsRow
            icon="lock-closed-outline"
            label={t('settings.changePassword')}
            onPress={() => {
              setShowPasswordChange(!showPasswordChange);
              setPasswordErrors({});
            }}
          />
        </View>

        {/* Password Change Form */}
        {showPasswordChange && (
          <View style={styles.formSection}>
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
        )}

        {/* Preferences Section */}
        <Text style={styles.sectionTitle}>{t('settings.preferences')}</Text>
        <View style={styles.section}>
          <SettingsRow
            icon="speedometer-outline"
            label={t('settings.units')}
            value={units === 'metric' ? t('settings.metric') : t('settings.imperial')}
            rightElement={
              <Switch
                value={units === 'imperial'}
                onValueChange={handleUnitsChange}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={units === 'imperial' ? colors.primary : colors.white}
                disabled={isLoadingUnits}
              />
            }
          />
        </View>

        {/* App Section */}
        <Text style={styles.sectionTitle}>{t('settings.app')}</Text>
        <View style={styles.section}>
          <SettingsRow
            icon="information-circle-outline"
            label={t('settings.version')}
            value={appVersion}
          />
        </View>

        {/* Logout */}
        <View style={[styles.section, styles.logoutSection]}>
          <SettingsRow
            icon="log-out-outline"
            label={t('common.logout')}
            onPress={handleLogout}
          />
        </View>

        {/* Danger Zone */}
        <Text style={[styles.sectionTitle, styles.dangerTitle]}>{t('settings.dangerZone')}</Text>
        <View style={styles.section}>
          <SettingsRow
            icon="trash-outline"
            label={t('settings.deleteAccount')}
            onPress={() => setShowDeleteAccount(!showDeleteAccount)}
            danger
          />
        </View>

        {/* Delete Account Form */}
        {showDeleteAccount && (
          <View style={styles.formSection}>
            <Text style={styles.dangerText}>{t('settings.deleteAccountWarning')}</Text>
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
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  section: {
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    color: colors.textPrimary,
  },
  rowLabelDanger: {
    color: colors.error,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowValue: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  formSection: {
    backgroundColor: colors.cardBackground,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  formButton: {
    marginTop: spacing.sm,
  },
  logoutSection: {
    marginTop: spacing.xl,
  },
  dangerTitle: {
    color: colors.error,
  },
  dangerText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
});
