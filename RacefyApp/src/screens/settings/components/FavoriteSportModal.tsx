import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '../../../components';
import type { SportTypeWithIcon } from '../../../hooks/useSportTypes';
import { useTheme } from '../../../hooks/useTheme';
import { fontSize, spacing } from '../../../theme';

interface Props {
  visible: boolean;
  sportTypes: SportTypeWithIcon[];
  isLoading: boolean;
  selectedId: number | null;
  onSelect: (sport: SportTypeWithIcon | null) => void;
  onClose: () => void;
}

/** Pick the sport preselected when a recording starts — or none. */
export function FavoriteSportModal({
  visible,
  sportTypes,
  isLoading,
  selectedId,
  onSelect,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScreenContainer style={styles.modalContainer}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
            {t('settings.selectFavoriteSport')}
          </Text>
          <View style={styles.modalHeaderSpacer} />
        </View>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {t('common.loading')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={[
              {
                id: null,
                name: t('settings.noSportSelected'),
                slug: 'none',
                icon: 'close-circle-outline' as keyof typeof Ionicons.glyphMap,
                is_active: true,
              },
              ...sportTypes,
            ]}
            keyExtractor={(item) => item.id?.toString() || 'none'}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.sportItem,
                  { borderBottomColor: colors.border },
                  selectedId === item.id && {
                    backgroundColor: colors.successLight,
                  },
                ]}
                onPress={() => onSelect(item.id ? (item as SportTypeWithIcon) : null)}
              >
                <Ionicons
                  name={item.icon}
                  size={24}
                  color={selectedId === item.id ? colors.primary : colors.textSecondary}
                  style={styles.sportIcon}
                />
                <Text
                  style={[
                    styles.sportName,
                    {
                      color: selectedId === item.id ? colors.primary : colors.textPrimary,
                    },
                  ]}
                >
                  {item.name}
                </Text>
                {selectedId === item.id && (
                  <Ionicons name="checkmark" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.sportList}
          />
        )}
      </ScreenContainer>
    </Modal>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  loadingText: {
    fontSize: fontSize.md,
    marginTop: spacing.md,
  },
  modalCloseButton: {
    padding: spacing.xs,
    width: 44,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalHeaderSpacer: {
    width: 44,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  sportIcon: {
    marginRight: spacing.md,
  },
  sportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  sportList: {
    paddingBottom: spacing.xl,
  },
  sportName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
});
