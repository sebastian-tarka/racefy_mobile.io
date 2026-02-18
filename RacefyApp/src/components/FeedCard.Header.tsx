import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Avatar } from './Avatar';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import type { Post } from '../types/api';
import { type FeedPostType, getTypeColors, getTypeIcon, styles } from './FeedCard.utils';

interface MenuBottomSheetProps {
  isOwner: boolean;
  visible: boolean;
  onClose: () => void;
  onMenu?: (action: 'edit' | 'delete' | 'report') => void;
}

function MenuBottomSheet({ isOwner, visible, onClose, onMenu }: MenuBottomSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (!onMenu) return null;

  const handleAction = (action: 'edit' | 'delete' | 'report') => {
    onClose();
    onMenu(action);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={bottomSheetStyles.backdrop} onPress={onClose}>
        <Pressable style={[bottomSheetStyles.sheet, { backgroundColor: colors.cardBackground }]} onPress={(e) => e.stopPropagation()}>
          <View style={[bottomSheetStyles.handle, { backgroundColor: colors.border }]} />

          <Text style={[bottomSheetStyles.title, { color: colors.textPrimary }]}>
            {t('feed.postOptions')}
          </Text>

          {isOwner ? (
            <>
              <TouchableOpacity
                style={[bottomSheetStyles.option, { borderBottomColor: colors.borderLight }]}
                onPress={() => handleAction('edit')}
              >
                <Ionicons name="create-outline" size={22} color={colors.textPrimary} />
                <Text style={[bottomSheetStyles.optionText, { color: colors.textPrimary }]}>
                  {t('feed.edit')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[bottomSheetStyles.option, { borderBottomColor: colors.borderLight }]}
                onPress={() => handleAction('delete')}
              >
                <Ionicons name="trash-outline" size={22} color={colors.error} />
                <Text style={[bottomSheetStyles.optionText, { color: colors.error }]}>
                  {t('feed.delete')}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[bottomSheetStyles.option, { borderBottomColor: colors.borderLight }]}
              onPress={() => handleAction('report')}
            >
              <Ionicons name="flag-outline" size={22} color={colors.textPrimary} />
              <Text style={[bottomSheetStyles.optionText, { color: colors.textPrimary }]}>
                {t('feed.report')}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[bottomSheetStyles.cancelButton, { backgroundColor: colors.background }]}
            onPress={onClose}
          >
            <Text style={[bottomSheetStyles.cancelText, { color: colors.textSecondary }]}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const bottomSheetStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  optionText: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  cancelButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});

interface FeedCardHeaderProps {
  post: Post;
  type: FeedPostType;
  isOwner: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onUserPress?: () => void;
  onMenu?: (action: 'edit' | 'delete' | 'report') => void;
}

export function FeedCardHeader({ post, type, isOwner, menuOpen, onToggleMenu, onUserPress, onMenu }: FeedCardHeaderProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const typeColors = getTypeColors(type, colors);
  const isSponsored = type === 'sponsored';
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: false });

  const visibilityConfig: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
    public: { icon: 'eye-outline', label: t('feed.visibility.public') },
    followers: { icon: 'people-outline', label: t('feed.visibility.followers') },
    private: { icon: 'lock-closed-outline', label: t('feed.visibility.private') },
  };

  const typeIcon = getTypeIcon(type);
  const campaignName = isSponsored ? ((post as any).sponsored_data?.campaign_name || t('feed.postTypes.sponsored')) : null;

  if (isSponsored) {
    return (
      <>
        <View style={styles.headerRow}>
          <View style={styles.headerUserBlock}>
            <View style={styles.headerTextBlock}>
              <Text style={[styles.headerName, { color: colors.textPrimary }]}>
                {campaignName}
              </Text>
              <View style={styles.headerMetaRow}>
                {typeIcon && (
                  <View style={styles.typeIndicator}>
                    <Ionicons name={typeIcon} size={14} color={typeColors.badge} />
                    <Text style={[styles.typeLabel, { color: typeColors.badge }]}>
                      {t('feed.postTypes.sponsored')}
                    </Text>
                  </View>
                )}
                <Text style={[styles.headerTime, { color: colors.textMuted }]}>•</Text>
                <Text style={[styles.headerTime, { color: colors.textMuted }]}>{timeAgo}</Text>
              </View>
            </View>
          </View>
          {onMenu && (
            <TouchableOpacity onPress={onToggleMenu} style={styles.menuButton}>
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <MenuBottomSheet isOwner={isOwner} visible={menuOpen} onClose={onToggleMenu} onMenu={onMenu} />
      </>
    );
  }

  return (
    <>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerUserBlock} onPress={onUserPress} disabled={!onUserPress}>
          <Avatar uri={post.user?.avatar} name={post.user?.name} size="md" />
          <View style={styles.headerTextBlock}>
            <Text style={[styles.headerName, { color: colors.textPrimary }]}>{post.user?.name}</Text>
            <View style={styles.headerMetaRow}>
              {type !== 'general' && typeIcon && (
                <>
                  <View style={styles.typeIndicator}>
                    <Ionicons name={typeIcon} size={14} color={typeColors.badge} />
                    <Text style={[styles.typeLabel, { color: typeColors.badge }]}>
                      {t(`feed.postTypes.${type}`)}
                    </Text>
                  </View>
                  <Text style={[styles.headerTime, { color: colors.textMuted }]}>•</Text>
                </>
              )}

              <Text style={[styles.headerTime, { color: colors.textMuted }]}>{timeAgo}</Text>
              {isOwner && post.visibility && visibilityConfig[post.visibility] && (
                  <>
                    <View style={styles.visibilityPill}>
                      <Ionicons name={visibilityConfig[post.visibility].icon} size={10} color={colors.textMuted} />
                      <Text style={[styles.visibilityPillText, { color: colors.textMuted }]}>{visibilityConfig[post.visibility].label}</Text>
                    </View>
                  </>
              )}
            </View>
          </View>
        </TouchableOpacity>
        {onMenu && (
          <TouchableOpacity onPress={onToggleMenu} style={styles.menuButton}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      <MenuBottomSheet isOwner={isOwner} visible={menuOpen} onClose={onToggleMenu} onMenu={onMenu} />
    </>
  );
}