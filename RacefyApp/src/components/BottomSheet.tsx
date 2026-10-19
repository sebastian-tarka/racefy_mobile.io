import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { SheetModal } from './SheetModal';
import { spacing, fontSize, borderRadius } from '../theme';

export interface BottomSheetOption {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  onPress: () => void;
  color?: string;
}

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  options: BottomSheetOption[];
}

export function BottomSheet({ visible, onClose, title, options }: BottomSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <SheetModal visible={visible} onClose={onClose} style={styles.container}>
      {/* Title */}
      {title && (
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        </View>
      )}

      {/* Options */}
      <View style={styles.options}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.option,
              { backgroundColor: colors.background },
              index < options.length - 1 && { marginBottom: spacing.sm },
            ]}
            onPress={() => {
              option.onPress();
              onClose();
            }}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: (option.color || colors.primary) + '15' },
              ]}
            >
              <Ionicons name={option.icon} size={24} color={option.color || colors.primary} />
            </View>
            <View style={styles.optionText}>
              <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                {option.title}
              </Text>
              {option.description && (
                <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                  {option.description}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Cancel Button */}
      <TouchableOpacity
        style={[styles.cancelButton, { backgroundColor: colors.background }]}
        onPress={onClose}
      >
        <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
          {t('common.cancel')}
        </Text>
      </TouchableOpacity>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  options: {
    marginBottom: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  cancelButton: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
});
