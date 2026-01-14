import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { fixStorageUrl } from '../config/api';
import { Avatar } from './Avatar';
import { ProfileStats } from './ProfileStats';
import { ProfileActions } from './ProfileActions';
import { ProfileTabs, TabType } from './ProfileTabs';
import { spacing, fontSize } from '../theme';
import type { UserProfile } from '../types/api';

interface UserProfileHeaderProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  isAuthenticated: boolean;
  isFollowing: boolean;
  isFollowLoading: boolean;
  isMessageLoading: boolean;
  canMessage: boolean;
  activeTab: TabType;
  tabs: Array<{ label: string; value: TabType; icon: keyof typeof Ionicons.glyphMap }>;
  onBackPress: () => void;
  onFollowersPress: () => void;
  onFollowingPress: () => void;
  onFollowToggle: () => void;
  onMessagePress: () => void;
  onTabChange: (tab: TabType) => void;
}

export function UserProfileHeader({
  profile,
  isOwnProfile,
  isAuthenticated,
  isFollowing,
  isFollowLoading,
  isMessageLoading,
  canMessage,
  activeTab,
  tabs,
  onBackPress,
  onFollowersPress,
  onFollowingPress,
  onFollowToggle,
  onMessagePress,
  onTabChange,
}: UserProfileHeaderProps) {
  const { colors } = useTheme();

  return (
    <>
      <View style={[styles.navHeader, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>@{profile.username}</Text>
      </View>

      {profile.background_image_url ? (
        <ImageBackground
          source={{ uri: fixStorageUrl(profile.background_image_url) || undefined }}
          style={[styles.coverImage, { backgroundColor: colors.primary }]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.coverImage, { backgroundColor: colors.primary }]} />
      )}

      <View style={[styles.profileHeader, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <View style={[styles.avatarContainer, { borderColor: colors.cardBackground }]}>
          <Avatar uri={profile.avatar} name={profile.name} size="xxl" />
        </View>

        <Text style={[styles.name, { color: colors.textPrimary }]}>{profile.name}</Text>
        <Text style={[styles.username, { color: colors.textSecondary }]}>@{profile.username}</Text>

        {profile.bio && <Text style={[styles.bio, { color: colors.textPrimary }]}>{profile.bio}</Text>}

        <ProfileStats
          postsCount={profile.posts_count}
          followersCount={profile.followers_count}
          followingCount={profile.following_count}
          onFollowersPress={onFollowersPress}
          onFollowingPress={onFollowingPress}
        />

        {!isOwnProfile && isAuthenticated && (
          <ProfileActions
            isFollowing={isFollowing}
            isFollowLoading={isFollowLoading}
            isMessageLoading={isMessageLoading}
            canMessage={canMessage}
            onFollowToggle={onFollowToggle}
            onMessagePress={onMessagePress}
          />
        )}
      </View>

      <ProfileTabs tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />

      <View style={styles.tabSpacer} />
    </>
  );
}

const styles = StyleSheet.create({
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  coverImage: {
    height: 120,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    marginTop: -40,
    borderWidth: 4,
    borderRadius: 44,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  username: {
    fontSize: fontSize.md,
    marginTop: 2,
  },
  bio: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  tabSpacer: {
    height: spacing.md,
  },
});