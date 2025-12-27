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
- `components/` - Reusable UI components (Button, Input, Card, Avatar, etc.)
- `theme/` - Colors (emerald primary #10b981), spacing, typography tokens
- `types/api.ts` - TypeScript interfaces matching Laravel API
- `i18n/` - Translation setup and locale files

### Key Patterns

**Authentication**: `useAuth` hook provides context with user state, login/register/logout. Token stored in AsyncStorage as `@racefy_token`.

**API Configuration**: Platform-aware URL detection in `config/api.ts`:
- Android Emulator: `http://10.0.2.2:8080/api`
- iOS Simulator: `http://localhost:8080/api`
- Physical device: Uses `API_LOCAL_IP` from `.env`

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

## Environment Setup

Copy `.env.example` to `.env` in RacefyApp/ and set your local IP:
```
API_LOCAL_IP=your.local.ip
API_LOCAL_PORT=8080
API_PRODUCTION_URL=https://api.racefy.app/api
```

The Laravel API backend runs via Sail on port 8080.

## Test Credentials
```
Email: test@racefy.test / Password: password
Email: demo@racefy.test / Password: password
```
