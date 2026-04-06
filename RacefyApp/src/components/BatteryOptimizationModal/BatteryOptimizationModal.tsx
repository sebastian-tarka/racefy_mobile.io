import React, {useEffect, useState} from 'react';
import {Linking, Modal, Platform, StyleSheet, Text, TouchableOpacity, View,} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../hooks/useTheme';
import {useAuth} from '../../hooks/useAuth';
import {fontSize, spacing} from '../../theme';

const STORAGE_KEY = '@racefy_battery_hint_shown';

const STEPS = [
  { icon: 'settings-outline' as const, key: 'step1' },
  { icon: 'battery-charging-outline' as const, key: 'step2' },
  { icon: 'search-outline' as const, key: 'step3' },
  { icon: 'checkmark-circle-outline' as const, key: 'step4' },
];

export function BatteryOptimizationModal() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || Platform.OS !== 'android') return;

    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (!value) setVisible(true);
    });
  }, [isAuthenticated]);

  const dismiss = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  const openSettings = async () => {
    await dismiss();
    Linking.openSettings();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.cardBackground, paddingBottom: spacing.xl + insets.bottom }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconBadge, { backgroundColor: colors.primary + '22' }]}>
              <Ionicons name="battery-full" size={28} color={colors.primary} />
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={dismiss} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('batteryOptimization.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('batteryOptimization.subtitle')}
          </Text>

          {/* Steps */}
          <View style={[styles.stepsContainer, { borderColor: colors.border }]}>
            {STEPS.map((step, index) => (
              <View key={step.key} style={styles.step}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary + '22' }]}>
                  <Text style={[styles.stepNumberText, { color: colors.primary }]}>
                    {index + 1}
                  </Text>
                </View>
                <Ionicons
                  name={step.icon}
                  size={18}
                  color={colors.textMuted}
                  style={styles.stepIcon}
                />
                <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                  {t(`batteryOptimization.${step.key}`)}
                </Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={openSettings}
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.primaryBtnText}>{t('batteryOptimization.openSettings')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={dismiss} activeOpacity={0.7}>
            <Text style={[styles.secondaryBtnText, { color: colors.textMuted }]}>
              {t('batteryOptimization.dismiss')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 0,
  },
  closeBtn: {
    marginLeft: 'auto',
    padding: 4,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  stepsContainer: {
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepIcon: {
    width: 20,
  },
  stepText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  secondaryBtnText: {
    fontSize: fontSize.sm,
  },
});
