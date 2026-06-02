import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import type {CompositeNavigationProp} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {ProfileSectionCard} from './ProfileSectionCard';
import {useTheme} from '../hooks/useTheme';
import {api} from '../services/api';
import {logger} from '../services/logger';
import {spacing} from '../theme';
import type {MainTabParamList, RootStackParamList} from '../navigation/types';
import type {SubscriptionTier} from '../types/api';

type ProfileNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface ProfileNavigationSectionsProps {
  navigation: ProfileNavigation;
  tier: SubscriptionTier;
}

/**
 * The grouped list of navigation shortcuts on the profile screen
 * (training, insights, AI reports, goals, teams, routes). Owns the
 * training-program lookup so the screen doesn't have to.
 */
export function ProfileNavigationSections({ navigation, tier }: ProfileNavigationSectionsProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [loadingTraining, setLoadingTraining] = useState(false);

  const isFree = tier === 'free';

  const handleTrainingPress = async () => {
    setLoadingTraining(true);
    try {
      const program = await api.getCurrentProgram();
      if (program) {
        // User has active program - go to weeks list
        navigation.navigate('TrainingWeeksList');
      } else {
        // No active program - go to calibration to create one
        navigation.navigate('TrainingCalibration');
      }
    } catch (error: any) {
      // Unexpected error - log it and navigate to calibration
      logger.error('training', 'Failed to check training program', { error });
      navigation.navigate('TrainingCalibration');
    } finally {
      setLoadingTraining(false);
    }
  };

  return (
    <View style={styles.group}>
      <ProfileSectionCard
        icon="fitness"
        accentColor={colors.primary}
        label={t('training.title')}
        subtitle={t('training.subtitle')}
        onPress={handleTrainingPress}
        loading={loadingTraining}
      />

      <ProfileSectionCard
        icon="bar-chart"
        accentColor={colors.info}
        label={t('insights.title')}
        subtitle={t('insights.subtitle')}
        onPress={() => navigation.navigate('Insights')}
      />

      <ProfileSectionCard
        icon="sparkles"
        accentColor={colors.primary}
        label={t('insights.aiReports.title')}
        subtitle={isFree ? t('insights.aiReports.premiumRequired') : t('insights.aiReports.subtitle')}
        locked={isFree}
        onPress={() =>
          isFree
            ? navigation.navigate('Paywall', { feature: 'activity_analysis_reports_monthly' })
            : navigation.navigate('AiActivityReports')
        }
      />

      <ProfileSectionCard
        icon="flag"
        accentColor="#f59e0b"
        label={t('goals.title')}
        subtitle={t('goals.subtitle')}
        onPress={() => navigation.navigate('Goals')}
      />

      <ProfileSectionCard
        icon="shield"
        accentColor="#8b5cf6"
        label={t('teams.teams')}
        subtitle={t('teams.profileSubtitle')}
        onPress={() => navigation.navigate('TeamsList')}
      />

      <ProfileSectionCard
        icon="map"
        accentColor="#06b6d4"
        label={t('routes.title')}
        subtitle={t('routes.subtitle')}
        onPress={() => navigation.navigate('RouteLibrary')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    marginHorizontal: spacing.sm,
    gap: 10,
  },
});