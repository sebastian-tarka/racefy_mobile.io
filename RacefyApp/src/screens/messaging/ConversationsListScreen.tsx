import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { format, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
import { Avatar, EmptyState, Loading, ScreenHeader, ScreenContainer, Input } from '../../components';
import { useConversations } from '../../hooks/useConversations';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useRefreshOn } from '../../services/refreshEvents';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { spacing, fontSize } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Conversation, MentionSearchUser } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'ConversationsList'>;

export function ConversationsListScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
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
    startConversation,
  } = useConversations();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MentionSearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen for message refresh events to update conversation list
  useRefreshOn('messages', refresh);

  useEffect(() => {
    if (isAuthenticated) {
      refresh();
    }
  }, [isAuthenticated]);

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (text.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await api.searchMentionUsers(text);
        setSearchResults(response.data);
      } catch (err) {
        logger.error('api', 'Failed to search users', { error: err });
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  }, []);

  const handleUserSelect = useCallback(async (user: MentionSearchUser) => {
    setIsStartingChat(true);
    try {
      const conversation = await startConversation(user.id);
      handleClearSearch();
      navigation.navigate('Chat', {
        conversationId: conversation.id,
        participant: {
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
        },
      });
    } catch (err) {
      logger.error('api', 'Failed to start conversation', { error: err });
      Alert.alert(t('common.error'), t('messaging.failedToLoad'));
    } finally {
      setIsStartingChat(false);
    }
  }, [startConversation, navigation, t, handleClearSearch]);

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

  const formatConversationTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const dateLocale = i18n.language.startsWith('pl') ? pl : enUS;
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return t('messaging.yesterday');
    if (isThisWeek(date, { weekStartsOn: 1 })) return format(date, 'EEE', { locale: dateLocale });
    if (isThisYear(date)) return format(date, 'd MMM', { locale: dateLocale });
    return format(date, 'd MMM yyyy', { locale: dateLocale });
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const timeAgo = item.last_message_at ? formatConversationTime(item.last_message_at) : '';

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
      <ScreenContainer>
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
      </ScreenContainer>
    );
  }

  if (isLoading && conversations.length === 0) {
    return (
      <ScreenContainer>
        <ScreenHeader
          title={t('messaging.title')}
          showBack
          onBack={() => navigation.goBack()}
        />
        <Loading fullScreen message={t('common.loading')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('messaging.title')}
        showBack
        onBack={() => navigation.goBack()}
      />

      <View style={styles.searchContainer}>
        <Input
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder={t('messaging.searchUsers')}
          leftIcon="search-outline"
          rightIcon={searchQuery.length > 0 ? 'close-circle' : undefined}
          onRightIconPress={searchQuery.length > 0 ? handleClearSearch : undefined}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {searchQuery.length >= 2 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.searchResultItem, { backgroundColor: colors.cardBackground, borderBottomColor: colors.borderLight }]}
              onPress={() => handleUserSelect(item)}
              disabled={isStartingChat}
              activeOpacity={0.7}
            >
              <Avatar uri={item.avatar} name={item.name} size="md" />
              <View style={styles.searchUserInfo}>
                <Text style={[styles.participantName, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.username, { color: colors.textSecondary }]}>@{item.username}</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            isSearching ? (
              <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
            ) : (
              <EmptyState
                icon="person-outline"
                title={t('messaging.noSearchResults')}
              />
            )
          }
          keyboardShouldPersistTaps="handled"
        />
      ) : (
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
      )}

      {isStartingChat && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.overlayText, { color: colors.white }]}>
            {t('messaging.startingConversation')}
          </Text>
        </View>
      )}
    </ScreenContainer>
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
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  searchUserInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
  },
});
