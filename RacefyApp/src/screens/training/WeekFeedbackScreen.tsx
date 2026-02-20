import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Keyboard,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { spacing, fontSize, borderRadius } from '../../theme';
import { ScreenHeader, Loading, ScreenContainer } from '../../components';
import { FeedbackSummaryHeader } from '../../components/Training/FeedbackSummaryHeader';
import { ComplianceRings } from '../../components/Training/ComplianceRings';
import { CoachMessageCard } from '../../components/Training/CoachMessageCard';
import { ActivityMatchCard } from '../../components/Training/ActivityMatchCard';
import { HighlightsGrid } from '../../components/Training/HighlightsGrid';
import { TrendIndicator } from '../../components/Training/TrendIndicator';
import type { RootStackParamList } from '../../navigation/types';
import type { WeekFeedback } from '../../types/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'WeekFeedback'>;

interface Props {
  navigation: NavigationProp;
  route: RoutePropType;
}

export function WeekFeedbackScreen({ navigation, route }: Props) {
  const { weekId } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [feedback, setFeedback] = useState<WeekFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekNotes, setWeekNotes] = useState<string>('');
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const loadFeedback = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      const [data, weekData] = await Promise.all([
        api.getWeekFeedback(weekId),
        api.getWeek(weekId),
      ]);
      setFeedback(data);
      setWeekNotes(weekData.notes || '');

      logger.info('training', 'Week feedback loaded', {
        weekId,
        weekNumber: data.week_number,
        overallRating: data.overall_rating,
      });
    } catch (err: any) {
      logger.error('training', 'Failed to load week feedback', { error: err, weekId });
      setError(err.message || t('training.feedback.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [weekId, t]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadFeedback(true);
  };

  const MAX_NOTE_LENGTH = 500;

  const openNoteModal = () => {
    setEditingNote(weekNotes);
    setNoteModalVisible(true);
  };

  const closeNoteModal = () => {
    if (!isSavingNote) {
      setNoteModalVisible(false);
    }
  };

  const handleSaveNote = async () => {
    try {
      setIsSavingNote(true);
      Keyboard.dismiss();
      await api.updateWeekNotes(weekId, editingNote.trim());
      setWeekNotes(editingNote.trim());
      setNoteModalVisible(false);
      logger.info('training', 'Week note saved', { weekId });
    } catch (err: any) {
      logger.error('training', 'Failed to save week note', { error: err, weekId });
      Alert.alert(t('common.error'), t('training.feedback.noteSaveFailed'));
    } finally {
      setIsSavingNote(false);
    }
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  if (error || !feedback) {
    return (
      <ScreenContainer>
        <ScreenHeader
          title={t('training.feedback.title', { number: '...' })}
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {error || t('training.feedback.loadError')}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => loadFeedback()}
          >
            <Text style={[styles.retryText, { color: colors.white }]}>
              {t('training.feedback.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('training.feedback.title', { number: feedback.week_number })}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Summary Header */}
        <FeedbackSummaryHeader
          overallRating={feedback.overall_rating}
          programName={feedback.program_name}
          weekNumber={feedback.week_number}
          programGoal={feedback.program_goal}
        />

        {/* Compliance Rings */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('training.feedback.compliance.sectionTitle')}
        </Text>
        <ComplianceRings compliance={feedback.compliance} />

        {/* Coach Messages */}
        {feedback.coach_messages.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('training.feedback.coachMessages.sectionTitle')}
            </Text>
            {feedback.coach_messages.map((msg, idx) => (
              <CoachMessageCard key={idx} message={msg} />
            ))}
            <View style={styles.sectionSpacer} />
          </>
        )}

        {/* Activity Matching */}
        {feedback.activity_matching.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('training.feedback.activityMatching.sectionTitle')}
            </Text>
            {feedback.activity_matching.map((match, idx) => (
              <ActivityMatchCard
                key={idx}
                match={match}
                onPress={(activityId) => navigation.navigate('ActivityDetail', { activityId })}
              />
            ))}
            <View style={styles.sectionSpacer} />
          </>
        )}

        {/* Highlights + Consistency */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('training.feedback.highlights.sectionTitle')}
        </Text>
        <HighlightsGrid
          highlights={feedback.highlights}
          consistencyScore={feedback.consistency_score}
        />

        {/* Trends */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('training.feedback.trends.sectionTitle')}
        </Text>
        <TrendIndicator trends={feedback.trends} />

        {/* My Notes */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('training.feedback.myNotes')}
        </Text>
        {weekNotes ? (
          <View style={[styles.noteCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.noteText, { color: colors.textPrimary }]}>{weekNotes}</Text>
            <TouchableOpacity
              style={styles.noteEditButton}
              onPress={openNoteModal}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="pencil" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addNoteButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            onPress={openNoteModal}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={22} color={colors.textMuted} />
            <Text style={[styles.addNoteText, { color: colors.textSecondary }]}>
              {t('training.feedback.addNote')}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Note Modal */}
      <Modal
        visible={noteModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeNoteModal}
      >
        <TouchableWithoutFeedback onPress={closeNoteModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                <View style={styles.handleContainer}>
                  <View style={[styles.handle, { backgroundColor: colors.border }]} />
                </View>

                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                    {t('training.feedback.myNotes')}
                  </Text>
                  <TouchableOpacity
                    onPress={closeNoteModal}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    disabled={isSavingNote}
                  >
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <View
                    style={[
                      styles.noteInputContainer,
                      { backgroundColor: colors.cardBackground, borderColor: colors.border },
                    ]}
                  >
                    <TextInput
                      style={[styles.noteInput, { color: colors.textPrimary }]}
                      placeholder={t('training.feedback.notePlaceholder')}
                      placeholderTextColor={colors.textMuted}
                      value={editingNote}
                      onChangeText={(text) => {
                        if (text.length <= MAX_NOTE_LENGTH) {
                          setEditingNote(text);
                        }
                      }}
                      multiline
                      maxLength={MAX_NOTE_LENGTH}
                      editable={!isSavingNote}
                      textAlignVertical="top"
                      autoFocus
                    />
                    <Text
                      style={[
                        styles.charCount,
                        {
                          color: editingNote.length === MAX_NOTE_LENGTH
                            ? colors.error
                            : colors.textMuted,
                        },
                      ]}
                    >
                      {editingNote.length}/{MAX_NOTE_LENGTH}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.saveNoteButton,
                      { backgroundColor: isSavingNote ? colors.border : colors.primary },
                    ]}
                    onPress={handleSaveNote}
                    disabled={isSavingNote}
                    activeOpacity={0.7}
                  >
                    {isSavingNote ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <Text style={[styles.saveNoteButtonText, { color: colors.white }]}>
                        {t('training.feedback.saveNote')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  sectionSpacer: {
    height: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  errorText: {
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  retryText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: spacing.xl,
  },
  // Notes section
  noteCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noteText: {
    flex: 1,
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  noteEditButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  addNoteText: {
    fontSize: fontSize.md,
  },
  // Note modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '70%',
    minHeight: 300,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  modalBody: {
    padding: spacing.md,
  },
  noteInputContainer: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.sm,
    minHeight: 140,
  },
  noteInput: {
    fontSize: fontSize.md,
    minHeight: 100,
  },
  charCount: {
    fontSize: fontSize.xs,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  saveNoteButton: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveNoteButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
