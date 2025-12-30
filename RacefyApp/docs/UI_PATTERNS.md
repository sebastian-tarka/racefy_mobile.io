# UI Patterns & Conventions

This document describes the UI patterns and conventions used in the Racefy Mobile app.

## Components

### ScreenHeader

Reusable header component for consistent styling across all screens.

```tsx
import { ScreenHeader } from '../../components';

// Basic usage (detail screen with back button)
<ScreenHeader
  title={t('settings.title')}
  showBack
  onBack={() => navigation.goBack()}
/>

// With right action (e.g., edit button)
<ScreenHeader
  title={t('eventDetail.title')}
  showBack
  onBack={() => navigation.goBack()}
  rightAction={
    <TouchableOpacity onPress={handleEdit}>
      <Ionicons name="create-outline" size={24} color={colors.textPrimary} />
    </TouchableOpacity>
  }
/>

// Main screen (no back button)
<ScreenHeader title={t('feed.title')} />
```

**Props:**
- `title` (string, required) - Header title text
- `showBack` (boolean) - Show back arrow button
- `onBack` (function) - Back button handler
- `rightAction` (ReactNode) - Optional right side element

### Card Components

All card components include consistent bottom margin for list spacing:

| Component | Margin | Usage |
|-----------|--------|-------|
| `PostCard` | `marginBottom: spacing.md` | Feed posts |
| `EventCard` | `marginBottom: spacing.md` | Event listings |
| `ActivityCard` | `marginBottom: spacing.md` | Activity listings |

### List Content Styling

For FlatList with cards, use this pattern:

```tsx
<FlatList
  contentContainerStyle={styles.listContent}
  ListHeaderComponent={renderHeader}
  // ...
/>

// Styles
listContent: {
  flexGrow: 1,
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.md,
},
```

When using tabs with content below, add a spacer after tabs:

```tsx
const renderHeader = () => (
  <>
    {/* Profile content */}
    <View style={styles.tabContainer}>
      {/* Tabs */}
    </View>
    <View style={styles.tabSpacer} />
  </>
);

// Style
tabSpacer: {
  height: spacing.md,
},
```

## Spacing

Use theme spacing tokens consistently:

```tsx
import { spacing } from '../../theme';

// spacing.xs  = 4
// spacing.sm  = 8
// spacing.md  = 16
// spacing.lg  = 24
// spacing.xl  = 32
// spacing.xxl = 40
// spacing.xxxl = 48
```

## Colors & Theming

Always use theme colors for dark/light mode support:

```tsx
import { useTheme } from '../../hooks/useTheme';

const { colors } = useTheme();

<View style={{ backgroundColor: colors.cardBackground }}>
  <Text style={{ color: colors.textPrimary }}>Primary text</Text>
  <Text style={{ color: colors.textSecondary }}>Secondary text</Text>
</View>
```

**Key colors:**
- `colors.primary` - Emerald (#10b981)
- `colors.background` - Screen background
- `colors.cardBackground` - Card/header background
- `colors.textPrimary` - Main text
- `colors.textSecondary` - Secondary/muted text
- `colors.border` - Border color

## Internationalization

Always use translation keys, never hardcoded strings:

```tsx
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();

<Text>{t('screen.title')}</Text>
<Button title={t('common.save')} />
```

**Adding new translations:**
1. Add key to `src/i18n/locales/en.json`
2. Add key to `src/i18n/locales/pl.json`

## Screen Structure

Standard screen template:

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { spacing } from '../../theme';

export function MyScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScreenHeader
        title={t('myScreen.title')}
        showBack
        onBack={() => navigation.goBack()}
      />
      {/* Content */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

## Navigation

```tsx
// Navigate to screen
navigation.navigate('ScreenName', { param: value });

// Go back
navigation.goBack();

// Navigate and reset stack
navigation.reset({
  index: 0,
  routes: [{ name: 'Home' }],
});
```
