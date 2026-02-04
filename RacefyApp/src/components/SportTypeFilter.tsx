import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import type { SportTypeWithIcon } from '../hooks/useSportTypes';

interface SportTypeFilterProps {
  sportTypes: SportTypeWithIcon[];
  selectedSportTypeId: number | null;
  onSelectSportType: (sportTypeId: number | null) => void;
  isLoading?: boolean;
}

export function SportTypeFilter({
  sportTypes,
  selectedSportTypeId,
  onSelectSportType,
  isLoading = false,
}: SportTypeFilterProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const isAllSelected = selectedSportTypeId === null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* All Sports Option */}
        <TouchableOpacity
          style={[
            styles.sportItem,
            {
              backgroundColor: isAllSelected ? colors.primary : colors.background,
              borderColor: isAllSelected ? colors.primary : colors.border,
            },
          ]}
          onPress={() => onSelectSportType(null)}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Ionicons
            name="apps-outline"
            size={24}
            color={isAllSelected ? colors.white : colors.textSecondary}
          />
          <Text
            style={[
              styles.sportLabel,
              { color: isAllSelected ? colors.white : colors.textSecondary },
            ]}
          >
            {t('profile.stats.allSports')}
          </Text>
        </TouchableOpacity>

        {/* Individual Sport Types */}
        {sportTypes.map((sport) => {
          const isSelected = selectedSportTypeId === sport.id;
          return (
            <TouchableOpacity
              key={sport.id}
              style={[
                styles.sportItem,
                {
                  backgroundColor: isSelected ? colors.primary : colors.background,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onSelectSportType(sport.id)}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Ionicons
                name={sport.icon}
                size={24}
                color={isSelected ? colors.white : colors.textSecondary}
              />
              <Text
                style={[
                  styles.sportLabel,
                  { color: isSelected ? colors.white : colors.textSecondary },
                ]}
              >
                {sport.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  sportItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    minWidth: 80,
    gap: spacing.xs,
  },
  sportLabel: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    textAlign: 'center',
  },
});