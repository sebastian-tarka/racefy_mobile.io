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
import { colors, spacing, fontSize, borderRadius } from '../theme';
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
}

export function SportTypeSelector({ value, onChange, error }: SportTypeSelectorProps) {
  const { t } = useTranslation();
  const { sportTypes, isLoading, getSportById } = useSportTypes();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const selectedSport = getSportById(value || 0);

  const renderItem = ({ item }: { item: SportTypeWithIcon }) => {
    const isSelected = item.id === value;
    return (
      <TouchableOpacity
        style={[styles.sportItem, isSelected && styles.sportItemSelected]}
        onPress={() => {
          onChange(item.id);
          setIsModalVisible(false);
        }}
      >
        <View style={[styles.sportIcon, isSelected && styles.sportIconSelected]}>
          <Ionicons
            name={item.icon}
            size={24}
            color={isSelected ? colors.primary : colors.textSecondary}
          />
        </View>
        <Text style={[styles.sportName, isSelected && styles.sportNameSelected]}>
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
      <Text style={styles.label}>{t('eventForm.sportType')}</Text>
      <TouchableOpacity
        style={[styles.selector, error && styles.selectorError]}
        onPress={() => setIsModalVisible(true)}
      >
        {selectedSport ? (
          <View style={styles.selectedValue}>
            <Ionicons
              name={selectedSport.icon}
              size={20}
              color={colors.primary}
            />
            <Text style={styles.selectedText}>{selectedSport.name}</Text>
          </View>
        ) : (
          <Text style={styles.placeholder}>{t('eventForm.selectSportType')}</Text>
        )}
        <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('eventForm.selectSportType')}</Text>
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
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  selectorError: {
    borderColor: colors.error,
  },
  placeholder: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  selectedValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectedText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing.xs,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
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
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  sportItemSelected: {
    backgroundColor: colors.primaryLight + '15',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  sportIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  sportIconSelected: {
    backgroundColor: colors.primaryLight + '30',
  },
  sportName: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  sportNameSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
});
