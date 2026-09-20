import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { msFont } from '../../theme';

interface Props {
  visible: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onClose: () => void;
}

/**
 * Refusal dialog for the event pin (design: EventLockDialog / EventBusyDialog).
 * There is deliberately no "unpin" or "switch" path in it: the discipline and
 * the event never change mid-recording, so the only way out is finish-and-save.
 */
export function EventPinDialog({
  visible,
  icon,
  title,
  body,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onClose,
}: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: colors.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.icon, { backgroundColor: colors.eventSoft }]}>
            <Ionicons name={icon} size={19} color={colors.event} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>
          <TouchableOpacity
            style={[styles.primary, { backgroundColor: colors.textPrimary }]}
            onPress={onPrimary}
            activeOpacity={0.85}
          >
            <Text style={[styles.primaryText, { color: colors.background }]}>{primaryLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondary, { borderColor: colors.border }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>
              {secondaryLabel}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,26,20,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: { width: '100%', maxWidth: 320, borderRadius: 20, padding: 18, paddingTop: 20 },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: msFont(16), fontWeight: '700', marginTop: 10 },
  body: { fontSize: msFont(13), lineHeight: msFont(13) * 1.45, marginTop: 5 },
  primary: {
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  primaryText: { fontSize: msFont(13.5), fontWeight: '700' },
  secondary: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  secondaryText: { fontSize: msFont(13), fontWeight: '600' },
});
