import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ConversationParticipant, Event } from '../types/api';
import type { LegalDocumentType } from '../types/legal';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  LegalDocuments: { documentType?: LegalDocumentType };
};

export type MainTabParamList = {
  Home: undefined;
  Feed: undefined;
  Record: { preselectedEvent?: Event } | undefined;
  Events: undefined;
  Profile: { initialTab?: 'posts' | 'drafts' | 'stats' | 'activities' | 'events' } | undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  ConsentModal: undefined;
  LegalDocuments: { documentType?: LegalDocumentType };
  PostDetail: { postId: number; focusComments?: boolean };
  EventDetail: { eventId: number };
  ActivityDetail: { activityId: number };
  UserProfile: { username: string };
  Settings: undefined;
  EditProfile: undefined;
  ConversationsList: undefined;
  Chat: { conversationId: number; participant: ConversationParticipant };
  EventForm: { eventId?: number };
  PostForm: { postId?: number };
  ActivityForm: { activityId?: number };
  GpxImport: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
