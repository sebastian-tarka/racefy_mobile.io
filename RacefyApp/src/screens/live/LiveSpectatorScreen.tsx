import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
// Same import as ChatScreen and PostFormScreen: the react-native version does
// not handle Android, which is exactly how the input ended up under the keyboard.
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../hooks/useTheme';
import { useLiveBroadcastFeed } from '../../hooks/useLiveBroadcastFeed';
import { borderRadius, fontSize, spacing } from '../../theme';
import {
  EmptyState,
  Loading,
  MapboxLiveMap,
  ScreenContainer,
  ScreenHeader,
} from '../../components';
import type { RootStackParamList } from '../../navigation/types';
import { LiveMessagePanel } from '../../components/LiveMessagePanel';
import type { GpsPoint, LiveMessage } from '../../types/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'LiveSpectator'>;

interface Props {
  navigation: NavigationProp;
  route: RoutePropType;
}

const fmtKm = (meters: number) => `${(Math.round(meters / 100) / 10).toFixed(1)} km`;

const fmtDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
};

/** `current_pace` is min/km and is frequently null — never render "0:00" for it. */
const fmtPace = (pace: number | null) => {
  if (pace == null) return '—';
  const m = Math.floor(pace);
  const s = Math.round((pace - m) * 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
};

export function LiveSpectatorScreen({ navigation, route }: Props) {
  const { activityId } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();

  const { broadcast, position, stats, trail, messages, status, isPositionHidden, error } =
    useLiveBroadcastFeed(activityId);
  /** Messages sent from this device, echoed until the next poll picks them up. */
  const [localMessages, setLocalMessages] = useState<LiveMessage[]>([]);

  const allMessages = useMemo(() => {
    const seen = new Set(messages.map((m) => m.id));
    return [...messages, ...localMessages.filter((m) => !seen.has(m.id))];
  }, [messages, localMessages]);

  // The map component speaks {lat, lng}; the API speaks [lng, lat]. The break
  // flag has to travel with the point: MapboxLiveMap splits the polyline on it,
  // which is what keeps privacy-zone gaps from being drawn as shortcuts.
  const livePoints = useMemo<GpsPoint[]>(
    () => trail.map((p) => ({ lat: p.lat, lng: p.lng, segment_break: p.segmentBreak })),
    [trail],
  );

  const currentPosition = useMemo(
    () => (position ? { lat: position[1], lng: position[0] } : null),
    [position],
  );

  const athleteName = broadcast?.user?.name ?? broadcast?.user?.username ?? '';

  if (status === 'ended') {
    return (
      <ScreenContainer>
        <ScreenHeader
          title={t('live.spectator.title')}
          showBack
          onBack={() => navigation.goBack()}
        />
        {/* A 404 here means "finished" or "not yours to watch" — an ordinary
            outcome, so this is an empty state and not an error screen. */}
        <EmptyState
          icon="radio-outline"
          title={t('live.spectator.endedTitle')}
          message={t('live.spectator.endedMessage')}
        />
      </ScreenContainer>
    );
  }

  if (status === 'connecting' && !broadcast) {
    return (
      <ScreenContainer>
        <ScreenHeader
          title={t('live.spectator.title')}
          showBack
          onBack={() => navigation.goBack()}
        />
        <Loading fullScreen message={t('live.spectator.connecting')} />
      </ScreenContainer>
    );
  }

  if (status === 'error' && !broadcast) {
    return (
      <ScreenContainer>
        <ScreenHeader
          title={t('live.spectator.title')}
          showBack
          onBack={() => navigation.goBack()}
        />
        <EmptyState
          icon="cloud-offline-outline"
          title={t('live.spectator.errorTitle')}
          message={error?.message ?? t('live.spectator.errorMessage')}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader
        title={athleteName || t('live.spectator.title')}
        showBack
        onBack={() => navigation.goBack()}
      />

      {/* The keyboard view must wrap the content AND the composer, like
          ChatScreen — wrapping only the composer leaves it under the keyboard. */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.mapWrap}>
          <MapboxLiveMap
            livePoints={livePoints}
            livePointsVersion={livePoints.length}
            currentPosition={currentPosition}
            gpsSignalQuality="good"
            // Keep the camera on the athlete: fitting once on first render leaves
            // the runner walking off the screen a few minutes later.
            followUser
          />

          {isPositionHidden && (
            <View style={[styles.hiddenBanner, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="eye-off-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.hiddenText, { color: colors.textSecondary }]}>
                {t('live.positionHidden')}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.statsBar, { backgroundColor: colors.cardBackground }]}>
          <Stat label={t('live.spectator.distance')} value={stats ? fmtKm(stats.distance) : '—'} />
          <Stat
            label={t('live.spectator.duration')}
            value={stats ? fmtDuration(stats.duration) : '—'}
          />
          <Stat label={t('live.spectator.pace')} value={fmtPace(stats?.current_pace ?? null)} />
        </View>

        <LiveMessagePanel
          activityId={activityId}
          messages={allMessages}
          allowComments={broadcast?.allow_live_comments}
          onSent={(message) => setLocalMessages((prev) => [...prev, message])}
        />
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  mapWrap: {
    flex: 1,
  },
  hiddenBanner: {
    position: 'absolute',
    top: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  hiddenText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: fontSize.xs,
  },
});
