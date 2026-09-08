import React, { useCallback, useState } from 'react';
import {
  createNavigationContainerRef,
  DarkTheme,
  DefaultTheme,
  LinkingOptions,
  NavigationContainer,
  Theme,
  useNavigation,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { BottomTabBarButtonProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useLiveActivityContext } from '../hooks/useLiveActivity';
import { useMaintenance } from '../hooks/useMaintenance';
import { useAppVersion } from '../hooks/useAppVersion';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { triggerHaptic } from '../hooks/useHaptics';
import { msFont } from '../theme';
import {
  BatteryOptimizationModal,
  BottomSheet,
  type BottomSheetOption,
  ErrorBoundary,
  ImpersonationBanner,
  Loading,
  NetworkStatusBar,
  SoftUpdateBanner,
  UpgradePromptModal,
} from '../components';

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { DynamicHomeScreen } from '../screens/main/DynamicHomeScreen';
import { ActivityRecordingScreen } from '../screens/main/ActivityRecordingScreen';
import { EventsScreen } from '../screens/main/EventsScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { EventDetailScreen } from '../screens/details/EventDetailScreen';
import { UserProfileScreen } from '../screens/details/UserProfileScreen';
import { ActivityDetailScreen } from '../screens/details/ActivityDetailScreen';
import { ActivityShareScreen } from '../screens/details/ActivityShareScreen';
import { PostDetailScreen } from '../screens/details/PostDetailScreen';
import { ChatScreen, ConversationsListScreen } from '../screens/messaging';
import {
  EventCommentaryScreen,
  EventCommentarySettingsScreen,
  EventFormScreen,
  EventLiveScreen,
  EventResultsScreen,
} from '../screens/events';
import { PostFormScreen } from '../screens/posts';
import { ActivityFormScreen, GpxImportScreen } from '../screens/activities';
import { PaywallScreen } from '../screens/PaywallScreen';
import { EditProfileScreen } from '../screens/profile';
import {
  BlockedUsersScreen,
  PrivacyZonesScreen,
  SettingsScreen,
  TrainingRemindersScreen,
} from '../screens/settings';
import { ConsentModalScreen, LegalDocumentsScreen } from '../screens/legal';
import { ImpersonateUserScreen } from '../screens/admin/ImpersonateUserScreen';
import { NotificationsScreen } from '../screens/notifications';
import { LandingScreen } from '../screens/landing';
import { LeaderboardScreen, PointHistoryScreen } from '../screens/leaderboard';
import { LiveBroadcastsScreen, LiveSpectatorScreen } from '../screens/live';
import {
  CalibrationFormScreen,
  TipDetailScreen,
  WeekDetailScreen,
  WeekFeedbackScreen,
  WeeksListScreen,
} from '../screens/training';
import { MaintenanceScreen } from '../screens/maintenance/MaintenanceScreen';
import { ForceUpdateScreen } from '../screens/update/ForceUpdateScreen';
import { TeamsListScreen } from '../screens/teams/TeamsListScreen';
import { TeamDetailScreen } from '../screens/teams/TeamDetailScreen';
import { TeamFormScreen } from '../screens/teams/TeamFormScreen';
import { FeedbackListScreen } from '../screens/feedback/FeedbackListScreen';
import { FeedbackFormScreen } from '../screens/feedback/FeedbackFormScreen';
import { FeedbackDetailScreen } from '../screens/feedback/FeedbackDetailScreen';
import { InviteMemberScreen } from '../screens/teams/InviteMemberScreen';
import { TeamsLeaderboardScreen } from '../screens/teams/TeamsLeaderboardScreen';
import { RouteDetailScreen, RouteLibraryScreen, RoutePlannerScreen } from '../screens/routes';

// Types
import type { AuthStackParamList, MainTabParamList, RootStackParamList } from './types';
import { FeedScreen } from '../screens/main/FeedScreen';
import { InsightsScreen } from '../screens/main/InsightsScreen';
import { UnsyncedActivitiesScreen } from '../screens/main/UnsyncedActivitiesScreen';
import { AiActivityReportsScreen } from '../screens/insights/AiActivityReportsScreen';
import { AiActivityReportDetailScreen } from '../screens/insights/AiActivityReportDetailScreen';
import { GoalsScreen } from '../screens/goals/GoalsScreen';
import { GoalDetailScreen } from '../screens/goals/GoalDetailScreen';
import { GoalFormScreen } from '../screens/goals/GoalFormScreen';
import {
  ExerciseFormScreen,
  ExerciseLibraryScreen,
  WorkoutDetailScreen,
  WorkoutExerciseFormScreen,
  WorkoutFormScreen,
  WorkoutPlanDetailScreen,
  WorkoutPlanFormScreen,
  WorkoutPlanImportScreen,
  WorkoutPlansScreen,
  WorkoutScheduleScreen,
  WorkoutSessionScreen,
} from '../screens/workouts';

// Create navigation ref for use outside of React components (e.g., push notification handlers)
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Deep linking: /reset-password?token=XXX&email=YYY opens the reset flow
// inside the Auth modal stack on racefy://, https://racefy.io and https://app.dev.racefy.io.
// /messages/{id} opens the Chat screen directly (works for direct & team chats —
// ChatScreen fetches the conversation when it's not passed as a param).
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['racefy://', 'https://racefy.io', 'https://app.dev.racefy.io'],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
          ResetPassword: 'reset-password',
        },
      },
      Chat: 'messages/:conversationId',
      ConversationsList: 'messages',
    },
  },
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

// Custom Tab Bar Background with glass blur effect
function AuthNavigator() {
  const { colors } = useTheme();
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <AuthStack.Screen name="LegalDocuments" component={LegalDocumentsScreen} />
    </AuthStack.Navigator>
  );
}

// Tab bar layout helpers (kept in separate modules to avoid circular deps)
export { TAB_BAR_CONTENT_GAP } from './constants';
export { useTabBarPadding } from './useTabBarPadding';

/**
 * The raised centre button (design "Racefy v2" → TabBar). A circle lifted out of
 * the bar and ringed in the bar's own colour, so it reads as sitting on top of
 * the navigation rather than inside it.
 *
 * Emerald means "nothing running, start something". Amber means an activity is
 * open, and the glyph says what the tap does next: a square stops the one that
 * is recording, a play resumes the one that is paused.
 *
 * Tap behaves like a normal tab (navigation + auth-guard listener fire via the
 * passed `onPress`); a long press opens the start-actions sheet.
 */
function RecordTabButton({
  onPress,
  onLongPress,
  accessibilityState,
  accessibilityLabel,
  testID,
  primaryColor,
  ringColor,
  activity,
  isTracking,
}: BottomTabBarButtonProps & {
  primaryColor: string;
  /** The bar's own colour — the ring is what lifts the button off it. */
  ringColor: string;
  activity: boolean;
  isTracking: boolean;
}) {
  const background = activity ? ACTIVITY_AMBER : primaryColor;

  return (
    <View style={fabStyles.slot} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityState={accessibilityState}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={350}
        android_ripple={{ color: 'rgba(16,185,129,0.25)', borderless: true, radius: 34 }}
        style={fabStyles.pressable}
      >
        <View
          style={[
            fabStyles.fab,
            { backgroundColor: background, borderColor: ringColor, shadowColor: background },
          ]}
        >
          {activity && isTracking ? (
            <View style={fabStyles.stopGlyph} />
          ) : (
            <Ionicons name="play" size={24} color="#fff" style={fabStyles.playOffset} />
          )}
        </View>
      </Pressable>
    </View>
  );
}

/** An activity is open — the design's one "something is running" colour. */
const ACTIVITY_AMBER = '#F59E0B';

const fabStyles = StyleSheet.create({
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  playOffset: {
    marginLeft: 3, // optical centering of the triangle
  },
  stopGlyph: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
});

/** One outline glyph per tab — the design's icon set, mapped to Ionicons. */
const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home-outline',
  Feed: 'reorder-three-outline',
  Events: 'location-outline',
  Profile: 'person-outline',
};

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: msFont(10),
    fontWeight: '600',
  },
});

function MainTabNavigator() {
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isTracking, activity } = useLiveActivityContext();
  const [startSheetVisible, setStartSheetVisible] = useState(false);

  // Long-pressing the Record tab opens the start-actions sheet, mirroring the
  // Home primary CTA. Tap still navigates to the Record screen as usual.
  const openStartSheet = useCallback(() => {
    triggerHaptic();
    if (!isAuthenticated) {
      navigation.navigate('Auth', { screen: 'Login' });
      return;
    }
    setStartSheetVisible(true);
  }, [isAuthenticated, navigation]);

  const hapticListener = {
    tabPress: () => {
      triggerHaptic();
    },
  };

  const authGuardListener = {
    tabPress: (e: { preventDefault: () => void }) => {
      triggerHaptic();
      if (!isAuthenticated) {
        e.preventDefault();
        navigation.navigate('Auth', { screen: 'Login' });
      }
    },
  };

  return (
    <>
      <MainTab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          // One outline set for every tab, in both states. Swapping to a filled
          // glyph on focus changed the shape under the thumb on every tap; the
          // ink/mute colour and the label weight carry the state instead.
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={TAB_ICONS[route.name] ?? 'help-circle-outline'}
              size={size}
              color={color}
            />
          ),
          tabBarActiveTintColor: colors.textPrimary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: styles.tabLabel,
          tabBarStyle: {
            backgroundColor: colors.cardBackground,
            borderTopColor: colors.border,
            borderTopWidth: StyleSheet.hairlineWidth,
            position: 'absolute' as const,
          },
        })}
      >
        <MainTab.Screen
          name="Home"
          component={DynamicHomeScreen}
          options={{ tabBarLabel: t('tabs.home'), tabBarAccessibilityLabel: t('tabs.a11y.home') }}
          listeners={hapticListener}
        />
        <MainTab.Screen
          name="Feed"
          component={FeedScreen}
          options={{ tabBarLabel: t('tabs.feed'), tabBarAccessibilityLabel: t('tabs.a11y.feed') }}
          listeners={authGuardListener}
        />
        <MainTab.Screen
          name="Record"
          component={ActivityRecordingScreen}
          options={{
            tabBarLabel: t('tabs.record'),
            tabBarAccessibilityLabel: t('tabs.a11y.record'),
            tabBarButton: (props) => (
              <RecordTabButton
                {...props}
                onLongPress={openStartSheet}
                primaryColor={colors.primary}
                ringColor={colors.cardBackground}
                activity={!!activity}
                isTracking={isTracking}
              />
            ),
          }}
          listeners={authGuardListener}
        />
        <MainTab.Screen
          name="Events"
          component={EventsScreen}
          options={{
            tabBarLabel: t('tabs.events'),
            tabBarAccessibilityLabel: t('tabs.a11y.events'),
          }}
          listeners={authGuardListener}
        />
        <MainTab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarLabel: t('tabs.profile'),
            tabBarAccessibilityLabel: t('tabs.a11y.profile'),
          }}
          listeners={authGuardListener}
        />
      </MainTab.Navigator>

      <BottomSheet
        visible={startSheetVisible}
        onClose={() => setStartSheetVisible(false)}
        title={t('home.startActions.title')}
        options={
          [
            {
              id: 'start',
              icon: 'play-circle',
              title: t('home.startActions.start'),
              description: t('home.startActions.startDesc'),
              onPress: () => navigation.navigate('Main', { screen: 'Record' }),
            },
            {
              id: 'trainings',
              icon: 'list-circle-outline',
              title: t('home.startActions.trainings'),
              description: t('home.startActions.trainingsDesc'),
              onPress: () => navigation.navigate('TrainingWeeksList'),
            },
            {
              id: 'import',
              icon: 'cloud-upload-outline',
              title: t('home.startActions.import'),
              description: t('home.startActions.importDesc'),
              onPress: () => navigation.navigate('GpxImport'),
            },
          ] as BottomSheetOption[]
        }
      />
    </>
  );
}

export function AppNavigator() {
  const { isLoading, isAuthenticated, requiresConsent } = useAuth();
  const { colors, isDark } = useTheme();
  const { isMaintenanceMode } = useMaintenance();
  const { forceUpdate } = useAppVersion();

  // Initialize push notifications with navigation ref for deep linking
  usePushNotifications({ navigationRef });

  if (isLoading) {
    return <Loading fullScreen message="Loading..." />;
  }

  // Show maintenance screen when server is in maintenance mode.
  // Maintenance takes priority over force-update — if backend is down,
  // sending the user to the store won't help.
  if (isMaintenanceMode) {
    return <MaintenanceScreen />;
  }

  // Block running on outdated native binaries.
  if (forceUpdate) {
    return <ForceUpdateScreen />;
  }

  // Create custom theme for React Navigation
  const navigationTheme: Theme = {
    dark: isDark,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.cardBackground,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.primary,
    },
    fonts: isDark ? DarkTheme.fonts : DefaultTheme.fonts,
  };

  // If user is authenticated but hasn't accepted required consents, show ConsentModal
  const showConsentModal = isAuthenticated && requiresConsent;

  // Key forces navigation reset when auth state changes
  const authStateKey = showConsentModal ? 'consent' : isAuthenticated ? 'auth' : 'guest';

  return (
    <ErrorBoundary>
      <NavigationContainer
        ref={navigationRef}
        theme={navigationTheme}
        key={authStateKey}
        linking={linking}
      >
        <RootStack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          {showConsentModal ? (
            // Consent required - show blocking consent modal
            <>
              <RootStack.Screen
                name="ConsentModal"
                component={ConsentModalScreen}
                options={{
                  gestureEnabled: false,
                  animation: 'fade',
                }}
              />
              <RootStack.Screen name="LegalDocuments" component={LegalDocumentsScreen} />
            </>
          ) : !isAuthenticated ? (
            // Not authenticated - show landing screen first
            <>
              <RootStack.Screen
                name="Landing"
                component={LandingScreen}
                options={{
                  animation: 'fade',
                }}
              />
              <RootStack.Screen
                name="Auth"
                component={AuthNavigator}
                options={{
                  presentation: 'modal',
                }}
              />
              <RootStack.Screen name="LegalDocuments" component={LegalDocumentsScreen} />
            </>
          ) : (
            // Authenticated - normal app flow
            <>
              <RootStack.Screen name="Main" component={MainTabNavigator} />
              <RootStack.Screen
                name="Auth"
                component={AuthNavigator}
                options={{
                  presentation: 'modal',
                }}
              />
              <RootStack.Screen name="EventDetail" component={EventDetailScreen} />
              <RootStack.Screen name="UserProfile" component={UserProfileScreen} />
              <RootStack.Screen name="ActivityDetail" component={ActivityDetailScreen} />
              <RootStack.Screen name="ActivityShare" component={ActivityShareScreen} />
              <RootStack.Screen name="PostDetail" component={PostDetailScreen} />
              <RootStack.Screen name="ConversationsList" component={ConversationsListScreen} />
              <RootStack.Screen name="Chat" component={ChatScreen} />
              <RootStack.Screen name="EventForm" component={EventFormScreen} />
              <RootStack.Screen
                name="EventCommentarySettings"
                component={EventCommentarySettingsScreen}
              />
              <RootStack.Screen name="EventCommentary" component={EventCommentaryScreen} />
              <RootStack.Screen name="EventLive" component={EventLiveScreen} />
              <RootStack.Screen name="EventResults" component={EventResultsScreen} />
              <RootStack.Screen name="PostForm" component={PostFormScreen} />
              <RootStack.Screen name="ActivityForm" component={ActivityFormScreen} />
              <RootStack.Screen name="GpxImport" component={GpxImportScreen} />
              <RootStack.Screen name="UnsyncedActivities" component={UnsyncedActivitiesScreen} />
              <RootStack.Screen name="Paywall" component={PaywallScreen} />
              <RootStack.Screen name="EditProfile" component={EditProfileScreen} />
              <RootStack.Screen name="Settings" component={SettingsScreen} />
              <RootStack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
              <RootStack.Screen name="PrivacyZones" component={PrivacyZonesScreen} />
              <RootStack.Screen name="TrainingReminders" component={TrainingRemindersScreen} />
              <RootStack.Screen
                name="ImpersonateUser"
                component={ImpersonateUserScreen}
                options={{
                  presentation: 'modal',
                }}
              />
              <RootStack.Screen name="Notifications" component={NotificationsScreen} />
              <RootStack.Screen name="LegalDocuments" component={LegalDocumentsScreen} />
              <RootStack.Screen name="Leaderboard" component={LeaderboardScreen} />
              <RootStack.Screen name="PointHistory" component={PointHistoryScreen} />
              <RootStack.Screen name="Insights" component={InsightsScreen} />
              <RootStack.Screen name="AiActivityReports" component={AiActivityReportsScreen} />
              <RootStack.Screen
                name="AiActivityReportDetail"
                component={AiActivityReportDetailScreen}
              />
              <RootStack.Screen name="Goals" component={GoalsScreen} />
              <RootStack.Screen name="GoalDetail" component={GoalDetailScreen} />
              <RootStack.Screen name="GoalForm" component={GoalFormScreen} />
              <RootStack.Screen name="WorkoutPlans" component={WorkoutPlansScreen} />
              <RootStack.Screen name="WorkoutPlanDetail" component={WorkoutPlanDetailScreen} />
              <RootStack.Screen name="WorkoutPlanForm" component={WorkoutPlanFormScreen} />
              <RootStack.Screen name="WorkoutPlanImport" component={WorkoutPlanImportScreen} />
              <RootStack.Screen name="WorkoutForm" component={WorkoutFormScreen} />
              <RootStack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
              <RootStack.Screen name="WorkoutExerciseForm" component={WorkoutExerciseFormScreen} />
              <RootStack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} />
              <RootStack.Screen name="ExerciseForm" component={ExerciseFormScreen} />
              <RootStack.Screen name="WorkoutSchedule" component={WorkoutScheduleScreen} />
              <RootStack.Screen
                name="WorkoutSession"
                component={WorkoutSessionScreen}
                options={{ gestureEnabled: false }}
              />
              <RootStack.Screen name="LiveBroadcasts" component={LiveBroadcastsScreen} />
              <RootStack.Screen name="LiveSpectator" component={LiveSpectatorScreen} />
              <RootStack.Screen name="TrainingCalibration" component={CalibrationFormScreen} />
              <RootStack.Screen name="TrainingWeeksList" component={WeeksListScreen} />
              <RootStack.Screen name="TrainingWeekDetail" component={WeekDetailScreen} />
              <RootStack.Screen name="TipDetail" component={TipDetailScreen} />
              <RootStack.Screen name="WeekFeedback" component={WeekFeedbackScreen} />
              {/* Teams */}
              <RootStack.Screen name="TeamsList" component={TeamsListScreen} />
              <RootStack.Screen name="TeamDetail" component={TeamDetailScreen} />
              <RootStack.Screen name="TeamForm" component={TeamFormScreen} />
              <RootStack.Screen name="InviteMember" component={InviteMemberScreen} />
              <RootStack.Screen name="TeamsLeaderboard" component={TeamsLeaderboardScreen} />
              {/* Feedback */}
              <RootStack.Screen name="FeedbackList" component={FeedbackListScreen} />
              <RootStack.Screen name="FeedbackForm" component={FeedbackFormScreen} />
              <RootStack.Screen name="FeedbackDetail" component={FeedbackDetailScreen} />
              {/* Routes */}
              <RootStack.Screen name="RouteLibrary" component={RouteLibraryScreen} />
              <RootStack.Screen name="RouteDetail" component={RouteDetailScreen} />
              <RootStack.Screen name="RoutePlanner" component={RoutePlannerScreen} />
            </>
          )}
        </RootStack.Navigator>
        <ImpersonationBanner />
        <NetworkStatusBar />
        <BatteryOptimizationModal />
        <UpgradePromptModal />
        <SoftUpdateBanner />
      </NavigationContainer>
    </ErrorBoundary>
  );
}
