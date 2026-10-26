import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, TextInput } from 'react-native';
import { api } from '../../../services/api';
import { logger } from '../../../services/logger';
import type { Event } from '../../../types/api';

/**
 * Event search on the Events screen: a sliding bar, a 300 ms debounce, and
 * results only from the second character on.
 */
export function useEventSearch() {
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Event[] | null>(null);
  const searchInputRef = useRef<TextInput>(null);
  const searchAnimValue = useRef(new Animated.Value(0)).current;
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

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
      logger.error('api', 'Search error', { error });
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  const handleSearchChange = useCallback(
    (text: string) => {
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
    },
    [performSearch],
  );

  const toggleSearch = useCallback(() => {
    if (isSearchVisible) {
      setSearchQuery('');
      setSearchResults(null);
      Keyboard.dismiss();
    }
    setIsSearchVisible(!isSearchVisible);
  }, [isSearchVisible]);

  /** Leave search (after opening a result). */
  const closeSearch = useCallback(() => {
    setIsSearchVisible(false);
    setSearchQuery('');
    setSearchResults(null);
  }, []);

  return {
    isSearchVisible,
    searchQuery,
    isSearching,
    searchResults,
    searchInputRef,
    searchAnimValue,
    handleSearchChange,
    toggleSearch,
    closeSearch,
  };
}

export type EventSearch = ReturnType<typeof useEventSearch>;
