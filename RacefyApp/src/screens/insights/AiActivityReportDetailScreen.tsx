import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenContainer, ScreenHeader, Button } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { AiActivityReport, AiActivityReportStatus } from '../../types/reports';

type Props = NativeStackScreenProps<RootStackParamList, 'AiActivityReportDetail'>;

const POLL_INTERVAL = 3000;
const POLL_GIVE_UP_AFTER = 3 * 60 * 1000; // 3 minutes

const TERMINAL_STATUSES: AiActivityReportStatus[] = ['completed', 'failed'];

const STATUS_COLORS: Record<AiActivityReportStatus, string> = {
  pending: '#6B7280',
  processing: '#F59E0B',
  completed: '#10B981',
  failed: '#EF4444',
};

export function AiActivityReportDetailScreen({ navigation, route }: Props) {
  const { reportId } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [report, setReport] = useState<AiActivityReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pollingGaveUp, setPollingGaveUp] = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const giveUpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingStartRef = useRef<number | null>(null);

  const clearPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (giveUpTimerRef.current) {
      clearTimeout(giveUpTimerRef.current);
      giveUpTimerRef.current = null;
    }
  }, []);

  const fetchReport = useCallback(async (): Promise<AiActivityReport | null> => {
    try {
      const data = await api.getActivityReport(reportId);
      setReport(data);
      return data;
    } catch (error: any) {
      if (error.status === 404) {
        logger.info('api', 'Report not found (likely deleted), popping back', { reportId });
        clearPolling();
        navigation.goBack();
        return null;
      }
      logger.error('api', 'Failed to load report', { reportId, error: error.message });
      return null;
    }
  }, [reportId, navigation, clearPolling]);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    pollingStartRef.current = Date.now();

    pollTimerRef.current = setInterval(async () => {
      const elapsed = Date.now() - (pollingStartRef.current ?? Date.now());
      if (elapsed >= POLL_GIVE_UP_AFTER) {
        clearPolling();
        setPollingGaveUp(true);
        return;
      }
      const fresh = await fetchReport();
      if (fresh && TERMINAL_STATUSES.includes(fresh.status)) {
        clearPolling();
      }
    }, POLL_INTERVAL);
  }, [fetchReport, clearPolling]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      const fresh = await fetchReport();
      if (!mounted) return;
      setIsLoading(false);
      if (fresh && !TERMINAL_STATUSES.includes(fresh.status)) {
        startPolling();
      }
    })();
    return () => {
      mounted = false;
      clearPolling();
    };
  }, [fetchReport, startPolling, clearPolling]);

  // Pause polling on blur/background
  useFocusEffect(
    useCallback(() => {
      // On focus: resume if needed
      if (report && !TERMINAL_STATUSES.includes(report.status) && !pollingGaveUp) {
        startPolling();
      }
      return () => clearPolling();
    }, [report, pollingGaveUp, startPolling, clearPolling])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        if (report && !TERMINAL_STATUSES.includes(report.status) && !pollingGaveUp) {
          fetchReport().then((fresh) => {
            if (fresh && !TERMINAL_STATUSES.includes(fresh.status)) {
              startPolling();
            }
          });
        }
      } else {
        clearPolling();
      }
    });
    return () => sub.remove();
  }, [report, pollingGaveUp, fetchReport, startPolling, clearPolling]);

  const handleRegenerate = useCallback(async () => {
    if (!report || isRegenerating) return;
    setIsRegenerating(true);
    try {
      const response = await api.generateActivityReport({
        activity_ids: report.activity_ids,
        locale: report.locale,
      });
      const newId = response.data.id;
      setPollingGaveUp(false);
      if (newId !== reportId) {
        navigation.replace('AiActivityReportDetail', { reportId: newId });
      } else {
        await fetchReport();
        startPolling();
      }
    } catch (error: any) {
      logger.error('api', 'Failed to regenerate report', { error: error.message });
      Alert.alert('', error.message || t('insights.aiReports.errorWaiting'));
    } finally {
      setIsRegenerating(false);
    }
  }, [report, isRegenerating, reportId, navigation, fetchReport, startPolling, t]);

  const handleDelete = useCallback(() => {
    Alert.alert('', t('insights.aiReports.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('insights.aiReports.delete'),
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            await api.deleteActivityReport(reportId);
            clearPolling();
            navigation.goBack();
          } catch (error: any) {
            logger.error('api', 'Failed to delete report', { error: error.message });
            Alert.alert('', error.message);
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  }, [reportId, navigation, t, clearPolling]);

  if (isLoading) {
    return (
      <ScreenContainer>
        <ScreenHeader title={t('insights.aiReports.title')} showBack onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!report) {
    return (
      <ScreenContainer>
        <ScreenHeader title={t('insights.aiReports.title')} showBack onBack={() => navigation.goBack()} />
      </ScreenContainer>
    );
  }

  const statusColor = STATUS_COLORS[report.status];
  const count = report.activity_ids.length;
  const countLabel = count === 1
    ? t('insights.aiReports.activityIncluded', { count })
    : t('insights.aiReports.activitiesIncluded', { count });
  const isNonTerminal = !TERMINAL_STATUSES.includes(report.status);
  const hasParseWarning = report.content?._parse_warning != null;

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('insights.aiReports.title')}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={handleDelete}
            disabled={isDeleting}
            style={styles.headerAction}
          >
            <Ionicons name="trash-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {t(`insights.aiReports.status.${report.status}`)}
            </Text>
          </View>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {countLabel}
          </Text>
        </View>

        <View style={styles.chipsRow}>
          {report.activity_ids.map((id) => (
            <TouchableOpacity
              key={id}
              style={[styles.chip, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              onPress={() => navigation.navigate('ActivityDetail', { activityId: id })}
            >
              <Text style={[styles.chipText, { color: colors.textPrimary }]}>#{id}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isNonTerminal && !pollingGaveUp && (
          <View style={[styles.stateCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.stateLabel, { color: colors.textPrimary }]}>
              {t(`insights.aiReports.status.${report.status}`)}
            </Text>
          </View>
        )}

        {isNonTerminal && pollingGaveUp && (
          <View style={[styles.stateCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Ionicons name="time-outline" size={32} color={colors.textSecondary} />
            <Text style={[styles.stateLabel, { color: colors.textPrimary }]}>
              {t('insights.aiReports.stillProcessing')}
            </Text>
          </View>
        )}

        {report.status === 'failed' && (
          <View style={[styles.stateCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Ionicons name="alert-circle-outline" size={32} color={STATUS_COLORS.failed} />
            <Text style={[styles.errorMessage, { color: colors.textPrimary }]}>
              {report.error_message || t('insights.aiReports.errorWaiting')}
            </Text>
            <Button
              title={t('insights.aiReports.regenerate')}
              onPress={handleRegenerate}
              loading={isRegenerating}
              variant="primary"
              style={styles.regenerateButton}
            />
          </View>
        )}

        {report.status === 'completed' && report.content && (
          <View style={styles.contentSections}>
            {report.content.summary ? (
              <Section
                title={t('insights.aiReports.sections.summary')}
                colors={colors}
              >
                <Text style={[styles.paragraph, { color: colors.textPrimary }]}>
                  {report.content.summary}
                </Text>
              </Section>
            ) : null}

            {!hasParseWarning && report.content.highlights?.length > 0 && (
              <Section title={`✨ ${t('insights.aiReports.sections.highlights')}`} colors={colors}>
                <BulletList items={report.content.highlights} colors={colors} />
              </Section>
            )}

            {!hasParseWarning && report.content.areas_to_improve?.length > 0 && (
              <Section title={`🎯 ${t('insights.aiReports.sections.areas_to_improve')}`} colors={colors}>
                <BulletList items={report.content.areas_to_improve} colors={colors} />
              </Section>
            )}

            {!hasParseWarning && report.content.coaching_recommendations?.length > 0 && (
              <Section title={`💡 ${t('insights.aiReports.sections.coaching_recommendations')}`} colors={colors}>
                <BulletList items={report.content.coaching_recommendations} colors={colors} />
              </Section>
            )}

            {!hasParseWarning && report.content.next_steps?.length > 0 && (
              <Section title={`➡️ ${t('insights.aiReports.sections.next_steps')}`} colors={colors}>
                {report.content.next_steps.map((step, idx) => (
                  <View
                    key={idx}
                    style={[styles.nextStep, { borderLeftColor: colors.primary, backgroundColor: colors.cardBackground }]}
                  >
                    <Text style={[styles.nextStepAction, { color: colors.textPrimary }]}>
                      {step.action}
                    </Text>
                    {step.rationale ? (
                      <Text style={[styles.nextStepRationale, { color: colors.textSecondary }]}>
                        {step.rationale}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </Section>
            )}

            {report.model ? (
              <Text style={[styles.footerNote, { color: colors.textMuted }]}>
                {t('insights.aiReports.generatedBy', { model: report.model })}
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function Section({ title, colors, children }: { title: string; colors: any; children: React.ReactNode }) {
  return (
    <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      {children}
    </View>
  );
}

function BulletList({ items, colors }: { items: string[]; colors: any }) {
  return (
    <View>
      {items.map((item, idx) => (
        <View key={idx} style={styles.bulletRow}>
          <Text style={[styles.bulletDot, { color: colors.primary }]}>•</Text>
          <Text style={[styles.bulletText, { color: colors.textPrimary }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  headerAction: {
    padding: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  metaText: {
    fontSize: fontSize.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  stateCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.md,
  },
  stateLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: fontSize.md * 1.4,
  },
  regenerateButton: {
    minWidth: 180,
  },
  contentSections: {
    gap: spacing.md,
  },
  section: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  paragraph: {
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.5,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  bulletDot: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  bulletText: {
    fontSize: fontSize.md,
    flex: 1,
    lineHeight: fontSize.md * 1.4,
  },
  nextStep: {
    borderLeftWidth: 4,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  nextStepAction: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  nextStepRationale: {
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.4,
  },
  footerNote: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});