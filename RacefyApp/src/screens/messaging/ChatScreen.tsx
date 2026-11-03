import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { isSameDay } from 'date-fns/isSameDay';
import { isToday } from 'date-fns/isToday';
import { isYesterday } from 'date-fns/isYesterday';
import { isThisYear } from 'date-fns/isThisYear';
import { Avatar, Loading, ParticipantsSheet, ScreenContainer } from '../../components';
import { SheetModal } from '../../components/SheetModal';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useMessages } from '../../hooks/useMessages';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { spacing, fontSize, borderRadius, msFont } from '../../theme';
import type { ThemeColors } from '../../theme/colors';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Conversation, ConversationParticipant, Message } from '../../types/api';
import { getErrorMessage, getErrorStatus } from '../../utils/errors';
import { formatDate, formatIntlDate } from '../../utils/dateFormat';
import { MessageAttachments } from './components/MessageAttachments';
import { AttachmentPreviewStrip } from './components/AttachmentPreviewStrip';
import { PendingMessageBubble } from './components/PendingMessageBubble';
import { messageBodyText } from './messageText';
import { pickChatDocument, pickChatImages } from './pickChatAttachments';
import {
  MAX_ATTACHMENTS,
  rejectionMessage,
  validateAttachments,
  type LocalAttachment,
} from '../../utils/chatAttachments';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export function ChatScreen({ navigation, route }: Props) {
  const {
    conversationId,
    participant: routeParticipant,
    conversation: routeConversation,
  } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    messages,
    isLoading: isLoadingMessages,
    isSending,
    sendMessage,
    pending,
    sendAttachments,
    retryPending,
    discardPending,
  } = useMessages(conversationId);
  const { chat_attachments: canAttach } = useFeatureFlags();
  const [inputText, setInputText] = useState('');
  const [draftAttachments, setDraftAttachments] = useState<LocalAttachment[]>([]);
  const [isAttachSheetVisible, setIsAttachSheetVisible] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const [conversation, setConversation] = useState<Conversation | null>(routeConversation ?? null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(!routeConversation);

  const [isParticipantsSheetVisible, setIsParticipantsSheetVisible] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isSavingRename, setIsSavingRename] = useState(false);

  const themedStyles = useMemo(() => createThemedStyles(colors), [colors]);

  const fetchConversation = useCallback(async () => {
    try {
      const data = await api.getConversation(conversationId);
      setConversation(data);
    } catch (error) {
      if (getErrorStatus(error) === 403) {
        logger.warn('api', 'No longer a participant of conversation', { conversationId });
        navigation.goBack();
      } else {
        logger.error('api', 'Failed to load conversation', {
          conversationId,
          error: getErrorMessage(error),
        });
      }
    } finally {
      setIsLoadingConversation(false);
    }
  }, [conversationId, navigation]);

  useEffect(() => {
    if (!conversation) {
      fetchConversation();
    } else {
      setIsLoadingConversation(false);
    }
  }, [conversation, fetchConversation]);

  // Scroll to bottom when new messages arrive (or an upload bubble is added)
  useEffect(() => {
    if (messages.length > 0 || pending.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, pending.length]);

  const isTeam = conversation?.type === 'team';
  const isCaptain = conversation?.is_captain === true;
  const headerParticipant: ConversationParticipant | null = isTeam
    ? null
    : (conversation?.participant ?? routeParticipant ?? null);

  const formatDateSeparator = (date: Date): string => {
    if (isToday(date)) return t('messaging.today');
    if (isYesterday(date)) return t('messaging.yesterday');
    if (isThisYear(date)) return formatIntlDate(date, { day: 'numeric', month: 'long' });
    return formatDate(date, 'PPP');
  };

  const canSend = (inputText.trim().length > 0 || draftAttachments.length > 0) && !isSending;

  const handleSend = async () => {
    if (!canSend) return;
    const text = inputText.trim();
    setInputText('');
    if (draftAttachments.length > 0) {
      const files = draftAttachments;
      setDraftAttachments([]);
      sendAttachments(text, files);
      return;
    }
    await sendMessage(text);
  };

  const addAttachments = (picked: LocalAttachment[]) => {
    if (picked.length === 0) return;
    const { accepted, rejected } = validateAttachments(draftAttachments, picked);
    if (accepted.length > 0) setDraftAttachments((prev) => [...prev, ...accepted]);
    const warning = rejectionMessage(rejected, t);
    if (warning) Alert.alert('', warning);
  };

  const handlePick = async (source: 'library' | 'camera' | 'document') => {
    setIsAttachSheetVisible(false);
    if (isPicking) return;
    setIsPicking(true);
    try {
      const room = MAX_ATTACHMENTS - draftAttachments.length;
      const picked =
        source === 'document' ? await pickChatDocument() : await pickChatImages(source, room);
      addAttachments(picked);
    } catch (error) {
      logger.error('general', 'Chat attachment picker failed', { source, error });
      Alert.alert(t('common.error'), t('messaging.attachments.pickFailed'));
    } finally {
      setIsPicking(false);
    }
  };

  const handleAttachPress = () => {
    if (draftAttachments.length >= MAX_ATTACHMENTS) {
      Alert.alert('', t('messaging.attachments.tooMany', { max: MAX_ATTACHMENTS }));
      return;
    }
    setIsAttachSheetVisible(true);
  };

  const handleHeaderPress = () => {
    if (isTeam && conversation?.team) {
      navigation.navigate('TeamDetail', { slug: conversation.team.slug });
    } else if (headerParticipant) {
      navigation.navigate('UserProfile', { username: headerParticipant.username });
    }
  };

  const handleStartRename = () => {
    setRenameValue(conversation?.name ?? conversation?.team?.name ?? '');
    setIsRenaming(true);
  };

  const handleCancelRename = () => {
    setIsRenaming(false);
    setRenameValue('');
  };

  const handleSaveRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === conversation?.name) {
      setIsRenaming(false);
      return;
    }
    setIsSavingRename(true);
    try {
      const updated = await api.updateConversation(conversationId, { name: trimmed });
      setConversation(updated);
      setIsRenaming(false);
    } catch (error) {
      if (getErrorStatus(error) === 403) {
        // Captain demoted mid-session — refetch + hide pencil
        await fetchConversation();
        setIsRenaming(false);
      } else {
        Alert.alert('', getErrorMessage(error) || t('messaging.renameFailed'));
      }
    } finally {
      setIsSavingRename(false);
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.is_own;
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const time = formatDate(item.created_at, 'p');
    const showDateSeparator =
      !prevMessage || !isSameDay(new Date(item.created_at), new Date(prevMessage.created_at));

    // Show sender attribution: in team chats, for first non-self bubble in a streak.
    const showSender =
      isTeam &&
      !isOwn &&
      (!prevMessage || prevMessage.sender.id !== item.sender.id || prevMessage.is_own);

    const showAvatar =
      !isOwn && (showSender || !prevMessage || messages[index - 1]?.is_own !== item.is_own);

    const attachments = item.attachments ?? [];
    const body = messageBodyText(item, t);

    return (
      <>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <View
              style={[
                styles.dateSeparatorLine,
                { backgroundColor: themedStyles.dateSeparatorLine.backgroundColor },
              ]}
            />
            <Text
              style={[styles.dateSeparatorText, { color: themedStyles.dateSeparatorText.color }]}
            >
              {formatDateSeparator(new Date(item.created_at))}
            </Text>
            <View
              style={[
                styles.dateSeparatorLine,
                { backgroundColor: themedStyles.dateSeparatorLine.backgroundColor },
              ]}
            />
          </View>
        )}
        <View
          style={[
            styles.messageContainer,
            isOwn ? styles.ownMessageContainer : styles.otherMessageContainer,
          ]}
        >
          {!isOwn && (
            <View style={styles.avatarContainer}>
              {showAvatar ? (
                <Avatar uri={item.sender.avatar} name={item.sender.name} size="sm" />
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
            {showSender && (
              <Text style={[styles.senderName, { color: colors.primary }]}>{item.sender.name}</Text>
            )}
            {attachments.length > 0 && (
              <MessageAttachments attachments={attachments} isOwn={isOwn} />
            )}
            {body && (
              <Text
                style={[
                  themedStyles.messageText,
                  isOwn && themedStyles.ownMessageText,
                  body.muted && themedStyles.mutedMessageText,
                  attachments.length > 0 && styles.caption,
                ]}
              >
                {body.text}
              </Text>
            )}
            <Text style={[themedStyles.messageTime, isOwn && themedStyles.ownMessageTime]}>
              {time}
            </Text>
          </View>
        </View>
      </>
    );
  };

  const renderHeader = () => (
    <View style={[styles.header, themedStyles.header]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </TouchableOpacity>

      {isRenaming ? (
        <View style={styles.renameRow}>
          <TextInput
            style={[styles.renameInput, { color: colors.textPrimary, borderColor: colors.border }]}
            value={renameValue}
            onChangeText={setRenameValue}
            maxLength={100}
            autoFocus
            placeholder={t('messaging.renamePlaceholder')}
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity
            onPress={handleCancelRename}
            disabled={isSavingRename}
            style={styles.renameAction}
          >
            <Text style={[styles.renameActionText, { color: colors.textSecondary }]}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSaveRename}
            disabled={isSavingRename}
            style={styles.renameAction}
          >
            {isSavingRename ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.renameActionText, { color: colors.primary, fontWeight: '700' }]}>
                {t('common.save')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity style={styles.headerUserInfo} onPress={handleHeaderPress}>
            {isTeam && conversation?.team ? (
              <Avatar uri={conversation.team.avatar} name={conversation.team.name} size="sm" />
            ) : headerParticipant ? (
              <Avatar uri={headerParticipant.avatar} name={headerParticipant.name} size="sm" />
            ) : null}
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerName, themedStyles.headerName]} numberOfLines={1}>
                {isTeam ? conversation?.name || conversation?.team?.name : headerParticipant?.name}
              </Text>
              <Text style={[styles.headerUsername, themedStyles.headerUsername]} numberOfLines={1}>
                {isTeam
                  ? conversation?.participants_count
                    ? conversation.participants_count === 1
                      ? t('messaging.memberOne', { count: conversation.participants_count })
                      : t('messaging.members', { count: conversation.participants_count })
                    : ''
                  : headerParticipant
                    ? `@${headerParticipant.username}`
                    : ''}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            {isTeam && (
              <TouchableOpacity
                onPress={() => setIsParticipantsSheetVisible(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={t('messaging.viewMembers')}
                style={styles.headerActionButton}
              >
                <Ionicons name="people-outline" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            )}
            {isTeam && isCaptain && (
              <TouchableOpacity
                onPress={handleStartRename}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={t('messaging.rename')}
                style={styles.headerActionButton}
              >
                <Ionicons name="pencil" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </View>
  );

  if (isLoadingMessages || isLoadingConversation) {
    return (
      <ScreenContainer>
        {renderHeader()}
        <Loading fullScreen message={t('common.loading')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {renderHeader()}

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListFooterComponent={
            pending.length > 0 ? (
              <>
                {pending.map((item) => (
                  <PendingMessageBubble
                    key={item.localId}
                    message={item}
                    onRetry={retryPending}
                    onDiscard={discardPending}
                  />
                ))}
              </>
            ) : null
          }
        />

        <AttachmentPreviewStrip
          attachments={draftAttachments}
          onRemove={(localId) =>
            setDraftAttachments((prev) => prev.filter((f) => f.localId !== localId))
          }
        />

        <View
          style={[
            styles.inputContainer,
            themedStyles.inputContainer,
            { paddingBottom: spacing.md + insets.bottom },
          ]}
        >
          {canAttach && (
            <TouchableOpacity
              style={styles.attachButton}
              onPress={handleAttachPress}
              disabled={isPicking}
              accessibilityRole="button"
              accessibilityLabel={t('messaging.attachments.attach')}
              testID="chat-attach-button"
            >
              {isPicking ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="attach" size={26} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          )}
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
              !canSend && themedStyles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!canSend}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="send" size={20} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <SheetModal visible={isAttachSheetVisible} onClose={() => setIsAttachSheetVisible(false)}>
        {(
          [
            ['library', 'images-outline', 'messaging.attachments.pickPhotos'],
            ['camera', 'camera-outline', 'messaging.attachments.takePhoto'],
            ['document', 'document-attach-outline', 'messaging.attachments.pickDocument'],
          ] as const
        ).map(([source, icon, label]) => (
          <TouchableOpacity
            key={source}
            style={styles.attachOption}
            onPress={() => void handlePick(source)}
            accessibilityRole="button"
            testID={`chat-attach-${source}`}
          >
            <Ionicons name={icon} size={24} color={colors.textPrimary} />
            <Text style={[styles.attachOptionText, { color: colors.textPrimary }]}>{t(label)}</Text>
          </TouchableOpacity>
        ))}
      </SheetModal>

      <ParticipantsSheet
        visible={isParticipantsSheetVisible}
        conversationId={conversationId}
        onClose={() => setIsParticipantsSheetVisible(false)}
        onUserPress={(username) => navigation.navigate('UserProfile', { username })}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
    flex: 1,
  },
  headerName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  headerUsername: {
    fontSize: fontSize.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerActionButton: {
    padding: spacing.xs,
  },
  renameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
    gap: spacing.xs,
  },
  renameInput: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
    borderBottomWidth: 1,
    paddingVertical: spacing.xs,
  },
  renameAction: {
    paddingHorizontal: spacing.xs,
    minWidth: 48,
    alignItems: 'center',
  },
  renameActionText: {
    fontSize: fontSize.sm,
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
  senderName: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    marginBottom: 2,
  },
  caption: {
    marginTop: spacing.xs,
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
  attachButton: {
    width: 40,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  attachOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  attachOptionText: {
    fontSize: fontSize.md,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  dateSeparatorLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dateSeparatorText: {
    fontSize: msFont(11),
    fontWeight: '500',
    marginHorizontal: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    mutedMessageText: {
      fontStyle: 'italic',
      opacity: 0.75,
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
    dateSeparatorLine: {
      backgroundColor: colors.borderLight,
    },
    dateSeparatorText: {
      color: colors.textMuted,
    },
  });
