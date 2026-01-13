# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Racefy Mobile is a React Native/Expo fitness and sports community app. It connects to a Laravel API backend and provides features for activity tracking (GPS), social feed, events, and user profiles.

## Commands

```bash
# Development
cd RacefyApp && npx expo start          # Start Expo dev server
cd RacefyApp && npx expo start --clear  # Start with cache cleared
cd RacefyApp && npm run android         # Run on Android emulator
cd RacefyApp && npm run ios             # Run on iOS simulator
cd RacefyApp && npm run web             # Run in browser

# Type checking
cd RacefyApp && npx tsc --noEmit

# Install Expo-compatible packages (preferred over npm install)
cd RacefyApp && npx expo install <package>
```

## Architecture

### Tech Stack
- React Native 0.81+ with Expo SDK 54
- TypeScript with strict mode
- React Navigation 7.x (bottom tabs + native stack)
- i18next for internationalization (en/pl)

### Source Structure (RacefyApp/src/)
- `config/api.ts` - API URL configuration with platform-aware base URLs
- `services/api.ts` - API client class with token management via AsyncStorage
- `hooks/` - React hooks for auth, feed, events, permissions, live activity tracking
- `navigation/` - AppNavigator with MainTabs and Auth modal stack
- `screens/auth/` - Login/Register screens
- `screens/main/` - Home, Feed, Events, Profile, ActivityRecording
- `screens/details/` - Detail screens (EventDetail, ActivityDetail, UserProfile)
- `screens/settings/` - Settings screen
- `components/` - Reusable UI components (Button, Input, Card, Avatar, ScreenHeader, etc.)
- `theme/` - Colors (emerald primary #10b981), spacing, typography tokens
- `types/api.ts` - TypeScript interfaces matching Laravel API
- `i18n/` - Translation setup and locale files
- `docs/` - Internal documentation (UI_PATTERNS.md, LOCAL_BUILD_SETUP.md)

### Key Patterns

**Authentication**: `useAuth` hook provides context with user state, login/register/logout. Token stored in AsyncStorage as `@racefy_token`. On login/app start, user preferences (language, theme) are synced from server.

**Language Sync**: Language preference is stored locally in AsyncStorage (`@racefy_language`) for instant app start, then synced with server preferences when user is authenticated.

**API Configuration**: Platform-aware URL detection in `config/api.ts`:
- Android Emulator: `http://10.0.2.2:8080/api`
- iOS Simulator: `http://localhost:8080/api`
- Physical device: Uses `API_LOCAL_IP` from `.env`

**API Service** (`services/api.ts`): Single `request<T>(endpoint, options)` method for all API calls:
- Auto-detects FormData and skips Content-Type header (browser sets it with boundary)
- Adds Authorization, Accept, Accept-Language headers automatically
- Appends Xdebug trigger when enabled (for PHP debugging)
- Parses JSON response and throws on error

```typescript
// JSON request
async getEvents(): Promise<Types.Event[]> {
  const response = await this.request<Types.ApiResponse<Types.Event[]>>('/events');
  return response.data;
}

// FormData upload (same method, auto-detected)
async uploadAvatar(imageUri: string): Promise<Types.User> {
  const formData = new FormData();
  formData.append('avatar', { uri: imageUri, type: 'image/jpeg', name: 'avatar.jpg' } as any);

  const result = await this.request<Types.ApiResponse<Types.User>>(
    '/profile/avatar',
    { method: 'POST', body: formData }
  );
  return result.data;
}
```

**Live Activity Tracking**: `useLiveActivity` hook manages GPS tracking with:
- Server sync every 30 seconds via `/activities/{id}/points`
- Pause/resume support with duration tracking
- Local distance calculation using Haversine formula
- Auto-recovery of existing active activity on app restart

**Navigation Structure**:
```
RootStack
├── Main (Bottom Tabs)
│   ├── Home
│   ├── Feed (auth required)
│   ├── Events
│   └── Profile (auth required)
└── Auth (Modal Stack)
    ├── Login
    └── Register
```

**Logging**: Always use the logger service instead of console.log/console.error/console.warn:
```typescript
import { logger } from '../services/logger';

// By log level
logger.debug('category', 'Debug message', { context: 'optional' });
logger.info('category', 'Info message', { userId: 123 });
logger.warn('category', 'Warning message');
logger.error('category', 'Error message', { error: err });

// Category shortcuts
logger.gps('GPS fix acquired', { lat, lon, accuracy });
logger.api('API request completed', { endpoint, duration });
logger.auth('User logged in', { userId, username });
logger.activity('Activity started', { activityId, sportType });
logger.nav('Navigated to screen', { screen: 'Home' });
```

**Available Categories**: `gps`, `api`, `auth`, `activity`, `navigation`, `general`

**Log Levels**: `debug` (most verbose), `info`, `warn`, `error` (least verbose)

**Features**:
- Stores logs locally in AsyncStorage (up to 2000 entries)
- Can be enabled/disabled via `.env` (LOG_ENABLED, LOG_LEVEL, LOG_CATEGORIES)
- Logs can be sent to backend via `/api/debug/logs` endpoint
- Includes device info, session ID, and timestamps
- Auto-rotates logs to prevent storage bloat
- Console output is configurable (LOG_CONSOLE_OUTPUT)

**Where to find logs**: Settings → Developer → Debug Logs (when LOG_ENABLED=true)

## UI Conventions

For detailed UI patterns, see `RacefyApp/docs/UI_PATTERNS.md`.

**Screen Headers**: Use `ScreenHeader` component for consistent headers:
```tsx
<ScreenHeader title={t('screen.title')} showBack onBack={() => navigation.goBack()} />
```

**Theming**: Always use `useTheme()` hook for colors:
```tsx
const { colors } = useTheme();
<View style={{ backgroundColor: colors.cardBackground }}>
```

**Translations**: Never hardcode strings, use i18n:
```tsx
const { t } = useTranslation();
<Text>{t('screen.title')}</Text>
```

**Spacing**: Use theme tokens from `spacing` object (xs=4, sm=8, md=16, lg=24, xl=32).

**Card Lists**: Cards have built-in `marginBottom: spacing.md`. Lists use `paddingHorizontal: spacing.md`.

## Environment Setup

Copy `.env.example` to `.env` in RacefyApp/ and set your local IP:
```
API_LOCAL_IP=your.local.ip
API_LOCAL_PORT=8080
API_STAGING_URL=https://app.dev.racefy.io/api
API_PRODUCTION_URL=https://api.racefy.app/api
```

The Laravel API backend runs via Sail on port 8080.

## EAS Build & Deployment

The app uses [EAS Build](https://docs.expo.dev/build/introduction/) for creating Android/iOS builds.

### Prerequisites
```bash
npm install -g eas-cli
eas login
```

### Build Profiles

| Profile | Platform | Output | API URL | Command |
|---------|----------|--------|---------|---------|
| `staging` | Android | APK | `https://app.dev.racefy.io/api` | `eas build --platform android --profile staging` |
| `production` | Android | AAB | `https://api.racefy.app/api` | `eas build --platform android --profile production` |

### Build Commands
```bash
# Staging APK (for testing)
cd RacefyApp && eas build --platform android --profile staging

# Production AAB (for Google Play)
cd RacefyApp && eas build --platform android --profile production

# iOS builds (requires Apple Developer account)
cd RacefyApp && eas build --platform ios --profile staging
cd RacefyApp && eas build --platform ios --profile production
```

### How Environment Selection Works

1. `eas.json` defines build profiles with `APP_ENV` variable (`staging` or `production`)
2. `app.config.ts` reads `APP_ENV` and selects the appropriate API URL
3. `config/api.ts` uses `extra.apiUrl` from the config for production/staging builds

**Note:** Local `.env` file is NOT used during EAS cloud builds. The API URLs are hardcoded as fallbacks in `app.config.ts`. To use custom URLs, set environment variables in EAS:
```bash
eas secret:create --name API_STAGING_URL --value "https://your-staging.api/api" --scope project
```

### Expo Dashboard
- Project: https://expo.dev/accounts/sebastiantarka/projects/RacefyApp
- Builds: https://expo.dev/accounts/sebastiantarka/projects/RacefyApp/builds

### Local Android Build

For local builds without EAS cloud, see `docs/LOCAL_BUILD_SETUP.md` for full setup guide.

**Quick start (if Android SDK already installed):**
```bash
cd RacefyApp

# Generate native project
npx expo prebuild --platform android --clean

# Build release APK (skipping lint for faster builds)
JAVA_HOME=$HOME/android-studio/jbr \
ANDROID_HOME=$HOME/Android/Sdk \
./android/gradlew app:assembleRelease -x lint -x lintRelease -x lintVitalRelease

# Install on connected device
adb install android/app/build/outputs/apk/release/app-release.apk
```

**Requirements:**
- Android Studio with SDK (or standalone SDK)
- `JAVA_HOME` and `ANDROID_HOME` environment variables
- Mapbox secret token in `~/.gradle/gradle.properties`:
  ```properties
  MAPBOX_DOWNLOADS_TOKEN=sk.your_secret_token_with_downloads_read_scope
  ```

## Test Credentials
```
Email: test@racefy.test / Password: password
Email: demo@racefy.test / Password: password
```

## API Documentation

For API endpoint details, request/response formats, and implementation examples, refer to the `docs/api/` directory:

- `docs/api/API_SPEC.md` - Full API specification with endpoints, types, and examples
- `docs/api/README.md` - API overview and quick reference
- `docs/api/CHANGELOG.md` - API version changes and updates

Use these docs when implementing new features that interact with the Laravel backend.

## Development Guidelines

When implementing new features:

1. **New Screens**: Use `ScreenHeader` component, `SafeAreaView` with `edges={['top']}`, and theme colors
2. **New Components**: Export from `components/index.ts`, use theme tokens for spacing/colors
3. **New Translations**: Add keys to both `en.json` and `pl.json`
4. **API Integration**: Add methods to `services/api.ts`, types to `types/api.ts`. Always use `this.request()` - it handles both JSON and FormData automatically. Never use `fetch()` directly.
5. **Forms**: Use existing `Input`, `Button` components with validation patterns from existing screens
6. **Lists**: Use `FlatList` with card components, ensure consistent spacing with `listContent` style
7. **UI Patterns**: When adding new reusable UI patterns or components, update `RacefyApp/docs/UI_PATTERNS.md` with usage examples
