import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Avatar, Loading } from '../../components';
import { useMessages } from '../../hooks/useMessages';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { ThemeColors } from '../../theme/colors';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Message } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export function ChatScreen({ navigation, route }: Props) {
  const { conversationId, participant } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { messages, isLoading, isSending, sendMessage } = useMessages(conversationId);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const themedStyles = useMemo(() => createThemedStyles(colors), [colors]);

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
            isOwn ? themedStyles.ownBubble : themedStyles.otherBubble,
          ]}
        >
          <Text
            style={[themedStyles.messageText, isOwn && themedStyles.ownMessageText]}
          >
            {item.content}
          </Text>
          <Text style={[themedStyles.messageTime, isOwn && themedStyles.ownMessageTime]}>
            {time}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, themedStyles.container]} edges={['top']}>
        <View style={[styles.header, themedStyles.header]}>
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
              <Text style={[styles.headerName, themedStyles.headerName]}>{participant.name}</Text>
              <Text style={[styles.headerUsername, themedStyles.headerUsername]}>@{participant.username}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.headerRight} />
        </View>
        <Loading fullScreen message={t('common.loading')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, themedStyles.container]} edges={['top']}>
      <View style={[styles.header, themedStyles.header]}>
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
            <Text style={[styles.headerName, themedStyles.headerName]}>{participant.name}</Text>
            <Text style={[styles.headerUsername, themedStyles.headerUsername]}>@{participant.username}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
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

        <View style={[styles.inputContainer, themedStyles.inputContainer, { paddingBottom: spacing.md + insets.bottom }]}>
          <TextInput
            style={[styles.input, themedStyles.input]}
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
              themedStyles.sendButton,
              (!inputText.trim() || isSending) && themedStyles.sendButtonDisabled,
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
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
  },
  headerUsername: {
    fontSize: fontSize.xs,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    minHeight: 48,
    maxHeight: 120,
    borderWidth: 1,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
});

const createThemedStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.cardBackground,
      borderBottomColor: colors.border,
    },
    headerName: {
      color: colors.textPrimary,
    },
    headerUsername: {
      color: colors.textSecondary,
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
      backgroundColor: colors.cardBackground,
      borderTopColor: colors.border,
    },
    input: {
      backgroundColor: colors.background,
      color: colors.textPrimary,
      borderColor: colors.border,
    },
    sendButton: {
      backgroundColor: colors.primary,
    },
    sendButtonDisabled: {
      backgroundColor: colors.textMuted,
    },
  });
