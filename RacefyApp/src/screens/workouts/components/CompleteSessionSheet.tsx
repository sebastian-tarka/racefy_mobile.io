import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button, Input, ScreenContainer } from '../../../components';
import { useTheme } from '../../../hooks/useTheme';
import type { ActivityVisibility, WorkoutSessionCompleteInput } from '../../../types/workouts';
import { borderRadius, fontSize, msFont, spacing } from '../../../theme';
import { formatTime } from '../../../utils/formatters';
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
  /** What is about to be saved — shown on top so the athlete sees it before confirming. */
  summary?: { setsCompleted: number; setsTotal: number; volumeKg: number; seconds: number };
}

const RPE_ROWS = [
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10],
];
const VISIBILITIES: { value: ActivityVisibility; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'public', icon: 'globe-outline' },
  { value: 'followers', icon: 'people-outline' },
  { value: 'private', icon: 'lock-closed-outline' },
];

/** Borg CR10 bands, so the number the athlete picks reads as words too. */
function rpeLevel(n: number): 'easy' | 'moderate' | 'hard' | 'veryHard' | 'max' {
  if (n <= 3) return 'easy';
  if (n <= 6) return 'moderate';
  if (n <= 8) return 'hard';
  if (n === 9) return 'veryHard';
  return 'max';
}

const toInt = (value: string) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Summary, RPE 1–10, notes, visibility (+ duration after an overrun) → the
 * session becomes an activity. The controls span the full width and the save
 * button sits pinned at the bottom, within thumb reach, instead of floating
 * under the form with half the screen left empty.
 */
export function CompleteSessionSheet({
  visible,
  onClose,
  onSubmit,
  durationPrompt,
  summary,
}: Props) {
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

  const stats = summary
    ? [
        {
          label: t('strengthPlans.complete.sets'),
          value: `${summary.setsCompleted}/${summary.setsTotal}`,
        },
        {
          label: t('strengthPlans.complete.volume'),
          value: `${Math.round(summary.volumeKg)} kg`,
        },
        {
          label: t('strengthPlans.complete.time'),
          value: formatTime(asksDuration ? durationSeconds : summary.seconds),
        },
      ]
    : [];

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
          <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel={t('common.close')}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {stats.length > 0 && (
              <View style={styles.statsRow}>
                {stats.map((s) => (
                  <View
                    key={s.label}
                    style={[
                      styles.statTile,
                      { backgroundColor: colors.cardBackground, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>{s.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                      {s.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {asksDuration && (
              <View style={styles.section}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>
                  {t('strengthPlans.complete.duration')}
                </Text>
                <Text style={[styles.hint, { color: colors.warning }]}>
                  {t('strengthPlans.complete.durationOverrun')}
                </Text>
                <View style={styles.durationRow}>
                  <View style={styles.flex}>
                    <Input
                      label={t('strengthPlans.complete.hours')}
                      value={hours}
                      onChangeText={setHours}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                  <View style={styles.flex}>
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
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>
                  {t('strengthPlans.complete.rpe')}
                </Text>
                <Text style={[styles.rpeValue, { color: colors.primary }]}>
                  {rpe != null
                    ? `${rpe} · ${t(`strengthPlans.complete.rpeLevels.${rpeLevel(rpe)}`)}`
                    : ''}
                </Text>
              </View>
              {RPE_ROWS.map((row) => (
                <View key={row[0]} style={styles.rpeRow}>
                  {row.map((n) => {
                    const active = rpe === n;
                    return (
                      <TouchableOpacity
                        key={n}
                        style={[
                          styles.rpeTile,
                          {
                            backgroundColor: active ? colors.primary : colors.cardBackground,
                            borderColor: active ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setRpe(active ? null : n)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`${n}, ${t(`strengthPlans.complete.rpeLevels.${rpeLevel(n)}`)}`}
                      >
                        <Text
                          style={[
                            styles.rpeText,
                            { color: active ? colors.onPrimary : colors.textPrimary },
                          ]}
                        >
                          {n}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
              <View style={styles.rpeScale}>
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                  {t('strengthPlans.complete.rpeLevels.easy')}
                </Text>
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                  {t('strengthPlans.complete.rpeLevels.max')}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                {t('strengthPlans.complete.visibility')}
              </Text>
              <View style={styles.visibilityRow} accessibilityRole="radiogroup">
                {VISIBILITIES.map(({ value, icon }) => {
                  const active = visibility === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.visibilityTile,
                        {
                          backgroundColor: active ? colors.primary + '1f' : colors.cardBackground,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setVisibility(value)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                    >
                      <Ionicons
                        name={icon}
                        size={20}
                        color={active ? colors.primary : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.visibilityText,
                          { color: active ? colors.primary : colors.textPrimary },
                        ]}
                        numberOfLines={1}
                      >
                        {t(`strengthPlans.complete.visibilityOptions.${value}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Input
              label={t('strengthPlans.complete.notes')}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('strengthPlans.complete.notesPlaceholder')}
              multiline
              numberOfLines={4}
              style={styles.notes}
            />
          </ScrollView>

          {/* Pinned: the one action of this sheet stays in thumb reach. */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Button
              title={t('strengthPlans.complete.submit')}
              onPress={submit}
              loading={submitting}
              disabled={durationInvalid}
              fullWidth
            />
          </View>
        </KeyboardAvoidingView>
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
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  flex: {
    flex: 1,
  },
  section: {
    gap: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statTile: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: 2,
  },
  statValue: {
    fontSize: msFont(22),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: fontSize.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  rpeValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  rpeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rpeTile: {
    flex: 1,
    height: 56,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpeText: {
    fontSize: msFont(20),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  rpeScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hint: {
    fontSize: fontSize.xs,
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  visibilityTile: {
    flex: 1,
    height: 64,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  visibilityText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  notes: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  durationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
  },
});
