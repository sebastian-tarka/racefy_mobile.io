import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSubscription } from '../hooks/useSubscription';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import type { SubscriptionFeatures } from '../types/api';

interface FeatureGateProps {
  feature: keyof SubscriptionFeatures;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { canUse } = useSubscription();

  if (canUse(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return <UpgradePromptInline feature={feature} />;
}

function UpgradePromptInline({ feature }: { feature: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '20' }]}
      onPress={() => navigation.navigate('Paywall', { feature })}
      activeOpacity={0.7}
    >
      <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
        <Ionicons name="lock-closed" size={20} color={colors.primary} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('subscription.featureLocked')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('subscription.upgradeToUnlock')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
});
