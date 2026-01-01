import React from 'react';
import { NavigationContainer, useNavigation, DefaultTheme, DarkTheme, Theme } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { Loading } from '../components';

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { HomeScreen } from '../screens/main/HomeScreen';
import { FeedScreen } from '../screens/main/FeedScreen';
import { ActivityRecordingScreen } from '../screens/main/ActivityRecordingScreen';
import { EventsScreen } from '../screens/main/EventsScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { EventDetailScreen } from '../screens/details/EventDetailScreen';
import { UserProfileScreen } from '../screens/details/UserProfileScreen';
import { ActivityDetailScreen } from '../screens/details/ActivityDetailScreen';
import { ConversationsListScreen, ChatScreen } from '../screens/messaging';
import { EventFormScreen } from '../screens/events';
import { EditProfileScreen } from '../screens/profile';
import { SettingsScreen } from '../screens/settings';

// Types
import type {
  RootStackParamList,
  AuthStackParamList,
  MainTabParamList,
} from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

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
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

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
        options={{ tabBarLabel: 'Record' }}
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
  const { isLoading } = useAuth();
  const { colors, isDark } = useTheme();

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

  return (
    <NavigationContainer theme={navigationTheme}>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
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
          name="EditProfile"
          component={EditProfileScreen}
        />
        <RootStack.Screen
          name="Settings"
          component={SettingsScreen}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
