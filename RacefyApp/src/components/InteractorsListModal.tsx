import React from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useNavigation} from '@react-navigation/native';
import {formatDistanceToNow} from 'date-fns';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../hooks/useTheme';
import {Avatar} from './Avatar';
import {EmptyState} from './EmptyState';
import {useInteractors} from '../hooks/useInteractors';
import {borderRadius, fontSize, spacing} from '../theme';
import type {InteractionTargetType,} from './InteractionButton';
import type {UserInteractor} from '../types/api';

interface InteractorsListModalProps {
  visible: boolean;
  onClose: () => void;
  variant: 'like' | 'boost';
  targetType: InteractionTargetType;
  targetId: number;
  parentId?: number;
  totalCount: number;
}

export function InteractorsListModal({
  visible,
  onClose,
  variant,
  targetType,
  targetId,
  parentId,
  totalCount,
}: InteractorsListModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const { users, isLoading, error, hasMore, loadMore, refresh } = useInteractors({
    enabled: visible,
    variant,
    targetType,
    targetId,
    parentId,
  });

  const handleUserPress = (user: UserInteractor) => {
    onClose();
    if (user.username) {
      navigation.navigate('UserProfile', { username: user.username });
    }
  };

  const title =
    variant === 'like'
      ? t('interactions.likedBy', 'Liked by')
      : t('interactions.boostedBy', 'Boosted by');

  const renderItem = ({ item }: { item: UserInteractor }) => (
    <TouchableOpacity
      style={[styles.userItem, { backgroundColor: colors.cardBackground }]}
      onPress={() => handleUserPress(item)}
      activeOpacity={0.7}
    >
      <Avatar
        uri={item.avatar}
        name={item.name || '?'}
        size="sm"
        showTierBadge={
          !!item.subscription?.tier && item.subscription.tier !== 'free'
        }
        tier={item.subscription?.tier}
      />
      <View style={styles.userInfo}>
        <Text
          style={[styles.userName, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text
          style={[styles.userUsername, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          @{item.username}
        </Text>
      </View>
      {item.interacted_at && (
        <Text style={[styles.timeAgo, { color: colors.textMuted }]}>
          {formatDistanceToNow(new Date(item.interacted_at), {
            addSuffix: false,
          })}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (isLoading && users.length === 0) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (error && users.length === 0) {
      return (
        <EmptyState
          icon="alert-circle-outline"
          title={t('common.error')}
          message={error}
          actionLabel={t('common.tryAgain')}
          onAction={refresh}
        />
      );
    }

    if (users.length === 0) {
      return (
        <EmptyState
          icon={variant === 'like' ? 'heart-outline' : 'rocket-outline'}
          title={
            variant === 'like'
              ? t('interactions.noLikesYet', 'No likes yet')
              : t('interactions.noBoostsYet', 'No boosts yet')
          }
          message=""
        />
      );
    }

    return (
      <FlatList
        data={users}
        keyExtractor={(item) => `interactor-${item.id}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onEndReached={hasMore ? loadMore : undefined}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoading && users.length > 0 ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
      />
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: colors.background },
              ]}
            >
              <View style={styles.handleContainer}>
                <View
                  style={[styles.handle, { backgroundColor: colors.border }]}
                />
              </View>

              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <Text
                  style={[styles.modalTitle, { color: colors.textPrimary }]}
                >
                  {title}
                  {totalCount > 0 ? ` (${totalCount})` : ''}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {renderContent()}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    minHeight: '40%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.sm,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  userUsername: {
    fontSize: fontSize.sm,
  },
  timeAgo: {
    fontSize: fontSize.xs,
    marginLeft: spacing.sm,
  },
  centered: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  footerLoader: {
    padding: spacing.md,
  },
});