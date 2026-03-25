import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { TrainingProgram } from '../../types/api';

interface ProgramSelectorProps {
  programs: TrainingProgram[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  canCreateNew: boolean;
  onCreateNew: () => void;
}

export function ProgramSelector({
  programs,
  selectedId,
  onSelect,
  canCreateNew,
  onCreateNew,
}: ProgramSelectorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      decelerationRate="fast"
      snapToInterval={128 + spacing.sm}
    >
      {programs.map((program) => {
        const isSelected = program.id === selectedId;
        const isPaused = program.status === 'paused';

        return (
          <TouchableOpacity
            key={program.id}
            style={[
              styles.card,
              {
                borderColor: isSelected ? colors.primary : colors.border,
                backgroundColor: isSelected ? colors.primary + '08' : colors.cardBackground,
              },
              isSelected && styles.cardSelected,
            ]}
            onPress={() => onSelect(program.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.cardName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {program.name}
            </Text>
            <Text style={[styles.cardProgress, { color: colors.textSecondary }]}>
              {t('training.programSelector.weekProgress', {
                current: program.current_week_number || 0,
                total: program.total_weeks,
              })}
            </Text>
            <View style={styles.statusRow}>
              {isPaused ? (
                <>
                  <Ionicons name="pause" size={10} color={colors.textMuted} />
                  <Text style={[styles.statusText, { color: colors.textMuted }]}>
                    {t('training.programSelector.paused')}
                  </Text>
                </>
              ) : (
                <>
                  <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.statusText, { color: colors.primary }]}>
                    {t('training.programSelector.active')}
                  </Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      {/* New Program Card */}
      <TouchableOpacity
        style={[
          styles.card,
          styles.newCard,
          { borderColor: colors.border, backgroundColor: colors.cardBackground },
        ]}
        onPress={onCreateNew}
        activeOpacity={0.7}
      >
        {canCreateNew ? (
          <>
            <Ionicons name="add-circle-outline" size={24} color={colors.textMuted} />
            <Text style={[styles.newCardText, { color: colors.textMuted }]}>
              {t('training.programSelector.newProgram')}
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="lock-closed-outline" size={24} color={colors.textMuted} />
            <Text style={[styles.newCardText, { color: colors.textMuted }]}>
              {t('training.programSelector.upgrade')}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  card: {
    width: 120,
    height: 80,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    padding: spacing.sm,
    justifyContent: 'center',
  },
  cardSelected: {
    transform: [{ scale: 1.02 }],
  },
  cardName: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardProgress: {
    fontSize: fontSize.xs,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  newCard: {
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  newCardText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    textAlign: 'center',
  },
});