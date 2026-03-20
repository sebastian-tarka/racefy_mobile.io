import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Card } from '../Card';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { SubscriptionTier } from '../../types/api';

interface LockedInsightCardProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  requiredTier: SubscriptionTier;
}

export function LockedInsightCard({ title, icon, requiredTier }: LockedInsightCardProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const tierLabel = requiredTier === 'pro' ? 'Pro' : 'Plus';

  return (
    <Card style={styles.card}>
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)' }]}>
        <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <Ionicons name="lock-closed" size={24} color={colors.textMuted} />
        </View>
        <View style={styles.headerRow}>
          <Ionicons name={icon} size={18} color={colors.textMuted} />
          <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
        </View>
        <Text style={[styles.upgradeText, { color: colors.textMuted }]}>
          {t('insights.locked.availableIn', { tier: tierLabel })}
        </Text>
        <TouchableOpacity
          style={[styles.upgradeButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('Paywall', { feature: 'insights' })}
        >
          <Text style={styles.upgradeButtonText}>{t('insights.locked.upgrade')}</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  overlay: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginLeft: spacing.xs,
  },
  upgradeText: {
    fontSize: fontSize.sm,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  upgradeButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});