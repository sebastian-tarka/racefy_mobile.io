import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { DraftPostCard } from './DraftPostCard';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import type { DraftPost } from '../types/api';

interface DraftsReminderModalProps {
  visible: boolean;
  onClose: () => void;
  drafts: DraftPost[];
  onPublish: (postId: number) => Promise<any>;
  onEdit: (draft: DraftPost) => void;
  onViewAll: () => void;
}

export function DraftsReminderModal({
  visible,
  onClose,
  drafts,
  onPublish,
  onEdit,
  onViewAll,
}: DraftsReminderModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [publishingId, setPublishingId] = useState<number | null>(null);

  const handlePublish = async (postId: number) => {
    setPublishingId(postId);
    try {
      await onPublish(postId);
    } catch {
      Alert.alert(t('common.error'), t('drafts.publishFailed'));
    } finally {
      setPublishingId(null);
    }
  };

  const handleEdit = (draft: DraftPost) => {
    onClose();
    onEdit(draft);
  };

  const handleViewAll = () => {
    onClose();
    onViewAll();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.cardBackground }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t('drafts.reminderTitle')}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t('drafts.reminderSubtitle')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.draftsList}
            showsVerticalScrollIndicator={false}
          >
            {drafts.map((draft) => (
              <DraftPostCard
                key={draft.id}
                post={draft}
                onPublish={() => handlePublish(draft.id)}
                onEdit={() => handleEdit(draft)}
                onDelete={() => {}}
                isPublishing={publishingId === draft.id}
              />
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity onPress={handleViewAll} style={styles.viewAllButton}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>
                {t('drafts.viewAll')}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dismissButton, { backgroundColor: colors.background }]}
              onPress={onClose}
            >
              <Text style={[styles.dismissText, { color: colors.textSecondary }]}>
                {t('drafts.dismissReminder')}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerText: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  closeButton: {
    padding: spacing.xs,
  },
  draftsList: {
    maxHeight: 400,
  },
  footer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  viewAllText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  dismissButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  dismissText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
