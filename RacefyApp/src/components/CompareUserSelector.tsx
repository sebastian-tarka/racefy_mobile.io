import React, { useState, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { Avatar } from './Avatar';
import { spacing, fontSize, borderRadius } from '../theme';
import type { User } from '../types/api';

interface CompareUserSelectorProps {
  following: User[];
  selectedUser: User | null;
  onSelectUser: (user: User | null) => void;
  isLoading?: boolean;
}

function CompareUserSelectorComponent({
  following,
  selectedUser,
  onSelectUser,
  isLoading = false,
}: CompareUserSelectorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelectUser = (user: User | null) => {
    onSelectUser(user);
    setModalVisible(false);
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={[
        styles.userItem,
        {
          backgroundColor:
            selectedUser?.id === item.id
              ? colors.primary + '20'
              : colors.cardBackground,
        },
      ]}
      onPress={() => handleSelectUser(item)}
    >
      <Avatar uri={item.avatar} name={item.name} size="sm" />
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.textPrimary }]}>
          {item.name}
        </Text>
        <Text style={[styles.userUsername, { color: colors.textSecondary }]}>
          @{item.username}
        </Text>
      </View>
      {selectedUser?.id === item.id && (
        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <>
      <View style={styles.container}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {t('profile.stats.compareWith')}
        </Text>
        <TouchableOpacity
          style={[
            styles.selector,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.borderLight,
            },
          ]}
          onPress={() => setModalVisible(true)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : selectedUser ? (
            <View style={styles.selectedUser}>
              <Avatar uri={selectedUser.avatar} name={selectedUser.name} size="sm" />
              <Text style={[styles.selectedName, { color: colors.textPrimary }]}>
                {selectedUser.name}
              </Text>
            </View>
          ) : (
            <Text style={[styles.placeholder, { color: colors.textMuted }]}>
              {t('profile.stats.selectUser')}
            </Text>
          )}
          <Ionicons
            name="chevron-down"
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background },
            ]}
          >
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: colors.border },
              ]}
            >
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {t('profile.stats.selectUserTitle')}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Clear selection option */}
            {selectedUser && (
              <TouchableOpacity
                style={[
                  styles.clearButton,
                  { borderBottomColor: colors.border },
                ]}
                onPress={() => handleSelectUser(null)}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text style={[styles.clearText, { color: colors.textSecondary }]}>
                  {t('profile.stats.clearComparison')}
                </Text>
              </TouchableOpacity>
            )}

            {following.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="people-outline"
                  size={48}
                  color={colors.textMuted}
                />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {t('profile.stats.noFollowing')}
                </Text>
              </View>
            ) : (
              <FlatList
                data={following}
                keyExtractor={(item) => `following-${item.id}`}
                renderItem={renderUserItem}
                contentContainerStyle={styles.listContent}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  selectedUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectedName: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  placeholder: {
    fontSize: fontSize.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
  },
  clearText: {
    fontSize: fontSize.md,
  },
  listContent: {
    padding: spacing.sm,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  userUsername: {
    fontSize: fontSize.sm,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.md,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

export const CompareUserSelector = memo(CompareUserSelectorComponent);
