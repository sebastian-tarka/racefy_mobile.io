import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../../../hooks/useTheme';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../../theme';
import type { TrainingTip, TipCategory } from '../../../../types/api';

interface CollapsibleTipCardProps {
  tip: TrainingTip;
  defaultExpanded?: boolean;
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

export const CollapsibleTipCard: React.FC<CollapsibleTipCardProps> = ({
  tip,
  defaultExpanded = false,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [contentHeight, setContentHeight] = useState(0);

  const height = useSharedValue(defaultExpanded ? 1 : 0);
  const rotation = useSharedValue(defaultExpanded ? 90 : 0);

  const categoryConfig = CATEGORY_CONFIG[tip.category] || {
    color: colors.primary,
    emoji: '💡',
  };

  const title = tip.translated_title || tip.title;
  const content = tip.translated_content || tip.content || '';

  const toggleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);

    height.value = withTiming(newExpanded ? 1 : 0, {
      duration: 350,
      easing: Easing.out(Easing.ease),
    });

    rotation.value = withTiming(newExpanded ? 90 : 0, {
      duration: 350,
      easing: Easing.out(Easing.ease),
    });
  };

  const handleContentLayout = (event: LayoutChangeEvent) => {
    const { height: measuredHeight } = event.nativeEvent.layout;
    if (contentHeight === 0) {
      setContentHeight(measuredHeight);
    }
  };

  const animatedContentStyle = useAnimatedStyle(() => ({
    height: contentHeight > 0 ? height.value * contentHeight : undefined,
    opacity: height.value,
    overflow: 'hidden',
  }));

  const animatedChevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Render emotional load indicator
  const renderEmotionalLoad = () => {
    const maxLoad = 3;
    const filled = tip.emotional_load;
    const empty = maxLoad - filled;

    return (
      <View style={styles.emotionalLoadContainer}>
        {Array.from({ length: filled }).map((_, idx) => (
          <Ionicons key={`filled-${idx}`} name="flash" size={12} color={categoryConfig.color} />
        ))}
        {Array.from({ length: empty }).map((_, idx) => (
          <Ionicons key={`empty-${idx}`} name="flash-outline" size={12} color={colors.border} />
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.titleRow}>
          <Text style={styles.emoji}>{categoryConfig.emoji}</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={isExpanded ? undefined : 1}>
            {title}
          </Text>
        </View>
        <Animated.View style={animatedChevronStyle}>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View style={animatedContentStyle}>
        <View
          onLayout={handleContentLayout}
          style={styles.contentWrapper}
        >
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.content, { color: colors.textSecondary }]}>
            {content}
          </Text>
          <View style={styles.footer}>
            {renderEmotionalLoad()}
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  emoji: {
    fontSize: fontSize.xxl,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    flex: 1,
  },
  contentWrapper: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  divider: {
    height: 1,
    marginBottom: spacing.lg,
  },
  content: {
    fontSize: fontSize.lg,
    lineHeight: 24,
    marginBottom: spacing.md,
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
