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

export function TrialBanner() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isTrial, remainingDays, isPremium } = useSubscription();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (!isTrial || !isPremium || remainingDays === null) return null;

  const isUrgent = remainingDays <= 7;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: isUrgent ? colors.warning + '15' : colors.primary + '10',
          borderColor: isUrgent ? colors.warning + '30' : colors.primary + '20',
        },
      ]}
      onPress={() => navigation.navigate('Paywall')}
      activeOpacity={0.7}
    >
      <Ionicons
        name={isUrgent ? 'time-outline' : 'diamond-outline'}
        size={18}
        color={isUrgent ? colors.warning : colors.primary}
      />
      <Text style={[styles.text, { color: isUrgent ? colors.warning : colors.primary }]}>
        {t('subscription.trialEndsIn', { days: remainingDays })}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={isUrgent ? colors.warning : colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  text: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
