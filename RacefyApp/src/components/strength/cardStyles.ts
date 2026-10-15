import { StyleSheet } from 'react-native';
import { fontSize, fontWeight, spacing } from '../../theme';

/** Shared by the strength cards on the activity screen (same look as its other sections). */
export const cardStyles = StyleSheet.create({
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  body: {
    paddingBottom: spacing.sm,
  },
  empty: {
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.5,
    paddingBottom: spacing.md,
  },
});
