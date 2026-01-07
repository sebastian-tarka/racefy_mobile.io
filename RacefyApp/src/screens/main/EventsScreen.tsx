import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Animated,
  ActivityIndicator,
  Keyboard,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { EventCard, Loading, EmptyState, Button } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { useEvents } from '../../hooks/useEvents';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import type { Event } from '../../types/api';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Events'>,
  NativeStackScreenProps<RootStackParamList>
>;

type FilterOption = 'all' | 'upcoming' | 'ongoing' | 'completed';

export function EventsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isAuthenticated } = useAuth();
  const {
    events,
    isLoading,
    isRefreshing,
    hasMore,
    error,
    statusFilter,
    refresh,
    loadMore,
    changeFilter,
  } = useEvents();

  const filters: { label: string; value: FilterOption }[] = [
    { label: t('events.filters.all'), value: 'all' },
    { label: t('events.filters.upcoming'), value: 'upcoming' },
    { label: t('events.filters.ongoing'), value: 'ongoing' },
    { label: t('events.filters.completed'), value: 'completed' },
  ];

  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');

  // Search state
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Event[] | null>(null);
  const searchInputRef = useRef<TextInput>(null);
  const searchAnimValue = useRef(new Animated.Value(0)).current;
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    changeFilter(activeFilter === 'all' ? undefined : activeFilter);
  }, [activeFilter]);

  useEffect(() => {
    if (statusFilter !== undefined || activeFilter === 'all') {
      refresh();
    }
  }, [statusFilter]);

  // Animate search visibility
  useEffect(() => {
    Animated.timing(searchAnimValue, {
      toValue: isSearchVisible ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      if (isSearchVisible) {
        searchInputRef.current?.focus();
      }
    });
  }, [isSearchVisible]);

  // Handle search
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.search({ query, type: 'events', per_type: 20 });
      setSearchResults(response.results.events.data);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (text.length >= 2) {
      setIsSearching(true);
      searchDebounceRef.current = setTimeout(() => {
        performSearch(text);
      }, 300);
    } else {
      setSearchResults(null);
      setIsSearching(false);
    }
  }, [performSearch]);

  const toggleSearch = useCallback(() => {
    if (isSearchVisible) {
      setSearchQuery('');
      setSearchResults(null);
      Keyboard.dismiss();
    }
    setIsSearchVisible(!isSearchVisible);
  }, [isSearchVisible]);

  const handleEventPress = (eventId: number) => {
    navigation.navigate('EventDetail', { eventId });
  };

  const renderSearchBar = () => {
    if (!isSearchVisible) return null;

    const searchBarHeight = searchAnimValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 56],
    });

    return (
      <Animated.View style={{ height: searchBarHeight, overflow: 'hidden' }}>
        <View style={[styles.searchContainer, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
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
  };

  const renderSearchResults = () => {
    if (!isSearchVisible || searchQuery.length === 0) return null;

    if (searchQuery.length < 2) {
      return (
        <View style={styles.searchResultsContainer}>
          <Text style={[styles.searchHint, { color: colors.textMuted }]}>
            {t('search.minChars')}
          </Text>
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
              setIsSearchVisible(false);
              setSearchQuery('');
              setSearchResults(null);
              handleEventPress(item.id);
            }}
          />
        )}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  if (isLoading && events.length === 0) {
    return <Loading fullScreen message={t('events.loadingEvents')} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('events.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('events.subtitle')}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={toggleSearch}
          >
            <Ionicons
              name={isSearchVisible ? 'close' : 'search'}
              size={24}
              color={isSearchVisible ? colors.error : colors.textPrimary}
            />
          </TouchableOpacity>
          {isAuthenticated && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('EventForm', {})}
            >
              <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderSearchBar()}

      {isSearchVisible && searchQuery.length > 0 ? (
        renderSearchResults()
      ) : (
        <>
          <View style={[styles.filterContainer, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterButton,
                  { backgroundColor: colors.borderLight },
                  activeFilter === filter.value && { backgroundColor: colors.primary },
                ]}
                onPress={() => setActiveFilter(filter.value)}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: colors.textSecondary },
                    activeFilter === filter.value && { color: colors.white },
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FlatList
            data={events}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <EventCard event={item} onPress={() => handleEventPress(item.id)} />
            )}
            ListEmptyComponent={
              error ? (
                <EmptyState
                  icon="alert-circle-outline"
                  title={t('events.failedToLoad')}
                  message={error}
                  actionLabel={t('common.tryAgain')}
                  onAction={refresh}
                />
              ) : (
                <EmptyState
                  icon="calendar-outline"
                  title={t('events.noEvents')}
                  message={
                    activeFilter === 'all'
                      ? t('events.noEventsMessage')
                      : t('events.noEventsFiltered', { filter: filters.find(f => f.value === activeFilter)?.label })
                  }
                  actionLabel={isAuthenticated ? t('events.createEvent') : undefined}
                  onAction={
                    isAuthenticated
                      ? () => navigation.navigate('EventForm', {})
                      : undefined
                  }
                />
              )
            }
            ListFooterComponent={
              isLoading && events.length > 0 ? (
                <Loading message={t('common.loadingMore')} />
              ) : null
            }
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={refresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            contentContainerStyle={styles.listContent}
          />
        </>
      )}
    </SafeAreaView>
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
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerButton: {
    padding: spacing.xs,
  },
  // Search styles
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    height: 40,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    height: '100%',
  },
  searchResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  searchHint: {
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  searchingText: {
    fontSize: fontSize.md,
    marginTop: spacing.sm,
  },
  // Filter and list styles
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
});
