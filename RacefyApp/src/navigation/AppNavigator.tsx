import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BlurView } from 'expo-blur';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useLiveActivityContext } from '../hooks/useLiveActivity';
import { useMaintenance } from '../hooks/useMaintenance';
import { useAppVersion } from '../hooks/useAppVersion';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { triggerHaptic } from '../hooks/useHaptics';
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
function TabBarBackground({ colors, isDark }: { colors: any; isDark: boolean }) {
  return (
    <BlurView
      intensity={isDark ? 80 : 90}
      tint={isDark ? 'dark' : 'light'}
      style={StyleSheet.absoluteFill}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark ? 'rgba(11, 18, 32, 0.8)' : 'rgba(255, 255, 255, 0.95)',
          },
        ]}
      />
    </BlurView>
  );
}

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

// Animated Tab Icon wrapper for smooth transitions (Classic Nav)
function AnimatedTabIcon({
  iconName,
  focused,
  size,
  color,
  pulse,
  pulseColor,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  size: number;
  color: string;
  /** When true, a looping "radar" glow plays behind the icon to invite a tap. */
  pulse?: boolean;
  pulseColor?: string;
}) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1.1 : 1)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      // Pop in effect: grow bigger, then settle
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.3,
          useNativeDriver: true,
          tension: 180,
          friction: 5,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.1,
          useNativeDriver: true,
          tension: 120,
          friction: 8,
        }),
      ]).start();
    } else {
      // Shrink back to normal
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }).start();
    }
  }, [focused, scaleAnim]);

  useEffect(() => {
    if (!pulse) {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1900,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, pulseAnim]);

  const glowSize = size + 6;
  const glowScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.9] });
  const glowOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {pulse && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: pulseColor ?? color,
            transform: [{ scale: glowScale }],
            opacity: glowOpacity,
          }}
        />
      )}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Ionicons name={iconName} size={size} color={color} />
      </Animated.View>
    </View>
  );
}

/**
 * Central floating action button for the Record tab: an elevated green circle
 * with a play glyph and a soft glow ring, matching the app's bottom-nav design.
 * Tap behaves like a normal tab (navigation + auth-guard listener fire via the
 * passed `onPress`); a long press opens the start-actions sheet. When an activity
 * is in progress the button switches to an active (record/pause) state.
 */
function RecordTabButton({
  onPress,
  onLongPress,
  accessibilityState,
  accessibilityLabel,
  testID,
  primaryColor,
  activity,
  isTracking,
}: BottomTabBarButtonProps & {
  primaryColor: string;
  activity: boolean;
  isTracking: boolean;
}) {
  const background = activity ? (isTracking ? '#ef4444' : '#f97316') : primaryColor;
  const iconName: keyof typeof Ionicons.glyphMap = activity
    ? isTracking
      ? 'stop'
      : 'pause'
    : 'play';

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
        <View style={[fabStyles.glow, { backgroundColor: background + '22' }]} />
        <View style={[fabStyles.fab, { backgroundColor: background, shadowColor: background }]}>
          <Ionicons
            name={iconName}
            size={26}
            color="#fff"
            style={iconName === 'play' ? fabStyles.playOffset : undefined}
          />
        </View>
      </Pressable>
    </View>
  );
}

const fabStyles = StyleSheet.create({
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
  glow: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
});

function MainTabNavigator() {
  const { isAuthenticated } = useAuth();
  const { colors, isDark } = useTheme();
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
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;
            let iconColor = color;
            switch (route.name) {
              case 'Home':
                iconName = focused ? 'home' : 'home-outline';
                break;
              case 'Feed':
                iconName = focused ? 'list' : 'list-outline';
                break;
              case 'Record':
                iconName = activity ? 'radio-button-on' : 'add-circle';
                iconColor = activity ? (isTracking ? '#ef4444' : '#f97316') : color;
                break;
              case 'Events':
                iconName = focused ? 'location' : 'location-outline';
                break;
              case 'Profile':
                iconName = focused ? 'person' : 'person-outline';
                break;
              default:
                iconName = 'help-circle-outline';
            }
            return (
              <AnimatedTabIcon
                iconName={iconName}
                focused={focused}
                size={size}
                color={iconColor}
                pulse={route.name === 'Record' && !activity && !focused}
                pulseColor={colors.primary}
              />
            );
          },
          tabBarActiveTintColor: colors.textPrimary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarBackground: () => <TabBarBackground colors={colors} isDark={isDark} />,
          tabBarStyle: {
            backgroundColor: 'transparent',
            borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            borderTopWidth: 1,
            position: 'absolute' as const,
          },
        })}
      >
        <MainTab.Screen
          name="Home"
          component={DynamicHomeScreen}
          options={{ tabBarLabel: 'Home', tabBarAccessibilityLabel: 'Strona główna' }}
          listeners={hapticListener}
        />
        <MainTab.Screen
          name="Feed"
          component={FeedScreen}
          options={{ tabBarLabel: 'Feed', tabBarAccessibilityLabel: 'Aktywności znajomych' }}
          listeners={authGuardListener}
        />
        <MainTab.Screen
          name="Record"
          component={ActivityRecordingScreen}
          options={{
            tabBarLabel: 'Record',
            tabBarAccessibilityLabel: 'Nagraj aktywność',
            tabBarButton: (props) => (
              <RecordTabButton
                {...props}
                onLongPress={openStartSheet}
                primaryColor={colors.primary}
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
          options={{ tabBarLabel: 'Events', tabBarAccessibilityLabel: 'Wydarzenia' }}
          listeners={authGuardListener}
        />
        <MainTab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ tabBarLabel: 'You', tabBarAccessibilityLabel: 'Profil użytkownika' }}
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
