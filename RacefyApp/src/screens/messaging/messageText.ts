import type { TFunction } from 'i18next';
import type { LastMessage, Message } from '../../types/api';

/**
 * One line for the conversation list. Prefers the server's `preview` (text, else a
 * localized "📷 Zdjęcie" / "📎 plik.pdf"); older API versions without it fall back to
 * the content or a generic label per type.
 */
export function lastMessagePreview(lastMessage: LastMessage | null, t: TFunction): string {
  if (!lastMessage) return '';
  if (typeof lastMessage.preview === 'string' && lastMessage.preview.trim()) {
    return lastMessage.preview;
  }
  const content = lastMessage.content?.trim();
  if (content) return content;
  switch (lastMessage.type) {
    case 'activity':
      return t('messaging.sharedActivity');
    case 'attachment':
      return t('messaging.attachment');
    default:
      return '';
  }
}

interface MessageBodyText {
  text: string;
  /** True for placeholders (unsupported type, activity without text) — render muted. */
  muted: boolean;
}

/**
 * The text line of a chat bubble, or null when nothing should be rendered under the
 * attachments. A message of a type this app does not know, with no content and no
 * attachments, gets a muted placeholder instead of an empty bubble.
 */
export function messageBodyText(message: Message, t: TFunction): MessageBodyText | null {
  const content = message.content?.trim();
  if (content) return { text: message.content as string, muted: false };

  const hasAttachments = (message.attachments?.length ?? 0) > 0;
  if (hasAttachments) return null;

  switch (message.type) {
    case 'text':
      return null;
    case 'activity':
      return { text: t('messaging.sharedActivity'), muted: true };
    default:
      // 'attachment' without any attachment payload, or a type newer than this app.
      return { text: t('messaging.unsupportedMessage'), muted: true };
  }
}
