import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { emitRefresh } from '../services/refreshEvents';
import type { Message } from '../types/api';
import { useForegroundInterval } from './useForegroundInterval';

/**
 * Messages of one conversation with 5 s foreground polling.
 *
 * Read marking: the conversation is marked read on open and whenever a poll brings a
 * new message from someone else — once per such batch, and only while the app is in
 * the foreground and the chat screen is focused (a chat left under a profile screen,
 * or an app in the background, must not clear the unread count). Coming back to the
 * foreground or to the screen marks read at once if something new arrived meanwhile.
 */
export function useMessages(conversationId: number) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastMessageIdRef = useRef<number | null>(null);
  /** Id of the newest message at the time of the last successful read marking. */
  const lastReadMarkedIdRef = useRef<number | null>(null);
  const isFocused = useIsFocused();
  const isFocusedRef = useRef(isFocused);
  isFocusedRef.current = isFocused;

  /**
   * Marks the conversation read when its newest message is from someone else and has
   * not been marked yet. Returns true when a request was sent.
   */
  const markReadIfNeeded = useCallback(
    (latest: Message[] | undefined, { force = false } = {}): boolean => {
      if (!latest || latest.length === 0) return false;
      const newest = latest[latest.length - 1];
      if (!force) {
        if (newest.is_own) return false;
        if (newest.id === lastReadMarkedIdRef.current) return false;
        if (!isFocusedRef.current || AppState.currentState !== 'active') return false;
      }
      lastReadMarkedIdRef.current = newest.id;
      api
        .markConversationAsRead(conversationId)
        .then(() => {
          // Emit after the server knows, so the list/badge refetch sees unread = 0.
          emitRefresh('messages');
        })
        .catch(() => {
          // Allow a retry on the next poll that brings something new.
          if (lastReadMarkedIdRef.current === newest.id) lastReadMarkedIdRef.current = null;
        });
      return true;
    },
    [conversationId],
  );

  // Fetch messages. Page 1 is the NEWEST 50 messages, ordered oldest → newest for chat
  // display; page 2 would be the 50 before them (prepend it if "load older" is ever added).
  const fetchMessages = useCallback(async () => {
    try {
      setError(null);
      const response = await api.getMessages(conversationId);
      setMessages(response.data);

      if (response.data.length > 0) {
        lastMessageIdRef.current = response.data[response.data.length - 1].id;
      }

      // Opening the chat always marks it read (even an own last message may follow
      // unread ones from others).
      markReadIfNeeded(response.data, { force: true });
    } catch (err) {
      logger.error('api', 'Failed to fetch messages', { error: err });
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, markReadIfNeeded]);

  // Send message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return false;

      setIsSending(true);
      try {
        const response = await api.sendMessage(conversationId, content.trim());
        setMessages((prev) => [...prev, response.data]);
        lastMessageIdRef.current = response.data.id;
        return true;
      } catch (err) {
        logger.error('api', 'Failed to send message', { error: err });
        setError('Failed to send message');
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [conversationId],
  );

  // Poll for new messages
  const pollForNewMessages = useCallback(async () => {
    try {
      const response = await api.getMessages(conversationId);
      const fetchedMessages = response.data;

      if (fetchedMessages.length > 0) {
        const latestMessageId = fetchedMessages[fetchedMessages.length - 1].id;

        // Only update if there are new messages
        if (latestMessageId !== lastMessageIdRef.current) {
          setMessages(fetchedMessages);
          lastMessageIdRef.current = latestMessageId;
        }
        // Checked on every poll, not only on change: a batch that arrived while the
        // screen was unfocused or the app in the background is marked on the first
        // poll after return (useForegroundInterval polls at once on return).
        markReadIfNeeded(fetchedMessages);
      }
    } catch (err) {
      logger.warn('api', 'Message polling error', { error: err });
    }
  }, [conversationId, markReadIfNeeded]);

  useEffect(() => {
    fetchMessages();
  }, [conversationId, fetchMessages]);

  // Back on the screen (e.g. from a profile opened over the chat): messages that
  // arrived meanwhile are on screen now, so mark them read without waiting for a poll.
  useEffect(() => {
    if (isFocused) markReadIfNeeded(messages);
  }, [isFocused, messages, markReadIfNeeded]);

  // Poll for new messages every 5 s — only while the app is in the foreground (a chat
  // left open used to keep polling in the background); catches up at once on return.
  useForegroundInterval(pollForNewMessages, 5000);

  return {
    messages,
    isLoading,
    isSending,
    error,
    sendMessage,
    refresh: fetchMessages,
  };
}
