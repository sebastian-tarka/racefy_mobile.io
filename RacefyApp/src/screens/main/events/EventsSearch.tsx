import React from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { EmptyState, EventCard } from '../../../components';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, fontSize, spacing } from '../../../theme';
import type { EventSearch } from './useEventSearch';

/** The sliding search field under the header. */
export function EventsSearchBar({ search }: { search: EventSearch }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isSearchVisible, searchAnimValue, searchInputRef, searchQuery, handleSearchChange } =
    search;
  if (!isSearchVisible) return null;

  const searchBarHeight = searchAnimValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 56],
  });

  return (
    <Animated.View style={{ height: searchBarHeight, overflow: 'hidden' }}>
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: colors.cardBackground, borderBottomColor: colors.border },
        ]}
      >
        <View style={[styles.searchInputContainer, { backgroundColor: colors.background }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={t('search.placeholderEvents')}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

/** Hint, spinner, "nothing found" or the result list. */
export function EventsSearchResults({
  search,
  bottomPadding,
  onOpenEvent,
}: {
  search: EventSearch;
  bottomPadding: number;
  onOpenEvent: (eventId: number) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isSearchVisible, searchQuery, isSearching, searchResults, closeSearch } = search;
  if (!isSearchVisible || searchQuery.length === 0) return null;

  if (searchQuery.length < 2) {
    return (
      <View style={styles.searchResultsContainer}>
        <Text style={[styles.searchHint, { color: colors.textMuted }]}>{t('search.minChars')}</Text>
      </View>
    );
  }

  if (isSearching) {
    return (
      <View style={styles.searchResultsContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.searchingText, { color: colors.textMuted }]}>
          {t('search.searching')}
        </Text>
      </View>
    );
  }

  if (!searchResults || searchResults.length === 0) {
    return (
      <View style={styles.searchResultsContainer}>
        <EmptyState
          icon="search-outline"
          title={t('search.noResults')}
          message={t('search.noResultsFor', { query: searchQuery })}
        />
      </View>
    );
  }

  return (
    <FlatList
      data={searchResults}
      keyExtractor={(item) => `search-${item.id}`}
      renderItem={({ item }) => (
        <EventCard
          event={item}
          onPress={() => {
            closeSearch();
            onOpenEvent(item.id);
          }}
        />
      )}
      contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  searchHint: {
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    height: '100%',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    height: 40,
    gap: spacing.sm,
  },
  searchResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  searchingText: {
    fontSize: fontSize.md,
    marginTop: spacing.sm,
  },
});
