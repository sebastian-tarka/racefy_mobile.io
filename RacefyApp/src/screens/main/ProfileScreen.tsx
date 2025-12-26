import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Avatar, Card, Button, EmptyState } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../navigation/types';

type Props = BottomTabScreenProps<MainTabParamList, 'Profile'>;

type TabType = 'posts' | 'activities' | 'events';

export function ProfileScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert(t('common.logout'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.logout'),
        style: 'destructive',
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            await logout();
          } catch (error) {
            Alert.alert(t('common.error'), t('profile.failedToLogout'));
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('profile.title')}</Text>
        </View>
        <EmptyState
          icon="person-outline"
          title={t('profile.signInRequired')}
          message={t('profile.signInDescription')}
          actionLabel={t('common.signIn')}
          onAction={() =>
            navigation.getParent()?.navigate('Auth', { screen: 'Login' })
          }
        />
      </SafeAreaView>
    );
  }

  const tabs: { label: string; value: TabType; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: t('profile.tabs.posts'), value: 'posts', icon: 'newspaper-outline' },
    { label: t('profile.tabs.activities'), value: 'activities', icon: 'fitness-outline' },
    { label: t('profile.tabs.events'), value: 'events', icon: 'calendar-outline' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        <View style={styles.coverImage}>
          <TouchableOpacity style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Avatar uri={user?.avatar} name={user?.name} size="xxl" />
          </View>

          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.username}>@{user?.username}</Text>

          {user?.bio && <Text style={styles.bio}>{user.bio}</Text>}

          <View style={styles.stats}>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>{t('profile.stats.posts')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>{t('profile.stats.followers')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>{t('profile.stats.following')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actions}>
            <Button
              title={t('profile.editProfile')}
              onPress={() => {
                // Navigate to edit profile
              }}
              variant="outline"
              style={styles.actionButton}
            />
            <Button
              title={t('common.logout')}
              onPress={handleLogout}
              variant="ghost"
              loading={isLoggingOut}
              style={styles.actionButton}
            />
          </View>
        </View>

        <View style={styles.tabContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.value}
              style={[
                styles.tab,
                activeTab === tab.value && styles.tabActive,
              ]}
              onPress={() => setActiveTab(tab.value)}
            >
              <Ionicons
                name={tab.icon}
                size={20}
                color={
                  activeTab === tab.value
                    ? colors.primary
                    : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.value && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tabContent}>
          {activeTab === 'posts' && (
            <EmptyState
              icon="newspaper-outline"
              title={t('profile.empty.noPosts')}
              message={t('profile.empty.noPostsMessage')}
            />
          )}
          {activeTab === 'activities' && (
            <EmptyState
              icon="fitness-outline"
              title={t('profile.empty.noActivities')}
              message={t('profile.empty.noActivitiesMessage')}
            />
          )}
          {activeTab === 'events' && (
            <EmptyState
              icon="calendar-outline"
              title={t('profile.empty.noEvents')}
              message={t('profile.empty.noEventsMessage')}
            />
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  coverImage: {
    height: 120,
    backgroundColor: colors.primary,
    position: 'relative',
  },
  settingsButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    marginTop: -40,
    borderWidth: 4,
    borderColor: colors.cardBackground,
    borderRadius: 44,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  username: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bio: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  stats: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    gap: spacing.xxxl,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  actionButton: {
    minWidth: 120,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  tabContent: {
    minHeight: 300,
    padding: spacing.lg,
  },
});
