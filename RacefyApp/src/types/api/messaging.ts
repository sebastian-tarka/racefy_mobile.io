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

export interface LastMessage {
  id: number;
  content: string | null;
  type: 'text' | 'activity';
  sender_id: number;
  created_at: string;
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

export interface Message {
  id: number;
  conversation_id: number;
  sender: ConversationParticipant;
  content: string | null;
  type: 'text' | 'activity';
  activity?: MessageActivityPreview;
  is_own: boolean;
  created_at: string;
}
