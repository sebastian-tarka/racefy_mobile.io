import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import { useMentions, type Suggestion } from 'react-native-controlled-mentions';
import { Avatar } from './Avatar';
import { useTheme } from '../hooks/useTheme';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { spacing, fontSize, borderRadius } from '../theme';
import type { MentionSearchUser, MentionSearchEvent, MentionSearchActivity } from '../types/api';

interface MentionInputProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  editable?: boolean;
  autoFocus?: boolean;
  onFocus?: () => void;
  numberOfLines?: number;
  error?: string;
}

const DEBOUNCE_MS = 300;

function useDebouncedSearch<T>(
  searchFn: (query: string) => Promise<T[]>,
): { results: T[]; search: (keyword: string | undefined) => void; clear: () => void } {
  const [results, setResults] = useState<T[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((keyword: string | undefined) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (keyword === undefined || keyword.trim().length === 0) {
      setResults([]);
      return;
    }

    timerRef.current = setTimeout(async () => {
      try {
        const data = await searchFn(keyword);
        setResults(data);
      } catch (err) {
        logger.error('api', 'Mention search failed', { error: err });
        setResults([]);
      }
    }, DEBOUNCE_MS);
  }, [searchFn]);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setResults([]);
  }, []);

  return { results, search, clear };
}

function UserSuggestionItem({ item, onPress }: { item: MentionSearchUser; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={styles.suggestionItem} onPress={onPress} activeOpacity={0.7}>
      <Avatar uri={item.avatar} name={item.name} size="sm" />
      <View style={styles.suggestionText}>
        <Text style={[styles.suggestionName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.suggestionMeta, { color: colors.textMuted }]} numberOfLines={1}>@{item.username}</Text>
      </View>
    </TouchableOpacity>
  );
}

function EventSuggestionItem({ item, onPress }: { item: MentionSearchEvent; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={styles.suggestionItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.triggerIcon, { backgroundColor: colors.info + '18' }]}>
        <Text style={[styles.triggerIconText, { color: colors.info }]}>#</Text>
      </View>
      <View style={styles.suggestionText}>
        <Text style={[styles.suggestionName, { color: colors.textPrimary }]} numberOfLines={1}>{item.title || item.name}</Text>
        {item.location && <Text style={[styles.suggestionMeta, { color: colors.textMuted }]} numberOfLines={1}>{item.location}</Text>}
      </View>
    </TouchableOpacity>
  );
}

function ActivitySuggestionItem({ item, onPress }: { item: MentionSearchActivity; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={styles.suggestionItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.triggerIcon, { backgroundColor: (colors.ai || '#A855F7') + '18' }]}>
        <Text style={[styles.triggerIconText, { color: colors.ai || '#A855F7' }]}>!</Text>
      </View>
      <View style={styles.suggestionText}>
        <Text style={[styles.suggestionName, { color: colors.textPrimary }]} numberOfLines={1}>{item.title || item.name}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function MentionInput({
  value,
  onChange,
  placeholder,
  multiline = true,
  maxLength = 2000,
  style,
  inputStyle,
  editable = true,
  autoFocus = false,
  onFocus,
  numberOfLines,
  error,
}: MentionInputProps) {
  const { colors } = useTheme();

  const searchUsers = useCallback(async (query: string): Promise<MentionSearchUser[]> => {
    const resp = await api.searchMentionUsers(query);
    return resp.data;
  }, []);

  const searchEvents = useCallback(async (query: string): Promise<MentionSearchEvent[]> => {
    const resp = await api.searchMentionEvents(query);
    return resp.data;
  }, []);

  const searchActivities = useCallback(async (query: string): Promise<MentionSearchActivity[]> => {
    const resp = await api.searchMentionActivities(query);
    return resp.data;
  }, []);

  const userSearch = useDebouncedSearch(searchUsers);
  const eventSearch = useDebouncedSearch(searchEvents);
  const activitySearch = useDebouncedSearch(searchActivities);

  const { textInputProps, triggers } = useMentions({
    value,
    onChange,
    triggersConfig: {
      mention: {
        trigger: '@',
        textStyle: { fontWeight: '600', color: colors.primary },
        isInsertSpaceAfterMention: true,
      },
      event: {
        trigger: '#',
        textStyle: { fontWeight: '600', color: colors.info },
        isInsertSpaceAfterMention: true,
      },
      activity: {
        trigger: '!',
        textStyle: { fontWeight: '600', color: colors.ai || '#A855F7' },
        isInsertSpaceAfterMention: true,
      },
    },
  });

  // Track which trigger is active for showing suggestions
  const mentionKeyword = triggers.mention.keyword;
  const eventKeyword = triggers.event.keyword;
  const activityKeyword = triggers.activity.keyword;

  // Trigger search when keyword changes
  React.useEffect(() => { userSearch.search(mentionKeyword); }, [mentionKeyword]);
  React.useEffect(() => { eventSearch.search(eventKeyword); }, [eventKeyword]);
  React.useEffect(() => { activitySearch.search(activityKeyword); }, [activityKeyword]);

  const showUserSuggestions = mentionKeyword !== undefined && userSearch.results.length > 0;
  const showEventSuggestions = eventKeyword !== undefined && eventSearch.results.length > 0;
  const showActivitySuggestions = activityKeyword !== undefined && activitySearch.results.length > 0;
  const showSuggestions = showUserSuggestions || showEventSuggestions || showActivitySuggestions;

  const handleSelectUser = (user: MentionSearchUser) => {
    triggers.mention.onSelect({ id: String(user.id), name: user.name });
    userSearch.clear();
  };

  const handleSelectEvent = (event: MentionSearchEvent) => {
    triggers.event.onSelect({ id: String(event.id), name: event.title || event.name || '' });
    eventSearch.clear();
  };

  const handleSelectActivity = (activity: MentionSearchActivity) => {
    triggers.activity.onSelect({ id: String(activity.id), name: activity.title || activity.name || '' });
    activitySearch.clear();
  };

  return (
    <View style={[styles.container, style]}>
      {showSuggestions && (
        <View style={[styles.suggestionsContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          {showUserSuggestions && (
            <ScrollView keyboardShouldPersistTaps="always" style={styles.suggestionList} nestedScrollEnabled>
              {userSearch.results.map((item) => (
                <UserSuggestionItem key={`user-${item.id}`} item={item} onPress={() => handleSelectUser(item)} />
              ))}
            </ScrollView>
          )}
          {showEventSuggestions && (
            <ScrollView keyboardShouldPersistTaps="always" style={styles.suggestionList} nestedScrollEnabled>
              {eventSearch.results.map((item) => (
                <EventSuggestionItem key={`event-${item.id}`} item={item} onPress={() => handleSelectEvent(item)} />
              ))}
            </ScrollView>
          )}
          {showActivitySuggestions && (
            <ScrollView keyboardShouldPersistTaps="always" style={styles.suggestionList} nestedScrollEnabled>
              {activitySearch.results.map((item) => (
                <ActivitySuggestionItem key={`activity-${item.id}`} item={item} onPress={() => handleSelectActivity(item)} />
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <TextInput
        {...textInputProps}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        maxLength={maxLength}
        editable={editable}
        autoFocus={autoFocus}
        onFocus={onFocus}
        numberOfLines={numberOfLines}
        style={[
          styles.input,
          {
            backgroundColor: colors.background,
            color: colors.textPrimary,
            borderColor: error ? colors.error : colors.border,
          },
          inputStyle,
        ]}
      />
      {error && (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  suggestionsContainer: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    maxHeight: 200,
    overflow: 'hidden',
  },
  suggestionList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  suggestionName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  suggestionMeta: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  triggerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  triggerIconText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
