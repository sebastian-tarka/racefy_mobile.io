import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { spacing, fontSize, borderRadius } from '../../theme';
import { Loading } from '../../components';
import type { RootStackParamList } from '../../navigation/types';
import type { TrainingTip, TipCategory } from '../../types/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'TipDetail'>;

interface Props {
  navigation: NavigationProp;
  route: RoutePropType;
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

export function TipDetailScreen({ navigation, route }: Props) {
  const { tipId } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [tip, setTip] = useState<TrainingTip | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    loadTip();
  }, [tipId]);

  const loadTip = async () => {
    try {
      setLoading(true);
      // This call automatically records delivery
      const tipData = await api.getTip(tipId);
      setTip(tipData);
      logger.info('training', 'Tip loaded and delivery recorded', { tipId });
    } catch (error: any) {
      logger.error('training', 'Failed to load tip', { error, tipId });
      Alert.alert(t('common.error'), error.message || t('training.errors.loadingFailed'));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (helpful: boolean) => {
    if (!tip) return;

    setSubmittingFeedback(true);
    try {
      await api.markTipHelpful(tip.id, helpful);
      logger.info('training', 'Tip feedback submitted', { tipId: tip.id, helpful });

      // Show toast-style confirmation
      Alert.alert(
        '',
        t('training.tips.thanksFeedback'),
        [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      logger.error('training', 'Failed to submit tip feedback', { error, tipId: tip.id });
      Alert.alert(t('common.error'), error.message);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return <Loading fullScreen message={t('common.loading')} />;
  }

  if (!tip) {
    return null;
  }

  // Fallback for unknown categories
  const categoryConfig = CATEGORY_CONFIG[tip.category] || {
    color: colors.primary,
    emoji: '💡',
  };
  const categoryColor = categoryConfig.color;
  const categoryEmoji = categoryConfig.emoji;
  const title = tip.translated_title || tip.title;
  const content = tip.translated_content || tip.content || '';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Badge */}
        <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
          <Text style={styles.categoryEmoji}>{categoryEmoji}</Text>
          <Text style={styles.categoryText}>
            {t(`training.tips.categories.${tip.category}`, { defaultValue: 'Tip' })}
          </Text>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {title}
        </Text>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Content */}
        <Text style={[styles.contentText, { color: colors.textSecondary }]}>
          {content}
        </Text>
      </ScrollView>

      {/* Sticky Footer with Feedback Buttons */}
      <View style={[styles.footer, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
        <Text style={[styles.feedbackLabel, { color: colors.textPrimary }]}>
          {t('training.tips.wasHelpful')}
        </Text>
        <View style={styles.feedbackButtons}>
          <TouchableOpacity
            style={[styles.feedbackButton, { backgroundColor: colors.success + '15', borderColor: colors.success }]}
            onPress={() => handleFeedback(true)}
            disabled={submittingFeedback}
          >
            <Text style={[styles.feedbackButtonText, { color: colors.success }]}>
              👍 {t('training.tips.helpful')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.feedbackButton, { backgroundColor: colors.error + '15', borderColor: colors.error }]}
            onPress={() => handleFeedback(false)}
            disabled={submittingFeedback}
          >
            <Text style={[styles.feedbackButtonText, { color: colors.error }]}>
              👎 {t('training.tips.notHelpful')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  categoryEmoji: {
    fontSize: fontSize.md,
  },
  categoryText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    lineHeight: 32,
    marginBottom: spacing.lg,
  },
  divider: {
    height: 2,
    width: 60,
    borderRadius: 1,
    marginBottom: spacing.lg,
  },
  contentText: {
    fontSize: fontSize.md,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  feedbackLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  feedbackButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
