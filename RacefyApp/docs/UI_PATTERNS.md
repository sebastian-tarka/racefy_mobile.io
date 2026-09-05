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

### Sport tiles (`SportTile`)

Illustrated sport picker used on the recording screen (idle overlay, map overlay) and as
thumbnails in `SportSelectionModal`. Illustrations live in `assets/sports/{dark,light}/`
(256 px squares, no caption) and are resolved by slug in `config/sportTiles.ts` — unknown
sports fall back to the "R" tile, so a new backend sport never renders broken.

```tsx
<SportTile sport={sport} selected={isSelected} onPress={() => select(sport)} size={tileSize} />
```

- Three tiles per row: `size = floor((width − 2·spacing.lg − 2·spacing.sm) / 3)`.
- The translated name sits on a bottom gradient; selection = primary ring + check badge.
- Add a new sport: drop `dark/<slug>.jpg` + `light/<slug>.jpg`, register both in `sportTiles.ts`.

### Training goal (`WorkoutGoalRow`, `WorkoutConfigModal`, `WorkoutProgressCard`)

Mockup: Racefy v2 "Set a goal". One sheet, distance or time, presets + stepper, alert
toggles; on the idle screen a segmented `Open | Distance | Time` that becomes a row card
once a goal is set; during recording a HUD card with the remaining value, a progress bar
and an "Edit" affordance (or a dashed "Set a goal mid-run" row when there is none).

```tsx
<WorkoutGoalRow label={goalLabel} onOpen={(type) => openSheet(type)} onClear={clearGoal} />
<WorkoutProgressCard plan={plan} progress={engine.progress} variant="recording" formatDistance={fmtDistance} onPress={openSheet} />
```

- `variant="recording"` uses the light frosted palette of `RecordingView` (fixed light
  colors over the map); `variant="paused"` uses theme tokens.
- Selected type tile / preset chip = "ink" `#0A1A14` with white text in light theme, a
  primary tint in dark theme.
- Cues (voice / tone / haptics / halfway / countdown) are local prefs: `useWorkoutCuePrefs()`.
- Intervals: the sheet shows presets (`services/workout/presets.ts`) and a "build your own"
  form (repeats, work, recovery, optional warm-up / cool-down, each by time or distance) with
  a plan strip preview. The card then shows the current segment (work = primary, recovery =
  `colors.warning`, warm/cool = sky `#0EA5E9`), the remaining value, "Next · …", a segment bar,
  the plan strip with position and a "Skip ▸" action; the big number pulses in the last 3 s.
- Sport tile grids sit on a frosted panel (`cardBackground + 'B8'`, `borderRadius.xl`) so the
  tiles don't float loose over the map.

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
