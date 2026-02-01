import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import type { TrainingTip, TipCategory } from '../types/api';

interface Props {
  tip: TrainingTip;
  onPress: () => void;
}

// Category colors and emojis
const CATEGORY_CONFIG: Record<TipCategory, { color: string; emoji: string }> = {
  mindset: { color: '#3B82F6', emoji: '🧠' },
  recovery: { color: '#10B981', emoji: '💪' },
  technique: { color: '#8B5CF6', emoji: '🎯' },
  nutrition: { color: '#F59E0B', emoji: '🍎' },
  sleep: { color: '#6366F1', emoji: '😴' },
  pacing: { color: '#EF4444', emoji: '🏃' },
};

export function TipCard({ tip, onPress }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  // Fallback for unknown categories
  const categoryConfig = CATEGORY_CONFIG[tip.category] || {
    color: colors.primary,
    emoji: '💡',
  };
  const categoryColor = categoryConfig.color;
  const categoryEmoji = categoryConfig.emoji;

  // Get translated content if available
  const title = tip.translated_title || tip.title;
  const previewContent = tip.translated_content || tip.content || '';
  const preview = previewContent.substring(0, 120) + (previewContent.length > 120 ? '...' : '');

  // Render emotional load indicator
  const renderEmotionalLoad = () => {
    const maxLoad = 3;
    const filled = tip.emotional_load;
    const empty = maxLoad - filled;

    return (
      <View style={styles.emotionalLoadContainer}>
        {Array.from({ length: filled }).map((_, idx) => (
          <Ionicons key={`filled-${idx}`} name="flash" size={12} color={colors.textMuted} />
        ))}
        {Array.from({ length: empty }).map((_, idx) => (
          <Ionicons key={`empty-${idx}`} name="flash-outline" size={12} color={colors.border} />
        ))}
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.cardBackground }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Category Badge */}
      <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
        <Text style={styles.categoryEmoji}>{categoryEmoji}</Text>
        <Text style={styles.categoryText}>
          {t(`training.tips.categories.${tip.category}`, { defaultValue: 'Tip' })}
        </Text>
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
        {title}
      </Text>

      {/* Preview */}
      {preview && (
        <Text style={[styles.preview, { color: colors.textSecondary }]} numberOfLines={3}>
          {preview}
        </Text>
      )}

      {/* Read More Button */}
      <View style={[styles.readMoreButton, { borderColor: colors.primary }]}>
        <Text style={[styles.readMoreText, { color: colors.primary }]}>
          {t('training.tips.readMore')}
        </Text>
        <Ionicons name="arrow-forward" size={16} color={colors.primary} />
      </View>

      {/* Emotional Load Indicator */}
      <View style={styles.footer}>
        {renderEmotionalLoad()}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  categoryEmoji: {
    fontSize: fontSize.sm,
  },
  categoryText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.md,
    lineHeight: 24,
  },
  preview: {
    fontSize: fontSize.md,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  readMoreText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  emotionalLoadContainer: {
    flexDirection: 'row',
    gap: 2,
  },
});
