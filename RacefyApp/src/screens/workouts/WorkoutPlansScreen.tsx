import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomSheet, Button, ScreenContainer, ScreenHeader } from '../../components';
import type { BottomSheetOption } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { emitRefresh, useRefreshOn } from '../../services/refreshEvents';
import { borderRadius, fontSize, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { WorkoutPlan } from '../../types/workouts';
import { PlanStatusPill } from './components/PlanStatusPill';
import { ResumeSessionBanner } from './components/ResumeSessionBanner';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutPlans'>;

export function WorkoutPlansScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [addSheet, setAddSheet] = useState(false);
  const [planSheet, setPlanSheet] = useState<WorkoutPlan | null>(null);

  const fetchPlans = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setIsRefreshing(true);
    else setIsLoading(true);
    try {
      setPlans(await api.listWorkoutPlans());
    } catch (error: any) {
      logger.error('api', 'Failed to load workout plans', { error: error.message });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchPlans();
    }, [fetchPlans]),
  );
  useRefreshOn('workouts', () => void fetchPlans());

  const run = async (action: () => Promise<unknown>, toast: string) => {
    try {
      await action();
      emitRefresh('workouts');
      Alert.alert('', toast);
    } catch (error: any) {
      Alert.alert('', error.message || t('common.error'));
    }
  };

  const activate = (plan: WorkoutPlan) =>
    Alert.alert('', t('strengthPlans.confirm.activate'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('strengthPlans.actions.activate'),
        onPress: () =>
          run(() => api.activateWorkoutPlan(plan.id), t('strengthPlans.toast.activated')),
      },
    ]);

  const remove = (plan: WorkoutPlan) =>
    Alert.alert('', t('strengthPlans.confirm.deletePlan'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('strengthPlans.actions.delete'),
        style: 'destructive',
        onPress: () =>
          run(() => api.deleteWorkoutPlan(plan.id), t('strengthPlans.toast.planDeleted')),
      },
    ]);

  const addOptions: BottomSheetOption[] = [
    {
      id: 'new',
      icon: 'add-circle-outline',
      title: t('strengthPlans.newPlan'),
      onPress: () => navigation.navigate('WorkoutPlanForm'),
    },
    {
      id: 'import',
      icon: 'cloud-upload-outline',
      title: t('strengthPlans.importXlsx'),
      onPress: () => navigation.navigate('WorkoutPlanImport'),
    },
    {
      id: 'library',
      icon: 'library-outline',
      title: t('strengthPlans.library'),
      onPress: () => navigation.navigate('ExerciseLibrary'),
    },
  ];

  const planOptions = (plan: WorkoutPlan): BottomSheetOption[] => [
    ...(plan.status !== 'active'
      ? [
          {
            id: 'activate',
            icon: 'checkmark-circle-outline' as const,
            title: t('strengthPlans.actions.activate'),
            onPress: () => activate(plan),
          },
        ]
      : []),
    {
      id: 'duplicate',
      icon: 'copy-outline',
      title: t('strengthPlans.actions.duplicate'),
      onPress: () =>
        run(() => api.duplicateWorkoutPlan(plan.id), t('strengthPlans.toast.duplicated')),
    },
    {
      id: 'edit',
      icon: 'create-outline',
      title: t('strengthPlans.actions.editPlan'),
      onPress: () => navigation.navigate('WorkoutPlanForm', { planId: plan.id }),
    },
    {
      id: 'delete',
      icon: 'trash-outline',
      title: t('strengthPlans.actions.deletePlan'),
      color: colors.error,
      onPress: () => remove(plan),
    },
  ];

  const renderPlan = ({ item }: { item: WorkoutPlan }) => (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          borderColor: item.status === 'active' ? colors.primary : colors.border,
        },
      ]}
      onPress={() => navigation.navigate('WorkoutPlanDetail', { planId: item.id })}
      onLongPress={() => setPlanSheet(item)}
      activeOpacity={0.8}
    >
      <View style={[styles.iconCircle, { backgroundColor: colors.primary + '22' }]}>
        <Ionicons name="barbell" size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.cardSub, { color: colors.textSecondary }]} numberOfLines={1}>
          {t('strengthPlans.workoutsCount', { count: item.workouts_count ?? 0 })}
          {item.goal ? ` · ${item.goal}` : ''}
        </Text>
      </View>
      <PlanStatusPill status={item.status} />
      <TouchableOpacity
        onPress={() => setPlanSheet(item)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer edges={['top']}>
      <ScreenHeader
        title={t('strengthPlans.title')}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={() => setAddSheet(true)} hitSlop={8}>
            <Ionicons name="add" size={26} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPlan}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<ResumeSessionBanner />}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => fetchPlans('refresh')} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="barbell-outline" size={56} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {t('strengthPlans.empty')}
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
                {t('strengthPlans.emptyHint')}
              </Text>
              <View style={styles.emptyActions}>
                <Button
                  title={t('strengthPlans.newPlan')}
                  onPress={() => navigation.navigate('WorkoutPlanForm')}
                />
                <Button
                  title={t('strengthPlans.importXlsx')}
                  variant="outline"
                  onPress={() => navigation.navigate('WorkoutPlanImport')}
                />
              </View>
            </View>
          }
        />
      )}

      <BottomSheet visible={addSheet} onClose={() => setAddSheet(false)} options={addOptions} />
      <BottomSheet
        visible={planSheet != null}
        onClose={() => setPlanSheet(null)}
        title={planSheet?.name}
        options={planSheet ? planOptions(planSheet) : []}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  cardSub: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  emptyActions: {
    marginTop: spacing.md,
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
});
