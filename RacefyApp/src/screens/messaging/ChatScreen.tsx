import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Avatar, Loading } from '../../components';
import { useMessages } from '../../hooks/useMessages';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Message } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export function ChatScreen({ navigation, route }: Props) {
  const { conversationId, participant } = route.params;
  const { t } = useTranslation();
  const { messages, isLoading, isSending, sendMessage } = useMessages(conversationId);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;

    const text = inputText.trim();
    setInputText('');
    await sendMessage(text);
  };

  const handleUserPress = () => {
    navigation.navigate('UserProfile', { username: participant.username });
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.is_own;
    const showAvatar =
      !isOwn && (index === 0 || messages[index - 1]?.is_own !== item.is_own);
    const time = format(new Date(item.created_at), 'HH:mm');

    return (
      <View
        style={[
          styles.messageContainer,
          isOwn ? styles.ownMessageContainer : styles.otherMessageContainer,
        ]}
      >
        {!isOwn && (
          <View style={styles.avatarContainer}>
            {showAvatar ? (
              <Avatar
                uri={participant.avatar}
                name={participant.name}
                size="sm"
              />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isOwn ? styles.ownBubble : styles.otherBubble,
          ]}
        >
          <Text
            style={[styles.messageText, isOwn && styles.ownMessageText]}
          >
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>
            {time}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerUserInfo}
            onPress={handleUserPress}
          >
            <Avatar
              uri={participant.avatar}
              name={participant.name}
              size="sm"
            />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerName}>{participant.name}</Text>
              <Text style={styles.headerUsername}>@{participant.username}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.headerRight} />
        </View>
        <Loading fullScreen message={t('common.loading')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerUserInfo}
          onPress={handleUserPress}
        >
          <Avatar
            uri={participant.avatar}
            name={participant.name}
            size="sm"
          />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerName}>{participant.name}</Text>
            <Text style={styles.headerUsername}>@{participant.username}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={t('messaging.placeholder')}
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="send" size={20} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  headerTextContainer: {
    marginLeft: spacing.sm,
  },
  headerName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerUsername: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  headerRight: {
    width: 32,
  },
  keyboardAvoid: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    maxWidth: '80%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    marginRight: spacing.xs,
    justifyContent: 'flex-end',
  },
  avatarPlaceholder: {
    width: 32,
  },
  messageBubble: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    maxWidth: '100%',
  },
  ownBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: spacing.xs,
  },
  otherBubble: {
    backgroundColor: colors.cardBackground,
    borderBottomLeftRadius: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  ownMessageText: {
    color: colors.white,
  },
  messageTime: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  sendButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
});
