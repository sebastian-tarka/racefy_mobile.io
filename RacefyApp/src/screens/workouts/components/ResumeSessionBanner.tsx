import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { useCurrentWorkoutSession } from '../../../hooks/useCurrentWorkoutSession';
import type { RootStackParamList } from '../../../navigation/types';
import { borderRadius, fontSize, spacing, withAlpha } from '../../../theme';

/**
 * "Session in progress — Resume" strip. Renders nothing when there is no
 * open session, so it can sit at the top of any strength screen.
 */
export function ResumeSessionBanner() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { current } = useCurrentWorkoutSession();

  if (!current) return null;

  const startedAt = current.started_at
    ? new Date(current.started_at).toLocaleTimeString(i18n.language, {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <TouchableOpacity
      style={[styles.banner, { backgroundColor: colors.primary }]}
      onPress={() => navigation.navigate('WorkoutSession', { sessionId: current.id })}
      activeOpacity={0.85}
    >
      <View style={[styles.pulse, { backgroundColor: colors.onPrimary }]}>
        <Ionicons name="play" size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.onPrimary }]}>
          {t('strengthPlans.resume.title')}
        </Text>
        <Text
          style={[styles.subtitle, { color: withAlpha(colors.onPrimary, 0.85) }]}
          numberOfLines={1}
        >
          {t('strengthPlans.resume.subtitle', { name: current.workout_name, time: startedAt })}
        </Text>
      </View>
      <Text style={[styles.cta, { color: colors.onPrimary }]}>
        {t('strengthPlans.resume.cta')} ›
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  pulse: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  cta: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
