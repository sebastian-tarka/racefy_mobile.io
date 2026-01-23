import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useBlockedUsers } from '../../hooks/useBlockedUsers';
import { useBlockUser } from '../../hooks/useBlockUser';
import { ScreenHeader, Avatar, EmptyState } from '../../components';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { BlockedUser } from '../../types/api';

export function BlockedUsersScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { unblockUser, isLoading: isUnblocking } = useBlockUser();

  const {
    blockedUsers,
    isLoading,
    isRefreshing,
    isLoadingMore,
    error,
    hasMore,
    totalUsers,
    refresh,
    loadMore,
    removeUser,
  } = useBlockedUsers();

  const handleUnblock = async (user: BlockedUser) => {
    await unblockUser(user.id, () => {
      // Optimistically remove user from list
      removeUser(user.id);
    });
  };

  const renderItem = ({ item }: { item: BlockedUser }) => (
    <View
      style={[
        styles.userItem,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
        },
      ]}
    >
      <Avatar uri={item.avatar} name={item.name} size="md" />
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.textPrimary }]}>
          {item.name}
        </Text>
        <Text style={[styles.userUsername, { color: colors.textSecondary }]}>
          @{item.username}
        </Text>
      </View>
      <TouchableOpacity
        style={[
          styles.unblockButton,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
        onPress={() => handleUnblock(item)}
        disabled={isUnblocking}
        activeOpacity={0.7}
      >
        <Text style={[styles.unblockButtonText, { color: colors.textPrimary }]}>
          {t('blocking.unblockAction')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
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
          onAction={refresh}
        />
      );
    }

    return (
      <EmptyState
        icon="shield-checkmark-outline"
        title={t('blocking.noBlockedUsers')}
        message={t('blocking.noBlockedUsersMessage')}
      />
    );
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScreenHeader
        title={t('blocking.title')}
        showBack
        onBack={() => navigation.goBack()}
      />

      {totalUsers > 0 && (
        <View style={styles.countContainer}>
          <Text style={[styles.countText, { color: colors.textSecondary }]}>
            {t('blocking.blockedCount', { count: totalUsers })}
          </Text>
        </View>
      )}

      <FlatList
        data={blockedUsers}
        keyExtractor={(item) => `blocked-user-${item.id}`}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          blockedUsers.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={hasMore ? loadMore : undefined}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  countContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  countText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  listContentEmpty: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: fontSize.sm,
  },
  unblockButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  unblockButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  footer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});
