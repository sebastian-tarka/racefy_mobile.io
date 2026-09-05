import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomSheet, ScreenContainer, ScreenHeader } from '../../components';
import type { BottomSheetOption } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { emitRefresh, useRefreshOn } from '../../services/refreshEvents';
import { borderRadius, fontSize, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { Exercise, MuscleGroup } from '../../types/workouts';
import { MUSCLE_GROUPS } from '../../types/workouts';

type Props = NativeStackScreenProps<RootStackParamList, 'ExerciseLibrary'>;
type Scope = 'all' | 'mine' | 'global';

const SEARCH_DEBOUNCE_MS = 250;
const PAGE_SIZE = 50;

export function ExerciseLibraryScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const [items, setItems] = useState<Exercise[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<Exercise | null>(null);

  const load = useCallback(
    async (nextPage: number, append: boolean) => {
      setLoading(true);
      try {
        const res = await api.listExercises({
          q: query.trim() || undefined,
          scope,
          muscle_group: group ?? undefined,
          page: nextPage,
          per_page: PAGE_SIZE,
        });
        setItems((prev) => (append ? [...prev, ...res.data] : res.data));
        setPage(nextPage);
        setLastPage(res.meta?.last_page ?? 1);
      } catch (error: any) {
        logger.error('api', 'Failed to load exercises', { error: error.message });
      } finally {
        setLoading(false);
      }
    },
    [query, scope, group],
  );

  useEffect(() => {
    const timer = setTimeout(() => void load(1, false), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load(1, false);
    }, [load]),
  );
  useRefreshOn('workouts', () => void load(1, false));

  const remove = (exercise: Exercise) =>
    Alert.alert('', t('strengthPlans.confirm.deleteExercise'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('strengthPlans.actions.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteExercise(exercise.id);
            emitRefresh('workouts');
            Alert.alert('', t('strengthPlans.toast.exerciseDeleted'));
          } catch (error: any) {
            if (error.status === 409) {
              const count =
                error.usage_count ?? error.data?.usage_count ?? exercise.usage_count ?? 0;
              Alert.alert('', t('strengthPlans.errors.inUse', { count }));
            } else {
              Alert.alert('', error.message || t('common.error'));
            }
          }
        },
      },
    ]);

  const options = (exercise: Exercise): BottomSheetOption[] => [
    ...(exercise.video_url
      ? [
          {
            id: 'video',
            icon: 'logo-youtube' as const,
            title: t('strengthPlans.actions.openVideo'),
            onPress: () => void Linking.openURL(exercise.video_url as string),
          },
        ]
      : []),
    ...(!exercise.is_global
      ? [
          {
            id: 'edit',
            icon: 'create-outline' as const,
            title: t('strengthPlans.actions.edit'),
            onPress: () => navigation.navigate('ExerciseForm', { exerciseId: exercise.id }),
          },
          {
            id: 'delete',
            icon: 'trash-outline' as const,
            title: t('strengthPlans.actions.delete'),
            color: colors.error,
            onPress: () => remove(exercise),
          },
        ]
      : []),
  ];

  return (
    <ScreenContainer edges={['top']}>
      <ScreenHeader
        title={t('strengthPlans.libraryScreen.title')}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={() => navigation.navigate('ExerciseForm')} hitSlop={8}>
            <Ionicons name="add" size={26} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <View
        style={[
          styles.searchBox,
          { backgroundColor: colors.cardBackground, borderColor: colors.border },
        ]}
      >
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('strengthPlans.libraryScreen.search')}
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.textPrimary }]}
          autoCorrect={false}
        />
      </View>

      <View style={styles.scopeRow}>
        {(['all', 'mine', 'global'] as Scope[]).map((s) => (
          <TouchableOpacity
            key={s}
            style={[
              styles.scopeChip,
              {
                backgroundColor: scope === s ? colors.primary : colors.cardBackground,
                borderColor: scope === s ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setScope(s)}
          >
            <Text
              style={[styles.chipText, { color: scope === s ? '#ffffff' : colors.textPrimary }]}
            >
              {t(`strengthPlans.libraryScreen.${s}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.groupRow}
      >
        {MUSCLE_GROUPS.map((g) => {
          const active = group === g;
          return (
            <TouchableOpacity
              key={g}
              style={[
                styles.groupChip,
                {
                  backgroundColor: active ? colors.primary + '22' : colors.cardBackground,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setGroup(active ? null : g)}
            >
              <Text
                style={[styles.chipText, { color: active ? colors.primary : colors.textSecondary }]}
              >
                {t(`strengthPlans.muscleGroups.${g}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        onEndReached={() => {
          if (!loading && page < lastPage) void load(page + 1, true);
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={loading ? <ActivityIndicator color={colors.primary} /> : null}
        ListEmptyComponent={
          !loading ? (
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              {t('strengthPlans.libraryScreen.empty')}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.row,
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
            ]}
            onPress={() =>
              item.is_global
                ? setSheet(item)
                : navigation.navigate('ExerciseForm', { exerciseId: item.id })
            }
            onLongPress={() => setSheet(item)}
            activeOpacity={0.8}
          >
            <View style={[styles.icon, { backgroundColor: colors.background }]}>
              <Ionicons name="barbell-outline" size={18} color={colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
                {t(`strengthPlans.muscleGroups.${item.muscle_group}`)}
                {item.equipment ? ` · ${item.equipment}` : ''}
                {item.usage_count
                  ? ` · ${t('strengthPlans.libraryScreen.usedIn', { count: item.usage_count })}`
                  : ''}
              </Text>
            </View>
            {item.is_global && (
              <View style={[styles.globalPill, { backgroundColor: colors.info + '22' }]}>
                <Text style={[styles.globalText, { color: colors.info }]}>
                  {t('strengthPlans.libraryScreen.globalBadge')}
                </Text>
              </View>
            )}
            {item.video_url ? (
              <Ionicons name="logo-youtube" size={18} color={colors.error} />
            ) : null}
            <TouchableOpacity onPress={() => setSheet(item)} hitSlop={10}>
              <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />

      <BottomSheet
        visible={sheet != null}
        onClose={() => setSheet(null)}
        title={sheet?.name}
        options={sheet ? options(sheet) : []}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
  },
  scopeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  scopeChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  groupRow: {
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  groupChip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  meta: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  globalPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  globalText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  empty: {
    textAlign: 'center',
    padding: spacing.xl,
    fontSize: fontSize.sm,
  },
});
