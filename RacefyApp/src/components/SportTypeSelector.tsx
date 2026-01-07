import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import { useSportTypes, type SportTypeWithIcon, FALLBACK_SPORTS } from '../hooks/useSportTypes';

export interface SportTypeOption {
  id: number;
  name: string;
  slug: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// Export for backward compatibility - prefer using useSportTypes hook
export const SPORT_TYPES: SportTypeOption[] = FALLBACK_SPORTS;

interface SportTypeSelectorProps {
  value: number | null;
  onChange: (sportTypeId: number) => void;
  error?: string;
  disabled?: boolean;
}

export function SportTypeSelector({ value, onChange, error, disabled }: SportTypeSelectorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { sportTypes, isLoading, getSportById } = useSportTypes();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const selectedSport = getSportById(value || 0);

  const renderItem = ({ item }: { item: SportTypeWithIcon }) => {
    const isSelected = item.id === value;
    return (
      <TouchableOpacity
        style={[
          styles.sportItem,
          { backgroundColor: colors.cardBackground },
          isSelected && { backgroundColor: colors.primary + '15', borderWidth: 1, borderColor: colors.primary },
        ]}
        onPress={() => {
          onChange(item.id);
          setIsModalVisible(false);
        }}
      >
        <View style={[styles.sportIcon, { backgroundColor: colors.background }, isSelected && { backgroundColor: colors.primary + '30' }]}>
          <Ionicons
            name={item.icon}
            size={24}
            color={isSelected ? colors.primary : colors.textSecondary}
          />
        </View>
        <Text style={[styles.sportName, { color: colors.textPrimary }, isSelected && { fontWeight: '600', color: colors.primary }]}>
          {item.name}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>{t('eventForm.sportType')}</Text>
      <TouchableOpacity
        style={[
          styles.selector,
          { backgroundColor: colors.background, borderColor: colors.border },
          error && { borderColor: colors.error },
          disabled && { opacity: 0.6 },
        ]}
        onPress={() => !disabled && setIsModalVisible(true)}
        disabled={disabled}
      >
        {selectedSport ? (
          <View style={styles.selectedValue}>
            <Ionicons
              name={selectedSport.icon}
              size={20}
              color={disabled ? colors.textMuted : colors.primary}
            />
            <Text style={[styles.selectedText, { color: disabled ? colors.textMuted : colors.textPrimary }]}>{selectedSport.name}</Text>
          </View>
        ) : (
          <Text style={[styles.placeholder, { color: colors.textMuted }]}>{t('eventForm.selectSportType')}</Text>
        )}
        <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
      {error && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('eventForm.selectSportType')}</Text>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={sportTypes}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  selectorError: {
    // borderColor applied inline
  },
  placeholder: {
    fontSize: fontSize.md,
  },
  selectedValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectedText: {
    fontSize: fontSize.md,
  },
  errorText: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.md,
  },
  sportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  sportItemSelected: {
    // styles applied inline
  },
  sportIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  sportIconSelected: {
    // styles applied inline
  },
  sportName: {
    flex: 1,
    fontSize: fontSize.md,
  },
  sportNameSelected: {
    // styles applied inline
  },
});
