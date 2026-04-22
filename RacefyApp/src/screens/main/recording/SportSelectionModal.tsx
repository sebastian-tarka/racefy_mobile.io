import React from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks';
import { ScreenContainer } from '../../../components';
import { fontSize, spacing, borderRadius } from '../../../theme';
import type { SportTypeWithIcon } from '../../../hooks/useSportTypes';

interface Props {
  visible: boolean;
  onClose: () => void;
  sportTypes: SportTypeWithIcon[];
  selectedSport: SportTypeWithIcon | null;
  onSelect: (sport: SportTypeWithIcon) => void;
}

export function SportSelectionModal({ visible, onClose, sportTypes, selectedSport, onSelect }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScreenContainer style={styles.container}>
        <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('recording.selectSport')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={sportTypes}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item: sport }) => {
            const isSelected = selectedSport?.id === sport.id;
            return (
              <TouchableOpacity
                style={[
                  styles.sportItem,
                  { backgroundColor: colors.cardBackground },
                  isSelected && { backgroundColor: colors.primary + '15', borderWidth: 1, borderColor: colors.primary },
                ]}
                onPress={() => {
                  onSelect(sport);
                  onClose();
                }}
              >
                <View style={[styles.sportIcon, { backgroundColor: colors.background }, isSelected && { backgroundColor: colors.primary + '30' }]}>
                  <Ionicons name={sport.icon} size={24} color={isSelected ? colors.primary : colors.textSecondary} />
                </View>
                <Text style={[styles.sportName, { color: colors.textPrimary }, isSelected && { fontWeight: '600', color: colors.primary }]}>
                  {sport.name}
                </Text>
                {isSelected && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
              </TouchableOpacity>
            );
          }}
        />
      </ScreenContainer>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing.xs,
  },
  list: {
    padding: spacing.md,
  },
  sportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  sportIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  sportName: {
    flex: 1,
    fontSize: fontSize.md,
  },
});