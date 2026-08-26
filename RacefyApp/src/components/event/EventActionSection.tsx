import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Card } from '../Card';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, fontSize, spacing } from '../../theme';
import type { Event } from '../../types/api';

export interface OwnerAction {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  highlighted?: boolean;
  loading?: boolean;
}

export interface EventActionSectionProps {
  event: Event;
  isAuthenticated: boolean;
  // registration
  canRegister: boolean;
  canCancel: boolean;
  isRegistering: boolean;
  onRegister: () => void;
  onCancelRegistration: () => void;
  registrationClosedMessage: string;
  // watch
  isWatching: boolean;
  isWatchToggling: boolean;
  canWatch: boolean;
  onToggleWatch: () => void;
  // owner
  ownerActions: OwnerAction[];
  // stage cta
  onViewStandings?: () => void;
  onViewResults?: () => void;
  standingsRacingCount?: number;
  standingsFinishedPct?: number;
}

type Stage = 'before' | 'during' | 'after';

function stageOf(status: Event['status']): Stage {
  if (status === 'upcoming') return 'before';
  if (status === 'ongoing') return 'during';
  return 'after';
}

/** Role × stage action block for the event detail screen. */
export function EventActionSection(props: EventActionSectionProps) {
  const { event } = props;
  const stage = stageOf(event.status);
  const isOwner = event.is_owner ?? false;
  const isRegistered = event.is_registered ?? false;

  return (
    <View style={styles.wrap}>
      {isOwner ? (
        <OwnerActionsCard actions={props.ownerActions} />
      ) : isRegistered ? (
        <RegisteredCard {...props} stage={stage} />
      ) : stage === 'before' ? (
        <RegistrationActions {...props} />
      ) : (
        <RegistrationClosedBox message={props.registrationClosedMessage} />
      )}

      {stage === 'during' && (
        <StageCtaCard
          variant="live"
          onPress={props.onViewStandings}
          racingCount={props.standingsRacingCount}
          finishedPct={props.standingsFinishedPct}
        />
      )}
      {stage === 'after' && event.status === 'completed' && (
        <StageCtaCard variant="results" onPress={props.onViewResults} />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Observer / Watcher — Register + Watch
// ---------------------------------------------------------------------------
function RegistrationActions(props: EventActionSectionProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { event, canRegister, isRegistering, onRegister, isAuthenticated } = props;

  const feeLabel =
    event.entry_fee == null || event.entry_fee === 0
      ? t('eventDetail.free', 'Free')
      : `$${event.entry_fee}`;
  const registerLabel = isAuthenticated
    ? `${t('eventDetail.register', 'Register')} · ${feeLabel}`
    : t('eventDetail.signInToRegister', 'Sign in to register');

  return (
    <View>
      <View style={styles.registerRow}>
        <TouchableOpacity
          style={[
            styles.registerButton,
            { backgroundColor: canRegister || !isAuthenticated ? colors.primary : colors.border },
          ]}
          onPress={onRegister}
          disabled={isRegistering || (!canRegister && isAuthenticated)}
          activeOpacity={0.85}
        >
          {isRegistering ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.registerText}>{registerLabel}</Text>
          )}
        </TouchableOpacity>
        <WatchButton {...props} />
      </View>
      {props.isWatching && (
        <View style={[styles.watchingBanner, { backgroundColor: colors.primaryLight + '18' }]}>
          <Ionicons name="notifications-outline" size={15} color={colors.primary} />
          <Text style={[styles.watchingText, { color: colors.primary }]}>
            {t('eventDetail.watchingReminder', "Watching · you'll get reminders before it starts")}
          </Text>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Watch bookmark
// ---------------------------------------------------------------------------
function WatchButton({
  isWatching,
  isWatchToggling,
  canWatch,
  onToggleWatch,
}: EventActionSectionProps) {
  const { colors } = useTheme();
  if (!canWatch && !isWatching) return null;
  return (
    <TouchableOpacity
      style={[
        styles.watchButton,
        {
          backgroundColor: isWatching ? colors.textPrimary : colors.cardBackground,
          borderColor: colors.border,
        },
      ]}
      onPress={onToggleWatch}
      disabled={isWatchToggling}
      activeOpacity={0.85}
    >
      {isWatchToggling ? (
        <ActivityIndicator
          size="small"
          color={isWatching ? colors.cardBackground : colors.textPrimary}
        />
      ) : (
        <Ionicons
          name={isWatching ? 'bookmark' : 'bookmark-outline'}
          size={22}
          color={isWatching ? colors.cardBackground : colors.textPrimary}
        />
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Participant — "You're registered / You raced this event" + BIB
// ---------------------------------------------------------------------------
function RegisteredCard(props: EventActionSectionProps & { stage: Stage }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { event, stage, canCancel, isRegistering, onCancelRegistration } = props;
  const reg = event.user_registration;
  const bib = reg?.registration_number;
  const status = reg?.status ?? 'registered';

  const title =
    stage === 'after'
      ? t('eventDetail.youRaced', 'You raced this event')
      : t('eventDetail.youreRegistered', "You're registered");

  return (
    <Card
      style={[styles.registeredCard, { backgroundColor: colors.primaryLight + '14' }]}
      noPadding
    >
      <View style={styles.registeredMain}>
        <View style={[styles.registeredCheck, { backgroundColor: colors.primary }]}>
          <Ionicons name="checkmark" size={22} color="#fff" />
        </View>
        <View style={styles.registeredInfo}>
          <Text style={[styles.registeredTitle, { color: colors.primary }]}>{title}</Text>
          <Text style={[styles.registeredStatus, { color: colors.textSecondary }]}>
            {t('eventDetail.statusLabel', 'Status')} ·{' '}
            {t(`eventRegistrationStatus.${status}`, status)}
          </Text>
        </View>
        {bib != null && (
          <View style={styles.bibBox}>
            <Text style={[styles.bibLabel, { color: colors.textMuted }]}>
              {t('eventDetail.bib', 'BIB')}
            </Text>
            <Text style={[styles.bibNumber, { color: colors.textPrimary }]}>{bib}</Text>
          </View>
        )}
      </View>
      {stage === 'before' && canCancel && (
        <TouchableOpacity
          style={[styles.cancelButton, { borderTopColor: colors.border }]}
          onPress={onCancelRegistration}
          disabled={isRegistering}
          activeOpacity={0.7}
        >
          {isRegistering ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
              {t('eventDetail.cancelRegistration', 'Cancel registration')}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Organizer — "You own this event" + action grid
// ---------------------------------------------------------------------------
function OwnerActionsCard({ actions }: { actions: OwnerAction[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Card style={styles.ownerCard}>
      <View style={styles.ownerHeader}>
        <View style={[styles.ownerBadge, { backgroundColor: colors.textPrimary }]}>
          <Ionicons name="settings-outline" size={16} color={colors.cardBackground} />
        </View>
        <Text style={[styles.ownerTitle, { color: colors.textPrimary }]}>
          {t('eventDetail.youOwn', 'You own this event')}
        </Text>
      </View>
      <View style={styles.ownerGrid}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.key}
            style={[
              styles.ownerButton,
              action.highlighted
                ? { backgroundColor: colors.primary }
                : { backgroundColor: colors.borderLight },
            ]}
            onPress={action.onPress}
            disabled={action.loading}
            activeOpacity={0.8}
          >
            {action.loading ? (
              <ActivityIndicator
                size="small"
                color={action.highlighted ? '#fff' : colors.textPrimary}
              />
            ) : (
              <Text
                style={[
                  styles.ownerButtonText,
                  { color: action.highlighted ? '#fff' : colors.textPrimary },
                ]}
              >
                {action.label}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Registration closed box (observer/watcher during & after)
// ---------------------------------------------------------------------------
function RegistrationClosedBox({ message }: { message: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View>
      <View style={[styles.closedPill, { backgroundColor: colors.borderLight }]}>
        <Text style={[styles.closedTitle, { color: colors.textMuted }]}>
          {t('eventDetail.registrationClosed', 'Registration closed')}
        </Text>
      </View>
      <View style={styles.closedReasonRow}>
        <Ionicons name="lock-closed" size={13} color={colors.textMuted} />
        <Text style={[styles.closedReason, { color: colors.textMuted }]}>{message}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Stage CTA — dark card for live standings / final results
// ---------------------------------------------------------------------------
function StageCtaCard({
  variant,
  onPress,
  racingCount,
  finishedPct,
}: {
  variant: 'live' | 'results';
  onPress?: () => void;
  racingCount?: number;
  finishedPct?: number;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const isLive = variant === 'live';

  const subline = isLive
    ? [
        racingCount != null
          ? t('eventDetail.racingNow', {
              count: racingCount,
              defaultValue: `${racingCount} racing`,
            })
          : null,
        finishedPct != null
          ? t('eventDetail.finishedPct', {
              pct: finishedPct,
              defaultValue: `${finishedPct}% finished`,
            })
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : t('eventDetail.resultsSubline', 'Podium, full standings & points awarded');

  return (
    <TouchableOpacity
      style={[styles.ctaCard, { backgroundColor: '#161d2b' }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
      disabled={!onPress}
    >
      {!isLive && (
        <View style={[styles.ctaTrophy, { backgroundColor: colors.warning }]}>
          <Ionicons name="trophy" size={20} color="#fff" />
        </View>
      )}
      <View style={styles.ctaBody}>
        {isLive && (
          <View style={styles.ctaLiveTag}>
            <View style={[styles.ctaDot, { backgroundColor: colors.error }]} />
            <Text style={styles.ctaLiveText}>{t('eventDetail.liveNow', 'LIVE NOW')}</Text>
          </View>
        )}
        <Text style={styles.ctaTitle}>
          {isLive
            ? t('eventDetail.viewLiveStandings', 'View live standings')
            : t('eventDetail.finalResults', 'Final results')}
        </Text>
        {subline ? <Text style={styles.ctaSubline}>{subline}</Text> : null}
      </View>
      <Ionicons name="arrow-forward" size={22} color="rgba(255,255,255,0.9)" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  // Register
  registerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  registerButton: {
    flex: 1,
    height: 56,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  watchButton: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  watchingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  watchingText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    flex: 1,
  },
  // Registered card
  registeredCard: {
    overflow: 'hidden',
  },
  registeredMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  registeredCheck: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registeredInfo: {
    flex: 1,
  },
  registeredTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  registeredStatus: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  bibBox: {
    alignItems: 'flex-end',
  },
  bibLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bibNumber: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
  },
  cancelButton: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  // Owner
  ownerCard: {
    gap: spacing.md,
  },
  ownerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ownerBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  ownerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  ownerButton: {
    flexGrow: 1,
    flexBasis: '46%',
    minHeight: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  ownerButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  // Closed box
  closedPill: {
    minHeight: 52,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closedTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  closedReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  closedReason: {
    fontSize: fontSize.sm,
    flex: 1,
  },
  // Stage CTA
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  ctaLiveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  ctaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ctaLiveText: {
    color: '#fff',
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ctaTrophy: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaBody: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 2,
  },
  ctaTitle: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  ctaSubline: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: fontSize.sm,
    marginTop: 2,
  },
});
