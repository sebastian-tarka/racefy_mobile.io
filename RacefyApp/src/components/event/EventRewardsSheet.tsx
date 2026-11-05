import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { openExternalUrl } from '../../utils/externalLinks';
import { SheetModal } from '../SheetModal';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, fontSize, msFont, spacing } from '../../theme';
import type { EventCoupon, EventPrize } from '../../types/api';
import { formatIntlDate } from '../../utils/dateFormat';

export type RewardItem =
  | { kind: 'prize'; prize: EventPrize }
  | { kind: 'coupon'; coupon: EventCoupon };

export interface RewardGroup {
  key: string;
  label: string;
  points: number | null;
  items: RewardItem[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  groups: RewardGroup[];
}

/**
 * Every prize and coupon of the event, grouped the way the card groups them.
 *
 * The card has one line per place and room for one title on it; a sponsor can
 * put several coupons on the same place (three for every finisher is real), so
 * the rest live here, with what the line cannot carry: the description, the
 * expiry, and — once the athlete has won it — the code itself.
 */
export function EventRewardsSheet({ visible, onClose, groups }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <SheetModal visible={visible} onClose={onClose} style={styles.sheet}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {t('events.rewards.sheetTitle')}
      </Text>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {groups
          .filter((group) => group.items.length > 0)
          .map((group) => (
            <View key={group.key} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
                  {group.label}
                </Text>
                {group.points != null && (
                  <Text style={[styles.groupPoints, { color: colors.primaryDark }]}>
                    {t('events.stakes.points', { count: group.points })}
                  </Text>
                )}
              </View>
              {group.items.map((item) =>
                item.kind === 'coupon' ? (
                  <CouponRow key={`coupon-${item.coupon.id}`} coupon={item.coupon} />
                ) : (
                  <PrizeRow key={`prize-${item.prize.id}`} prize={item.prize} />
                ),
              )}
            </View>
          ))}
      </ScrollView>
    </SheetModal>
  );
}

function CouponRow({ coupon }: { coupon: EventCoupon }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!coupon.code) return;
    await Clipboard.setStringAsync(coupon.code);
    setCopied(true);
  };

  return (
    <View style={[styles.item, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.itemHeader}>
        <Ionicons name="pricetag" size={16} color={colors.warning} />
        <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{coupon.title}</Text>
      </View>
      {!!coupon.description && (
        <Text style={[styles.itemText, { color: colors.textSecondary }]}>{coupon.description}</Text>
      )}
      {!!coupon.expires_at && (
        <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
          {t('events.rewards.validUntil', { date: formatIntlDate(coupon.expires_at) })}
        </Text>
      )}

      {coupon.code ? (
        <>
          <TouchableOpacity
            style={[styles.code, { borderColor: colors.primary }]}
            onPress={copy}
            activeOpacity={0.8}
          >
            <View style={styles.codeText}>
              <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                {t('events.rewards.yourCode')}
              </Text>
              <Text style={[styles.codeValue, { color: colors.textPrimary }]} selectable>
                {coupon.code}
              </Text>
            </View>
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={18}
              color={colors.primary}
            />
          </TouchableOpacity>
          {copied && (
            <Text style={[styles.itemMeta, { color: colors.primary }]}>{t('common.copied')}</Text>
          )}
          {!!coupon.promoted_link && (
            <Link label={t('events.rewards.openShop')} url={coupon.promoted_link} />
          )}
        </>
      ) : (
        <View style={styles.locked}>
          <Ionicons name="lock-closed" size={13} color={colors.textMuted} />
          <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
            {t('events.rewards.codeLocked')}
          </Text>
        </View>
      )}
    </View>
  );
}

function PrizeRow({ prize }: { prize: EventPrize }) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.item, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.itemHeader}>
        <Ionicons name="gift" size={16} color={colors.warning} />
        <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{prize.name}</Text>
      </View>
      {!!prize.image_url && (
        <Image source={{ uri: prize.image_url }} style={styles.image} cachePolicy="memory-disk" />
      )}
      {!!prize.description && (
        <Text style={[styles.itemText, { color: colors.textSecondary }]}>{prize.description}</Text>
      )}
      {!!prize.affiliate_url && (
        <Link label={t('events.rewards.seePrize')} url={prize.affiliate_url} />
      )}
    </View>
  );
}

function Link({ label, url }: { label: string; url: string }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={styles.link} onPress={() => void openExternalUrl(url)} hitSlop={8}>
      <Text style={[styles.linkText, { color: colors.primaryDark }]}>{label}</Text>
      <Ionicons name="open-outline" size={14} color={colors.primaryDark} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: spacing.lg,
    maxHeight: '80%',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    paddingBottom: spacing.md,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  group: {
    gap: spacing.sm,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupLabel: {
    fontSize: msFont(12),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  groupPoints: {
    fontSize: msFont(13),
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  item: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.xs + 2,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  itemTitle: {
    flex: 1,
    fontSize: msFont(14),
    fontWeight: '700',
  },
  itemText: {
    fontSize: msFont(13),
    lineHeight: msFont(18),
  },
  itemMeta: {
    fontSize: msFont(11.5),
    fontWeight: '600',
  },
  locked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  code: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  codeText: {
    flex: 1,
    gap: 2,
  },
  codeValue: {
    fontSize: msFont(16),
    fontWeight: '800',
    letterSpacing: 1,
  },
  image: {
    width: '100%',
    height: 140,
    borderRadius: borderRadius.md,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  linkText: {
    fontSize: msFont(13),
    fontWeight: '700',
  },
});
