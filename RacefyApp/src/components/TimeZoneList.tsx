import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { borderRadius, fontSize, spacing } from '../theme';
import { filterTimeZones, formatTimeZone, listTimeZones } from '../utils/timezone';

interface Props {
  selected: string | null;
  onSelect: (zone: string) => void;
  disabled?: boolean;
}

/** Searchable list of IANA zones with the current one ticked. */
export function TimeZoneList({ selected, onSelect, disabled }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const zones = useMemo(() => listTimeZones(), []);
  const shown = useMemo(() => filterTimeZones(zones, query), [zones, query]);

  return (
    <>
      <View
        style={[
          styles.search,
          { backgroundColor: colors.cardBackground, borderColor: colors.border },
        ]}
      >
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          value={query}
          onChangeText={setQuery}
          placeholder={t('settings.timezone.search')}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={t('settings.timezone.search')}
        />
      </View>
      <FlatList
        data={shown}
        keyExtractor={(zone) => zone}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={30}
        renderItem={({ item }) => {
          const isSelected = item === selected;
          return (
            <TouchableOpacity
              style={[
                styles.zoneItem,
                { borderBottomColor: colors.border },
                isSelected && { backgroundColor: colors.successLight },
              ]}
              onPress={() => onSelect(item)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.zoneText}>
                <Text
                  style={[
                    styles.zoneName,
                    { color: isSelected ? colors.primary : colors.textPrimary },
                  ]}
                >
                  {formatTimeZone(item)}
                </Text>
                <Text style={[styles.zoneId, { color: colors.textMuted }]}>{item}</Text>
              </View>
              {isSelected && <Ionicons name="checkmark" size={22} color={colors.primary} />}
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.list}
      />
    </>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: fontSize.md, paddingVertical: 0 },
  list: { paddingBottom: spacing.xl },
  zoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  zoneText: { flex: 1 },
  zoneName: { fontSize: fontSize.md, fontWeight: '500' },
  zoneId: { fontSize: fontSize.xs, marginTop: 1 },
});
