import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { upgradePromptEmitter } from '../services/upgradePromptEmitter';

export function UpgradePromptModal() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [visible, setVisible] = useState(false);
  const [featureName, setFeatureName] = useState<string | null>(null);

  useEffect(() => {
    const handler = (data: { feature?: string; currentTier?: string }) => {
      setFeatureName(data.feature ?? null);
      setVisible(true);
    };
    upgradePromptEmitter.on('show', handler);
    return () => { upgradePromptEmitter.off('show', handler); };
  }, []);

  const handleUpgrade = useCallback(() => {
    setVisible(false);
    navigation.navigate('Paywall', { feature: featureName ?? undefined });
  }, [navigation, featureName]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  // Feature-specific title and description
  const featureTitle = featureName
    ? t(`subscription.features.${featureName}`, { defaultValue: '' })
    : '';
  const featureDesc = featureName
    ? t(`subscription.featureDescriptions.${featureName}`, { defaultValue: '' })
    : '';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleDismiss}>
        <View
          style={[styles.card, { backgroundColor: colors.cardBackground }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="diamond" size={32} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {featureTitle || t('subscription.upgradeRequired')}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {featureDesc || t('subscription.upgradeRequiredDesc')}
          </Text>

          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: colors.primary }]}
            onPress={handleUpgrade}
          >
            <Text style={styles.upgradeButtonText}>{t('subscription.viewPlans')}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDismiss}>
            <Text style={[styles.dismissText, { color: colors.textMuted }]}>
              {t('common.notNow')}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  upgradeButton: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  dismissText: {
    fontSize: fontSize.md,
    paddingVertical: spacing.sm,
  },
});