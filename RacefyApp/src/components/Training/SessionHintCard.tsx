import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../theme';
import { CollapsibleSection } from '../CollapsibleSection';
import type { SessionHint } from '../../types/api';

interface Props {
  hint: SessionHint;
}

export function SessionHintCard({ hint }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [warmUpExpanded, setWarmUpExpanded] = useState(false);
  const [mainFocusExpanded, setMainFocusExpanded] = useState(false);
  const [coolDownExpanded, setCoolDownExpanded] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      {/* Session Header */}
      <View style={styles.header}>
        <View style={[styles.sessionBadge, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.sessionBadgeText, { color: colors.primary }]}>
            {t('training.weekDetail.sessionNumber', { number: hint.session_order })}
          </Text>
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {hint.title}
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {hint.description}
        </Text>
      </View>

      {/* Collapsible Sections */}
      <CollapsibleSection
        title={t('training.coachingHints.warmUp')}
        icon="flame-outline"
        isExpanded={warmUpExpanded}
        onToggle={() => setWarmUpExpanded(!warmUpExpanded)}
      >
        <Text style={[styles.sectionContent, { color: colors.textPrimary }]}>
          {hint.warm_up}
        </Text>
      </CollapsibleSection>

      <CollapsibleSection
        title={t('training.coachingHints.mainFocus')}
        icon="fitness-outline"
        isExpanded={mainFocusExpanded}
        onToggle={() => setMainFocusExpanded(!mainFocusExpanded)}
      >
        <Text style={[styles.sectionContent, { color: colors.textPrimary }]}>
          {hint.main_focus}
        </Text>
      </CollapsibleSection>

      <CollapsibleSection
        title={t('training.coachingHints.coolDown')}
        icon="snow-outline"
        isExpanded={coolDownExpanded}
        onToggle={() => setCoolDownExpanded(!coolDownExpanded)}
      >
        <Text style={[styles.sectionContent, { color: colors.textPrimary }]}>
          {hint.cool_down}
        </Text>
      </CollapsibleSection>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
  },
  sessionBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  sessionBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  sectionContent: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
});
