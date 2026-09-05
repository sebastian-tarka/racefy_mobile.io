import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button, Input, OptionSelector, ScreenContainer } from '../../../components';
import { useTheme } from '../../../hooks/useTheme';
import type { ActivityVisibility, WorkoutSessionCompleteInput } from '../../../types/workouts';
import { borderRadius, fontSize, spacing } from '../../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: WorkoutSessionCompleteInput) => Promise<void>;
}

const RPE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const VISIBILITIES: ActivityVisibility[] = ['public', 'followers', 'private'];

/** RPE 1–10, notes, visibility → the session becomes an activity. */
export function CompleteSessionSheet({ visible, onClose, onSubmit }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [visibility, setVisibility] = useState<ActivityVisibility>('followers');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        rpe: rpe ?? undefined,
        notes: notes.trim() || null,
        visibility,
      });
    } finally {
      setSubmitting(false);
    }
  };

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
            {t('strengthPlans.complete.title')}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            {t('strengthPlans.complete.rpe')}
          </Text>
          <View style={styles.rpeRow}>
            {RPE.map((n) => {
              const active = rpe === n;
              return (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.rpeChip,
                    {
                      backgroundColor: active ? colors.primary : colors.cardBackground,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setRpe(active ? null : n)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[styles.rpeText, { color: active ? '#ffffff' : colors.textPrimary }]}
                  >
                    {n}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            {t('strengthPlans.complete.rpeHint')}
          </Text>

          <Input
            label={t('strengthPlans.complete.notes')}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          <OptionSelector<ActivityVisibility>
            label={t('strengthPlans.complete.visibility')}
            value={visibility}
            onChange={setVisibility}
            options={VISIBILITIES.map((v) => ({
              value: v,
              label: t(`strengthPlans.complete.visibilityOptions.${v}`),
            }))}
          />

          <Button
            title={t('strengthPlans.complete.submit')}
            onPress={submit}
            loading={submitting}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </ScrollView>
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
  content: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  rpeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  rpeChip: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpeText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  hint: {
    fontSize: fontSize.xs,
  },
});
