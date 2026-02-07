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
import { Button } from './Button';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { spacing, fontSize, borderRadius } from '../theme';
import type { User, FollowRequest } from '../types/api';

type TabType = 'followers' | 'following' | 'requests';

interface UserListModalProps {
  visible: boolean;
  onClose: () => void;
  userId: number;
  initialTab?: TabType;
  isOwnProfile: boolean;
  onUserPress: (user: User) => void;
  isRestricted?: boolean;
}

function UserListModalComponent({
  visible,
  onClose,
  userId,
  initialTab = 'followers',
  isOwnProfile,
  onUserPress,
  isRestricted = false,
}: UserListModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(null);

  // Reset to initial tab when modal is opened
  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  const fetchFollowers = useCallback(async () => {
    try {
      const data = await api.getFollowers(userId);
      setFollowers(data);
    } catch (err) {
      logger.error('api', 'Failed to fetch followers', { error: err });
      throw err;
    }
  }, [userId]);

  const fetchFollowing = useCallback(async () => {
    try {
      const data = await api.getFollowing(userId);
      setFollowing(data);
    } catch (err) {
      logger.error('api', 'Failed to fetch following', { error: err });
      throw err;
    }
  }, [userId]);

  const fetchRequests = useCallback(async () => {
    try {
      const response = await api.getFollowRequests(1);
      setRequests(response.data);
    } catch (err) {
      logger.error('api', 'Failed to fetch follow requests', { error: err });
      throw err;
    }
  }, []);

  const fetchTabData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (activeTab === 'followers') {
        await fetchFollowers();
      } else if (activeTab === 'following') {
        await fetchFollowing();
      } else if (activeTab === 'requests') {
        await fetchRequests();
      }
    } catch (err) {
      setError(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, fetchFollowers, fetchFollowing, fetchRequests, t]);

  useEffect(() => {
    if (visible && !isRestricted) {
      fetchTabData();
    }
  }, [visible, isRestricted, activeTab, fetchTabData]);

  const handleAcceptRequest = async (request: FollowRequest) => {
    setProcessingRequestId(request.id);
    try {
      await api.acceptFollowRequest(request.id);
      // Remove from requests list optimistically
      setRequests(prev => prev.filter(r => r.id !== request.id));
      logger.info('general', 'Follow request accepted', { requestId: request.id });
    } catch (err) {
      logger.error('api', 'Failed to accept follow request', { error: err, requestId: request.id });
      setError(t('common.error'));
      // Refetch to restore correct state
      await fetchRequests();
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (request: FollowRequest) => {
    setProcessingRequestId(request.id);
    try {
      await api.rejectFollowRequest(request.id);
      // Remove from requests list optimistically
      setRequests(prev => prev.filter(r => r.id !== request.id));
      logger.info('general', 'Follow request rejected', { requestId: request.id });
    } catch (err) {
      logger.error('api', 'Failed to reject follow request', { error: err, requestId: request.id });
      setError(t('common.error'));
      // Refetch to restore correct state
      await fetchRequests();
    } finally {
      setProcessingRequestId(null);
    }
  };

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

  const renderRequestItem = ({ item }: { item: FollowRequest }) => (
    <View style={[styles.requestItem, { backgroundColor: colors.cardBackground }]}>
      <TouchableOpacity
        style={styles.requestUserInfo}
        onPress={() => handleUserPress(item.follower)}
        activeOpacity={0.7}
      >
        <Avatar uri={item.follower.avatar} name={item.follower.name} size="sm" />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>
            {item.follower.name}
          </Text>
          <Text style={[styles.userUsername, { color: colors.textSecondary }]}>
            @{item.follower.username}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.requestActions}>
        <Button
          title={t('profile.accept')}
          onPress={() => handleAcceptRequest(item)}
          variant="primary"
          loading={processingRequestId === item.id}
          disabled={!!processingRequestId}
          style={styles.acceptButton}
        />
        <Button
          title={t('profile.reject')}
          onPress={() => handleRejectRequest(item)}
          variant="ghost"
          loading={processingRequestId === item.id}
          disabled={!!processingRequestId}
          style={styles.rejectButton}
        />
      </View>
    </View>
  );

  const getEmptyConfig = () => {
    if (activeTab === 'followers') {
      return {
        icon: 'people-outline' as const,
        title: t('profile.followersList.noFollowers'),
        message: t('profile.followersList.noFollowersMessage'),
      };
    }
    if (activeTab === 'following') {
      return {
        icon: 'person-add-outline' as const,
        title: t('profile.followingList.noFollowing'),
        message: t('profile.followingList.noFollowingMessage'),
      };
    }
    return {
      icon: 'notifications-outline' as const,
      title: t('profile.noFollowRequestsYet'),
      message: '',
    };
  };

  const getCurrentTabData = () => {
    if (activeTab === 'followers') return followers;
    if (activeTab === 'following') return following;
    return [];
  };

  const getTitle = () => {
    if (activeTab === 'followers') return t('profile.followersList.title');
    if (activeTab === 'following') return t('profile.followingList.title');
    return t('profile.followRequests');
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
          actionLabel={t('common.tryAgain')}
          onAction={fetchTabData}
        />
      );
    }

    const currentData = getCurrentTabData();
    const isEmpty = activeTab === 'requests' ? requests.length === 0 : currentData.length === 0;

    if (isEmpty) {
      const emptyConfig = getEmptyConfig();
      return <EmptyState {...emptyConfig} />;
    }

    if (activeTab === 'requests') {
      return (
        <FlatList
          data={requests}
          keyExtractor={(item) => `request-${item.id}`}
          renderItem={renderRequestItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      );
    }

    return (
      <FlatList
        data={currentData}
        keyExtractor={(item) => `user-${item.id}`}
        renderItem={renderUserItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const tabs: { value: TabType; label: string }[] = [
    { value: 'followers', label: t('profile.stats.followers') },
    { value: 'following', label: t('profile.stats.following') },
    ...(isOwnProfile ? [{ value: 'requests' as TabType, label: t('profile.requests') }] : []),
  ];

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
                  {getTitle()}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Tabs */}
              <View style={[styles.tabContainer, { borderBottomColor: colors.border }]}>
                {tabs.map((tab) => (
                  <TouchableOpacity
                    key={tab.value}
                    style={[
                      styles.tab,
                      activeTab === tab.value && [
                        styles.activeTab,
                        { borderBottomColor: colors.primary },
                      ],
                    ]}
                    onPress={() => setActiveTab(tab.value)}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        {
                          color:
                            activeTab === tab.value
                              ? colors.primary
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
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
    minHeight: 400,
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
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: fontSize.md,
    fontWeight: '500',
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
  requestItem: {
    flexDirection: 'column',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  requestUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
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
  requestActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginLeft: 52, // Avatar width + margin
  },
  acceptButton: {
    flex: 1,
  },
  rejectButton: {
    flex: 1,
  },
});

export const UserListModal = memo(UserListModalComponent);
