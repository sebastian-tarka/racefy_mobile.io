import React, { useState, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useReportContent } from '../hooks/useReportContent';
import { spacing, fontSize, borderRadius } from '../theme';
import type { ReportableType, ReportReason } from '../types/api';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  reportableType: ReportableType;
  reportableId: number;
  onReportSuccess?: () => void;
}

const REPORT_REASONS: Array<{ key: ReportReason; icon: string }> = [
  { key: 'spam', icon: '📧' },
  { key: 'harassment', icon: '🚫' },
  { key: 'hate_speech', icon: '⚠️' },
  { key: 'violence', icon: '⚔️' },
  { key: 'nudity', icon: '🔞' },
  { key: 'misinformation', icon: '❌' },
  { key: 'impersonation', icon: '👤' },
  { key: 'copyright', icon: '©' },
  { key: 'other', icon: '❓' },
];

const MAX_DESCRIPTION_LENGTH = 500;

function ReportModalComponent({
  visible,
  onClose,
  reportableType,
  reportableId,
  onReportSuccess,
}: ReportModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isLoading, submitReport } = useReportContent();

  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');

  const handleClose = () => {
    setSelectedReason(null);
    setDescription('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedReason) return;

    await submitReport(
      reportableType,
      reportableId,
      selectedReason,
      description.trim() || undefined,
      () => {
        handleClose();
        onReportSuccess?.();
      }
    );
  };

  const handleReasonSelect = (reason: ReportReason) => {
    setSelectedReason(reason);
  };

  const characterCount = description.length;
  const isSubmitDisabled = !selectedReason || isLoading;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View
              style={[styles.modalContent, { backgroundColor: colors.background }]}
            >
              <View style={styles.handleContainer}>
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
              </View>

              <View
                style={[styles.modalHeader, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  {t('reporting.title')}
                </Text>
                <TouchableOpacity
                  onPress={handleClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  disabled={isLoading}
                >
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  {t('reporting.selectReason')}
                </Text>

                <View style={styles.reasonsGrid}>
                  {REPORT_REASONS.map((reason) => {
                    const isSelected = selectedReason === reason.key;
                    return (
                      <TouchableOpacity
                        key={reason.key}
                        style={[
                          styles.reasonButton,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : colors.cardBackground,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => handleReasonSelect(reason.key)}
                        disabled={isLoading}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.reasonIcon}>{reason.icon}</Text>
                        <Text
                          style={[
                            styles.reasonText,
                            {
                              color: isSelected
                                ? colors.background
                                : colors.textPrimary,
                            },
                          ]}
                          numberOfLines={2}
                        >
                          {t(`reporting.reasons.${reason.key}`)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text
                  style={[
                    styles.sectionTitle,
                    { color: colors.textSecondary, marginTop: spacing.lg },
                  ]}
                >
                  {t('reporting.additionalDetails')}
                </Text>

                <View
                  style={[
                    styles.descriptionContainer,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[
                      styles.descriptionInput,
                      { color: colors.textPrimary },
                    ]}
                    placeholder={t('reporting.descriptionPlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    value={description}
                    onChangeText={(text) => {
                      if (text.length <= MAX_DESCRIPTION_LENGTH) {
                        setDescription(text);
                      }
                    }}
                    multiline
                    maxLength={MAX_DESCRIPTION_LENGTH}
                    editable={!isLoading}
                    textAlignVertical="top"
                  />
                  <Text
                    style={[
                      styles.characterCount,
                      {
                        color:
                          characterCount === MAX_DESCRIPTION_LENGTH
                            ? colors.error
                            : colors.textMuted,
                      },
                    ]}
                  >
                    {characterCount}/{MAX_DESCRIPTION_LENGTH}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    {
                      backgroundColor: isSubmitDisabled
                        ? colors.border
                        : colors.error,
                    },
                  ]}
                  onPress={handleSubmit}
                  disabled={isSubmitDisabled}
                  activeOpacity={0.7}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.background} size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {t('reporting.submitReport')}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
    minHeight: 400,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  reasonButton: {
    width: '48%',
    aspectRatio: 1.5,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  reasonText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    textAlign: 'center',
  },
  descriptionContainer: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.sm,
    minHeight: 120,
  },
  descriptionInput: {
    fontSize: fontSize.md,
    minHeight: 80,
  },
  characterCount: {
    fontSize: fontSize.xs,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  submitButton: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  cancelButton: {
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
});

export const ReportModal = memo(ReportModalComponent);
