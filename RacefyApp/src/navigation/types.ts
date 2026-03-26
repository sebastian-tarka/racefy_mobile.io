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
  Events: { initialFilter?: 'all' | 'upcoming' | 'ongoing' | 'completed' } | undefined;
  Profile: { initialTab?: 'posts' | 'drafts' | 'stats' | 'activities' | 'events' } | undefined;
};

export type RootStackParamList = {
  Landing: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  ConsentModal: undefined;
  LegalDocuments: { documentType?: LegalDocumentType };
  PostDetail: { postId: number; focusComments?: boolean };
  EventDetail: { eventId: number };
  ActivityDetail: { activityId: number };
  ActivityShare: { activityId: number; hasGpsTrack?: boolean; photos?: import('../types/api').Photo[] };
  UserProfile: { username: string };
  Settings: undefined;
  BlockedUsers: undefined;
  PrivacyZones: undefined;
  EditProfile: undefined;
  ImpersonateUser: undefined;
  Notifications: undefined;
  ConversationsList: undefined;
  Chat: { conversationId: number; participant: ConversationParticipant };
  Messages: { conversationId?: number };
  EventForm: { eventId?: number };
  EventCommentarySettings: { eventId: number };
  PostForm: { postId?: number };
  ActivityForm: { activityId?: number };
  GpxImport: undefined;
  Paywall: { feature?: string } | undefined;
  Leaderboard: undefined;
  PointHistory: undefined;
  Insights: undefined;
  // Training Plans
  TrainingCalibration: undefined;
  ProgramLoading: { programId: number };
  TrainingWeeksList: undefined;
  TrainingWeekDetail: { weekId: number };
  TipDetail: { tipId: number };
  WeekFeedback: { weekId: number };
  // Training Reminders
  TrainingReminders: undefined;
  // Teams
  TeamsList: undefined;
  TeamDetail: { slug: string };
  TeamForm: { teamId?: number };
  InviteMember: { teamId: number };
  // Feedback
  FeedbackList: undefined;
  FeedbackForm: undefined;
  FeedbackDetail: { feedbackId: number };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
