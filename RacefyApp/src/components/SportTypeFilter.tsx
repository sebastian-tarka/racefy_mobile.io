import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import { sportColor } from '../utils/sportColor';
import type { SportTypeWithIcon } from '../hooks/useSportTypes';

interface SportTypeFilterProps {
  sportTypes: SportTypeWithIcon[];
  selectedSportTypeId: number | null;
  onSelectSportType: (sportTypeId: number | null) => void;
  isLoading?: boolean;
}

/**
 * Sport chips (design "Racefy v2" → SportFilter): a row of pills, each carrying
 * its sport's own colour so the same sport reads the same here and in the bars
 * below. Selection is the ink fill — the colour is identity, not state.
 */
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
              backgroundColor: isAllSelected ? colors.textPrimary : colors.cardBackground,
              borderColor: isAllSelected ? colors.textPrimary : colors.border,
            },
          ]}
          onPress={() => onSelectSportType(null)}
          disabled={isLoading}
          activeOpacity={0.8}
          accessibilityRole="radio"
          accessibilityState={{ selected: isAllSelected }}
        >
          <Ionicons
            name="grid-outline"
            size={16}
            color={isAllSelected ? colors.cardBackground : colors.primary}
          />
          <Text
            style={[
              styles.sportLabel,
              { color: isAllSelected ? colors.cardBackground : colors.textSecondary },
            ]}
          >
            {t('profile.stats.allSports')}
          </Text>
        </TouchableOpacity>

        {/* Individual Sport Types */}
        {sportTypes.map((sport) => {
          const isSelected = selectedSportTypeId === sport.id;
          const tone = sportColor(sport);
          return (
            <TouchableOpacity
              key={sport.id}
              style={[
                styles.sportItem,
                {
                  backgroundColor: isSelected ? colors.textPrimary : colors.cardBackground,
                  borderColor: isSelected ? colors.textPrimary : colors.border,
                },
              ]}
              onPress={() => onSelectSportType(sport.id)}
              disabled={isLoading}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <Ionicons
                name={sport.icon}
                size={16}
                color={isSelected ? colors.cardBackground : tone}
              />
              <Text
                style={[
                  styles.sportLabel,
                  { color: isSelected ? colors.cardBackground : colors.textSecondary },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    paddingLeft: spacing.md - 2,
    paddingRight: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs + 2,
  },
  sportLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
