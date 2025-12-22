# Racefy Mobile App Development Guide

This document provides information for developing the Racefy React Native mobile app.

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.79+ | Mobile framework |
| Expo | SDK 54 | Development platform |
| TypeScript | 5.x | Type safety |
| React Navigation | 7.x | Navigation |
| AsyncStorage | 2.x | Local storage |

---

## Project Structure

```
RacefyApp/
├── App.tsx                    # Entry point with providers
├── app.json                   # Expo configuration
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── assets/                    # App icons and splash
│   ├── icon.png
│   ├── splash-icon.png
│   ├── adaptive-icon.png
│   └── favicon.png
└── src/
    ├── config/
    │   └── api.ts             # API URL configuration
    ├── types/
    │   └── api.ts             # TypeScript interfaces
    ├── services/
    │   └── api.ts             # API service class
    ├── hooks/
    │   ├── index.ts
    │   ├── useAuth.tsx        # Authentication context
    │   ├── useFeed.ts         # Feed data hook
    │   ├── useEvents.ts       # Events data hook
    │   ├── usePermissions.ts  # Device permissions (location, camera)
    │   └── useLiveActivity.ts # Live activity tracking with API sync
    ├── theme/
    │   ├── index.ts
    │   ├── colors.ts          # Color palette
    │   └── spacing.ts         # Spacing, fonts, sizes
    ├── components/
    │   ├── index.ts
    │   ├── Avatar.tsx         # User avatar
    │   ├── Badge.tsx          # Status badges
    │   ├── Button.tsx         # Styled buttons
    │   ├── Card.tsx           # Card container
    │   ├── EmptyState.tsx     # Empty list state
    │   ├── EventCard.tsx      # Event display card
    │   ├── Input.tsx          # Form input
    │   ├── Loading.tsx        # Loading spinner
    │   └── PostCard.tsx       # Post display card
    ├── screens/
    │   ├── auth/
    │   │   ├── LoginScreen.tsx
    │   │   └── RegisterScreen.tsx
    │   ├── main/
    │   │   ├── HomeScreen.tsx
    │   │   ├── FeedScreen.tsx
    │   │   ├── EventsScreen.tsx
    │   │   ├── ProfileScreen.tsx
    │   │   └── ActivityRecordingScreen.tsx  # Live activity tracking
    │   └── details/           # (TODO)
    │       ├── PostDetailScreen.tsx
    │       ├── EventDetailScreen.tsx
    │       └── ActivityDetailScreen.tsx
    └── navigation/
        ├── index.ts
        ├── types.ts           # Navigation types
        └── AppNavigator.tsx   # Navigation setup
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo Go app (for physical device testing)
- Android Studio (for Android emulator)
- Xcode (for iOS simulator, macOS only)

### Installation

```bash
# Navigate to app directory
cd RacefyApp

# Install dependencies
npm install

# Start development server
npx expo start
```

### Running the App

```bash
# Start Expo dev server
npx expo start

# Run on specific platform
npm run android    # Android emulator
npm run ios        # iOS simulator (macOS only)
npm run web        # Web browser
```

### Testing on Physical Device

1. Install **Expo Go** app from App Store / Play Store
2. Ensure phone is on same WiFi as your computer
3. Run `npx expo start`
4. Scan QR code with Expo Go app

---

## API Configuration

The app connects to the Laravel API. Configuration is in `src/config/api.ts`:

```typescript
// Your computer's local IP address
const LOCAL_IP = '10.27.198.154';

const getBaseUrl = (): string => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8080/api';      // Android Emulator
    } else if (Platform.OS === 'ios') {
      return 'http://localhost:8080/api';      // iOS Simulator
    }
    return `http://${LOCAL_IP}:8080/api`;      // Physical device
  }
  return 'https://api.racefy.app/api';         // Production
};
```

### Finding Your Local IP

```bash
# Linux
ip addr show | grep "inet " | grep -v 127.0.0.1

# macOS
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig
```

---

## Theme System

### Colors (`src/theme/colors.ts`)

| Color | Hex | Usage |
|-------|-----|-------|
| `primary` | `#10b981` | Buttons, links, accents |
| `primaryDark` | `#059669` | Hover/active states |
| `primaryLight` | `#34d399` | Backgrounds, highlights |
| `background` | `#f9fafb` | Page background |
| `cardBackground` | `#ffffff` | Cards, modals |
| `textPrimary` | `#111827` | Headings, main text |
| `textSecondary` | `#6b7280` | Secondary text |
| `border` | `#e5e7eb` | Borders, dividers |
| `error` | `#ef4444` | Error states |
| `success` | `#10b981` | Success states |

### Spacing (`src/theme/spacing.ts`)

```typescript
spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 }
borderRadius = { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 }
fontSize = { xs: 10, sm: 12, md: 14, lg: 16, xl: 18, xxl: 20, xxxl: 24, title: 28 }
avatarSizes = { sm: 32, md: 40, lg: 48, xl: 64, xxl: 80 }
```

---

## Navigation Structure

### Stack Navigators

```
RootStack
├── Main (Tab Navigator)
│   ├── Home        → HomeScreen
│   ├── Feed        → FeedScreen (requires auth)
│   ├── Events      → EventsScreen
│   └── Profile     → ProfileScreen (requires auth)
└── Auth (Modal)
    ├── Login       → LoginScreen
    └── Register    → RegisterScreen
```

### Navigation Types (`src/navigation/types.ts`)

```typescript
type MainTabParamList = {
  Home: undefined;
  Feed: undefined;
  Events: undefined;
  Profile: undefined;
};

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  PostDetail: { postId: number };
  EventDetail: { eventId: number };
  // ...
};
```

---

## Components

### Button

```tsx
<Button
  title="Sign In"
  onPress={handleLogin}
  variant="primary"    // primary | secondary | outline | danger | ghost
  loading={isLoading}
  disabled={false}
  fullWidth
/>
```

### Input

```tsx
<Input
  label="Email"
  placeholder="you@example.com"
  value={email}
  onChangeText={setEmail}
  leftIcon="mail-outline"
  error={errors.email}
  secureTextEntry      // Shows password toggle
/>
```

### Avatar

```tsx
<Avatar
  uri={user?.avatar}
  name={user?.name}    // Fallback to initial
  size="md"            // sm | md | lg | xl | xxl
/>
```

### Badge

```tsx
<Badge
  label="Upcoming"
  variant="upcoming"   // upcoming | ongoing | completed | cancelled
/>                     // beginner | intermediate | advanced | all_levels
```

### Card

```tsx
<Card style={styles.card} noPadding={false}>
  <Text>Card content</Text>
</Card>
```

### PostCard

```tsx
<PostCard
  post={post}
  onPress={() => navigateToDetail(post.id)}
  onLike={() => toggleLike(post)}
  onComment={() => openComments(post.id)}
  onUserPress={() => navigateToProfile(post.user)}
  onMenuPress={() => showMenu(post.id)}
  isOwner={post.user_id === currentUser?.id}
/>
```

### EventCard

```tsx
<EventCard
  event={event}
  onPress={() => navigateToEvent(event.id)}
/>
```

### EmptyState

```tsx
<EmptyState
  icon="newspaper-outline"
  title="No posts yet"
  message="Be the first to share something!"
  actionLabel="Create Post"
  onAction={handleCreatePost}
/>
```

### Loading

```tsx
<Loading fullScreen message="Loading..." />
```

---

## Hooks

### useAuth

```tsx
const {
  user,              // Current user or null
  isLoading,         // Initial auth check loading
  isAuthenticated,   // Boolean
  login,             // (data: LoginRequest) => Promise<void>
  register,          // (data: RegisterRequest) => Promise<void>
  logout,            // () => Promise<void>
  refreshUser,       // () => Promise<void>
} = useAuth();
```

### useFeed

```tsx
const {
  posts,             // Post[]
  isLoading,         // Loading more
  isRefreshing,      // Pull-to-refresh
  hasMore,           // Has more pages
  error,             // Error message
  refresh,           // Pull-to-refresh handler
  loadMore,          // Infinite scroll handler
  toggleLike,        // (post: Post) => Promise<void>
  createPost,        // (content: string) => Promise<Post>
  deletePost,        // (postId: number) => Promise<void>
} = useFeed();
```

### useEvents

```tsx
const {
  events,            // Event[]
  isLoading,
  isRefreshing,
  hasMore,
  error,
  statusFilter,      // 'upcoming' | 'ongoing' | 'completed' | undefined
  refresh,
  loadMore,
  changeFilter,      // (status) => void
  registerForEvent,  // (eventId: number) => Promise<void>
  cancelRegistration,// (eventId: number) => Promise<void>
} = useEvents();
```

### usePermissions

```tsx
const {
  permissions,       // { location, locationBackground, camera, mediaLibrary }
  isChecking,        // Initial check loading
  checkPermissions,  // () => Promise<void>
  requestLocationPermission,     // () => Promise<boolean>
  requestBackgroundLocationPermission, // () => Promise<boolean>
  requestCameraPermission,       // () => Promise<boolean>
  requestMediaLibraryPermission, // () => Promise<boolean>
  requestActivityTrackingPermissions, // () => Promise<boolean>
  checkLocationServices,         // () => Promise<boolean>
} = usePermissions();
```

### useLiveActivity

```tsx
const {
  activity,          // Activity | null - Server activity record
  isTracking,        // Boolean - GPS is actively recording
  isPaused,          // Boolean - Activity is paused
  isLoading,         // Boolean - API operation in progress
  error,             // string | null - Error message
  currentStats,      // { distance, duration, elevation_gain }
  startTracking,     // (sportTypeId: number, title?: string) => Promise<Activity>
  pauseTracking,     // () => Promise<void>
  resumeTracking,    // () => Promise<void>
  finishTracking,    // (data?: { title?, description?, calories? }) => Promise<Activity>
  discardTracking,   // () => Promise<void>
  clearError,        // () => void
  checkExistingActivity, // () => Promise<void>
} = useLiveActivity();
```

---

## API Service

The API service (`src/services/api.ts`) provides methods for all endpoints:

### Authentication
```typescript
api.register(data)    // Register new user
api.login(data)       // Login user
api.logout()          // Logout current user
api.getUser()         // Get current user
```

### Posts
```typescript
api.getFeed(page)           // Get feed posts (paginated)
api.getPost(id)             // Get single post
api.createPost(data)        // Create post
api.updatePost(id, data)    // Update post
api.deletePost(id)          // Delete post
api.likePost(id)            // Like post
api.unlikePost(id)          // Unlike post
```

### Events
```typescript
api.getEvents(params)       // Get events (paginated, filterable)
api.getEvent(id)            // Get single event
api.createEvent(data)       // Create event
api.registerForEvent(id)    // Register for event
api.cancelEventRegistration(id)
```

### Profile
```typescript
api.getProfile()            // Get current user profile
api.updateProfile(data)     // Update profile
api.updatePassword(data)    // Change password
api.getUserByUsername(username)  // Get user by @username
```

### Social
```typescript
api.followUser(userId)      // Follow user
api.unfollowUser(userId)    // Unfollow user
api.getFollowers(userId)    // Get user's followers
api.getFollowing(userId)    // Get user's following
```

### Live Activity Tracking
```typescript
api.getCurrentActivity()           // Get current active activity (if any)
api.startLiveActivity(data)        // Start new live activity
api.addActivityPoints(id, points)  // Send GPS points batch
api.pauseActivity(id)              // Pause activity
api.resumeActivity(id)             // Resume paused activity
api.finishActivity(id, data)       // Complete and save activity
api.discardActivity(id)            // Delete/cancel activity
```

---

## Screens

### HomeScreen
- Landing page with feature overview
- Login/Register prompts for guests
- Quick navigation to main features

### FeedScreen
- Social feed with infinite scroll
- Create post form at top
- Like/comment actions
- Pull-to-refresh

### EventsScreen
- Event list with filters (All/Upcoming/Ongoing/Completed)
- Event cards with details
- Create event button (authenticated)

### ProfileScreen
- User profile header with avatar, stats
- Tabs: Posts, Activities, Events
- Edit profile and logout actions

### LoginScreen / RegisterScreen
- Form with validation
- Password visibility toggle
- Navigation between auth screens

### ActivityRecordingScreen
- Sport type selector (Running, Cycling, Swimming, Gym)
- Start/Pause/Resume/Stop controls
- Live timer and stats (distance, pace, calories, elevation)
- GPS tracking with expo-location
- Milestones with best/average time comparisons
- Server sync every 30 seconds
- Save or discard activity options

---

## Live Activity Tracking

The app supports real-time GPS activity tracking with server synchronization.

### Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    LIVE TRACKING FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. START                                                   │
│     POST /api/activities/start                              │
│     └── Creates activity with status='in_progress'          │
│                                                             │
│  2. TRACK (Loop every 30 seconds)                           │
│     POST /api/activities/{id}/points                        │
│     └── Sends batched GPS points, returns updated stats     │
│                                                             │
│  3. PAUSE (Optional)                                        │
│     POST /api/activities/{id}/pause                         │
│     └── Sets status='paused', records pause time            │
│                                                             │
│  4. RESUME (After pause)                                    │
│     POST /api/activities/{id}/resume                        │
│     └── Sets status='in_progress', tracks paused duration   │
│                                                             │
│  5. FINISH                                                  │
│     POST /api/activities/{id}/finish                        │
│     └── Sets status='completed', calculates final stats     │
│                                                             │
│  6. DISCARD (Alternative to finish)                         │
│     DELETE /api/activities/{id}/discard                     │
│     └── Deletes the activity entirely                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### GPS Point Structure

```typescript
interface GpsPoint {
  lat: number;        // Latitude (-90 to 90)
  lng: number;        // Longitude (-180 to 180)
  ele?: number;       // Elevation in meters
  time?: string;      // ISO 8601 timestamp
  hr?: number;        // Heart rate (0-300)
  speed?: number;     // Speed in m/s
  cadence?: number;   // Steps/min or rpm
}
```

### Key Features

- **Local distance calculation** using Haversine formula for immediate UI feedback
- **Server-side stats** for accurate totals (synced every 30 seconds)
- **Auto-recovery** of existing active activity on app restart
- **Background location** support (requires additional permissions)
- **Offline buffering** - GPS points saved locally until sync succeeds

---

## TODO / Future Features

- [ ] Post detail screen with comments
- [ ] Event detail screen with registration
- [ ] Activity detail screen with map
- [x] Activity tracking (GPS) - Implemented with live server sync
- [ ] Photo upload for posts
- [ ] Push notifications
- [ ] Settings screen
- [ ] Edit profile screen
- [ ] Followers/Following lists
- [ ] Search functionality
- [ ] Dark mode support
- [ ] Heart rate monitor integration
- [ ] Activity map preview

---

## Troubleshooting

### Common Issues

**Metro bundler port conflict:**
```bash
npx expo start --clear
```

**Android emulator not found:**
```bash
# Ensure ANDROID_HOME is set
export ANDROID_HOME=$HOME/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

**API connection failed:**
1. Check Laravel Sail is running: `./vendor/bin/sail ps`
2. Verify correct IP in `src/config/api.ts`
3. Ensure phone/emulator can reach the IP
4. Check firewall settings

**TypeScript errors:**
```bash
npx tsc --noEmit
```

**Clear all caches:**
```bash
npx expo start --clear
rm -rf node_modules && npm install
```

**Location permissions not working:**
1. On iOS: Check Settings > Privacy > Location Services
2. On Android: Check Settings > Apps > Racefy > Permissions
3. For background location on Android 10+: Select "Allow all the time"
4. Ensure location services are enabled on the device

**Activity tracking not syncing:**
1. Check API connection (verify network)
2. Look for errors in console logs
3. Ensure user is authenticated
4. Check if server is running: `./vendor/bin/sail ps`

---

## Test Credentials

```
Email: test@racefy.test
Password: password

Email: demo@racefy.test
Password: password
```

---

## Useful Commands

```bash
# Development
npx expo start              # Start dev server
npx expo start --clear      # Start with cleared cache
npm run android             # Run on Android
npm run ios                 # Run on iOS
npm run web                 # Run on web

# Type checking
npx tsc --noEmit            # Check TypeScript

# Dependencies
npx expo install <package>  # Install Expo-compatible package
npm outdated                # Check for updates

# Build (for production)
npx expo build:android      # Build Android APK
npx expo build:ios          # Build iOS IPA
```
