import React from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Avatar,
  BadgeCabinet,
  ProfileNavigationSections,
  StandingBlock,
} from '../../../components';
import { fixStorageUrl } from '../../../config/api';
import { useTheme } from '../../../hooks/useTheme';
import { useUnits } from '../../../hooks/useUnits';
import type { MainTabParamList, RootStackParamList } from '../../../navigation/types';
import { borderRadius, fontSize, msFont, spacing } from '../../../theme';
import type {
  BadgeReward,
  SubscriptionTier,
  User,
  UserPointStats,
  UserStats,
} from '../../../types/api';
import { formatDurationCompact } from '../../../utils/formatDuration';

export type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const SETTINGS_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

interface Props {
  user: User | null;
  stats: UserStats | null;
  pointStats: UserPointStats | null;
  weeklyDelta: number | null;
  badges: BadgeReward[];
  tier: SubscriptionTier;
  pendingFollowCount: number;
  /** Admin replies to feedback since the last visit — a dot on the settings button. */
  newFeedback: number;
  navigation: ProfileScreenNavigationProp;
  /** Where the header ends — lets a tab switch land on the content. */
  onLayoutHeight: (height: number) => void;
  onEditProfile: () => void;
  onOpenSettings: () => void;
  onOpenFollowers: () => void;
  onOpenFollowing: () => void;
  onOpenLeaderboard: () => void;
  onOpenRewards: () => void;
  onOpenBadge: (badge: BadgeReward) => void;
}

/**
 * Everything above the profile's tab bar: cover with the settings button,
 * identity, standing, lifetime numbers, followers, badges and the tool list.
 * Memoized — the screen re-renders on every tab switch and list page, and none
 * of that touches the header.
 */
export const ProfileHeader = React.memo(function ProfileHeader({
  user,
  stats,
  pointStats,
  weeklyDelta,
  badges,
  tier,
  pendingFollowCount,
  newFeedback,
  navigation,
  onLayoutHeight,
  onEditProfile,
  onOpenSettings,
  onOpenFollowers,
  onOpenFollowing,
  onOpenLeaderboard,
  onOpenRewards,
  onOpenBadge,
}: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { formatTotalDistance } = useUnits();

  const renderSettingsButton = () => (
    <TouchableOpacity
      style={styles.settingsButton}
      onPress={onOpenSettings}
      activeOpacity={0.7}
      hitSlop={SETTINGS_HIT_SLOP}
    >
      <Ionicons name="settings-outline" size={24} color={colors.white} />
      {newFeedback > 0 && (
        <View
          style={[
            styles.settingsDot,
            { backgroundColor: colors.primary, borderColor: colors.white },
          ]}
        />
      )}
    </TouchableOpacity>
  );

  const renderCoverImage = () => {
    const coverStyle = [styles.coverImage, { backgroundColor: colors.primary }];
    const gradientOverlay = (
      <LinearGradient
        colors={['transparent', isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.3)']}
        style={StyleSheet.absoluteFillObject}
      />
    );

    if (user?.background_image_url) {
      return (
        <ImageBackground
          source={{ uri: fixStorageUrl(user.background_image_url) || undefined }}
          style={coverStyle}
          resizeMode="cover"
        >
          {gradientOverlay}
          {renderSettingsButton()}
        </ImageBackground>
      );
    }

    return (
      <LinearGradient
        colors={isDark ? [colors.primary, '#0f1520'] : [colors.primary, colors.background]}
        style={coverStyle}
      >
        {renderSettingsButton()}
      </LinearGradient>
    );
  };

  // Wrapped in a measured View: knowing where the header ends is what lets a
  // tab switch land on the content instead of somewhere in the middle of it.
  return (
    <View
      style={styles.profileHeader}
      onLayout={(e) => onLayoutHeight(e.nativeEvent.layout.height)}
    >
      <View
        style={[
          styles.profileCard,
          { backgroundColor: colors.cardBackground, borderColor: colors.borderLight },
        ]}
      >
        {renderCoverImage()}

        <View style={styles.profileBody}>
          {/* The avatar is the thing people reach for when they want to change
              it, so it goes where the edit screen is — three taps through
              Settings was the old route. */}
          <View style={styles.identityRow}>
            <TouchableOpacity
              style={[styles.avatarContainer, { borderColor: colors.cardBackground }]}
              onPress={onEditProfile}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('editProfile.title')}
            >
              <Avatar
                uri={user?.avatar}
                name={user?.name}
                size="xxl"
                showTierBadge={tier !== 'free'}
                tier={tier}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.editButton, { borderColor: colors.border }]}
              onPress={onEditProfile}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={16} color={colors.textPrimary} />
              <Text style={[styles.editButtonText, { color: colors.textPrimary }]}>
                {t('editProfile.title')}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {user?.name}
          </Text>
          <Text style={[styles.username, { color: colors.textSecondary }]} numberOfLines={1}>
            @{user?.username}
          </Text>
          {user?.bio && (
            <Text style={[styles.bio, { color: colors.textPrimary }]} numberOfLines={2}>
              {user.bio}
            </Text>
          )}

          {/* Where you stand — current state, one tap from the full board.
              The lifetime row below is history; this is not (design
              "Racefy v2" → StandingBlock). */}
          <StandingBlock stats={pointStats} weeklyDelta={weeklyDelta} onPress={onOpenLeaderboard} />

          {/* Training and social used to share one row of four columns, with
              the distance labelled "Total" — total of what was anyone's guess.
              Three named training metrics, then the social pair on its own. */}
          <View style={[styles.statsRow, { borderTopColor: colors.borderLight }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('profile.stats.activities')}
              </Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {stats?.activities?.total ?? 0}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('profile.stats.distance')}
              </Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {formatTotalDistance(stats?.activities?.total_distance ?? 0)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('profile.stats.time')}
              </Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {formatDurationCompact(stats?.activities?.total_duration ?? 0)}
              </Text>
            </View>
          </View>

          {/* All-time numbers say nothing about how it is going right now. */}
          {(stats?.activities?.this_month ?? 0) > 0 && (
            <Text style={[styles.thisMonth, { color: colors.textSecondary }]}>
              {t('profile.stats.thisMonth', { count: stats?.activities?.this_month ?? 0 })}
            </Text>
          )}

          <View style={[styles.socialRow, { borderTopColor: colors.borderLight }]}>
            <TouchableOpacity style={styles.socialItem} onPress={onOpenFollowers}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {stats?.social.followers ?? 0}
              </Text>
              <Text style={[styles.socialLabel, { color: colors.textSecondary }]}>
                {t('profile.stats.followers')}
              </Text>
              {pendingFollowCount > 0 && (
                <View style={[styles.statBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.statBadgeText}>
                    {pendingFollowCount > 99 ? '99+' : pendingFollowCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={[styles.socialDivider, { backgroundColor: colors.borderLight }]} />
            <TouchableOpacity style={styles.socialItem} onPress={onOpenFollowing}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {stats?.social.following ?? 0}
              </Text>
              <Text style={[styles.socialLabel, { color: colors.textSecondary }]}>
                {t('profile.stats.following')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* What you have won, above the tabs — see BadgeCabinet for why this is
          a section and not a sixth tab. */}
      <BadgeCabinet badges={badges} onOpenAll={onOpenRewards} onOpenBadge={onOpenBadge} />

      {/* Navigation Sections */}
      <ProfileNavigationSections navigation={navigation} tier={tier} />
    </View>
  );
});

const styles = StyleSheet.create({
  avatarContainer: {
    marginTop: -44,
    borderWidth: 4,
    borderRadius: 44,
  },
  bio: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  coverImage: {
    height: 160,
    position: 'relative',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  editButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  profileBody: {
    alignItems: 'stretch',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  profileCard: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  profileHeader: {
    // Design "Racefy v2" (ProfileScreen): 18 px między ostatnią kartą narzędzi
    // a paskiem tabów. Na headerze, nie na pasku — pasek jest sticky, więc
    // margines nad nim przepuszczałby wiersze listy po przypięciu.
    paddingBottom: 18,
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
    zIndex: 10,
  },
  settingsDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  socialDivider: {
    width: StyleSheet.hairlineWidth,
    height: 16,
    marginRight: spacing.md,
  },
  socialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: spacing.md,
  },
  socialLabel: {
    fontSize: fontSize.sm,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statBadge: {
    minWidth: 18,
    minHeight: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statBadgeText: {
    color: '#fff',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  statItem: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: msFont(11),
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: fontSize.xxxl,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  thisMonth: {
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },
  username: {
    fontSize: fontSize.md,
    marginTop: 2,
  },
});
