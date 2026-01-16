# Event Commentary - Implementation Guide

Complete implementation of AI-powered event commentary for the Racefy mobile app.

## Overview

The Event Commentary feature provides real-time AI-generated updates during events with warmup content, live updates, milestone announcements, and comprehensive summaries. This guide covers integration examples for both public users and event organizers.

## Architecture

### Data Layer
- **API Client**: `src/services/api.ts` - All commentary endpoints
- **Types**: `src/types/api.ts` - TypeScript interfaces for commentary data

### Hooks
- **useEventCommentaryFeed**: Feed with auto-refresh, pagination, language filtering
- **useCommentarySettings**: Load and update settings (organizers only)
- **useGenerateCommentary**: Manual commentary generation (organizers only)

### Components
- **CommentaryItem**: Single commentary card with type badges and timestamps
- **CommentaryFeed**: Complete feed with loading, empty states, token usage display

### Screens
- **EventCommentarySettingsScreen**: Full settings UI for event organizers

## Integration Examples

### 1. Public Event Details Screen - Commentary Tab

Add commentary feed to event detail screen for all users:

```typescript
// src/screens/details/EventDetailScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { CommentaryFeed } from '../../components';
import type { Event } from '../../types/api';

export function EventDetailScreen({ route }) {
  const { event } = route.params as { event: Event };
  const [activeTab, setActiveTab] = useState('details');

  return (
    <View style={styles.container}>
      {/* Tab selector */}
      <TabSelector
        tabs={['details', 'participants', 'commentary']}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Content */}
      {activeTab === 'commentary' && (
        <CommentaryFeed
          eventId={event.id}
          autoRefresh={event.status === 'ongoing'}
          refreshInterval={30000} // 30 seconds
          showTokenUsage={false} // Hide for public users
        />
      )}
    </View>
  );
}
```

### 2. Organizer Dashboard - Commentary Settings Button

Add settings button for event organizers:

```typescript
// src/screens/details/EventDetailScreen.tsx (organizer view)
import { useAuth } from '../../hooks';

export function EventDetailScreen({ route, navigation }) {
  const { user } = useAuth();
  const { event } = route.params as { event: Event };

  const isOrganizer = user?.id === event.created_by;

  const handleOpenCommentarySettings = () => {
    navigation.navigate('EventCommentarySettings', { eventId: event.id });
  };

  return (
    <View style={styles.container}>
      {/* Show settings button only for organizers */}
      {isOrganizer && (
        <Button
          title="Commentary Settings"
          onPress={handleOpenCommentarySettings}
          variant="secondary"
          icon="⚙️"
        />
      )}

      {/* Commentary feed */}
      <CommentaryFeed
        eventId={event.id}
        autoRefresh={event.status === 'ongoing'}
        showTokenUsage={isOrganizer} // Show token usage to organizers
      />
    </View>
  );
}
```

### 3. Standalone Commentary Screen

Create a dedicated screen for commentary:

```typescript
// src/screens/events/EventCommentaryScreen.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { CommentaryFeed, ScreenHeader } from '../../components';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  EventCommentary: { eventId: number; eventName: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'EventCommentary'>;

export function EventCommentaryScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const { eventId, eventName } = route.params;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScreenHeader
        title={eventName}
        subtitle="Live Commentary"
        showBack
        onBack={() => navigation.goBack()}
      />

      <CommentaryFeed
        eventId={eventId}
        autoRefresh={true}
        refreshInterval={30000}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

### 4. Custom Commentary Feed with Header

Use CommentaryFeed with custom header component:

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CommentaryFeed } from '../../components';
import { useTheme } from '../../hooks';

export function EventCommentaryTab({ eventId, eventStatus }) {
  const { colors } = useTheme();

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
        📢 AI Commentary
      </Text>
      <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
        Real-time updates powered by AI
      </Text>
    </View>
  );

  return (
    <CommentaryFeed
      eventId={eventId}
      autoRefresh={eventStatus === 'ongoing'}
      ListHeaderComponent={renderHeader()}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
});
```

### 5. Language Switcher for Commentary

Allow users to switch commentary language:

```typescript
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { CommentaryFeed } from '../../components';
import { useTheme } from '../../hooks';
import type { CommentaryLanguage } from '../../types/api';

export function CommentaryWithLanguageSwitcher({ eventId }) {
  const { colors } = useTheme();
  const [language, setLanguage] = useState<CommentaryLanguage>('en');

  return (
    <View style={styles.container}>
      {/* Language switcher */}
      <View style={styles.languageSwitcher}>
        <TouchableOpacity
          style={[
            styles.langButton,
            language === 'en' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setLanguage('en')}
        >
          <Text
            style={[
              styles.langText,
              { color: language === 'en' ? colors.white : colors.textPrimary },
            ]}
          >
            English
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.langButton,
            language === 'pl' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setLanguage('pl')}
        >
          <Text
            style={[
              styles.langText,
              { color: language === 'pl' ? colors.white : colors.textPrimary },
            ]}
          >
            Polski
          </Text>
        </TouchableOpacity>
      </View>

      {/* Commentary feed */}
      <CommentaryFeed eventId={eventId} language={language} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  languageSwitcher: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
  },
  langButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  langText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
```

### 6. Manual Hook Usage (Advanced)

Use hooks directly for custom implementations:

```typescript
import React, { useEffect } from 'react';
import { useEventCommentaryFeed } from '../../hooks';
import { logger } from '../../services/logger';

export function CustomCommentaryComponent({ eventId }) {
  const {
    commentaries,
    meta,
    isLoading,
    error,
    refresh,
    loadMore,
    isEmpty,
    isCommentaryEnabled,
  } = useEventCommentaryFeed({
    eventId,
    language: 'en',
    perPage: 20,
    autoRefresh: true,
    refreshInterval: 30000,
  });

  // Log when new commentary arrives
  useEffect(() => {
    if (commentaries.length > 0) {
      logger.info('commentary', `Loaded ${commentaries.length} commentary items`);
    }
  }, [commentaries.length]);

  // Custom rendering logic
  if (!isCommentaryEnabled) {
    return <DisabledMessage />;
  }

  if (isEmpty) {
    return <EmptyMessage />;
  }

  return (
    <FlatList
      data={commentaries}
      renderItem={({ item }) => <CustomCommentaryCard commentary={item} />}
      onRefresh={refresh}
      onEndReached={loadMore}
    />
  );
}
```

### 7. Navigation Setup

Add commentary screens to your navigation:

```typescript
// src/navigation/AppNavigator.tsx
import { EventCommentarySettingsScreen } from '../screens/events';
import { EventCommentaryScreen } from '../screens/events';

// Inside your Stack.Navigator
<Stack.Screen
  name="EventCommentary"
  component={EventCommentaryScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen
  name="EventCommentarySettings"
  component={EventCommentarySettingsScreen}
  options={{ headerShown: false }}
/>
```

## Best Practices

### 1. Polling Strategy
- Enable auto-refresh only for `ongoing` events
- Use 30-second intervals for live events
- Disable polling for `completed` or `upcoming` events

```typescript
<CommentaryFeed
  eventId={eventId}
  autoRefresh={event.status === 'ongoing'}
  refreshInterval={30000}
/>
```

### 2. Language Handling
- Default to user's app language
- Provide language switcher for multilingual events
- Filter by language using the `language` prop

```typescript
import { getCurrentLanguage } from '../../i18n';

const userLanguage = getCurrentLanguage() as CommentaryLanguage;

<CommentaryFeed
  eventId={eventId}
  language={userLanguage}
/>
```

### 3. Token Usage Display
- Show token usage only to event organizers
- Hide from public users

```typescript
const isOrganizer = user?.id === event.created_by;

<CommentaryFeed
  eventId={eventId}
  showTokenUsage={isOrganizer}
/>
```

### 4. Error Handling
- Hooks handle errors internally
- Access error state for custom error UI

```typescript
const { error, refresh } = useEventCommentaryFeed({ eventId });

if (error) {
  return (
    <ErrorView
      message={error}
      onRetry={refresh}
    />
  );
}
```

### 5. Performance
- Use pagination (50 items per page)
- Auto-refresh runs silently in background
- Deduplicate commentary items by ID

## API Reference

### Hooks

#### useEventCommentaryFeed
```typescript
useEventCommentaryFeed({
  eventId: number;
  language?: CommentaryLanguage;
  perPage?: number; // default: 50
  autoRefresh?: boolean; // default: true
  refreshInterval?: number; // default: 30000 (30s)
})

Returns:
{
  commentaries: EventCommentary[];
  meta: CommentaryListResponse['meta'] | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  hasMore: boolean;
  refresh: () => void;
  loadMore: () => void;
  isEmpty: boolean;
  isCommentaryEnabled: boolean;
  tokensUsed: number;
  tokenLimit: number;
  availableLanguages: Record<CommentaryLanguage, string>;
  eventLanguages: CommentaryLanguage[];
}
```

#### useCommentarySettings
```typescript
useCommentarySettings(eventId: number)

Returns:
{
  settings: CommentarySettings | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateSettings: (updates: UpdateCommentarySettingsRequest) => Promise<CommentarySettings>;
  isEnabled: boolean;
  tokensUsed: number;
  tokenLimit: number;
  tokenUsagePercent: number;
  isNearLimit: boolean;
}
```

#### useGenerateCommentary
```typescript
useGenerateCommentary(eventId: number)

Returns:
{
  generate: (type: CommentaryType) => Promise<GenerateCommentaryResponse>;
  isGenerating: boolean;
  error: string | null;
  lastGenerationType: CommentaryType | null;
  clearError: () => void;
}
```

### Components

#### CommentaryFeed
```typescript
<CommentaryFeed
  eventId={number}
  language?: CommentaryLanguage
  autoRefresh?: boolean // default: true
  refreshInterval?: number // default: 30000
  showTokenUsage?: boolean // default: false
  ListHeaderComponent?: React.ReactElement | null
/>
```

#### CommentaryItem
```typescript
<CommentaryItem commentary={EventCommentary} />
```

## Troubleshooting

### Commentary not loading
- Check if commentary is enabled for the event
- Verify user has permissions to view
- Check API connectivity

### Auto-refresh not working
- Ensure `autoRefresh` prop is `true`
- Check that event status is `ongoing`
- Verify interval is reasonable (minimum 5s)

### Token usage not displayed
- Set `showTokenUsage={true}`
- Verify user is event organizer
- Check commentary is enabled

## Migration Notes

No breaking changes. This is a new feature with zero impact on existing code.

---

**Last Updated:** 2026-01-16
**Version:** 1.0.0
