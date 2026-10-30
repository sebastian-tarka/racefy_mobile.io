import React, { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button, Input, OptionSelector, ScreenContainer } from '../../../components';
import { useTheme } from '../../../hooks/useTheme';
import type { ActivityVisibility, WorkoutSessionCompleteInput } from '../../../types/workouts';
import { borderRadius, fontSize, spacing } from '../../../theme';
import { MAX_SESSION_DURATION_SECONDS } from '../../../utils/sessionDuration';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: WorkoutSessionCompleteInput) => Promise<void>;
  /**
   * Set when the session clock overran: the sheet then asks for the real
   * duration, prefilled with `suggested` (read once, when the sheet opens).
   */
  durationPrompt?: { suggested: number | null } | null;
}

const RPE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const VISIBILITIES: ActivityVisibility[] = ['public', 'followers', 'private'];

const toInt = (value: string) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** RPE 1–10, notes, visibility (+ duration after an overrun) → the session becomes an activity. */
export function CompleteSessionSheet({ visible, onClose, onSubmit, durationPrompt }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [visibility, setVisibility] = useState<ActivityVisibility>('followers');
  const [submitting, setSubmitting] = useState(false);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');

  const asksDuration = !!durationPrompt;
  // The suggestion ticks with the session clock; reading it through a ref
  // keeps it from overwriting what the athlete is typing.
  const suggestedRef = useRef<number | null>(null);
  suggestedRef.current = durationPrompt?.suggested ?? null;
  useEffect(() => {
    if (!visible || !asksDuration) return;
    const suggested = suggestedRef.current;
    setHours(suggested != null ? String(Math.floor(suggested / 3600)) : '');
    setMinutes(suggested != null ? String(Math.floor((suggested % 3600) / 60)) : '');
  }, [visible, asksDuration]);

  const durationSeconds = toInt(hours) * 3600 + toInt(minutes) * 60;
  const tooLong = durationSeconds > MAX_SESSION_DURATION_SECONDS;
  const durationInvalid = asksDuration && (durationSeconds === 0 || tooLong);

  const submit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        ...(asksDuration ? { duration_seconds: durationSeconds } : {}),
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
          {asksDuration && (
            <>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                {t('strengthPlans.complete.duration')}
              </Text>
              <Text style={[styles.hint, { color: colors.warning }]}>
                {t('strengthPlans.complete.durationOverrun')}
              </Text>
              <View style={styles.durationRow}>
                <View style={styles.durationField}>
                  <Input
                    label={t('strengthPlans.complete.hours')}
                    value={hours}
                    onChangeText={setHours}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <View style={styles.durationField}>
                  <Input
                    label={t('strengthPlans.complete.minutes')}
                    value={minutes}
                    onChangeText={setMinutes}
                    keyboardType="number-pad"
                    maxLength={3}
                    error={tooLong ? t('strengthPlans.complete.durationMax') : null}
                  />
                </View>
              </View>
            </>
          )}

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
            disabled={durationInvalid}
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
  durationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  durationField: {
    flex: 1,
  },
});
