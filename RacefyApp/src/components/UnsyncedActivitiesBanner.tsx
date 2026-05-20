import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../hooks/useTheme';
import {useUnsyncedActivitiesCount} from '../hooks/useUnsyncedActivities';
import {spacing} from '../theme';

interface Props {
  onPress: () => void;
}

export function UnsyncedActivitiesBanner({ onPress }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { count } = useUnsyncedActivitiesCount();

  if (count <= 0) return null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.warningLight,
          borderColor: colors.warning,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={t('unsynced.bannerTitle', { count })}
    >
      <Ionicons name="cloud-offline" size={22} color={colors.warning} style={styles.icon} />
      <View style={styles.text}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('unsynced.bannerTitle', { count })}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('unsynced.bannerSubtitle')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
  },
  icon: {
    marginRight: spacing.sm,
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});