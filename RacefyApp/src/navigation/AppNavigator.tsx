import React, { useEffect, useRef } from 'react';
import { NavigationContainer, useNavigation, DefaultTheme, DarkTheme, Theme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Animated, View, Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useLiveActivityContext } from '../hooks/useLiveActivity';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useHomeConfig } from '../hooks/useHomeConfig';
import { useNavigationStyle, NavigationStyleProvider } from '../contexts/NavigationStyleContext';
import { Loading, ImpersonationBanner } from '../components';

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { HomeScreenWrapper } from '../screens/main/HomeScreenWrapper';
import { HomeScreen } from '../screens/main/HomeScreen';
import { DynamicHomeScreen } from '../screens/main/DynamicHomeScreen';
import { FeedScreenOld } from '../screens/main/FeedScreen-old';
import { ActivityRecordingScreen } from '../screens/main/ActivityRecordingScreen';
import { EventsScreen } from '../screens/main/EventsScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { EventDetailScreen } from '../screens/details/EventDetailScreen';
import { UserProfileScreen } from '../screens/details/UserProfileScreen';
import { ActivityDetailScreen } from '../screens/details/ActivityDetailScreen';
import { ActivityShareScreen } from '../screens/details/ActivityShareScreen';
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
import {
  CalibrationFormScreen,
  ProgramLoadingScreen,
  WeeksListScreen,
  WeekDetailScreen,
  TipDetailScreen,
} from '../screens/training';

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

// Custom Tab Bar Background with blur effect
function TabBarBackground({ colors }: { colors: any }) {
  return (
    <BlurView
      intensity={95}
      tint="dark"
      style={StyleSheet.absoluteFill}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: 'rgba(17, 24, 39, 0.98)', // More opaque to hide content underneath
            borderWidth: 1,
            borderColor: colors.border,
          },
        ]}
      />
    </BlurView>
  );
}

// Pulsing Record Icon Component with gradient background
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

  // When focused (on Record tab): show gradient background with + icon
  // When not focused but has recording: show recording indicator
  // When not focused and no recording: show gray +

  if (focused) {
    // On Record tab - gradient background with white + icon
    return (
      <LinearGradient
        colors={['#10b981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 52,
          height: 42,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 20, color: '#ffffff', fontWeight: 'bold', lineHeight: 20 }}>+</Text>
      </LinearGradient>
    );
  }

  if (hasActiveRecording) {
    // Not on Record tab, but has active recording - show pulsing indicator
    const color = isActivelyTracking ? '#ef4444' : '#f97316';
    return (
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Ionicons name="radio-button-on" size={size} color={color} />
      </Animated.View>
    );
  }

  // Not on Record tab, no recording - show gray +
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 16, color: '#9ca3af', lineHeight: 16 }}>+</Text>
    </View>
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

// Tab bar constants for layout calculations
export const TAB_BAR_HEIGHT = 58;
export const TAB_BAR_BOTTOM_MARGIN = 16;

// Custom Tab Button with background for active state (used only in MainNavigatorDynamic)
function CustomTabButton({ children, onPress, accessibilityState, style, ...props }: any) {
  const { colors } = useTheme();
  const focused = accessibilityState?.selected;

  return (
    <TouchableOpacity
      {...props}
      onPress={onPress}
      style={[
        style,
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 20,
          paddingVertical: 8,
          borderRadius: 14,
          backgroundColor: focused ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
          marginHorizontal: 4,
        }
      ]}
    >
      {children}
    </TouchableOpacity>
  );
}

// Classic Navigator - Original styling with Ionicons
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

  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          let iconColor = color;

          // Use Ionicons for classic navigation
          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Feed':
              iconName = focused ? 'list' : 'list-outline';
              break;
            case 'Record':
              // Show recording status with simple color changes
              if (activity) {
                // Recording exists - show status
                iconName = 'radio-button-on';
                iconColor = isTracking ? '#ef4444' : '#f97316'; // red when tracking, orange when paused
              } else {
                // No recording - normal icon
                iconName = 'add-circle';
              }
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

          return <Ionicons name={iconName} size={size} color={iconColor} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.cardBackground,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
      })}
    >
      <MainTab.Screen
        name="Home"
        component={HomeScreen}
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

// Dynamic Navigator - Modern styling with emoji icons and custom button
function MainNavigatorDynamic() {
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

  // Calculate tab bar height
  const tabBarHeight = 60 + insets.bottom;
  const tabBarPaddingBottom = Math.max(insets.bottom, 8);

  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarButton: (props) => <CustomTabButton {...props} />,
        tabBarIcon: ({ focused, color, size }) => {
          let icon: string;

          // Use emoji/unicode icons from mockup
          switch (route.name) {
            case 'Home':
              icon = '⌂';
              break;
            case 'Feed':
              icon = '☰';
              break;
            case 'Record':
              icon = '+';
              break;
            case 'Events':
              icon = '📅';
              break;
            case 'Profile':
              icon = '◉';
              break;
            default:
              icon = '?';
          }

          // Use custom gradient icon for Record tab
          if (route.name === 'Record') {
            return null; // Will be rendered in tabBarIcon option for Record screen
          }

          // Icon stays same color (not colored)
          const iconColor = colors.textPrimary;

          return (
            <Text style={{ fontSize: 16, color: iconColor, lineHeight: 16 }}>{icon}</Text>
          );
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.cardBackground,
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: tabBarPaddingBottom,
          borderTopWidth: 0,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '500',
          letterSpacing: 0.3,
        },
      })}
    >
      <MainTab.Screen
        name="Home"
        component={DynamicHomeScreen}
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
          tabBarLabel: '', // No label for Record button
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

// Wrapper that decides which navigator to use based on navigation style from API
function MainNavigatorWrapper() {
  const { style } = useNavigationStyle();

  // Use dynamic navigator when style is 'dynamic', otherwise use legacy/classic
  if (style === 'dynamic') {
    return <MainNavigatorDynamic />;
  }

  return <MainNavigator />;
}

// Component that loads home config and sets navigation style
function NavigationStyleSetter({ children }: { children: React.ReactNode }) {
  const { homeVersion } = useHomeConfig();
  const { setStyle } = useNavigationStyle();

  useEffect(() => {
    // Update navigation style based on API config
    setStyle(homeVersion);
  }, [homeVersion, setStyle]);

  return <>{children}</>;
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
    <NavigationStyleProvider>
      <NavigationStyleSetter>
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
            <RootStack.Screen name="Main" component={MainNavigatorWrapper} />
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
          </>
        )}
          </RootStack.Navigator>
          <ImpersonationBanner />
        </NavigationContainer>
      </NavigationStyleSetter>
    </NavigationStyleProvider>
  );
}
