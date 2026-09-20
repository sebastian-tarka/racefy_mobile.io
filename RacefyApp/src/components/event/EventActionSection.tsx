import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Card } from '../Card';
import { LivePulse } from '../recording/LivePulse';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, fontSize, msFont, spacing } from '../../theme';
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
  /**
   * "Start activity" — the way in to recording for this event. Rendered only
   * for a registered athlete; what it shows follows from the stage.
   */
  startCta?: {
    /** An activity is already being recorded. */
    recording: boolean;
    onStart: () => void;
    onResume: () => void;
    onBusy: () => void;
  };
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
  // One dominant CTA, never two: while "Start activity" is showing, the live
  // standings tile demotes to a quiet row.
  const startShowing = !!props.startCta && isRegistered && stage === 'during';

  return (
    <View style={styles.wrap}>
      {isOwner ? (
        <>
          <OwnerActionsCard actions={props.ownerActions} />
          {isRegistered && props.startCta && stage !== 'after' && (
            <Card noPadding style={styles.registeredCard}>
              <EventStartCta event={event} stage={stage} cta={props.startCta} bare />
            </Card>
          )}
        </>
      ) : isRegistered ? (
        <RegisteredCard {...props} stage={stage} />
      ) : stage === 'before' ? (
        <RegistrationActions {...props} />
      ) : (
        <RegistrationClosedBox message={props.registrationClosedMessage} />
      )}

      {stage === 'during' &&
        (startShowing ? (
          <LiveStandingsRow
            onPress={props.onViewStandings}
            racingCount={props.standingsRacingCount}
          />
        ) : (
          <StageCtaCard
            variant="live"
            onPress={props.onViewStandings}
            racingCount={props.standingsRacingCount}
            finishedPct={props.standingsFinishedPct}
          />
        ))}
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
      {props.startCta && stage !== 'after' && (
        <EventStartCta event={event} stage={stage} cta={props.startCta} />
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// "Start activity" — footer of the registration card (design: EventStartCTA).
// The card states the situation, then offers the single action that follows.
// ---------------------------------------------------------------------------
function EventStartCta({
  event,
  stage,
  cta,
  bare,
}: {
  event: Event;
  stage: Stage;
  cta: NonNullable<EventActionSectionProps['startCta']>;
  /** No top divider — the CTA is the whole card (organizer who also races). */
  bare?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (event.status === 'cancelled') return null;

  const frame = [
    styles.startWrap,
    { backgroundColor: colors.cardBackground, borderTopColor: colors.border },
    bare && { borderTopWidth: 0 },
  ];

  // Not started: a reason instead of a greyed-out dummy button.
  if (stage === 'before') {
    const startTime = new Date(event.starts_at).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    return (
      <View style={[frame, styles.startInfoRow]}>
        <View style={[styles.startInfoIcon, { backgroundColor: colors.background }]}>
          <Ionicons name="time-outline" size={17} color={colors.textMuted} />
        </View>
        <View style={styles.startInfoBody}>
          <Text style={[styles.startInfoTitle, { color: colors.textSecondary }]}>
            {t('eventPin.notStarted', { time: startTime })}
          </Text>
          <Text style={[styles.startInfoSub, { color: colors.textMuted }]}>
            {t('eventPin.notStartedSub')}
          </Text>
        </View>
      </View>
    );
  }

  // Already recording something else → the CTA becomes a way back, and the
  // only path to this event runs through saving what is running.
  if (cta.recording) {
    return (
      <View style={frame}>
        <TouchableOpacity
          style={[styles.startButton, styles.resumeButton, { backgroundColor: colors.textPrimary }]}
          onPress={cta.onResume}
          activeOpacity={0.85}
        >
          <LivePulse color={colors.primary} size={7} />
          <Text style={[styles.resumeText, { color: colors.background }]}>
            {t('eventPin.backToActivity')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={cta.onBusy} style={styles.busyLink} hitSlop={HIT_SLOP}>
          <Text style={[styles.busyLinkText, { color: colors.textSecondary }]}>
            {t('eventPin.startActivity')} →
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={frame}>
      <TouchableOpacity
        style={[
          styles.startButton,
          { backgroundColor: colors.primary, shadowColor: colors.primary },
        ]}
        onPress={cta.onStart}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t('eventPin.startActivity')}
      >
        <Ionicons name="play" size={19} color="#ffffff" />
        <Text style={styles.startText}>{t('eventPin.startActivity')}</Text>
      </TouchableOpacity>
      <Text style={[styles.startSub, { color: colors.textSecondary }]}>
        {t('eventPin.startSub')}
      </Text>
    </View>
  );
}

const HIT_SLOP = { top: 8, bottom: 8, left: 12, right: 12 };

/** The live-standings tile, demoted to a quiet row while "Start activity" leads. */
function LiveStandingsRow({
  onPress,
  racingCount,
}: {
  onPress?: () => void;
  racingCount?: number;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.liveRow,
        { backgroundColor: colors.cardBackground, borderColor: colors.border },
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.85}
    >
      <LivePulse color={colors.error} size={7} />
      <Text style={[styles.liveRowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
        {t('eventDetail.viewLiveStandings', 'View live standings')}
      </Text>
      {racingCount != null && (
        <Text style={[styles.liveRowMeta, { color: colors.textMuted }]}>
          {t('eventDetail.racingNow', {
            count: racingCount,
            defaultValue: `${racingCount} racing`,
          })}
        </Text>
      )}
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
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
  // Start activity
  startWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  startButton: {
    height: 54,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  startText: {
    color: '#ffffff',
    fontSize: msFont(16),
    fontWeight: '700',
  },
  startSub: {
    textAlign: 'center',
    fontSize: msFont(11.5),
    paddingTop: 7,
    paddingHorizontal: 6,
  },
  resumeButton: {
    height: 50,
    gap: 9,
    shadowOpacity: 0,
    elevation: 0,
  },
  resumeText: {
    fontSize: msFont(14.5),
    fontWeight: '700',
  },
  busyLink: {
    alignSelf: 'center',
    paddingTop: 10,
  },
  busyLinkText: {
    fontSize: msFont(12),
    fontWeight: '600',
  },
  startInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  startInfoIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startInfoBody: { flex: 1, minWidth: 0 },
  startInfoTitle: {
    fontSize: msFont(13),
    fontWeight: '700',
  },
  startInfoSub: {
    fontSize: msFont(11.5),
    marginTop: 1,
  },
  liveRow: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  liveRowTitle: {
    flex: 1,
    fontSize: msFont(13.5),
    fontWeight: '600',
  },
  liveRowMeta: {
    fontSize: msFont(11.5),
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
