import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, EmptyState, Loading, ScreenHeader } from '../../components';
import { useConversations } from '../../hooks/useConversations';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useRefreshOn } from '../../services/refreshEvents';
import { spacing, fontSize } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Conversation } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'ConversationsList'>;

export function ConversationsListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isAuthenticated } = useAuth();
  const {
    conversations,
    isLoading,
    isRefreshing,
    hasMore,
    error,
    refresh,
    loadMore,
    deleteConversation,
  } = useConversations();

  // Listen for message refresh events to update conversation list
  useRefreshOn('messages', refresh);

  useEffect(() => {
    if (isAuthenticated) {
      refresh();
    }
  }, [isAuthenticated]);

  const handleConversationPress = (conversation: Conversation) => {
    navigation.navigate('Chat', {
      conversationId: conversation.id,
      participant: conversation.participant,
    });
  };

  const handleDeleteConversation = (conversation: Conversation) => {
    Alert.alert(
      t('messaging.deleteConversation'),
      t('messaging.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteConversation(conversation.id);
            } catch (err) {
              Alert.alert(t('common.error'), t('messaging.failedToLoad'));
            }
          },
        },
      ]
    );
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const timeAgo = item.last_message_at
      ? formatDistanceToNow(new Date(item.last_message_at), { addSuffix: false })
      : '';

    const lastMessagePreview = item.last_message
      ? item.last_message.type === 'activity'
        ? t('messaging.sharedActivity')
        : item.last_message.content
      : '';

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          { backgroundColor: colors.cardBackground, borderBottomColor: colors.borderLight },
        ]}
        onPress={() => handleConversationPress(item)}
        onLongPress={() => handleDeleteConversation(item)}
        activeOpacity={0.7}
      >
        <Avatar
          uri={item.participant.avatar}
          name={item.participant.name}
          size="lg"
        />
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.participantName, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.participant.name}
            </Text>
            {timeAgo && <Text style={[styles.timeAgo, { color: colors.textMuted }]}>{timeAgo}</Text>}
          </View>
          <Text style={[styles.username, { color: colors.textSecondary }]}>@{item.participant.username}</Text>
          {lastMessagePreview && (
            <Text style={[styles.lastMessage, { color: colors.textMuted }]} numberOfLines={1}>
              {lastMessagePreview}
            </Text>
          )}
        </View>
        {item.unread_count > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.unreadCount, { color: colors.white }]}>
              {item.unread_count > 99 ? '99+' : item.unread_count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ScreenHeader
          title={t('messaging.title')}
          showBack
          onBack={() => navigation.goBack()}
        />
        <EmptyState
          icon="lock-closed-outline"
          title={t('feed.signInRequired')}
          message={t('feed.signInDescription')}
          actionLabel={t('common.signIn')}
          onAction={() => navigation.navigate('Auth', { screen: 'Login' })}
        />
      </SafeAreaView>
    );
  }

  if (isLoading && conversations.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ScreenHeader
          title={t('messaging.title')}
          showBack
          onBack={() => navigation.goBack()}
        />
        <Loading fullScreen message={t('common.loading')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        title={t('messaging.title')}
        showBack
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderConversation}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          error ? (
            <EmptyState
              icon="alert-circle-outline"
              title={t('messaging.failedToLoad')}
              message={error}
              actionLabel={t('common.tryAgain')}
              onAction={refresh}
            />
          ) : (
            <EmptyState
              icon="chatbubbles-outline"
              title={t('messaging.noConversations')}
              message={t('messaging.noConversationsMessage')}
            />
          )
        }
        ListFooterComponent={
          isLoading && conversations.length > 0 ? (
            <Loading message={t('common.loadingMore')} />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  conversationContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  participantName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    flex: 1,
  },
  timeAgo: {
    fontSize: fontSize.xs,
    marginLeft: spacing.sm,
  },
  username: {
    fontSize: fontSize.sm,
    marginTop: 1,
  },
  lastMessage: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    marginLeft: spacing.sm,
  },
  unreadCount: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});
