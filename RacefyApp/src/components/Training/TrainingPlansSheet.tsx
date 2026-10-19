import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, fontSize, spacing, msFont } from '../../theme';
import type { TrainingProgram } from '../../types/api';
import { TrainingProgramRow } from './TrainingProgramRow';
import { SheetModal } from '../SheetModal';

interface TrainingPlansSheetProps {
  visible: boolean;
  onClose: () => void;
  programs: TrainingProgram[];
  activeProgramId?: number | null;
  onSelectProgram: (program: TrainingProgram) => void;
  onCreateNew: () => void;
}

/**
 * Bottom sheet listing the user's training programs (rendered with the same
 * {@link TrainingProgramRow} used on the profile screen) plus a "create new plan"
 * action. Opened by long-pressing the training card on the profile.
 */
export function TrainingPlansSheet({
  visible,
  onClose,
  programs,
  activeProgramId,
  onSelectProgram,
  onCreateNew,
}: TrainingPlansSheetProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const handleSelect = (program: TrainingProgram) => {
    onClose();
    onSelectProgram(program);
  };

  const handleCreate = () => {
    onClose();
    onCreateNew();
  };

  return (
    <SheetModal visible={visible} onClose={onClose} style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>
          {t('training.yourPlans', { count: programs.length })}
        </Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {programs.map((program) => (
          <TrainingProgramRow
            key={program.id}
            program={program}
            active={program.id === activeProgramId}
            onPress={() => handleSelect(program)}
            trailing={<Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
          />
        ))}

        <TouchableOpacity
          style={[styles.createRow, { borderColor: colors.borderLight }]}
          onPress={handleCreate}
          activeOpacity={0.8}
        >
          <View style={[styles.createIcon, { backgroundColor: colors.ai + '22' }]}>
            <Ionicons name="sparkles" size={20} color={colors.ai} />
          </View>
          <View style={styles.createText}>
            <Text style={[styles.createTitle, { color: colors.textPrimary }]}>
              {t('training.createPlan')}
            </Text>
            <Text style={[styles.createSub, { color: colors.textSecondary }]}>
              {t('training.createPlanDesc')}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.cancelButton,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.background },
        ]}
        onPress={onClose}
        activeOpacity={0.7}
      >
        <Text style={[styles.cancelText, { color: colors.textPrimary }]}>{t('common.cancel')}</Text>
      </TouchableOpacity>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    maxHeight: '85%',
  },
  header: {
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  createIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  createText: {
    flex: 1,
    marginRight: 8,
  },
  createTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  createSub: {
    fontSize: msFont(11),
    marginTop: 1,
  },
  cancelButton: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
