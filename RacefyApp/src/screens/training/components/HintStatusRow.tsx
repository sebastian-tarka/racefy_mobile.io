import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../hooks/useTheme';
import { fontSize, spacing } from '../../../theme';
import type { TrainingWeek } from '../../../types/api';

interface Props {
  week: Pick<TrainingWeek, 'coaching_hint' | 'hint_status' | 'hint_language'>;
  /** Shown on `failed`; absent = no retry offered here. */
  onRetry?: () => void;
  retrying?: boolean;
}

/**
 * One line under a week about its coaching hint when there is something to
 * say: a job is writing it, it failed (with a retry), or it is shown in
 * English while the translation is on its way. Nothing otherwise.
 */
export function HintStatusRow({ week, onRetry, retrying }: Props) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const status = week.hint_status ?? 'none';
  const language = (i18n.language || 'en').slice(0, 2);

  if (status === 'pending' && !week.coaching_hint) {
    return (
      <View style={styles.row}>
        <ActivityIndicator size="small" color={colors.warning} />
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          {t('training.generation.preparingHint')}
        </Text>
      </View>
    );
  }

  if (status === 'failed' && !week.coaching_hint) {
    return (
      <View style={styles.row}>
        <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          {t('training.generation.hintFailed')}
        </Text>
        {onRetry &&
          (retrying ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <TouchableOpacity onPress={onRetry} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.action, { color: colors.primary }]}>
                {t('training.generation.retry')}
              </Text>
            </TouchableOpacity>
          ))}
      </View>
    );
  }

  if (week.coaching_hint && week.hint_language && week.hint_language !== language) {
    return (
      <View style={styles.row}>
        <Ionicons name="language-outline" size={16} color={colors.textMuted} />
        <Text style={[styles.text, { color: colors.textMuted }]}>
          {t('training.generation.translationPending')}
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  text: {
    flex: 1,
    fontSize: fontSize.sm,
  },
  action: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
