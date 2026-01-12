import React, { useState, useEffect, memo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { Avatar } from './Avatar';
import { EmptyState } from './EmptyState';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { spacing, fontSize, borderRadius } from '../theme';
import type { User } from '../types/api';

interface UserListModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  userId: number;
  listType: 'followers' | 'following';
  onUserPress: (user: User) => void;
  isRestricted?: boolean;
}

function UserListModalComponent({
  visible,
  onClose,
  title,
  userId,
  listType,
  onUserPress,
  isRestricted = false,
}: UserListModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data =
        listType === 'followers'
          ? await api.getFollowers(userId)
          : await api.getFollowing(userId);
      setUsers(data);
    } catch (err) {
      logger.error('api', `Failed to fetch ${listType}`, { error: err });
      setError(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  }, [userId, listType, t]);

  useEffect(() => {
    if (visible && !isRestricted) {
      fetchUsers();
    }
  }, [visible, isRestricted, fetchUsers]);

  const handleUserPress = (user: User) => {
    onUserPress(user);
    onClose();
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={[styles.userItem, { backgroundColor: colors.cardBackground }]}
      onPress={() => handleUserPress(item)}
      activeOpacity={0.7}
    >
      <Avatar uri={item.avatar} name={item.name} size="sm" />
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.textPrimary }]}>
          {item.name}
        </Text>
        <Text style={[styles.userUsername, { color: colors.textSecondary }]}>
          @{item.username}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );

  const getEmptyConfig = () => {
    if (listType === 'followers') {
      return {
        icon: 'people-outline' as const,
        title: t('profile.followersList.noFollowers'),
        message: t('profile.followersList.noFollowersMessage'),
      };
    }
    return {
      icon: 'person-add-outline' as const,
      title: t('profile.followingList.noFollowing'),
      message: t('profile.followingList.noFollowingMessage'),
    };
  };

  const renderContent = () => {
    if (isRestricted) {
      return (
        <EmptyState
          icon="lock-closed-outline"
          title={t('profile.privacy.restricted')}
          message={t('profile.privacy.restrictedMessage')}
        />
      );
    }

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (error) {
      return (
        <EmptyState
          icon="alert-circle-outline"
          title={t('common.error')}
          message={error}
          actionLabel={t('common.retry')}
          onAction={fetchUsers}
        />
      );
    }

    if (users.length === 0) {
      const emptyConfig = getEmptyConfig();
      return <EmptyState {...emptyConfig} />;
    }

    return (
      <FlatList
        data={users}
        keyExtractor={(item) => `user-${item.id}`}
        renderItem={renderUserItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
              style={[styles.modalContent, { backgroundColor: colors.background }]}
            >
              <View style={styles.handleContainer}>
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
              </View>

              <View
                style={[styles.modalHeader, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  {title}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
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
    maxHeight: '70%',
    minHeight: 300,
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
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
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
});

export const UserListModal = memo(UserListModalComponent);
