import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ActionButton } from '../../../../components';
import { spacing } from '../../../../theme';

interface QuickActionsBarV2Props {
  onCreatePost: () => void;
  onFindEvents: () => void;
}

/**
 * QuickActionsBarV2 - Nowa wersja paska szybkich akcji
 *
 * Zmiany w wersji V2:
 * - Tylko 2 przyciski (Create Post, Find Events)
 * - Usunięto przycisk "Start Activity" (przeniesiony do Primary CTA)
 * - Design zgodny z mockupem: emoji, semi-transparent tła, bordery
 * - Używa reużywalnego komponentu ActionButton
 */
export function QuickActionsBarV2({ onCreatePost, onFindEvents }: QuickActionsBarV2Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <ActionButton
        label={t('home.quickActions.createPost')}
        icon="✏️"
        backgroundColor="rgba(59, 130, 246, 0.08)"
        borderColor="rgba(59, 130, 246, 0.15)"
        onPress={onCreatePost}
      />
      <ActionButton
        label={t('home.quickActions.findEvents')}
        icon="🏆"
        backgroundColor="rgba(245, 158, 11, 0.08)"
        borderColor="rgba(245, 158, 11, 0.15)"
        onPress={onFindEvents}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.lg,
  },
});
