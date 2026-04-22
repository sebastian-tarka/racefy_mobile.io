import React, {useEffect, useRef} from 'react';
import {
    createNavigationContainerRef,
    DarkTheme,
    DefaultTheme,
    LinkingOptions,
    NavigationContainer,
    Theme,
    useNavigation
} from '@react-navigation/native';
import {createNativeStackNavigator, NativeStackNavigationProp} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Ionicons} from '@expo/vector-icons';
import {Animated, StyleSheet, View} from 'react-native';
import {BlurView} from 'expo-blur';
import {useAuth} from '../hooks/useAuth';
import {useTheme} from '../hooks/useTheme';
import {useLiveActivityContext} from '../hooks/useLiveActivity';
import {useMaintenance} from '../hooks/useMaintenance';
import {useAppVersion} from '../hooks/useAppVersion';
import {usePushNotifications} from '../hooks/usePushNotifications';
import {triggerHaptic} from '../hooks/useHaptics';
import {
    BatteryOptimizationModal,
    ErrorBoundary,
    ImpersonationBanner,
    Loading,
    NetworkStatusBar,
    SoftUpdateBanner,
    UpgradePromptModal
} from '../components';

// Screens
import {LoginScreen} from '../screens/auth/LoginScreen';
import {RegisterScreen} from '../screens/auth/RegisterScreen';
import {ForgotPasswordScreen} from '../screens/auth/ForgotPasswordScreen';
import {ResetPasswordScreen} from '../screens/auth/ResetPasswordScreen';
import {DynamicHomeScreen} from '../screens/main/DynamicHomeScreen';
import {ActivityRecordingScreen} from '../screens/main/ActivityRecordingScreen';
import {EventsScreen} from '../screens/main/EventsScreen';
import {ProfileScreenWrapper} from '../screens/main/ProfileScreenWrapper';
import {EventDetailScreen} from '../screens/details/EventDetailScreen';
import {UserProfileScreen} from '../screens/details/UserProfileScreen';
import {ActivityDetailScreen} from '../screens/details/ActivityDetailScreen';
import {ActivityShareScreen} from '../screens/details/ActivityShareScreen';
import {PostDetailScreen} from '../screens/details/PostDetailScreen';
import {ChatScreen, ConversationsListScreen} from '../screens/messaging';
import {EventCommentarySettingsScreen, EventFormScreen} from '../screens/events';
import {PostFormScreen} from '../screens/posts';
import {ActivityFormScreen, GpxImportScreen} from '../screens/activities';
import {PaywallScreen} from '../screens/PaywallScreen';
import {EditProfileScreen} from '../screens/profile';
import {BlockedUsersScreen, PrivacyZonesScreen, SettingsScreen, TrainingRemindersScreen} from '../screens/settings';
import {ConsentModalScreen, LegalDocumentsScreen} from '../screens/legal';
import {ImpersonateUserScreen} from '../screens/admin/ImpersonateUserScreen';
import {NotificationsScreen} from '../screens/notifications';
import {LandingScreen} from '../screens/landing';
import {LeaderboardScreen, PointHistoryScreen} from '../screens/leaderboard';
import {
    CalibrationFormScreen,
    ProgramLoadingScreen,
    TipDetailScreen,
    WeekDetailScreen,
    WeekFeedbackScreen,
    WeeksListScreen,
} from '../screens/training';
import {MaintenanceScreen} from '../screens/maintenance/MaintenanceScreen';
import {ForceUpdateScreen} from '../screens/update/ForceUpdateScreen';
import {TeamsListScreen} from '../screens/teams/TeamsListScreen';
import {TeamDetailScreen} from '../screens/teams/TeamDetailScreen';
import {TeamFormScreen} from '../screens/teams/TeamFormScreen';
import {FeedbackListScreen} from '../screens/feedback/FeedbackListScreen';
import {FeedbackFormScreen} from '../screens/feedback/FeedbackFormScreen';
import {FeedbackDetailScreen} from '../screens/feedback/FeedbackDetailScreen';
import {InviteMemberScreen} from '../screens/teams/InviteMemberScreen';
import {TeamsLeaderboardScreen} from '../screens/teams/TeamsLeaderboardScreen';
import {RouteDetailScreen, RouteLibraryScreen, RoutePlannerScreen} from '../screens/routes';

// Types
import type {AuthStackParamList, MainTabParamList, RootStackParamList,} from './types';
import {FeedScreen} from '../screens/main/FeedScreen';
import {InsightsScreen} from '../screens/main/InsightsScreen';

// Create navigation ref for use outside of React components (e.g., push notification handlers)
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Deep linking: /reset-password?token=XXX&email=YYY opens the reset flow
// inside the Auth modal stack on racefy://, https://racefy.io and https://app.dev.racefy.io.
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
            backgroundColor: isDark
              ? 'rgba(11, 18, 32, 0.8)'
              : 'rgba(255, 255, 255, 0.95)',
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

// Tab bar constants for layout calculations (imported from constants.ts to avoid circular deps)
export { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_MARGIN } from './constants';

// Animated Tab Icon wrapper for smooth transitions (Classic Nav)
function AnimatedTabIcon({ iconName, focused, size, color }: {
  iconName: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  size: number;
  color: string;
}) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1.1 : 1)).current;

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

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Ionicons name={iconName} size={size} color={color} />
    </Animated.View>
  );
}

function MainTabNavigator() {
  const { isAuthenticated } = useAuth();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isTracking, activity } = useLiveActivityContext();

  const hapticListener = {
    tabPress: () => { triggerHaptic(); },
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
              iconColor = activity
                ? (isTracking ? '#ef4444' : '#f97316')
                : color;
              break;
            case 'Events':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-circle-outline';
          }
          return <AnimatedTabIcon iconName={iconName} focused={focused} size={size} color={iconColor} />;
        },
        tabBarActiveTintColor: colors.primary,
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
        options={{ tabBarLabel: 'Record', tabBarAccessibilityLabel: 'Nagraj aktywność' }}
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
        component={ProfileScreenWrapper}
        options={{ tabBarLabel: 'Profile', tabBarAccessibilityLabel: 'Profil użytkownika' }}
        listeners={authGuardListener}
      />
    </MainTab.Navigator>
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
        <NavigationContainer ref={navigationRef} theme={navigationTheme} key={authStateKey} linking={linking}>
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
            <RootStack.Screen
              name="LegalDocuments"
              component={LegalDocumentsScreen}
            />
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
            <RootStack.Screen
              name="LegalDocuments"
              component={LegalDocumentsScreen}
            />
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
            <RootStack.Screen
              name="EventDetail"
              component={EventDetailScreen}
            />
            <RootStack.Screen
              name="UserProfile"
              component={UserProfileScreen}
            />
            <RootStack.Screen
              name="ActivityDetail"
              component={ActivityDetailScreen}
            />
            <RootStack.Screen
              name="ActivityShare"
              component={ActivityShareScreen}
            />
            <RootStack.Screen
              name="PostDetail"
              component={PostDetailScreen}
            />
            <RootStack.Screen
              name="ConversationsList"
              component={ConversationsListScreen}
            />
            <RootStack.Screen
              name="Chat"
              component={ChatScreen}
            />
            <RootStack.Screen
              name="EventForm"
              component={EventFormScreen}
            />
            <RootStack.Screen
              name="EventCommentarySettings"
              component={EventCommentarySettingsScreen}
            />
            <RootStack.Screen
              name="PostForm"
              component={PostFormScreen}
            />
            <RootStack.Screen
              name="ActivityForm"
              component={ActivityFormScreen}
            />
            <RootStack.Screen
              name="GpxImport"
              component={GpxImportScreen}
            />
            <RootStack.Screen
              name="Paywall"
              component={PaywallScreen}
            />
            <RootStack.Screen
              name="EditProfile"
              component={EditProfileScreen}
            />
            <RootStack.Screen
              name="Settings"
              component={SettingsScreen}
            />
            <RootStack.Screen
              name="BlockedUsers"
              component={BlockedUsersScreen}
            />
            <RootStack.Screen
              name="PrivacyZones"
              component={PrivacyZonesScreen}
            />
            <RootStack.Screen
              name="TrainingReminders"
              component={TrainingRemindersScreen}
            />
            <RootStack.Screen
              name="ImpersonateUser"
              component={ImpersonateUserScreen}
              options={{
                presentation: 'modal',
              }}
            />
            <RootStack.Screen
              name="Notifications"
              component={NotificationsScreen}
            />
            <RootStack.Screen
              name="LegalDocuments"
              component={LegalDocumentsScreen}
            />
            <RootStack.Screen
              name="Leaderboard"
              component={LeaderboardScreen}
            />
            <RootStack.Screen
              name="PointHistory"
              component={PointHistoryScreen}
            />
            <RootStack.Screen
              name="Insights"
              component={InsightsScreen}
            />
            <RootStack.Screen
              name="TrainingCalibration"
              component={CalibrationFormScreen}
            />
            <RootStack.Screen
              name="ProgramLoading"
              component={ProgramLoadingScreen}
              options={{
                gestureEnabled: false,
              }}
            />
            <RootStack.Screen
              name="TrainingWeeksList"
              component={WeeksListScreen}
            />
            <RootStack.Screen
              name="TrainingWeekDetail"
              component={WeekDetailScreen}
            />
            <RootStack.Screen
              name="TipDetail"
              component={TipDetailScreen}
            />
            <RootStack.Screen
              name="WeekFeedback"
              component={WeekFeedbackScreen}
            />
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
