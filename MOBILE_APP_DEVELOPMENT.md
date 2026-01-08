# Racefy Mobile App Development Guide

This document provides information for developing the Racefy React Native mobile app.

## App Status & Overview

The Racefy mobile app is a feature-complete fitness and sports community platform built with React Native and Expo. The app has evolved significantly and includes:

- **40+ Reusable Components** - Comprehensive UI component library
- **13 Main Screen Directories** - All major features implemented
- **18 Custom Hooks** - Data management and state handling
- **100+ API Methods** - Full backend integration
- **759 Translation Keys** - Complete English/Polish support
- **Dark Mode Support** - Light, dark, and system themes
- **Real-time Features** - GPS tracking, messaging, live activity sync
- **66+ Type Definitions** - Full TypeScript type safety

### Core Features Implemented

✓ User Authentication & Profile Management
✓ Social Feed with Posts, Likes, Comments
✓ Live GPS Activity Tracking with Server Sync
✓ Event Creation, Registration & Management
✓ Real-time Messaging System
✓ Comprehensive Settings (Notifications, Privacy, Preferences)
✓ Dark Mode with Theme Switching
✓ Internationalization (English/Polish)
✓ Media Upload (Photos/Videos)
✓ Activity Statistics & Charts
✓ GPX Import
✓ Draft Management
✓ Legal Consents & Documents

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.81+ | Mobile framework |
| Expo | SDK 54 | Development platform |
| TypeScript | 5.x | Type safety |
| React Navigation | 7.x | Navigation |
| AsyncStorage | 2.x | Local storage |
| i18next | 23.x | Internationalization (en/pl) |
| date-fns | 3.x | Date formatting |
| Leaflet | - | Map rendering |

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
    │   ├── useLiveActivity.ts # Live activity tracking with API sync
    │   ├── useTheme.tsx       # Theme context (light/dark/system)
    │   ├── useMessages.ts     # Chat messages
    │   ├── useConversations.ts # Messaging conversations
    │   ├── useDrafts.ts       # Draft post management
    │   ├── useFollowing.ts    # Follow/unfollow users
    │   ├── useActivityStats.ts # Activity statistics
    │   ├── usePointStats.ts   # Point/leaderboard stats
    │   ├── useOngoingEvents.ts # Events user is registered for
    │   ├── useSportTypes.ts   # Sport types fetching
    │   ├── useHaptics.ts      # Haptic feedback control
    │   ├── useUnreadCount.ts  # Unread messages count
    │   └── useBrandAssets.ts  # Brand assets/media
    ├── theme/
    │   ├── index.ts
    │   ├── colors.ts          # Color palette (light/dark)
    │   └── spacing.ts         # Spacing, fonts, sizes
    ├── i18n/
    │   ├── index.ts           # i18next configuration
    │   └── locales/
    │       ├── en.json        # English translations (759 keys)
    │       └── pl.json        # Polish translations (759 keys)
    ├── docs/
    │   └── UI_PATTERNS.md     # Component usage patterns
    ├── components/
    │   ├── index.ts
    │   ├── ActivityCard.tsx   # Activity display card
    │   ├── ActivitySliderCard.tsx # Slider view for activities
    │   ├── AiPostsSettings.tsx # AI-generated post settings
    │   ├── Avatar.tsx         # User avatar with fallback initials
    │   ├── Badge.tsx          # Status badges
    │   ├── BoostButton.tsx    # Activity boost interaction
    │   ├── BottomSheet.tsx    # Generic bottom sheet
    │   ├── BrandLogo.tsx      # Racefy brand logo
    │   ├── Button.tsx         # Styled buttons
    │   ├── Card.tsx           # Card container
    │   ├── CollapsibleSection.tsx # Expandable sections
    │   ├── CommentInput.tsx   # Comment composition UI
    │   ├── CommentItem.tsx    # Individual comment display
    │   ├── CommentSection.tsx # Comment thread container
    │   ├── CompareUserSelector.tsx # User comparison selector
    │   ├── CountdownTimer.tsx # Event countdown display
    │   ├── DebugLogsSection.tsx # Debug logging UI (dev only)
    │   ├── DifficultySelector.tsx # Event difficulty picker
    │   ├── DraftPostCard.tsx  # Draft post display
    │   ├── DraftsTab.tsx      # Drafts tab component
    │   ├── EmptyState.tsx     # Empty list state
    │   ├── EventCard.tsx      # Event display card
    │   ├── EventSelectionSheet.tsx # Event selection bottom sheet
    │   ├── ImagePickerButton.tsx # Image selection button
    │   ├── Input.tsx          # Form input
    │   ├── LeafletMap.tsx     # Map display (Leaflet)
    │   ├── Loading.tsx        # Loading spinner
    │   ├── MediaGallery.tsx   # Image/video gallery
    │   ├── MediaPicker.tsx    # Media selection
    │   ├── MediaThumbnail.tsx # Media preview thumbnail
    │   ├── PointsCard.tsx     # Points/leaderboard card
    │   ├── PostCard.tsx       # Post display card
    │   ├── PrivacyConsentsSection.tsx # Privacy consent UI
    │   ├── ScreenHeader.tsx   # Screen header with back button
    │   ├── SettingsSection.tsx # Collapsible settings section
    │   ├── SportStatsChart.tsx # Activity statistics chart
    │   ├── SportTypeSelector.tsx # Sport type picker
    │   ├── UserListModal.tsx  # User list modal
    │   └── VideoPlayer.tsx    # Video playback component
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
    │   ├── details/
    │   │   ├── PostDetailScreen.tsx         # Post with comments
    │   │   ├── EventDetailScreen.tsx        # Event details with registration
    │   │   ├── ActivityDetailScreen.tsx     # Activity details with map
    │   │   └── UserProfileScreen.tsx        # Other user's profile
    │   ├── settings/
    │   │   ├── SettingsScreen.tsx           # Comprehensive settings
    │   │   └── EditProfileScreen.tsx        # Profile editing
    │   ├── messaging/
    │   │   ├── ConversationsListScreen.tsx  # Message conversations list
    │   │   └── ChatScreen.tsx               # Direct messaging
    │   ├── forms/
    │   │   ├── EventFormScreen.tsx          # Create/edit events
    │   │   ├── PostFormScreen.tsx           # Create/edit posts
    │   │   ├── ActivityFormScreen.tsx       # Create/edit activities
    │   │   └── GpxImportScreen.tsx          # GPX file import
    │   └── legal/
    │       ├── ConsentModalScreen.tsx       # Legal consent modal
    │       └── LegalDocumentsScreen.tsx     # Terms, privacy, etc.
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
# Clone with submodules
git clone --recurse-submodules <repo-url>

# Or if already cloned, init submodules
git submodule update --init --recursive

# Install git hooks (auto-sync docs on pull)
./scripts/install-hooks.sh

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
spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 40, xxxl: 48 }
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
│   ├── Record      → ActivityRecordingScreen (requires auth)
│   ├── Events      → EventsScreen
│   └── Profile     → ProfileScreen (requires auth)
├── Auth (Modal)
│   ├── Login       → LoginScreen
│   ├── Register    → RegisterScreen
│   └── LegalDocuments → LegalDocumentsScreen
├── Detail Screens
│   ├── PostDetail  → PostDetailScreen
│   ├── EventDetail → EventDetailScreen
│   ├── ActivityDetail → ActivityDetailScreen
│   └── UserProfile → UserProfileScreen
├── Feature Screens
│   ├── Settings    → SettingsScreen
│   ├── EditProfile → EditProfileScreen
│   ├── ConversationsList → ConversationsListScreen
│   ├── Chat        → ChatScreen
│   ├── EventForm   → EventFormScreen
│   ├── PostForm    → PostFormScreen
│   ├── ActivityForm → ActivityFormScreen
│   └── GpxImport   → GpxImportScreen
└── Legal
    └── ConsentModal → ConsentModalScreen
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

### useTheme

```tsx
const {
  theme,             // 'light' | 'dark' | 'system'
  colors,            // Theme color palette
  effectiveTheme,    // Resolved theme ('light' | 'dark')
  setTheme,          // (theme: 'light' | 'dark' | 'system') => void
  isDark,            // Boolean - is dark mode active
} = useTheme();
```

### useMessages

```tsx
const {
  messages,          // Message[] - conversation messages
  isLoading,         // Boolean - loading state
  isSending,         // Boolean - sending message
  error,             // string | null
  sendMessage,       // (text: string) => Promise<void>
  markAsRead,        // () => Promise<void>
  refresh,           // () => Promise<void>
} = useMessages(conversationId);
```

### useConversations

```tsx
const {
  conversations,     // Conversation[] - all conversations
  isLoading,         // Boolean
  isRefreshing,      // Boolean
  error,             // string | null
  unreadCount,       // number - total unread messages
  refresh,           // () => Promise<void>
  startConversation, // (userId: number) => Promise<Conversation>
} = useConversations();
```

### useDrafts

```tsx
const {
  drafts,            // Post[] - draft posts
  isLoading,         // Boolean
  error,             // string | null
  createDraft,       // (content: string) => Promise<Post>
  updateDraft,       // (id: number, content: string) => Promise<Post>
  deleteDraft,       // (id: number) => Promise<void>
  publishDraft,      // (id: number) => Promise<Post>
  refresh,           // () => Promise<void>
} = useDrafts();
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
api.getActivity(id)                // Get activity details
api.updateActivity(id, data)       // Update activity
api.deleteActivity(id)             // Delete activity
api.boostActivity(id)              // Boost activity visibility
```

### Messaging
```typescript
api.getConversations()             // Get all conversations
api.getConversation(id)            // Get conversation details
api.startConversation(userId)      // Start new conversation
api.getMessages(conversationId)    // Get messages in conversation
api.sendMessage(conversationId, text) // Send message
api.markConversationAsRead(id)     // Mark as read
```

### Comments
```typescript
api.getPostComments(postId)        // Get post comments
api.createPostComment(postId, text) // Add comment to post
api.deletePostComment(commentId)   // Delete post comment
api.getActivityComments(activityId) // Get activity comments
api.createActivityComment(activityId, text) // Add comment to activity
api.getEventComments(eventId)      // Get event comments
api.createEventComment(eventId, text) // Add comment to event
```

### Statistics
```typescript
api.getUserStats(userId)           // Get user statistics
api.getActivityStats(userId)       // Get activity statistics
api.getWeeklyStats()               // Get weekly stats
api.getPointStats()                // Get point/leaderboard stats
```

### Settings & Preferences
```typescript
api.getPreferences()               // Get user preferences
api.updatePreferences(data)        // Update preferences
api.updatePassword(data)           // Change password
api.deleteAccount(password)        // Delete user account
```

### Media
```typescript
api.uploadAvatar(imageUri)         // Upload user avatar
api.uploadBackground(imageUri)     // Upload profile background
api.uploadActivityPhotos(activityId, photos) // Upload activity photos
api.uploadActivityVideos(activityId, videos) // Upload activity videos
```

### GPX & Import
```typescript
api.importGpx(file)                // Import GPX file as activity
api.getSportTypes()                // Get all sport types
api.getBrandAssets()               // Get brand assets/media
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

### SettingsScreen
- Comprehensive settings with expandable sections:
  - **Account**: Password change, account deletion
  - **Preferences**: Units (metric/imperial), language (en/pl), theme (light/dark/system), haptic feedback
  - **Notifications**: Email/push toggles for likes, comments, follows, messages, event reminders, weekly summary
  - **Privacy**: Profile visibility, activities/stats visibility, message permissions
  - **Activity Defaults**: Visibility, auto-share options
  - **AI Posts**: Enable/disable, style selection, triggers
  - **App**: Version display, debug logs (dev mode)
  - **Danger Zone**: Logout, delete account
- All settings synced with server
- Section expansion state persisted in AsyncStorage

### EditProfileScreen
- Avatar upload (camera/gallery)
- Background image upload
- Edit name, username, email, bio
- Form validation with real-time feedback
- Image optimization (0.8 quality)
- Profile refresh after updates

### ChatScreen / ConversationsListScreen
- Real-time messaging system
- Conversation list with unread counts
- Individual chat view with message history
- Message composition and sending
- Date-formatted messages
- Mark as read functionality

### Detail Screens
- **PostDetailScreen**: Full post view with comments section
- **EventDetailScreen**: Event info, participants, registration/cancellation
- **ActivityDetailScreen**: Activity stats, map, photos/videos, comments
- **UserProfileScreen**: View other users' profiles, follow/unfollow

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

## Dark Mode & Theme System

The app supports light, dark, and system-based themes with automatic switching.

### Features

- **Three theme modes**: Light, Dark, and System (follows device settings)
- **Persistent preference**: Theme choice stored in AsyncStorage
- **Instant switching**: No app restart required
- **Comprehensive color palette**: All UI elements adapt to theme
- **Server sync**: Theme preference synced with user settings

### Theme Colors

| Element | Light Theme | Dark Theme |
|---------|------------|------------|
| Primary | `#10b981` (emerald) | `#10b981` (emerald) |
| Background | `#f9fafb` | `#111827` |
| Card Background | `#ffffff` | `#1f2937` |
| Text Primary | `#111827` | `#f9fafb` |
| Text Secondary | `#6b7280` | `#9ca3af` |
| Border | `#e5e7eb` | `#374151` |

### Usage

```tsx
import { useTheme } from '../hooks';

const MyComponent = () => {
  const { colors, isDark, setTheme } = useTheme();

  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.textPrimary }}>Hello!</Text>
      <Button onPress={() => setTheme('dark')} title="Dark Mode" />
    </View>
  );
};
```

---

## Internationalization (i18n)

The app supports multiple languages with server-synced preferences.

### Supported Languages

- **English** (en) - Default
- **Polish** (pl)

### Features

- **759 translation keys** covering all UI text
- **Server sync**: Language preference synced with user settings
- **Local storage**: Instant app start with cached language
- **Accept-Language header**: Automatically sent with API requests
- **Fallback support**: Missing translations fall back to English

### Translation Files

- `src/i18n/locales/en.json` - English translations
- `src/i18n/locales/pl.json` - Polish translations

### Usage

```tsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t, i18n } = useTranslation();

  return (
    <View>
      <Text>{t('welcome.title')}</Text>
      <Button onPress={() => i18n.changeLanguage('pl')} title="Polski" />
    </View>
  );
};
```

### Adding New Translations

1. Add key to `en.json` with English text
2. Add corresponding key to `pl.json` with Polish text
3. Use `t('your.key')` in components
4. Never hardcode strings in UI components

---

## TODO / Future Features

### Completed Features ✓

- [x] Post detail screen with comments
- [x] Event detail screen with registration
- [x] Activity detail screen with map
- [x] Activity tracking (GPS) with live server sync
- [x] Photo/video upload for posts and activities
- [x] Settings screen (comprehensive with all preferences)
- [x] Edit profile screen (avatar, background, bio)
- [x] Dark mode support (light/dark/system)
- [x] Activity map display (Leaflet integration)
- [x] Messaging/chat system
- [x] Draft post management
- [x] GPX file import
- [x] Event creation and management
- [x] Post creation with media
- [x] Activity boost feature
- [x] Internationalization (English/Polish)
- [x] Legal consents and documents
- [x] AI-generated posts configuration
- [x] User profile views
- [x] Follow/unfollow functionality
- [x] Comments on posts, activities, and events
- [x] Activity statistics and charts

### Planned Features

- [ ] Push notifications (infrastructure exists, needs native implementation)
- [ ] Real-time updates via WebSocket
- [ ] Advanced search functionality (users, posts, events, activities)
- [ ] Followers/Following lists UI
- [ ] Heart rate monitor integration via Bluetooth
- [ ] Offline mode with local caching
- [ ] Activity challenges and leaderboards UI
- [ ] Social sharing to other platforms
- [ ] Activity segments and PRs
- [ ] Training plans and goals
- [ ] Notification center screen
- [ ] Performance optimizations (memoization, lazy loading)
- [ ] E2E testing setup
- [ ] CI/CD pipeline

---

## EAS Build & Deployment

The app uses [Expo Application Services (EAS)](https://docs.expo.dev/build/introduction/) for creating production-ready Android and iOS builds.

### Overview

EAS Build is a hosted service that compiles your app in the cloud. Unlike the legacy `expo build` command, EAS Build:
- Runs on Expo's servers (no local compilation needed)
- Supports custom native code and config plugins
- Provides build logs and artifact downloads
- Integrates with EAS Submit for app store submissions

### Prerequisites

#### 1. Install EAS CLI

```bash
npm install -g eas-cli
```

#### 2. Login to Expo Account

```bash
eas login
```

Use your Expo account credentials. If you don't have an account, create one at [expo.dev](https://expo.dev).

#### 3. Project Configuration

The project is already configured with:
- `eas.json` - Build profiles and environment variables
- `app.config.ts` - Dynamic app configuration
- EAS Project ID: `6eab0c85-bf5b-4308-96e2-15fcd9c780fe`

### Build Profiles

Build profiles are defined in `RacefyApp/eas.json`. Each profile configures different build settings:

| Profile | Platform | Output | API URL | Distribution | Use Case |
|---------|----------|--------|---------|--------------|----------|
| `development` | Both | Dev client | Local/Staging | Internal | Development testing |
| `staging` | Both | APK (Android) / IPA (iOS) | `https://app.dev.racefy.io/api` | Internal | QA testing, beta releases |
| `production` | Both | AAB (Android) / IPA (iOS) | `https://api.racefy.app/api` | Store | Production releases |

#### Profile Details

**Development Profile**
```json
{
  "developmentClient": true,
  "distribution": "internal"
}
```
- Used for development builds with Expo Dev Client
- Hot reloading and debugging enabled

**Staging Profile**
```json
{
  "android": { "buildType": "apk" },
  "distribution": "internal",
  "env": {
    "APP_ENV": "staging",
    "LOG_ENABLED": "true",
    "LOG_LEVEL": "debug"
  }
}
```
- Creates APK for easy distribution to testers
- Points to staging API
- Debug logging enabled

**Production Profile**
```json
{
  "android": { "buildType": "app-bundle" },
  "env": {
    "APP_ENV": "production"
  }
}
```
- Creates AAB (Android App Bundle) for Google Play
- Points to production API
- Optimized and minified

### Build Commands

#### Android Builds

```bash
# Navigate to app directory
cd RacefyApp

# Staging build (APK for testing)
eas build --platform android --profile staging

# Production build (AAB for Google Play)
eas build --platform android --profile production

# Development build
eas build --platform android --profile development
```

#### iOS Builds

```bash
# Staging build (requires Apple Developer account)
eas build --platform ios --profile staging

# Production build (for App Store)
eas build --platform ios --profile production
```

#### Build Both Platforms

```bash
# Build for both Android and iOS
eas build --platform all --profile production
```

### Environment Variables

#### How Environment Selection Works

1. **Build Profile** (`eas.json`) sets `APP_ENV` variable (`staging` or `production`)
2. **App Config** (`app.config.ts`) reads `APP_ENV` and selects the appropriate API URL
3. **API Service** (`src/config/api.ts`) uses `extra.apiUrl` from the config

#### Available Environment Variables

The following variables can be configured in `eas.json` or as EAS secrets:

| Variable | Description | Default | Used In |
|----------|-------------|---------|---------|
| `APP_ENV` | Environment name | `production` | Build profile selection |
| `API_STAGING_URL` | Staging API endpoint | `https://app.dev.racefy.io/api` | Staging builds |
| `API_PRODUCTION_URL` | Production API endpoint | `https://api.racefy.app/api` | Production builds |
| `API_LOCAL_IP` | Local dev IP | `192.168.1.100` | Development only |
| `API_LOCAL_PORT` | Local dev port | `8080` | Development only |
| `LOG_ENABLED` | Enable debug logging | `false` | All builds |
| `LOG_LEVEL` | Log level | `debug` | All builds |
| `LOG_PERSIST` | Persist logs to storage | `true` | All builds |
| `LOG_MAX_ENTRIES` | Max log entries | `2000` | All builds |
| `LOG_CONSOLE_OUTPUT` | Console logging | `true` | All builds |
| `XDEBUG_ENABLED` | PHP Xdebug trigger | `false` | Development only |
| `USE_STAGING_IN_DEV` | Use staging in dev | `false` | Development only |

#### Adding New Environment Variables

**Method 1: Add to eas.json (Recommended for non-sensitive values)**

Edit `RacefyApp/eas.json` and add to the profile's `env` section:

```json
{
  "build": {
    "staging": {
      "env": {
        "APP_ENV": "staging",
        "LOG_ENABLED": "true",
        "MY_NEW_VARIABLE": "my_value"
      }
    }
  }
}
```

**Method 2: EAS Secrets (Recommended for sensitive values)**

Use EAS CLI to set encrypted environment variables:

```bash
# Set a secret for the project
eas secret:create --name MY_API_KEY --value "secret_key_value" --scope project

# List all secrets
eas secret:list

# Delete a secret
eas secret:delete --name MY_API_KEY
```

Secrets are automatically available during builds without adding them to `eas.json`.

**Method 3: .env file (Local development only)**

Create `RacefyApp/.env` for local development:

```bash
API_LOCAL_IP=192.168.1.100
API_LOCAL_PORT=8080
XDEBUG_ENABLED=true
```

⚠️ **Important:** `.env` files are NOT used during EAS cloud builds. Use Method 1 or 2 for build-time variables.

#### Using Environment Variables in Code

**In app.config.ts:**

```typescript
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  extra: {
    myVariable: process.env.MY_NEW_VARIABLE || 'default_value',
  },
});
```

**In React Native code:**

```typescript
import Constants from 'expo-constants';

const myVariable = Constants.expoConfig?.extra?.myVariable;
console.log('My variable:', myVariable);
```

**Example (API URL selection):**

```typescript
// In app.config.ts
const getApiUrl = (): string => {
  const env = process.env.APP_ENV || 'production';

  if (env === 'staging') {
    return process.env.API_STAGING_URL || 'https://app.dev.racefy.io/api';
  }

  return process.env.API_PRODUCTION_URL || 'https://api.racefy.app/api';
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  extra: {
    appEnv: process.env.APP_ENV || 'production',
    apiUrl: getApiUrl(),
  },
});
```

```typescript
// In src/config/api.ts
import Constants from 'expo-constants';

const getBaseUrl = (): string => {
  // In production/staging builds, use the configured API URL
  if (Constants.expoConfig?.extra?.apiUrl) {
    return Constants.expoConfig.extra.apiUrl;
  }

  // In development, use platform-specific URLs
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8080/api'; // Android Emulator
    }
    return 'http://localhost:8080/api'; // iOS Simulator
  }

  return 'https://api.racefy.app/api'; // Fallback
};
```

### Build Process

#### 1. Start a Build

```bash
cd RacefyApp
eas build --platform android --profile staging
```

#### 2. Monitor Build Progress

- Build logs are displayed in the terminal
- Or view in browser: [expo.dev/accounts/sebastiantarka/projects/RacefyApp/builds](https://expo.dev/accounts/sebastiantarka/projects/RacefyApp/builds)

#### 3. Download Build Artifact

When complete, EAS provides a download URL:
- **APK**: Can be installed directly on Android devices
- **AAB**: For Google Play Store submission
- **IPA**: For App Store submission (requires TestFlight or App Store)

### App Store Submission

#### Android (Google Play)

```bash
# Submit production build to Google Play
eas submit --platform android --profile production
```

Requires:
- Google Play Console account
- Service account JSON key
- Configured app in Play Console

#### iOS (App Store)

```bash
# Submit production build to App Store
eas submit --platform ios --profile production
```

Requires:
- Apple Developer account ($99/year)
- App Store Connect app created
- App-specific password or API key

### Expo Dashboard

Access your builds, updates, and analytics at:
- **Project Dashboard**: [expo.dev/accounts/sebastiantarka/projects/RacefyApp](https://expo.dev/accounts/sebastiantarka/projects/RacefyApp)
- **Builds**: [expo.dev/accounts/sebastiantarka/projects/RacefyApp/builds](https://expo.dev/accounts/sebastiantarka/projects/RacefyApp/builds)
- **Updates**: [expo.dev/accounts/sebastiantarka/projects/RacefyApp/updates](https://expo.dev/accounts/sebastiantarka/projects/RacefyApp/updates)

### Version Management

#### Update App Version

Edit `app.config.ts`:

```typescript
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  version: '1.0.1', // Increment this
  ios: {
    buildNumber: '1', // iOS build number
  },
  android: {
    versionCode: 2, // Android version code (must increment)
  },
});
```

#### Version Naming Convention

- **Major.Minor.Patch** (e.g., `1.0.0`, `1.2.3`)
- **Major**: Breaking changes
- **Minor**: New features, backwards compatible
- **Patch**: Bug fixes

### Build Troubleshooting

#### Build Failed

1. Check build logs in terminal or Expo dashboard
2. Common issues:
   - **Native dependencies**: Ensure all dependencies are compatible with Expo
   - **Configuration errors**: Validate `app.config.ts` and `eas.json`
   - **Asset errors**: Check all images/fonts are in `assets/` directory
   - **Environment variables**: Verify all required variables are set

#### Clear Build Cache

```bash
eas build --platform android --profile staging --clear-cache
```

#### Local Build (for debugging)

```bash
# Build locally instead of on EAS servers
eas build --platform android --profile staging --local
```

Requires:
- Android Studio and SDK (for Android)
- Xcode (for iOS, macOS only)

#### Check Build Configuration

```bash
# Validate configuration without building
eas build:configure
```

### Best Practices

1. **Use Staging First**: Always test staging builds before production
2. **Version Incrementing**: Always increment version codes for new builds
3. **Environment Variables**: Use EAS secrets for sensitive data
4. **Build Logs**: Save build logs for troubleshooting
5. **Testing**: Test APK/IPA on real devices before store submission
6. **Code Signing**: Keep signing credentials secure (EAS manages this automatically)
7. **Build Frequency**: Avoid excessive builds to stay within EAS usage limits

### EAS Usage Limits

Free tier includes:
- 30 builds per month
- Unlimited updates (EAS Update)

For more builds, consider [EAS pricing plans](https://expo.dev/pricing).

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
