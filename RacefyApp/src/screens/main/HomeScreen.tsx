import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing, fontSize } from '../../theme';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../navigation/types';

type Props = BottomTabScreenProps<MainTabParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { user, isAuthenticated } = useAuth();

  const features = [
    {
      icon: 'newspaper-outline' as const,
      title: 'Social Feed',
      description: 'Share your activities and connect with others',
      screen: 'Feed' as const,
      requiresAuth: true,
    },
    {
      icon: 'calendar-outline' as const,
      title: 'Events',
      description: 'Find and join local sports events',
      screen: 'Events' as const,
      requiresAuth: false,
    },
    {
      icon: 'fitness-outline' as const,
      title: 'Activities',
      description: 'Track and record your workouts',
      screen: 'Profile' as const,
      requiresAuth: true,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="walk" size={32} color={colors.primary} />
            <Text style={styles.logo}>Racefy</Text>
          </View>
          {isAuthenticated && (
            <Text style={styles.greeting}>Hello, {user?.name}!</Text>
          )}
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Sports & Fitness Community</Text>
          <Text style={styles.heroSubtitle}>
            Track activities, join events, and connect with fitness enthusiasts
          </Text>
        </View>

        {!isAuthenticated && (
          <Card style={styles.authCard}>
            <Text style={styles.authTitle}>Get Started</Text>
            <Text style={styles.authSubtitle}>
              Join Racefy to track your activities and connect with others
            </Text>
            <View style={styles.authButtons}>
              <Button
                title="Sign In"
                onPress={() =>
                  navigation.getParent()?.navigate('Auth', { screen: 'Login' })
                }
                variant="primary"
                style={styles.authButton}
              />
              <Button
                title="Sign Up"
                onPress={() =>
                  navigation
                    .getParent()
                    ?.navigate('Auth', { screen: 'Register' })
                }
                variant="outline"
                style={styles.authButton}
              />
            </View>
          </Card>
        )}

        <Text style={styles.sectionTitle}>Features</Text>

        {features.map((feature, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => {
              if (feature.requiresAuth && !isAuthenticated) {
                navigation.getParent()?.navigate('Auth', { screen: 'Login' });
              } else {
                navigation.navigate(feature.screen);
              }
            }}
            activeOpacity={0.8}
          >
            <Card style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Ionicons
                  name={feature.icon}
                  size={28}
                  color={colors.primary}
                />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>
                  {feature.description}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textMuted}
              />
            </Card>
          </TouchableOpacity>
        ))}

        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Ionicons name="people" size={24} color={colors.primary} />
            <Text style={styles.statValue}>10K+</Text>
            <Text style={styles.statLabel}>Users</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="calendar" size={24} color={colors.primary} />
            <Text style={styles.statValue}>500+</Text>
            <Text style={styles.statLabel}>Events</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="trophy" size={24} color={colors.primary} />
            <Text style={styles.statValue}>50K+</Text>
            <Text style={styles.statLabel}>Activities</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  greeting: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  hero: {
    marginBottom: spacing.xl,
  },
  heroTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  authCard: {
    marginBottom: spacing.xl,
  },
  authTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  authSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  authButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  authButton: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.xl,
    paddingVertical: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
