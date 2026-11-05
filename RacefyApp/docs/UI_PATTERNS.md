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

### Sport illustrations (`config/sportTiles.ts`)

Sport pictures (`SportSelectionModal`, `SportShortcutsModal`, `RouteCard`) live in
`assets/sports/{dark,light}/` (256 px squares, no caption) and are resolved by slug in
`config/sportTiles.ts` — an unknown sport falls back to the "R" tile, so a new backend sport
never renders broken. New sport: add `dark/<slug>.jpg` + `light/<slug>.jpg` and register both.

### Bottom sheets (`SheetModal`)

The shell every bottom sheet shares: dimmed backdrop that closes on tap, sheet sliding up
with rounded top corners and a drag handle. The content is yours.

```tsx
<SheetModal visible={visible} onClose={onClose} style={styles.sheet}>
  <Text style={styles.title}>{t('…')}</Text>
  <ScrollView>{/* … */}</ScrollView>
</SheetModal>
```

- `style` is merged over the defaults (`cardBackground`, `borderRadius.xl` top) — put
  `maxHeight`, `paddingHorizontal` or a different background there.
- `safeAreaBottom` (default `true`) pads for the home indicator; `handleSpacing="sm"` for the
  tighter list sheets.
- A list of actions (icon + title + chevron) is `BottomSheet` — built on `SheetModal`.
- Sheets with a text input keep their own `KeyboardAvoidingView` shell for now (`ReportModal`).

### Date and time pickers (`DatePickerSheet`)

Never render `@react-native-community/datetimepicker` directly. The iOS spinner fires
`onChange` on every wheel tick and has no close button of its own; Android shows a dialog
that fires once. `DatePickerSheet` gives both the same "pick, then confirm" behaviour.

```tsx
<DatePickerSheet
  visible={field != null}
  mode="datetime"               // 'date' | 'time' | 'datetime'
  value={formData[field] ?? new Date()}
  minimumDate={new Date()}
  title={t('…')}               // iOS only, between Cancel and Done
  onConfirm={(date) => { save(date); close(); }}
  onCancel={close}
/>
```

- iOS: spinner in a sheet with Cancel / Done; nothing is reported before Done.
- Android: native dialog; `datetime` runs a date dialog, then a time dialog.

### Error state (`ErrorState`)

Full-screen "could not load" for a detail screen; for empty lists use `EmptyState`.

```tsx
if (error || !post) {
  return (
    <ScreenContainer>
      <ScreenHeader title={t('feed.title')} showBack onBack={navigation.goBack} />
      <ErrorState message={error || t('feed.failedToLoad')} onRetry={fetchPost} />
    </ScreenContainer>
  );
}
```

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

### Event pin (`EventBar`, `EventSelectionSheet`, `EventPinDialog`)

Pinning an activity to an event **before** the start (design: `racefy-event-pin.jsx`).
Hard rule: a pinned event owns the discipline — the sport rail locks to it and the
only way out is unpinning; while recording, unpinning is refused outright.

- Accent: `colors.event` / `eventSoft` / `eventDeep` (magenta). Emerald stays goal/CTA,
  `#2563EB` stays route — never paint an event in either.
- `EventBar` — full-width bar above the sport rail on the pre-start card. Three states:
  no ongoing events (muted, "Browse"), events available (dashed, count pill), pinned
  (filled, "×"; `locked` turns the "×" into a lock).
- `EventSelectionSheet` — "No event" always on top. Pass `lockedSportId` once an activity
  is recorded: events of another discipline render disabled instead of silently
  rewriting the activity type.
- `EventPinDialog` — refusal dialog with no "unpin"/"switch" path, only finish-and-save.

```tsx
<EventBar event={pinned} count={ongoing.length} onOpen={openSheet} onClear={unpin} />
```

### Event live & results (`components/event/Live*`, `EventResultCard`, `EventResultShareSheet`)

The ongoing-event screen (`EventLiveScreen`) and the after-event screen
(`EventResultsScreen`) — Claude Design "Racefy — wydarzenie na żywo", rounds 1–5.
Every list and card works on `RankedRow` from `utils/eventStandings.ts`, the one
flattening of `/standings` rows, `/results` rows and the DNF list (same maths as the
web app's `utils/standings.js`): `gapToNeighbour`, `eventTarget`, `progressToTarget`.

- **Pulse tiles** (`StatTile` with `note` / `live`): registered · on course now
  (`is_recording`, pulse dot) · finished · leading. After the event: finished of N,
  winner, average (time modes) or total distance, total climb.
- **`LiveMyPlaceCard`** — the registered viewer: `BibBox` (NR), "#n · metric", the gap to
  the person ahead or the lead, goal bar when the event has a target, then the one
  action: Start (→ pre-start with the event pinned) or Back to recording (+ "Start →"
  opening `EventPinDialog`). Hidden once the single allowed activity is finished.
- **`LiveSpectatorCard`** — not registered: Join (only `is_registration_open && !is_full`;
  team events go to the event page) and Watch (`useEventWatch`).
- **`LiveCheerCard`** — rows with `live.activity_id` → `LiveSpectator`; at most 5, the
  rest counted in the footer. Signed-in viewers only (guests get no `live`).
- **`LiveVariantPanel`** — one picture per rule set: team stacked bar, goal challenge
  "everyone together", course race markers on a 0…distance line. Nothing otherwise.
- **`StandingRow`** — pulse dot + "ON COURSE" / "FINISHED", goal bar while unfinished,
  DNF rows without a place and with the short reason; time modes split the list into
  "Finished · n of N" / "On course · n" via `EventScoreboard.individualGroups`.
- **`EventResultCard`** (`viewer_result`) / **`EventWinnerCard`** (spectator) — place of N,
  three stats, chips (record / points or "after approval" / badges), Share + activity.
  Provisional state: amber pill + notice; rows then come from `/standings` (no polling).
- **`EventResultShareSheet`** — `SheetModal`; the server draws the card
  (`POST /events/{id}/result-share`), regenerated on every option change (last request
  wins). Format / background (`photo` only when the activity has photos) / Switch toggles.
  Actions: Share… (`shareImageFile` → system sheet, Instagram included), Copy link only
  with `share_url`. No "save to gallery" (would need `expo-media-library`).

### Team activity board (`TeamDetailScreen` → `TeamActivityBoardTab`, `TeamActivityRow`)

The team's "Activities" tab: `GET /teams/{slug}/activities` (members' finished
activities the viewer may see — membership unlocks nothing, the server already
applied each activity's visibility, so the client shows what came back). The hook
`useTeamActivityBoard(slug, { enabled })` lives in the **screen**, not the tab, so the
screen's pull-to-refresh and scroll-to-end (`onScroll` near the bottom) can drive
`refresh()` / `loadMore()`; the tab is presentation only.

- **This week strip** (`Card`): distance · activities · active members from
  `/stats?period=this_week`, with "most active: name · distance" from
  `/stats/ranking?period=this_week&sort_by=distance` (only when `total_distance > 0`).
- **Sport chips** (`FilterChip` row): from the sports on the first unfiltered page, shown
  when there are 2+; a chip refetches with `sport_type_id`, "All" clears it.
- **`TeamActivityRow`**: avatar, name, "sport · time ago", title, distance / time / pace /
  ↗ climb, heart + bubble counts, 64 px route thumbnail (`route_preview_url` first, else
  `route_map_url`) → `ActivityDetail`. Pace follows the user's units; the API's metric
  `formatted.pace.value === null` only says pace does not apply.
- **States**: 403 → the same "private team" `EmptyState` as the stats tab; empty →
  "No activities to show" + the privacy note; more pages → footer spinner / "Show more".

### Strength activities (`components/strength/`)

Activities logged from a strength session carry `activity.strength_session`
(`StrengthSessionSummary` in `types/api/activities.ts`; API docs → "Strength session"). Mirror of the
web SPA's `components/workouts/strength/` — same rules, same `activities.strength.*` wording.
Helpers (labels "55×8", volume shares, rhythm, deltas) live in `strengthSession.ts`.

| Component | Where | What |
|-----------|-------|------|
| `StrengthFeedPanel` | `FeedCard.ActivityBody`, where a run shows its map | `StrengthSetMosaic` (row per exercise, tile per set: accent = done, amber = heavier than last time, dashed = skipped) over `StrengthVolumePanel` (total kg, one bar split by exercise, amber record chips). Tap opens the activity |
| `StrengthMetricStrip` | feed stats bar, `PostCard`, activity screen | Feed: time · sets · exercises · RPE. Activity screen / `PostCard`: volume first |
| `StrengthRhythm` | `ActivityDetailScreen`, where the map would be | Sets as blocks, rests as bars ∝ `rest_seconds` (rest *after* that set, null = not timed), scrolls sideways |
| `StrengthSessionCards` | `ActivityDetailScreen`, under the metrics | Owner's note (quote), progress vs last time, volume breakdown, one tile per exercise (plan, "+5 kg vs plan", 4-column set grid, volume) |

- The description is hidden only while `strength_session.description_is_auto` is true (it is
  the generated sets list): on the activity screen always, on the feed / post cards when the
  post text is empty or equal to it. Once the athlete edits it, it shows as usual.
- Weights: the API speaks kg; `useStrengthFormat()` binds the formatters to the UI language and
  `useUnits().units` — imperial users read lb (1 kg = 2.20462 lb, max 1 decimal; kg max 2),
  volume rounded. Volume is always grouped by hand with the locale's separator ("5 912" pl,
  "5,912" en, "1.234.567" es; plain space when Hermes' Intl cannot tell).
- A skipped exercise (`sets_completed: 0`) is dashed and muted — never red. A worse result
  than last time is muted, a better one amber (`colors.warningStrong`).
- Series colours: `colors.series` (stable order, light/dark). Mono figures: `fontFamily.mono`.
- `muscle_group` is mostly `"other"` — nothing is built on it.

### Picking images for upload (`utils/pickImages`, `utils/imageMetadata`)

A photo file carries EXIF: where and when it was taken, on what device. The picker's `exif: false`
only hides that from JavaScript — the file still has it. Every image the app uploads must therefore
be a re-encoded copy:

```tsx
import { pickImages } from '../utils/pickImages';

// Permission, picker, and a copy without metadata — in one call. Empty when cancelled or denied.
const [avatar] = await pickImages({ allowsEditing: true, aspect: [1, 1] });
const photos = await pickImages({ multiple: true, selectionLimit: 5, maxSide: 2048 });
```

A screen that has to open `expo-image-picker` itself (mixed photos and videos — `MediaPicker`) runs
each image through `stripImageMetadata()` / `stripImagesMetadata()` before using its `uri`, and calls
`alertImagesLeftOut()` when one comes back `null`. Never fall back to the picked file. Videos cannot be
cleaned on the phone; the server strips them.

### Remote images (`expo-image` + variants)

Every remote image goes through `expo-image` with `cachePolicy="memory-disk"` — never React
Native's `Image`/`ImageBackground` (no disk cache, decodes at full size). The API ships a map
of downscaled WebP copies next to each original (`avatar_variants`, photo `variants`,
`cover_variants`, `background_variants`, `thumbnail_variants`, `route_map_variants`; see
`docs/api/mobile/API_ENDPOINTS.md` "Image variants"). Never load the original where a
variant exists; pick with `utils/imageVariants`:

```tsx
// Avatars: pass both — the component picks thumb/small/medium for its size
<Avatar uri={user.avatar} variants={user.avatar_variants} name={user.name} size="md" />

// A fixed-size thumbnail (points → device pixels via PixelRatio)
pickVariantForWidth(photo.variants, 120, PHOTO_LADDER, photo.url);

// Explicit preference, e.g. the full-screen viewer
pickFullSizeUrl(photo.variants, photo.url); // xlarge → large → original
pickVariant(video.thumbnail_variants, ['medium', 'small'], video.thumbnail_url);

// Window-wide images
pickRouteMapUrl(activity); // or a GpsTrack
pickBackgroundUrl(user);
pickEventCoverUrl(event); // components/event/eventFormat — mobile → medium → large → cover → post photo
```

Feed media go through `photoMediaItem` / `videoMediaItem` / `buildMediaItems` in
`FeedCard.utils`, which fill `thumbnailUrl` (grid cells), `previewUrl` (full-width card) and
`fullUrl` (viewer); render with `previewUrlOf(item)` and open with `fullUrlOf(item)`. A
variants map is `null` until the server has generated it and may miss keys — every helper
falls back to the original, so no call site needs its own `??`.

### External links (`utils/externalLinks`)

Never pass a URL from the API or from a user to `Linking.openURL` directly — the OS follows
`tel:`, `sms:`, `intent:` and other apps' schemes (ours included) just as readily as a web link.

```tsx
import { openExternalUrl, openUpdateUrl } from '../utils/externalLinks';

// Web links only (http is upgraded to https in release builds). Resolves to false
// when the link was refused or could not be opened — never throws.
if (!(await openExternalUrl(post.cta_url))) Alert.alert('', t('common.error'));

// A scheme beyond the web is named by the call site that needs it.
await openExternalUrl(contactUrl, ['mailto:']);

// The update target from /config/app: a store, TestFlight, an APK or a build page.
await openUpdateUrl(update.update_url);
```

Do not gate on `Linking.canOpenURL`: it says "no" for anything the manifest does not declare,
even when opening works. Constants written in the app (`app-settings:`, the support `mailto:`)
may still use `Linking` directly.

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

### Temporary files for the share sheet (`utils/shareFiles`)

A file written to the cache only to be shared (GPX track, downloaded share image, photo overlay) must not
stay there — it holds where the user has been. Name it with one of the prefixes in `SHARE_FILE_PREFIXES`
(add a new one there) and remove it in `finally`, so it also goes when the share fails or is cancelled:

```tsx
import { discardShareFileLater } from '../utils/shareFiles';

const localUri = `${FileSystem.cacheDirectory}racefy-overlay-${Date.now()}.jpg`;
try {
  await FileSystem.downloadAsync(url, localUri);
  await Sharing.shareAsync(localUri);
} finally {
  discardShareFileLater(localUri); // a minute later — the receiving app may still be reading it
}
```

Do not delete right after `shareAsync` returns. Files left behind when the app is closed first are swept by
`purgeStaleShareFiles()` on the next start (`App.tsx`).

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
- `colors.onPrimary` - text/icons sitting ON a `primary` fill (buttons, active chips, FAB)
- `colors.background` - Screen background
- `colors.cardBackground` - Card/header background
- `colors.textPrimary` - Main text
- `colors.textSecondary` - Secondary/muted text
- `colors.border` - Border color
- `colors.routeAccent` - planned route (blue), `colors.rank.gold/silver/bronze` - leaderboard places
- `colors.shadow`, `colors.overlay`, `colors.overlayStrong` - elevation and scrims

**No accent literals.** The palette is designed to be swapped at runtime (seasonal themes
delivered by the server, see `.notes/ANALIZA_MOTYWY_ZDALNE.md`), so a hardcoded `'#10b981'`
or `'#fff'` on a primary button stays emerald/white while the rest of the app changes. ESLint
(`no-restricted-syntax`, "Theme accent as a literal") rejects the accent hex values and
`rgba(16,185,129,…)`; use the token, and `withAlpha(colors.primary, 0.25)` from `theme/color.ts`
for translucent variants. White/black on photos, video and the hero recording surface are
not accents and stay literals. Palettes that are deliberately fixed (sport colours, weather
gradients, map paint, notification channel colours) are listed as exemptions in
`eslint.config.js` — each with the reason.

A literal inside a module-level `StyleSheet.create` cannot read the theme: drop the colour
from the static style and apply it inline, `style={[styles.label, { color: colors.onPrimary }]}`.

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
