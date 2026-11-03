// ============ MESSAGING ============

export type ConversationType = 'direct' | 'team';

export interface ConversationParticipant {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  is_captain?: boolean;
  joined_at?: string;
}

/**
 * Known message types. The server may add more; render anything else defensively
 * (see `messageBodyText`), never as an empty bubble.
 */
export type MessageType = 'text' | 'activity' | 'attachment';

export interface LastMessage {
  id: number;
  content: string | null;
  type: MessageType;
  sender_id: number;
  created_at: string;
  /**
   * One-line summary for the conversation list: the text, else "📷 Zdjęcie" / "📎 plik.pdf"
   * (localized by the server). Absent on API versions before chat attachments.
   */
  preview?: string | null;
}

export interface ConversationTeam {
  id: number;
  name: string;
  slug: string;
  avatar: string | null;
  captain_user_id: number;
}

export interface Conversation {
  id: number;
  type: ConversationType;
  // Team chats only:
  name: string | null;
  team: ConversationTeam | null;
  is_captain: boolean | null;
  participants_count: number | null;
  // Direct chats only:
  participant: ConversationParticipant | null;
  // Common:
  last_message: LastMessage | null;
  unread_count: number;
  last_message_at: string | null;
  created_at: string;
}

export interface MessageActivityPreview {
  id: number;
  title: string;
  sport_type: { id: number; name: string; icon: string } | null;
  distance: number;
  duration: number;
  route_map_url: string | null;
  route_preview_url: string | null;
}

/**
 * A file sent in a chat (docs/features/messaging/chat-attachments.md in the API repo).
 * Every URL is a temporary signed link (valid 6–12 h, no Bearer needed) that is
 * refreshed on every fetch — never cache it beyond the message list it came with.
 */
export interface MessageAttachment {
  id: number;
  kind: 'image' | 'file';
  name: string;
  /** image/jpeg|png|webp, application/pdf, application/gpx+xml */
  mime_type: string;
  /** bytes */
  size: number;
  width: number | null;
  height: number | null;
  /** Original; for files the server sends it as a download. */
  url: string;
  /** Images: 320 px WebP (falls back to `url` until generated). */
  thumb_url: string | null;
  /** Images: 1280 px WebP. */
  large_url: string | null;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender: ConversationParticipant;
  /** With attachments: an optional caption. */
  content: string | null;
  type: MessageType;
  activity?: MessageActivityPreview;
  /** Only with `type: 'attachment'`; absent on API versions before chat attachments. */
  attachments?: MessageAttachment[];
  is_own: boolean;
  created_at: string;
}
