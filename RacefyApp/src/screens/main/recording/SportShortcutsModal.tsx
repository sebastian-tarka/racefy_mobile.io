import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks';
import { MAX_SPORT_SHORTCUTS } from '../../../hooks/useSportShortcuts';
import type { SportTypeWithIcon } from '../../../hooks/useSportTypes';
import { ScreenContainer } from '../../../components';
import { borderRadius, fontSize, msFont, spacing } from '../../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  sportTypes: SportTypeWithIcon[];
  /** Currently pinned sports, in rail order. */
  shortcuts: SportTypeWithIcon[];
  onSave: (ids: number[]) => void;
}

/**
 * Manage what the pre-start rail shows (design "Racefy v2" → SportShortcutsScreen).
 *
 * Two lists: what is on the rail — reorderable and removable — and the rest of
 * the catalogue, searchable. Reordering is arrow buttons rather than drag: the
 * list is at most six rows, and arrows work with one thumb and with a screen
 * reader, which a drag handle does not.
 */
export function SportShortcutsModal({ visible, onClose, sportTypes, shortcuts, onSave }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [ids, setIds] = useState<number[]>([]);
  const [query, setQuery] = useState('');

  // Re-seed from the live rail every time the sheet opens, so a cancelled edit
  // leaves nothing behind.
  useEffect(() => {
    if (visible) {
      setIds(shortcuts.map((s) => s.id));
      setQuery('');
    }
  }, [visible, shortcuts]);

  const pinned = ids
    .map((id) => sportTypes.find((s) => s.id === id))
    .filter((s): s is SportTypeWithIcon => !!s);

  const rest = sportTypes.filter(
    (s) => !ids.includes(s.id) && s.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const full = ids.length >= MAX_SPORT_SHORTCUTS;

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    const next = ids.slice();
    [next[index], next[target]] = [next[target], next[index]];
    setIds(next);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScreenContainer style={{ backgroundColor: colors.background }}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={t('common.cancel')}
          >
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t('recording.shortcuts.title')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {t('recording.shortcuts.counter', { count: ids.length, max: MAX_SPORT_SHORTCUTS })}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              onSave(ids);
              onClose();
            }}
            disabled={ids.length === 0}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text
              style={[
                styles.saveLink,
                { color: ids.length === 0 ? colors.textMuted : colors.primary },
              ]}
            >
              {t('common.save')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            {t('recording.shortcuts.onTheRail').toUpperCase()}
          </Text>
          {pinned.map((sport, index) => (
            <View
              key={sport.id}
              style={[
                styles.row,
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
              ]}
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.primary + '1F' }]}>
                <Ionicons name={sport.icon} size={19} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {sport.name}
                </Text>
                {index === 0 && (
                  <Text style={[styles.rowHint, { color: colors.textMuted }]}>
                    {t('recording.shortcuts.defaultSport')}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.miniButton, { borderColor: colors.border }]}
                onPress={() => move(index, -1)}
                disabled={index === 0}
                accessibilityLabel={t('recording.shortcuts.moveUp')}
              >
                <Ionicons
                  name="chevron-up"
                  size={16}
                  color={index === 0 ? colors.textMuted : colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.miniButton, { borderColor: colors.border }]}
                onPress={() => move(index, 1)}
                disabled={index === pinned.length - 1}
                accessibilityLabel={t('recording.shortcuts.moveDown')}
              >
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={index === pinned.length - 1 ? colors.textMuted : colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.miniButton, { borderColor: colors.border }]}
                onPress={() => setIds(ids.filter((id) => id !== sport.id))}
                disabled={ids.length <= 1}
                accessibilityLabel={t('recording.shortcuts.remove')}
              >
                <Ionicons
                  name="remove"
                  size={16}
                  color={ids.length <= 1 ? colors.textMuted : colors.error}
                />
              </TouchableOpacity>
            </View>
          ))}

          <View
            style={[
              styles.search,
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
            ]}
          >
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('recording.shortcuts.search')}
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.textPrimary }]}
            />
          </View>

          {rest.map((sport) => (
            <TouchableOpacity
              key={sport.id}
              style={[
                styles.row,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                  opacity: full ? 0.5 : 1,
                },
              ]}
              onPress={() => !full && setIds([...ids, sport.id])}
              disabled={full}
              activeOpacity={0.8}
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.background }]}>
                <Ionicons name={sport.icon} size={19} color={colors.textSecondary} />
              </View>
              <Text
                style={[styles.rowTitle, { color: colors.textPrimary, flex: 1 }]}
                numberOfLines={1}
              >
                {sport.name}
              </Text>
              <Ionicons name="add" size={20} color={full ? colors.textMuted : colors.primary} />
            </TouchableOpacity>
          ))}

          {full && (
            <Text style={[styles.fullHint, { color: colors.textMuted }]}>
              {t('recording.shortcuts.full', { max: MAX_SPORT_SHORTCUTS })}
            </Text>
          )}
        </ScrollView>
      </ScreenContainer>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  saveLink: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: msFont(10),
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  rowHint: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  miniButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    padding: 0,
  },
  fullHint: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
