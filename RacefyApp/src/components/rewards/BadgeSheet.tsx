import React from 'react';
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { rarityColor } from './BadgeTile';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, msFont, spacing } from '../../theme';
import type { BadgeReward } from '../../types/api';

interface Props {
  reward: BadgeReward | null;
  onClose: () => void;
}

/**
 * Badge detail (design "Racefy v2" → BadgeSheet).
 *
 * Name, description, when it was earned and what it came from — no "how to
 * earn this" for badges the athlete does not have: the server sends no
 * criteria, so the cabinet shows what exists rather than inventing empty slots
 * it cannot explain.
 */
export function BadgeSheet({ reward, onClose }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const badge = reward?.badge;
  const tint = badge ? rarityColor(badge) : colors.primary;

  return (
    <Modal visible={!!reward} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.cardBackground,
                  paddingBottom: Math.max(insets.bottom, spacing.lg),
                },
              ]}
            >
              <View style={styles.handleWrap}>
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
              </View>

              {badge && reward && (
                <View style={styles.body}>
                  <LinearGradient
                    colors={[`${tint}2e`, `${tint}0a`]}
                    start={{ x: 0.1, y: 0 }}
                    end={{ x: 0.9, y: 1 }}
                    style={[styles.face, { borderColor: tint }]}
                  >
                    {badge.icon_url ? (
                      <Image source={{ uri: badge.icon_url }} style={styles.faceImage} />
                    ) : (
                      <Text style={styles.faceEmoji}>{badge.icon_emoji || badge.icon || '🏅'}</Text>
                    )}
                  </LinearGradient>

                  <Text style={[styles.rarity, { color: tint }]}>
                    {t(`rewards.rarity.${badge.rarity}`)}
                  </Text>
                  <Text style={[styles.name, { color: colors.textPrimary }]}>{badge.name}</Text>
                  {!!badge.description && (
                    <Text style={[styles.description, { color: colors.textSecondary }]}>
                      {badge.description}
                    </Text>
                  )}

                  <View style={styles.metaRow}>
                    <Meta
                      label={t('rewards.badgeSheet.earned')}
                      value={new Date(reward.earned_at).toLocaleDateString()}
                    />
                    {!!reward.metadata?.event_id && (
                      <Meta
                        label={t('rewards.badgeSheet.from')}
                        value={t('rewards.badgeSheet.fromEvent')}
                      />
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.close, { backgroundColor: colors.textPrimary }]}
                    onPress={onClose}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.closeText, { color: colors.white }]}>
                      {t('common.close')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.meta, { backgroundColor: colors.background }]}>
      <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(10, 26, 20, 0.5)',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 2,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 999,
  },
  body: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    alignItems: 'center',
  },
  face: {
    width: 92,
    height: 92,
    borderRadius: 26,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  faceImage: {
    width: 48,
    height: 48,
  },
  faceEmoji: {
    fontSize: msFont(44),
    lineHeight: msFont(56),
  },
  rarity: {
    fontSize: msFont(9.5),
    fontWeight: '800',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    marginTop: spacing.md,
  },
  name: {
    fontSize: msFont(21),
    fontWeight: '700',
    marginTop: 3,
    textAlign: 'center',
  },
  description: {
    fontSize: msFont(13.5),
    lineHeight: msFont(20),
    marginTop: 6,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignSelf: 'stretch',
    marginTop: spacing.lg,
  },
  meta: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: 13,
  },
  metaLabel: {
    fontSize: msFont(9.5),
    fontWeight: '600',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: msFont(13),
    fontWeight: '600',
    marginTop: 3,
  },
  close: {
    alignSelf: 'stretch',
    height: 46,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  closeText: {
    fontSize: msFont(14),
    fontWeight: '700',
  },
});
