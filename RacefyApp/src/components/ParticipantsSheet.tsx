import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Avatar } from './Avatar';
import { useTheme } from '../hooks/useTheme';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { spacing, fontSize, borderRadius } from '../theme';
import type { ConversationParticipant } from '../types/api';
import { SheetModal } from './SheetModal';

interface ParticipantsSheetProps {
  visible: boolean;
  conversationId: number;
  onClose: () => void;
  onUserPress: (username: string) => void;
}

export function ParticipantsSheet({
  visible,
  conversationId,
  onClose,
  onUserPress,
}: ParticipantsSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [participants, setParticipants] = useState<ConversationParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    setIsLoading(true);
    api
      .getConversationParticipants(conversationId)
      .then((data) => {
        if (mounted) setParticipants(data);
      })
      .catch((error: any) => {
        logger.error('api', 'Failed to load participants', {
          conversationId,
          error: error.message,
        });
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [visible, conversationId]);

  const renderRow = ({ item }: { item: ConversationParticipant }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => {
        onClose();
        onUserPress(item.username);
      }}
      activeOpacity={0.7}
    >
      <Avatar uri={item.avatar} name={item.name} size="md" />
      <View style={styles.rowText}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.username, { color: colors.textSecondary }]} numberOfLines={1}>
          @{item.username}
        </Text>
      </View>
      {item.is_captain ? (
        <View style={[styles.captainChip, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="star" size={12} color={colors.primary} />
          <Text style={[styles.captainText, { color: colors.primary }]}>
            {t('messaging.captain')}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <SheetModal visible={visible} onClose={onClose} style={styles.sheet}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('messaging.viewMembers')}
        </Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={participants}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderRow}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
          )}
        />
      )}
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: spacing.lg,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  username: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  captainChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  captainText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48 + spacing.md,
  },
});
