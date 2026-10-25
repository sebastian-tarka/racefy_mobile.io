import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useSubscription } from '../../hooks/useSubscription';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { upgradePromptEmitter } from '../../services/upgradePromptEmitter';
import { borderRadius, fontSize, spacing } from '../../theme';
import type { EventAiCovers, EventCoverGeneration, EventCoverPreview } from '../../types/api';
import { getErrorMessage, getErrorStatus, isApiError } from '../../utils/errors';
import { Button } from '../Button';
import { Input } from '../Input';

interface EventAiCoverModalProps {
  visible: boolean;
  eventId: number;
  onClose: () => void;
  /** The preview is already the event cover on the server — just show the new URL. */
  onApplied: (coverUrl: string) => void;
}

const POLL_INTERVAL_MS = 3000;
const HINT_MAX_LENGTH = 200;

const isRunning = (g: EventCoverGeneration) => g.status === 'pending' || g.status === 'processing';

/**
 * AI cover ideas for an existing event (Plus 3 / Pro 15 a month): an optional
 * hint, two previews per generation made in the background and polled, and every
 * earlier preview of this event to pick from — applying one is free. Mirrors
 * EventAiCoverModal.jsx in the web app.
 */
export function EventAiCoverModal({
  visible,
  eventId,
  onClose,
  onApplied,
}: EventAiCoverModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { tier } = useSubscription();
  const [data, setData] = useState<EventAiCovers | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [hint, setHint] = useState('');
  const [hintError, setHintError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      setData(await api.getEventAiCovers(eventId));
    } catch (error) {
      logger.warn('api', 'Could not load AI covers', { error, eventId });
      setLoadError(true);
    }
  }, [eventId]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const running = data?.generations.filter(isRunning) ?? [];
  const hasRunning = running.length > 0;

  // Poll the running generations, and tick the elapsed-seconds counter on their tiles
  useEffect(() => {
    if (!visible || !hasRunning) return;
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    const poller = setInterval(async () => {
      const ids = (data?.generations ?? []).filter(isRunning).map((g) => g.id);
      try {
        const fresh = await Promise.all(
          ids.map((id) => api.getEventAiCoverGeneration(eventId, id)),
        );
        setData((prev) =>
          prev
            ? {
                ...prev,
                generations: prev.generations.map((g) => fresh.find((f) => f.id === g.id) ?? g),
              }
            : prev,
        );
      } catch (error) {
        logger.debug('api', 'AI cover poll failed', { error, eventId });
      }
    }, POLL_INTERVAL_MS);
    return () => {
      clearInterval(ticker);
      clearInterval(poller);
    };
  }, [visible, hasRunning, data?.generations, eventId]);

  const generate = async () => {
    setIsStarting(true);
    setHintError(null);
    try {
      const { generation, quota } = await api.generateEventAiCover(
        eventId,
        hint.trim() || undefined,
      );
      setData((prev) =>
        prev ? { ...prev, quota, generations: [generation, ...prev.generations] } : prev,
      );
      setHint('');
    } catch (error) {
      const status = getErrorStatus(error);
      if (status === 409) {
        await load(); // one is already running — show it
      } else if (status === 422 && isApiError(error) && error.errors?.hint) {
        setHintError(error.errors.hint[0]);
      } else if (!(isApiError(error) && error.upgrade_required)) {
        // upgrade_required already opened the paywall (api.request callback)
        Alert.alert(t('common.error'), getErrorMessage(error) || t('eventForm.aiCover.loadError'));
      }
    } finally {
      setIsStarting(false);
    }
  };

  const apply = async (preview: EventCoverPreview) => {
    setApplyingId(preview.id);
    try {
      const result = await api.applyEventAiCover(eventId, preview.id);
      const appliedAt = new Date().toISOString();
      setData((prev) =>
        prev
          ? {
              ...prev,
              generations: prev.generations.map((g) => ({
                ...g,
                previews: g.previews.map((p) =>
                  p.id === preview.id ? { ...p, applied_at: appliedAt } : p,
                ),
              })),
            }
          : prev,
      );
      onApplied(result.cover_image);
    } catch (error) {
      Alert.alert(t('common.error'), getErrorMessage(error) || t('eventForm.aiCover.loadError'));
    } finally {
      setApplyingId(null);
    }
  };

  const quota = data?.quota;
  const notOnPlan = quota?.limit === 0;
  const outOfQuota = !!quota && quota.limit > 0 && quota.remaining === 0;
  const previews = (data?.generations ?? []).flatMap((g) =>
    g.status === 'completed' ? g.previews : [],
  );
  const failed = (data?.generations ?? []).filter((g) => g.status === 'failed').slice(0, 1);

  const renderIntro = () => {
    if (!data) return null;
    if (!data.enabled) {
      return (
        <Text style={[styles.notice, { color: colors.textSecondary }]}>
          {t('eventForm.aiCover.disabled')}
        </Text>
      );
    }
    if (notOnPlan) {
      return (
        <View style={[styles.upgradeBox, { borderColor: colors.primary + '40' }]}>
          <Text style={{ color: colors.textPrimary, fontSize: fontSize.md }}>
            {t('eventForm.aiCover.upgrade')}
          </Text>
          <Button
            title={t('eventForm.aiCover.upgradeCta')}
            onPress={() =>
              upgradePromptEmitter.emit('show', {
                feature: 'event_ai_covers_monthly',
                currentTier: tier,
              })
            }
          />
        </View>
      );
    }
    return (
      <View style={styles.form}>
        <Input
          label={t('eventForm.aiCover.hintLabel')}
          placeholder={t('eventForm.aiCover.hintPlaceholder')}
          value={hint}
          onChangeText={(text) => {
            setHint(text);
            setHintError(null);
          }}
          maxLength={HINT_MAX_LENGTH}
          multiline
          error={hintError}
          editable={!hasRunning && !outOfQuota}
        />
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {t('eventForm.aiCover.hintHelp')}
        </Text>
        {quota && (
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {quota.limit === -1
              ? t('eventForm.aiCover.quotaUnlimited')
              : t('eventForm.aiCover.quota', { used: quota.used, limit: quota.limit })}
          </Text>
        )}
        {outOfQuota ? (
          <Text style={[styles.notice, { color: colors.textSecondary }]}>
            {t('eventForm.aiCover.outOfQuota')}
          </Text>
        ) : (
          <Button
            title={
              hasRunning
                ? t('eventForm.aiCover.generating')
                : t('eventForm.aiCover.generate', { count: data.variants })
            }
            onPress={generate}
            loading={isStarting}
            disabled={hasRunning || isStarting}
          />
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        edges={['top', 'bottom']}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('eventForm.aiCover.title')}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!data && !loadError && (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          )}
          {loadError && (
            <View style={styles.form}>
              <Text style={[styles.notice, { color: colors.textSecondary }]}>
                {t('eventForm.aiCover.loadError')}
              </Text>
              <Button title={t('common.retry')} variant="outline" onPress={load} />
            </View>
          )}

          {data && (
            <>
              <Text style={[styles.intro, { color: colors.textSecondary }]}>
                {t('eventForm.aiCover.intro', { count: data.variants })}
              </Text>
              {renderIntro()}

              {failed.map((g) => (
                <Text key={g.id} style={[styles.notice, { color: colors.error }]}>
                  {t(`eventForm.aiCover.errors.${g.error ?? 'provider_error'}`)}
                </Text>
              ))}

              <View style={styles.grid}>
                {running.flatMap((g) =>
                  Array.from({ length: g.variants }, (_, i) => (
                    <View
                      key={`run-${g.id}-${i}`}
                      style={[
                        styles.tile,
                        styles.placeholder,
                        { backgroundColor: colors.cardBackground },
                      ]}
                    >
                      <ActivityIndicator color={colors.primary} />
                      <Text style={[styles.meta, { color: colors.textSecondary }]}>
                        {t('eventForm.aiCover.generatingTile')}
                      </Text>
                      <Text style={[styles.meta, { color: colors.textMuted }]}>
                        {t('eventForm.aiCover.elapsed', {
                          seconds: Math.max(0, Math.round((now - Date.parse(g.created_at)) / 1000)),
                        })}
                      </Text>
                    </View>
                  )),
                )}
                {previews.map((preview) => (
                  <View key={preview.id} style={styles.tileWrapper}>
                    <Image
                      source={{ uri: preview.url }}
                      style={styles.tile}
                      contentFit="cover"
                      cachePolicy="disk"
                      transition={150}
                    />
                    {preview.applied_at ? (
                      <View style={[styles.usedChip, { backgroundColor: colors.primary }]}>
                        <Ionicons name="checkmark" size={14} color={colors.white} />
                        <Text style={[styles.usedText, { color: colors.white }]}>
                          {t('eventForm.aiCover.used')}
                        </Text>
                      </View>
                    ) : null}
                    <Button
                      title={t('eventForm.aiCover.apply')}
                      variant="outline"
                      onPress={() => apply(preview)}
                      loading={applyingId === preview.id}
                      disabled={applyingId != null}
                    />
                  </View>
                ))}
              </View>

              <Text style={[styles.disclosure, { color: colors.textMuted }]}>
                {t('eventForm.aiCover.disclosure')}
              </Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: fontSize.lg, fontWeight: '700' },
  content: { padding: spacing.md, gap: spacing.md },
  loading: { marginTop: spacing.xl },
  intro: { fontSize: fontSize.sm },
  form: { gap: spacing.sm },
  meta: { fontSize: fontSize.xs },
  notice: { fontSize: fontSize.sm },
  upgradeBox: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tileWrapper: { width: '48.5%', gap: spacing.xs },
  tile: { width: '100%', aspectRatio: 3 / 2, borderRadius: borderRadius.md },
  placeholder: {
    width: '48.5%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  usedChip: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  usedText: { fontSize: fontSize.xs, fontWeight: '600' },
  disclosure: { fontSize: fontSize.xs, marginTop: spacing.sm },
});
