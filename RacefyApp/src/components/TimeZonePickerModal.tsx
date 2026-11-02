import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from './ScreenContainer';
import { TimeZoneList } from './TimeZoneList';
import { useTheme } from '../hooks/useTheme';
import { fontSize, spacing } from '../theme';

interface Props {
  visible: boolean;
  title: string;
  selected: string | null;
  onSelect: (zone: string) => void;
  onClose: () => void;
}

/** A page-sheet with the searchable zone list; picking a zone closes it. */
export function TimeZonePickerModal({ visible, title, selected, onSelect, onClose }: Props) {
  const { colors } = useTheme();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScreenContainer style={styles.container}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <TimeZoneList
          selected={selected}
          onSelect={(zone) => {
            onSelect(zone);
            onClose();
          }}
        />
      </ScreenContainer>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: { padding: spacing.xs, width: 44 },
  headerSpacer: { width: 44 },
  title: { fontSize: fontSize.lg, fontWeight: '600', flex: 1, textAlign: 'center' },
});
