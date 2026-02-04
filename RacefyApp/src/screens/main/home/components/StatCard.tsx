import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../hooks/useTheme';
import { spacing, borderRadius, fontSize, fontWeight } from '../../../../theme';
import { AnimatedNumber } from '../../../../components/AnimatedNumber';

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: number | string;
  suffix?: string;
  decimals?: number;
  valueColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  iconColor,
  label,
  value,
  suffix = '',
  decimals = 0,
  valueColor,
}) => {
  const { colors } = useTheme();

  const isNumeric = typeof value === 'number';
  const displayColor = valueColor || colors.textPrimary;

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.header}>
        <Ionicons name={icon} size={20} color={iconColor} />
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
      </View>

      <View style={styles.valueContainer}>
        {isNumeric ? (
          <AnimatedNumber
            value={value}
            suffix={suffix}
            decimals={decimals}
            style={{ ...styles.value, color: displayColor }}
          />
        ) : (
          <Text style={[styles.value, { color: displayColor }]}>
            {value}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  valueContainer: {
    minHeight: 32,
  },
  value: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
});
