import React, { useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileSectionCard } from './ProfileSectionCard';
import { TrainingProgramRow } from './Training/TrainingProgramRow';
import { TrainingPlansSheet } from './Training/TrainingPlansSheet';
import { useTheme } from '../hooks/useTheme';
import { useLiveBroadcasts } from '../hooks/useLiveBroadcasts';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { spacing } from '../theme';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import type { SubscriptionTier, TrainingProgram } from '../types/api';

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
 * (training, insights, AI reports, goals, teams, routes). The training entry is
 * a rich progress card when an active program exists; long-pressing it opens a
 * sheet to switch programs or start the calibration wizard.
 */
export function ProfileNavigationSections({ navigation, tier }: ProfileNavigationSectionsProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loadingTraining, setLoadingTraining] = useState(true);
  const [sheetVisible, setSheetVisible] = useState(false);
  // `total` (server-side), not the page length — the list is paginated at 20.
  const { total: liveCount } = useLiveBroadcasts();

  const isFree = tier === 'free';

  const loadPrograms = useCallback(async () => {
    try {
      const result = await api.getCurrentPrograms();
      setPrograms(result);
    } catch (error) {
      logger.error('training', 'Failed to load training programs', { error });
      setPrograms([]);
    } finally {
      setLoadingTraining(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPrograms();
    }, [loadPrograms]),
  );

  // Prefer the active program; fall back to the first (e.g. only paused ones exist).
  const activeProgram = programs.find((p) => p.status === 'active') ?? programs[0] ?? null;

  const openWeeks = () => navigation.navigate('TrainingWeeksList');
  const openCalibration = () => navigation.navigate('TrainingCalibration');

  return (
    <View style={styles.group}>
      {activeProgram ? (
        <TrainingProgramRow
          program={activeProgram}
          subtitleSuffix={t('training.holdToSwitch')}
          onPress={openWeeks}
          onLongPress={() => setSheetVisible(true)}
          trailing={
            <TouchableOpacity
              style={[styles.switchBtn, { backgroundColor: colors.cardBackgroundHighlight }]}
              onPress={() => setSheetVisible(true)}
              hitSlop={8}
              activeOpacity={0.7}
            >
              <Ionicons name="swap-horizontal" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          }
        />
      ) : (
        <ProfileSectionCard
          icon="fitness"
          accentColor={colors.primary}
          label={t('training.title')}
          subtitle={t('training.subtitle')}
          onPress={openCalibration}
          loading={loadingTraining}
        />
      )}

      <View style={styles.grid}>
        {/* The count IS the discovery mechanism — an entry that never says how
          many people are live gives nobody a reason to open it. */}
        <ProfileSectionCard
          layout="tile"
          icon="radio"
          accentColor={colors.error}
          label={t('live.list.title')}
          subtitle={
            liveCount > 0
              ? t('live.list.countSubtitle', { count: liveCount })
              : t('live.list.emptySubtitle')
          }
          onPress={() => navigation.navigate('LiveBroadcasts')}
        />

        <ProfileSectionCard
          layout="tile"
          icon="bar-chart"
          accentColor={colors.info}
          label={t('insights.title')}
          subtitle={t('insights.subtitle')}
          onPress={() => navigation.navigate('Insights')}
        />

        <ProfileSectionCard
          layout="tile"
          icon="sparkles"
          accentColor={colors.primary}
          label={t('insights.aiReports.title')}
          subtitle={
            isFree ? t('insights.aiReports.premiumRequired') : t('insights.aiReports.subtitle')
          }
          locked={isFree}
          onPress={() =>
            isFree
              ? navigation.navigate('Paywall', { feature: 'activity_analysis_reports_monthly' })
              : navigation.navigate('AiActivityReports')
          }
        />

        <ProfileSectionCard
          layout="tile"
          icon="flag"
          accentColor="#f59e0b"
          label={t('goals.title')}
          subtitle={t('goals.subtitle')}
          onPress={() => navigation.navigate('Goals')}
        />

        <ProfileSectionCard
          layout="tile"
          icon="shield"
          accentColor="#8b5cf6"
          label={t('teams.teams')}
          subtitle={t('teams.profileSubtitle')}
          onPress={() => navigation.navigate('TeamsList')}
        />

        <ProfileSectionCard
          layout="tile"
          icon="map"
          accentColor="#06b6d4"
          label={t('routes.title')}
          subtitle={t('routes.subtitle')}
          onPress={() => navigation.navigate('RouteLibrary')}
        />

        <ProfileSectionCard
          layout="tile"
          icon="barbell"
          accentColor="#f97316"
          label={t('strengthPlans.title')}
          subtitle={t('strengthPlans.subtitle')}
          onPress={() => navigation.navigate('WorkoutPlans')}
        />
      </View>

      <TrainingPlansSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        programs={programs}
        activeProgramId={activeProgram?.id}
        onSelectProgram={openWeeks}
        onCreateNew={openCalibration}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  switchBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
