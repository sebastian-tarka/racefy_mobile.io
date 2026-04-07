import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, ScreenHeader, Loading, KeyboardAwareScreenLayout } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Feedback, FeedbackReply, FeedbackAttachment } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'FeedbackDetail'>;

const STATUS_COLORS: Record<string, string> = {
  open: '#3B82F6',
  in_progress: '#EAB308',
  waiting_for_user: '#F97316',
  resolved: '#22C55E',
  closed: '#6B7280',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#6B7280',
};

export function FeedbackDetailScreen({ navigation, route }: Props) {
  const { feedbackId } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const fetchFeedback = useCallback(async () => {
    try {
      const data = await api.getFeedback(feedbackId);
      setFeedback(data);
    } catch (err) {
      logger.error('api', 'Failed to fetch feedback detail', { feedbackId, error: err });
      Alert.alert(t('feedback.messages.loadFailed'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [feedbackId, t]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchFeedback();
  }, [fetchFeedback]);

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setIsSendingReply(true);

    try {
      const reply = await api.replyToFeedback(feedbackId, { body: replyText.trim() });
      setFeedback((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          replies: [...(prev.replies || []), reply],
          replies_count: prev.replies_count + 1,
        };
      });
      setReplyText('');
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
    } catch (err: any) {
      logger.error('api', 'Failed to send reply', { feedbackId, error: err });
      if (err?.status === 403) {
        Alert.alert(t('feedback.detail.closedNotice'));
      } else {
        Alert.alert(t('feedback.messages.replyFailed'));
      }
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleOpenAttachment = (attachment: FeedbackAttachment) => {
    Linking.openURL(attachment.url);
  };

  const renderAttachments = (attachments: FeedbackAttachment[]) => {
    if (!attachments.length) return null;
    return (
      <View style={styles.attachmentsList}>
        {attachments.map((att) => (
          <TouchableOpacity
            key={att.id}
            style={[styles.attachmentItem, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            onPress={() => handleOpenAttachment(att)}
          >
            <Ionicons name="attach" size={14} color={colors.textSecondary} />
            <Text style={[styles.attachmentName, { color: colors.primary }]} numberOfLines={1}>
              {att.filename}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderReply = (reply: FeedbackReply) => {
    const isAdmin = reply.is_admin_reply;
    const borderColor = isAdmin ? '#10B981' : colors.border;
    const label = isAdmin ? t('feedback.detail.adminReply') : t('feedback.detail.you');

    return (
      <View
        key={reply.id}
        style={[styles.replyCard, { borderLeftColor: borderColor, backgroundColor: colors.cardBackground }]}
      >
        <View style={styles.replyHeader}>
          {isAdmin && (
            <View style={[styles.teamBadge, { backgroundColor: '#10B98120' }]}>
              <Text style={styles.teamBadgeText}>{t('feedback.detail.adminReply')}</Text>
            </View>
          )}
          <Text style={[styles.replyAuthor, { color: colors.textPrimary }]}>{label}</Text>
          <Text style={[styles.replyDate, { color: colors.textMuted }]}>
            {new Date(reply.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <Text style={[styles.replyBody, { color: colors.textPrimary }]}>{reply.body}</Text>
        {renderAttachments(reply.attachments)}
      </View>
    );
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="" showBack onBack={() => navigation.goBack()} />
        <Loading />
      </ScreenContainer>
    );
  }

  if (!feedback) {
    return (
      <ScreenContainer>
        <ScreenHeader title="" showBack onBack={() => navigation.goBack()} />
        <View style={styles.errorContainer}>
          <Text style={{ color: colors.textSecondary }}>{t('feedback.messages.loadFailed')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  const isClosed = feedback.status === 'closed';
  const statusColor = STATUS_COLORS[feedback.status] || '#6B7280';
  const priorityColor = PRIORITY_COLORS[feedback.priority] || '#6B7280';

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t(`feedback.types.${feedback.type}`)}
        showBack
        onBack={() => navigation.goBack()}
      />
      <KeyboardAwareScreenLayout
        scrollViewRef={scrollViewRef}
        refreshing={isRefreshing}
        onRefresh={onRefresh}
        scrollViewProps={{ contentContainerStyle: styles.content }}
        bottomContent={
          isClosed ? (
            <View style={[styles.closedBar, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.closedText, { color: colors.textSecondary }]}>
                {t('feedback.detail.closedNotice')}
              </Text>
            </View>
          ) : (
            <View style={[styles.replyBar, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
              <TextInput
                style={[styles.replyInput, { color: colors.textPrimary, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder={t('feedback.detail.replyPlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={replyText}
                onChangeText={setReplyText}
                multiline
                maxLength={5000}
                editable={!isSendingReply}
              />
              <TouchableOpacity
                style={[styles.sendButton, { opacity: (!replyText.trim() || isSendingReply) ? 0.4 : 1 }]}
                onPress={handleSendReply}
                disabled={!replyText.trim() || isSendingReply}
              >
                <Ionicons name="send" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )
        }
      >
        {/* Subject */}
        <Text style={[styles.subject, { color: colors.textPrimary }]}>{feedback.subject}</Text>

        {/* Meta */}
        <View style={[styles.metaCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.badgeText, { color: statusColor }]}>
                {t(`feedback.statuses.${feedback.status}`)}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: priorityColor + '20' }]}>
              <Text style={[styles.badgeText, { color: priorityColor }]}>
                {t(`feedback.priorities.${feedback.priority}`)}
              </Text>
            </View>
            {feedback.platform && (
              <View style={[styles.badge, { backgroundColor: colors.border + '40' }]}>
                <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                  {feedback.platform === 'ios' ? 'iOS' : 'Android'}
                </Text>
              </View>
            )}
          </View>
          {(feedback.app_version || feedback.device_model) && (
            <Text style={[styles.metaInfo, { color: colors.textMuted }]}>
              {[
                feedback.app_version && `v${feedback.app_version}`,
                feedback.device_model,
              ]
                .filter(Boolean)
                .join(' • ')}
            </Text>
          )}
          <Text style={[styles.metaInfo, { color: colors.textMuted }]}>
            {new Date(feedback.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {/* Description */}
        <Text style={[styles.description, { color: colors.textPrimary }]}>{feedback.description}</Text>

        {/* Attachments */}
        {renderAttachments(feedback.attachments)}

        {/* Replies */}
        <View style={styles.repliesSection}>
          <Text style={[styles.repliesTitle, { color: colors.textPrimary }]}>
            {t('feedback.detail.replies')} ({feedback.replies?.length || 0})
          </Text>

          {(!feedback.replies || feedback.replies.length === 0) ? (
            <Text style={[styles.noReplies, { color: colors.textSecondary }]}>
              {t('feedback.detail.noReplies')}
            </Text>
          ) : (
            feedback.replies.map(renderReply)
          )}
        </View>
      </KeyboardAwareScreenLayout>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subject: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  metaCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg || 12,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm || 6,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  metaInfo: {
    fontSize: fontSize.xs,
  },
  description: {
    fontSize: fontSize.md,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  attachmentsList: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm || 6,
    borderWidth: 1,
  },
  attachmentName: {
    fontSize: fontSize.sm,
    flex: 1,
  },
  repliesSection: {
    marginTop: spacing.md,
  },
  repliesTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  noReplies: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  replyCard: {
    borderLeftWidth: 3,
    padding: spacing.md,
    borderRadius: borderRadius.md || 8,
    marginBottom: spacing.sm,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  teamBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: 4,
  },
  teamBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  replyAuthor: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  replyDate: {
    fontSize: fontSize.xs,
    marginLeft: 'auto',
  },
  replyBody: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  replyInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md || 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: fontSize.sm,
    maxHeight: 100,
  },
  sendButton: {
    padding: spacing.sm,
  },
  closedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderTopWidth: 1,
  },
  closedText: {
    fontSize: fontSize.sm,
  },
});
