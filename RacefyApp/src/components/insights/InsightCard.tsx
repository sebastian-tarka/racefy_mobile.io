import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../Card';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, fontWeight } from '../../theme';

interface InsightCardProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function InsightCard({ title, icon, children, style }: InsightCardProps) {
  const { colors } = useTheme();

  return (
    <Card style={style ? [styles.card, style] : styles.card}>
      <View style={styles.header}>
        <Ionicons name={icon} size={20} color={colors.primary} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginLeft: spacing.sm,
  },
});