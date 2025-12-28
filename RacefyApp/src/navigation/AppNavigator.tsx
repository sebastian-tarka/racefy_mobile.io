import React from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { Loading } from '../components';
import { colors } from '../theme';

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
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  const { isAuthenticated } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Auth guard listener - redirects to Auth screen if not authenticated
  const authGuardListener = {
    tabPress: (e: { preventDefault: () => void }) => {
      if (!isAuthenticated) {
        e.preventDefault();
        navigation.navigate('Auth');
      }
    },
  };

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
          height: 60,
          paddingBottom: 8,
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

  if (isLoading) {
    return <Loading fullScreen message="Loading..." />;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
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
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
