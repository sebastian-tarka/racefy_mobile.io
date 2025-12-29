import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../../components';
import { useTheme } from '../../../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../../../theme';

type IconName = keyof typeof Ionicons.glyphMap;

interface Feature {
  icon: IconName;
  titleKey: string;
  descriptionKey: string;
  onPress: () => void;
}

interface FeaturesListProps {
  features: Feature[];
}

export function FeaturesList({ features }: FeaturesListProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('home.features')}</Text>
      {features.map((feature, index) => (
        <TouchableOpacity
          key={index}
          onPress={feature.onPress}
          activeOpacity={0.8}
        >
          <Card style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: colors.primaryLight + '20' }]}>
              <Ionicons name={feature.icon} size={28} color={colors.primary} />
            </View>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>{t(feature.titleKey)}</Text>
              <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>{t(feature.descriptionKey)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Card>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: fontSize.sm,
  },
});
