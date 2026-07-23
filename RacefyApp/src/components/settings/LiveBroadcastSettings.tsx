import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../hooks/useTheme';
import { useLivePreferences } from '../../hooks/useLivePreferences';
import { borderRadius, fontSize, spacing } from '../../theme';
import type { LiveVisibility } from '../../types/api';

const VISIBILITY_ORDER: LiveVisibility[] = ['followers', 'public', 'selected'];

/**
 * The "Live broadcasting" settings block.
 *
 * These are consents, not cosmetic switches, so each one is written as a full
 * sentence saying what it actually permits — a bare label like "Comments" tells
 * the user nothing about what they are agreeing to.
 *
 * Note what is NOT here: the broadcast on/off switch. Starting and stopping a
 * broadcast lives on the recording screen, because an athlete who wants to stop
 * sharing their position must never have to find a settings screen first.
 */
export function LiveBroadcastSettings() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { preferences, isLoading, isSaving, update } = useLivePreferences();

  const cycleVisibility = () => {
    const current = VISIBILITY_ORDER.indexOf(preferences.transmission_visibility);
    const next = VISIBILITY_ORDER[(current + 1) % VISIBILITY_ORDER.length];
    update({ transmission_visibility: next });
  };

  const disabled = isLoading || isSaving;

  return (
    <View style={styles.container}>
      <Text style={[styles.intro, { color: colors.textSecondary }]}>
        {t('live.settings.intro')}
      </Text>

      {/* Default audience — applies when a broadcast is started without an
          explicit choice, so it needs to be visible outside the heat of a run. */}
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: colors.border }]}
        onPress={cycleVisibility}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Ionicons name="eye-outline" size={22} color={colors.textSecondary} />
        <View style={styles.rowBody}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            {t('live.settings.visibilityLabel')}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {t(`live.visibilityDesc.${preferences.transmission_visibility}`)}
          </Text>
        </View>
        <Text style={[styles.value, { color: colors.primary }]}>
          {t(`live.visibility.${preferences.transmission_visibility}`)}
        </Text>
      </TouchableOpacity>

      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.textSecondary} />
        <View style={styles.rowBody}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            {t('live.settings.commentsLabel')}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {t('live.settings.commentsDescription')}
          </Text>
        </View>
        <Switch
          value={preferences.allow_live_comments}
          onValueChange={(value) => {
            update({ allow_live_comments: value });
          }}
          trackColor={{ false: colors.border, true: colors.primaryLight }}
          thumbColor={preferences.allow_live_comments ? colors.primary : colors.white}
          disabled={disabled}
        />
      </View>

      <View style={styles.row}>
        <Ionicons name="volume-high-outline" size={22} color={colors.textSecondary} />
        <View style={styles.rowBody}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            {t('live.settings.ttsLabel')}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {t('live.settings.ttsDescription')}
          </Text>
        </View>
        <Switch
          value={preferences.tts_incoming}
          onValueChange={(value) => {
            update({ tts_incoming: value });
          }}
          trackColor={{ false: colors.border, true: colors.primaryLight }}
          thumbColor={preferences.tts_incoming ? colors.primary : colors.white}
          // Reading messages aloud is pointless if nobody may send any.
          disabled={disabled || !preferences.allow_live_comments}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  intro: {
    fontSize: fontSize.sm,
    lineHeight: 19,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  description: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  value: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    borderRadius: borderRadius.sm,
  },
});
