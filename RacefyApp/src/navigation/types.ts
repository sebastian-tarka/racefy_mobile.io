import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ConversationParticipant } from '../types/api';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Feed: undefined;
  Record: undefined;
  Events: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  PostDetail: { postId: number };
  EventDetail: { eventId: number };
  ActivityDetail: { activityId: number };
  UserProfile: { username: string };
  Settings: undefined;
  EditProfile: undefined;
  ConversationsList: undefined;
  Chat: { conversationId: number; participant: ConversationParticipant };
  EventForm: { eventId?: number };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
