import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../hooks/useTheme';
import { useLiveBroadcastControl } from '../hooks/useLiveBroadcastControl';
import { triggerHaptic } from '../hooks/useHaptics';
import { borderRadius, fontSize, spacing } from '../theme';
import { BottomSheet } from './BottomSheet';
import type { LiveVisibility } from '../types/api';

interface Props {
  activityId: number | null;
  /** Base web URL used to build the `selected`-mode share link. */
  shareBaseUrl?: string;
  /** Reports broadcast state up so siblings (e.g. the message inbox) can react. */
  onBroadcastingChange?: (isBroadcasting: boolean) => void;
}

const VISIBILITIES: { value: LiveVisibility; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'followers', icon: 'people-outline' },
  { value: 'public', icon: 'earth-outline' },
  { value: 'selected', icon: 'link-outline' },
];

/**
 * Broadcast toggle for the recording screen.
 *
 * Two rules drive this design, both from the live implementation guide:
 * - Turning it ON is always a deliberate, informed choice — the athlete is told
 *   who will see their real-time location before anything is sent.
 * - Turning it OFF is ONE TAP, right here, never behind a settings screen. The
 *   athlete is running; they cannot go hunting through menus to stop sharing
 *   their position.
 */
export function LiveBroadcastControl({ activityId, shareBaseUrl, onBroadcastingChange }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isBroadcasting, visibility, shareToken, isBusy, enable, disable } =
    useLiveBroadcastControl(activityId);
  const [pickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    onBroadcastingChange?.(isBroadcasting);
  }, [isBroadcasting, onBroadcastingChange]);

  const confirmEnable = (next: LiveVisibility) => {
    setPickerVisible(false);
    // Say plainly what is being shared and with whom, before it starts.
    Alert.alert(t('live.broadcast.confirmTitle'), t(`live.broadcast.confirmMessage.${next}`), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('live.broadcast.startSharing'),
        onPress: async () => {
          const ok = await enable(next);
          if (!ok) Alert.alert(t('common.error'), t('live.broadcast.enableFailed'));
        },
      },
    ]);
  };

  const handlePress = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    if (isBroadcasting) {
      // One tap, no confirmation: stopping must never be obstructed.
      const ok = await disable();
      if (!ok) Alert.alert(t('common.error'), t('live.broadcast.disableFailed'));
      return;
    }
    setPickerVisible(true);
  };

  const handleShareLink = async () => {
    if (!shareToken || !activityId) return;
    const url = `${shareBaseUrl ?? 'https://racefy.io'}/live/${activityId}/join?token=${shareToken}`;
    await Share.share({ message: t('live.broadcast.shareMessage', { url }) });
  };

  if (!activityId) return null;

  const accent = isBroadcasting ? colors.error : colors.textSecondary;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={isBusy}
        accessibilityRole="button"
        accessibilityLabel={
          isBroadcasting ? t('live.broadcast.stopA11y') : t('live.broadcast.startA11y')
        }
        style={[styles.pill, { backgroundColor: accent + '1f', borderColor: accent + '55' }]}
      >
        {isBusy ? (
          <ActivityIndicator size="small" color={accent} />
        ) : (
          <Ionicons name={isBroadcasting ? 'radio' : 'radio-outline'} size={16} color={accent} />
        )}
        <Text style={[styles.pillText, { color: accent }]} numberOfLines={1}>
          {isBroadcasting
            ? t(`live.broadcast.liveWith.${visibility ?? 'followers'}`)
            : t('live.broadcast.start')}
        </Text>
        {isBroadcasting && <Ionicons name="close-circle" size={16} color={accent} />}
      </TouchableOpacity>

      {/* `selected` is the "send it to my partner, nobody else" mode — the link
          is useless unless the athlete can actually hand it over. */}
      {isBroadcasting && visibility === 'selected' && !!shareToken && (
        <TouchableOpacity onPress={handleShareLink} style={styles.shareButton}>
          <Ionicons name="link-outline" size={16} color={colors.primary} />
          <Text style={[styles.shareText, { color: colors.primary }]}>
            {t('live.broadcast.shareLink')}
          </Text>
        </TouchableOpacity>
      )}

      <BottomSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        title={t('live.broadcast.pickAudience')}
        options={VISIBILITIES.map(({ value, icon }) => ({
          id: value,
          icon,
          title: t(`live.visibility.${value}`),
          description: t(`live.visibilityDesc.${value}`),
          onPress: () => confirmEnable(value),
        }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  pillText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  shareText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
