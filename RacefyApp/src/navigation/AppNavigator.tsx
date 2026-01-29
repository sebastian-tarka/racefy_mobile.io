import React, { useEffect, useRef } from 'react';
import { NavigationContainer, useNavigation, DefaultTheme, DarkTheme, Theme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Animated, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useLiveActivityContext } from '../hooks/useLiveActivity';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { Loading, ImpersonationBanner } from '../components';

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { HomeScreenWrapper } from '../screens/main/HomeScreenWrapper';
import { FeedScreenOld } from '../screens/main/FeedScreen-old';
import { ActivityRecordingScreen } from '../screens/main/ActivityRecordingScreen';
import { EventsScreen } from '../screens/main/EventsScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { EventDetailScreen } from '../screens/details/EventDetailScreen';
import { UserProfileScreen } from '../screens/details/UserProfileScreen';
import { ActivityDetailScreen } from '../screens/details/ActivityDetailScreen';
import { PostDetailScreen } from '../screens/details/PostDetailScreen';
import { ConversationsListScreen, ChatScreen } from '../screens/messaging';
import { EventFormScreen, EventCommentarySettingsScreen } from '../screens/events';
import { PostFormScreen } from '../screens/posts';
import { ActivityFormScreen, GpxImportScreen } from '../screens/activities';
import { EditProfileScreen } from '../screens/profile';
import { SettingsScreen, BlockedUsersScreen } from '../screens/settings';
import { ConsentModalScreen, LegalDocumentsScreen } from '../screens/legal';
import { ImpersonateUserScreen } from '../screens/admin/ImpersonateUserScreen';
import { NotificationsScreen } from '../screens/notifications';
import { LandingScreen } from '../screens/landing';
import { LeaderboardScreen, PointHistoryScreen } from '../screens/leaderboard';

// Types
import type {
  RootStackParamList,
  AuthStackParamList,
  MainTabParamList,
} from './types';
import {FeedScreen} from "../screens/main/FeedScreen";

// Create navigation ref for use outside of React components (e.g., push notification handlers)
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

// Pulsing Record Icon Component
function RecordIcon({ focused, size, hasActiveRecording, isActivelyTracking }: {
  focused: boolean;
  size: number;
  hasActiveRecording: boolean;  // true when there's any activity (recording or paused)
  isActivelyTracking: boolean;  // true when GPS is actively tracking
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Only pulse when actively tracking AND not on the Record tab
  const shouldPulse = isActivelyTracking && !focused;

  useEffect(() => {
    if (shouldPulse) {
      // Start pulsing animation when tracking and not focused
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      // Reset scale when not pulsing
      pulseAnim.setValue(1);
    }
  }, [shouldPulse, pulseAnim]);

  // When focused (on Record tab): always show green add-circle (normal focused state)
  // When not focused but has recording: show recording indicator
  // When not focused and no recording: show gray outline
  let iconName: keyof typeof Ionicons.glyphMap;
  let color: string;

  if (focused) {
    // On Record tab - always green, normal icon
    iconName = 'add-circle';
    color = '#10b981'; // green
  } else if (hasActiveRecording) {
    // Not on Record tab, but has active recording - show indicator
    iconName = 'radio-button-on';
    color = isActivelyTracking ? '#ef4444' : '#f97316'; // red if tracking, orange if paused
  } else {
    // Not on Record tab, no recording - normal inactive state
    iconName = 'add-circle-outline';
    color = '#9ca3af'; // gray
  }

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <Ionicons name={iconName} size={size} color={color} />
    </Animated.View>
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
      <AuthStack.Screen name="LegalDocuments" component={LegalDocumentsScreen} />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { isTracking, activity } = useLiveActivityContext();

  // Auth guard listener - redirects to Auth screen if not authenticated
  const authGuardListener = {
    tabPress: (e: { preventDefault: () => void }) => {
      if (!isAuthenticated) {
        e.preventDefault();
        navigation.navigate('Auth', { screen: 'Login' });
      }
    },
  };

  // Calculate tab bar height based on safe area insets
  const tabBarHeight = 60 + insets.bottom;
  const tabBarPaddingBottom = Math.max(insets.bottom, 8);

  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Feed':
              iconName = focused ? 'newspaper' : 'newspaper-outline';
              break;
            case 'Record':
              iconName = focused ? 'add-circle' : 'add-circle-outline';
              break;
            case 'Events':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.cardBackground,
          borderTopColor: colors.border,
          paddingTop: 4,
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >
      <MainTab.Screen
        name="Home"
        component={HomeScreenWrapper}
        options={{ tabBarLabel: 'Home' }}
      />
      <MainTab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarLabel: 'Feed',
        }}
        listeners={authGuardListener}
      />
      <MainTab.Screen
        name="Record"
        component={ActivityRecordingScreen}
        options={{
          tabBarLabel: 'Record',
          tabBarIcon: ({ focused, size }) => (
            <RecordIcon
              focused={focused}
              size={size}
              hasActiveRecording={!!activity}
              isActivelyTracking={isTracking}
            />
          ),
        }}
        listeners={authGuardListener}
      />
      <MainTab.Screen
        name="Events"
        component={EventsScreen}
        options={{ tabBarLabel: 'Events' }}
        listeners={authGuardListener}
      />
      <MainTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
        listeners={authGuardListener}
      />
    </MainTab.Navigator>
  );
}

export function AppNavigator() {
  const { isLoading, isAuthenticated, requiresConsent } = useAuth();
  const { colors, isDark } = useTheme();

  // Initialize push notifications with navigation ref for deep linking
  usePushNotifications({ navigationRef });

  if (isLoading) {
    return <Loading fullScreen message="Loading..." />;
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
    <NavigationContainer ref={navigationRef} theme={navigationTheme} key={authStateKey}>
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
            <RootStack.Screen name="Main" component={MainNavigator} />
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
          </>
        )}
      </RootStack.Navigator>
      <ImpersonationBanner />
    </NavigationContainer>
  );
}
