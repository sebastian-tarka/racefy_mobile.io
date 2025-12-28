import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import type { Message } from '../types/api';

export function useMessages(conversationId: number) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageIdRef = useRef<number | null>(null);

  // Fetch messages (API returns newest first, we reverse for display)
  const fetchMessages = useCallback(async () => {
    try {
      setError(null);
      const response = await api.getMessages(conversationId);
      const reversedMessages = [...response.data].reverse();
      setMessages(reversedMessages);

      if (reversedMessages.length > 0) {
        lastMessageIdRef.current = reversedMessages[reversedMessages.length - 1].id;
      }

      // Mark conversation as read
      api.markConversationAsRead(conversationId).catch(() => {
        // Ignore errors for marking as read
      });
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

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
        console.error('Failed to send message:', err);
        setError('Failed to send message');
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [conversationId]
  );

  // Poll for new messages
  const pollForNewMessages = useCallback(async () => {
    try {
      const response = await api.getMessages(conversationId);
      const reversedMessages = [...response.data].reverse();

      if (reversedMessages.length > 0) {
        const latestMessageId = reversedMessages[reversedMessages.length - 1].id;

        // Only update if there are new messages
        if (latestMessageId !== lastMessageIdRef.current) {
          setMessages(reversedMessages);
          lastMessageIdRef.current = latestMessageId;

          // Mark as read if there are new messages from others
          const hasNewFromOthers = reversedMessages.some(
            (m) => !m.is_own && m.id > (lastMessageIdRef.current || 0)
          );
          if (hasNewFromOthers) {
            api.markConversationAsRead(conversationId).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, [conversationId]);

  // Initial fetch and polling setup
  useEffect(() => {
    fetchMessages();

    // Poll for new messages every 5 seconds
    pollIntervalRef.current = setInterval(pollForNewMessages, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [conversationId, fetchMessages, pollForNewMessages]);

  return {
    messages,
    isLoading,
    isSending,
    error,
    sendMessage,
    refresh: fetchMessages,
  };
}
