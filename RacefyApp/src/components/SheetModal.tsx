import React from 'react';
import {
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { borderRadius, spacing } from '../theme';

interface SheetModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Merged over the sheet's defaults (rounded top, card background): maxHeight, padding… */
  style?: StyleProp<ViewStyle>;
  /** Pad the bottom for the home indicator (min spacing.lg). Default true. */
  safeAreaBottom?: boolean;
  /** Vertical space around the drag handle. Default 'md'. */
  handleSpacing?: 'sm' | 'md';
}

/**
 * The bottom-sheet shell: dimmed backdrop that closes on tap, a sheet sliding up from
 * the bottom with a drag handle. The content is the caller's.
 */
export function SheetModal({
  visible,
  onClose,
  children,
  style,
  safeAreaBottom = true,
  handleSpacing = 'md',
}: SheetModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          {/* Swallows taps inside the sheet so only the backdrop closes it. */}
          <TouchableWithoutFeedback onPress={swallowTap}>
            <View
              style={[
                styles.sheet,
                { backgroundColor: colors.cardBackground },
                safeAreaBottom && { paddingBottom: Math.max(insets.bottom, spacing.lg) },
                style,
              ]}
            >
              <View
                style={[
                  styles.handleContainer,
                  { paddingVertical: handleSpacing === 'sm' ? spacing.sm : spacing.md },
                ]}
              >
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
              </View>
              {children}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const swallowTap = () => {};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  handleContainer: {
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
});
