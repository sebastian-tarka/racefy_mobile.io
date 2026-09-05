import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '../../../components';
import { useTheme } from '../../../hooks/useTheme';
import { api } from '../../../services/api';
import { logger } from '../../../services/logger';
import type { Exercise, ExerciseReference } from '../../../types/workouts';
import { borderRadius, fontSize, spacing } from '../../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Either a library row (`{ id }`) or a brand-new name (`{ name }`). */
  onSelect: (ref: ExerciseReference, exercise?: Exercise) => void;
}

const SEARCH_DEBOUNCE_MS = 250;

/**
 * Searches the athlete's library plus the global one; typing a name nobody
 * has yet offers to create it — the backend's `ExerciseResolver` does the
 * matching, so a near-duplicate still lands on the existing row.
 */
export function ExercisePickerModal({ visible, onClose, onSelect }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const page = await api.listExercises({ q: query.trim() || undefined, per_page: 50 });
        if (!cancelled) setResults(page.data);
      } catch (err) {
        logger.warn('api', 'Exercise search failed', { error: err });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, visible]);

  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const trimmed = query.trim();
  const exactExists = useMemo(
    () => results.some((e) => e.name.toLowerCase() === trimmed.toLowerCase()),
    [results, trimmed],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScreenContainer>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('strengthPlans.picker.title')}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

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
            placeholder={t('strengthPlans.picker.search')}
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            autoFocus
            autoCorrect={false}
          />
          {loading && <ActivityIndicator size="small" color={colors.primary} />}
        </View>

        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            trimmed.length > 0 && !exactExists ? (
              <TouchableOpacity
                style={[styles.row, styles.createRow, { borderColor: colors.primary }]}
                onPress={() => onSelect({ name: trimmed })}
                activeOpacity={0.8}
              >
                <View style={[styles.icon, { backgroundColor: colors.primary + '22' }]}>
                  <Ionicons name="add" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.rowTitle, { color: colors.primary, flex: 1 }]}>
                  {t('strengthPlans.picker.createNew', { name: trimmed })}
                </Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            !loading ? (
              <Text style={[styles.empty, { color: colors.textMuted }]}>
                {t('strengthPlans.picker.noResults')}
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.row,
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
              ]}
              onPress={() => onSelect({ id: item.id }, item)}
              activeOpacity={0.8}
            >
              <View style={[styles.icon, { backgroundColor: colors.background }]}>
                <Ionicons name="barbell-outline" size={18} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.rowSub, { color: colors.textMuted }]} numberOfLines={1}>
                  {t(`strengthPlans.muscleGroups.${item.muscle_group}`)}
                  {item.equipment ? ` · ${item.equipment}` : ''}
                </Text>
              </View>
              <Text style={[styles.scope, { color: colors.textMuted }]}>
                {t(item.is_global ? 'strengthPlans.picker.global' : 'strengthPlans.picker.mine')}
              </Text>
            </TouchableOpacity>
          )}
        />
      </ScreenContainer>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  createRow: {
    borderStyle: 'dashed',
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  scope: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    padding: spacing.lg,
    fontSize: fontSize.sm,
  },
});
