# Racefy API Specification for React Native

Use this file as context when building a React Native mobile app for Racefy.

---

## SPA Design Reference

The mobile app should follow the same design patterns as the React SPA web application. This section describes the UI/UX patterns to maintain consistency.

### Design Theme

#### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | `#10b981` | Buttons, links, accents (emerald-500) |
| Primary Dark | `#059669` | Button hover, active states (emerald-600) |
| Primary Light | `#34d399` | Backgrounds, highlights (emerald-400) |
| Background | `#f9fafb` | Page background (gray-50) |
| Card Background | `#ffffff` | Cards, modals |
| Text Primary | `#111827` | Headings, main text (gray-900) |
| Text Secondary | `#6b7280` | Secondary text, labels (gray-500) |
| Border | `#e5e7eb` | Card borders, dividers (gray-200) |
| Error | `#ef4444` | Error states, delete buttons (red-500) |
| Success | `#10b981` | Success messages (emerald-500) |

#### Typography

- **Headings**: Bold, gray-900
- **Body text**: Regular, gray-700
- **Secondary text**: Regular, gray-500
- **Links**: Emerald-600, underline on hover

### Navigation Structure

#### Bottom Tab Navigation (Mobile)

```
┌─────────────────────────────────────────┐
│                                         │
│              [Screen Content]           │
│                                         │
├─────────────────────────────────────────┤
│  🏠      📰      📅      👤            │
│  Home    Feed   Events  Profile         │
└─────────────────────────────────────────┘
```

| Tab | Icon | Screen | Auth Required |
|-----|------|--------|---------------|
| Home | Home icon | Landing/Dashboard | No |
| Feed | Newspaper icon | Posts feed | Yes |
| Events | Calendar icon | Events list | No |
| Profile | User icon | User profile | Yes |

#### Header Navigation

- **Logo**: "Racefy" text in emerald-500, bold
- **Right side (logged in)**: Avatar dropdown with Profile, Settings, Logout
- **Right side (guest)**: Login and Sign Up buttons

### Screen Layouts

#### 1. Feed Screen (Main)

```
┌─────────────────────────────────────────┐
│ [Header with logo and user avatar]      │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ [Create Post Card]                  │ │
│ │ "What's on your mind?" + Photo btn  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ [Post Card]                         │ │
│ │ ┌─────┐ Username        • 2h ago    │ │
│ │ │Avatar│ @username                   │ │
│ │ └─────┘                              │ │
│ │                                      │ │
│ │ Post content text here...           │ │
│ │                                      │ │
│ │ [Photo Grid if any - max 4]         │ │
│ │                                      │ │
│ │ ❤️ 12    💬 5                        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [More posts with infinite scroll...]    │
└─────────────────────────────────────────┘
```

**Post Card Components:**
- Avatar (40px circle) with user initial fallback
- Username (bold) + @handle (gray)
- Relative time (e.g., "2h ago", "3d ago")
- Post content (text)
- Photo grid (1-4 images, responsive grid)
- Action bar: Like button (heart), Comment count
- Three-dot menu for own posts (Edit, Delete)

#### 2. Profile Screen (`/@username`)

```
┌─────────────────────────────────────────┐
│ [Cover Image - Emerald gradient]        │
│ ┌──────┐                                │
│ │Avatar│  Display Name                  │
│ │ 80px │  @username                     │
│ └──────┘                    [Follow]    │
│                                         │
│ Bio text here if available...           │
│                                         │
│ 12 Posts   48 Followers   23 Following  │
├─────────────────────────────────────────┤
│ [Posts] [Activities] [Events]   <- Tabs │
├─────────────────────────────────────────┤
│                                         │
│ [Content based on active tab]           │
│                                         │
│ Posts tab: List of user's posts         │
│ Activities tab: User's activities       │
│ Events tab: Events user participates    │
└─────────────────────────────────────────┘
```

**Profile Header:**
- Cover: Gradient from emerald-400 to emerald-600
- Avatar: Large (80px), white ring border
- Stats: Posts count, Followers, Following (clickable)
- Follow button (emerald for follow, outline for unfollow)

**For Guests viewing profile:**
- Activities tab shows max 5 items
- "Log in to see more" message with login button

#### 3. Events List Screen

```
┌─────────────────────────────────────────┐
│ Events                                  │
│ Discover and join local sports events   │
│                                         │
│ [+ Create Event] (if logged in)         │
├─────────────────────────────────────────┤
│ Filter: [All] [Upcoming] [Ongoing]      │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ [Event Card]                        │ │
│ │ ┌───────────┐ Event Title           │ │
│ │ │  Photo    │ 🏃 Running • Beginner │ │
│ │ │  or icon  │ 📍 Central Park       │ │
│ │ └───────────┘ 📅 Dec 25, 10:00 AM   │ │
│ │               👥 12/50 participants │ │
│ │                                      │ │
│ │ [UPCOMING] badge                     │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Event Card:**
- Event photo or sport type icon
- Title (bold)
- Sport type + difficulty badge
- Location with pin icon
- Date/time with calendar icon
- Participant count
- Status badge (Upcoming=emerald, Ongoing=blue, Completed=gray)

#### 4. Event Detail Screen

```
┌─────────────────────────────────────────┐
│ [Event Photo/Header]                    │
│                                         │
│ Event Title                             │
│ [UPCOMING] badge                        │
├─────────────────────────────────────────┤
│ About                                   │
│ Event description text...               │
├─────────────────────────────────────────┤
│ 📅 Date & Time                          │
│    Sat, Dec 25, 2024                    │
│    10:00 AM - 2:00 PM                   │
├─────────────────────────────────────────┤
│ 📍 Location                             │
│    Central Park, New York               │
├─────────────────────────────────────────┤
│ 🏃 Sport: Running                       │
│ 📊 Difficulty: Beginner                 │
│ 👥 Participants: 12/50                  │
├─────────────────────────────────────────┤
│ Participants                            │
│ [Avatar] [Avatar] [Avatar] +9 more      │
├─────────────────────────────────────────┤
│ [Register] or [Cancel Registration]     │
└─────────────────────────────────────────┘
```

#### 5. Activity Card

```
┌─────────────────────────────────────────┐
│ ┌─────┐ Username           • 2h ago    │
│ │Avatar│ Morning Run                    │
│ └─────┘ 🏃 Running                      │
├─────────────────────────────────────────┤
│ [Map Preview if GPS track available]    │
├─────────────────────────────────────────┤
│ 🛣️ 5.2 km    ⏱️ 32:15    ⚡ 6:12/km    │
│ Distance     Duration     Pace          │
│                                         │
│ 📈 120m      🔥 320       ❤️ 145        │
│ Elevation   Calories     Avg HR         │
└─────────────────────────────────────────┘
```

**Activity Stats Display:**
- Primary stats: Distance, Duration, Pace (larger)
- Secondary stats: Elevation, Calories, Heart Rate (smaller)
- GPS track map preview if available
- Sport type icon and name

#### 6. Settings Screen

```
┌─────────────────────────────────────────┐
│ Settings                                │
├─────────────────────────────────────────┤
│ Language                                │
│ [English] [Polski]                      │
├─────────────────────────────────────────┤
│ Profile                                 │
│ ┌─────────────────────────────────────┐ │
│ │ Display Name: [_______________]     │ │
│ │ Username:     [_______________]     │ │
│ │ Your URL: /@username                │ │
│ │ Email:        [_______________]     │ │
│ │ [Save Changes]                       │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ Change Password                         │
│ ┌─────────────────────────────────────┐ │
│ │ Current Password: [_______________] │ │
│ │ New Password:     [_______________] │ │
│ │ Confirm:          [_______________] │ │
│ │ [Update Password]                    │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ ⚠️ Danger Zone                          │
│ [Delete Account] (red button)           │
└─────────────────────────────────────────┘
```

#### 7. Login/Register Screens

```
┌─────────────────────────────────────────┐
│                                         │
│         🏃 Racefy                       │
│    Sports & Fitness Community           │
│                                         │
├─────────────────────────────────────────┤
│ Sign In                                 │
│                                         │
│ Email                                   │
│ ┌─────────────────────────────────────┐ │
│ │ you@example.com                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Password                                │
│ ┌─────────────────────────────────────┐ │
│ │ ••••••••                            │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [      Sign In (emerald)      ]         │
│                                         │
│ Don't have an account? Sign Up          │
└─────────────────────────────────────────┘
```

### UI Components

#### Buttons

| Type | Style |
|------|-------|
| Primary | bg-emerald-500, text-white, rounded-lg, hover:bg-emerald-600 |
| Secondary | bg-gray-100, text-gray-700, rounded-lg, hover:bg-gray-200 |
| Outline | border-emerald-500, text-emerald-600, rounded-lg |
| Danger | bg-red-500, text-white, rounded-lg |
| Ghost | text-gray-600, hover:bg-gray-100 |

#### Cards

- White background
- Rounded corners (rounded-xl, ~12px)
- Subtle shadow (shadow-sm)
- Light border (border-gray-100)

#### Form Inputs

- Rounded (rounded-lg, ~8px)
- Gray border (border-gray-300)
- Focus: emerald ring (ring-2 ring-emerald-500)
- Padding: px-4 py-2.5

#### Avatar

- Circular image
- Sizes: sm (32px), md (40px), lg (48px), xl (64px), 2xl (80px)
- Fallback: emerald background with white initial letter

#### Badges/Tags

- Status badges: rounded-full, px-3 py-1, small text
- Upcoming: bg-emerald-100, text-emerald-700
- Ongoing: bg-blue-100, text-blue-700
- Completed: bg-gray-100, text-gray-700
- Difficulty: similar style with appropriate colors

#### Toast Notifications

- Position: top-right (web), top (mobile)
- Success: emerald-500 accent
- Error: red-500 accent
- Auto-dismiss after 3-5 seconds

### Empty States

When lists are empty, show friendly messages:

```
┌─────────────────────────────────────────┐
│                                         │
│              [Icon]                     │
│                                         │
│         No posts yet                    │
│   Be the first to share something!      │
│                                         │
│         [Create Post]                   │
└─────────────────────────────────────────┘
```

### Loading States

- **Page loader**: Centered spinner with emerald color
- **Infinite scroll**: Small spinner at bottom
- **Button loading**: Spinner inside button, disabled state
- **Skeleton**: Gray animated placeholders for cards

### Responsive Behavior

The SPA uses responsive breakpoints:

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 768px | Single column, bottom nav |
| Tablet | 768px - 1024px | Single column, top nav |
| Desktop | > 1024px | Centered content (max-w-2xl), sidebar optional |

For React Native, focus on the mobile layout with bottom tab navigation.

---

## API Endpoints Reference

Complete list of all available API endpoints.

### Public Endpoints (No Authentication Required)

#### Health & System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | API health check status |

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Login and get access token |
| POST | `/forgot-password` | Request password reset email |
| POST | `/reset-password` | Reset password with token |
| GET | `/email/verify/{id}/{hash}` | Verify email (signed URL) |

#### Sport Types
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sport-types` | List all active sport types |
| GET | `/sport-types/{id}` | Get sport type details |

#### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/posts` | List public posts (paginated) |
| GET | `/posts/{id}` | Get post details |
| GET | `/posts/{id}/comments` | Get post comments |

#### Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/events` | List events (filterable by status, sport_type_id) |
| GET | `/events/{id}` | Get event details by ID |
| GET | `/events/slug/{slug}` | Get event by friendly URL slug |
| GET | `/events/{id}/participants` | List event participants |
| GET | `/events/{id}/point-rewards` | Get event point reward configuration |

#### Users & Profiles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/username/{username}` | Get user profile by username |
| GET | `/users/{id}/activities` | List user's public activities |
| GET | `/users/{id}/followers` | List user's followers |
| GET | `/users/{id}/following` | List who user follows |

#### Leaderboard (Public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/leaderboard/global` | Global points leaderboard |
| GET | `/leaderboard/event/{id}` | Event-specific leaderboard |
| GET | `/leaderboard/user/{username}` | User's point stats by username |

---

### Protected Endpoints (Authentication Required)

Include header: `Authorization: Bearer YOUR_TOKEN`

#### Current User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user` | Get authenticated user info |
| POST | `/logout` | Logout and revoke token |

#### Email Verification
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/email/resend` | Resend verification email |
| GET | `/email/check` | Check email verification status |

#### Profile Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` | Get full profile details |
| PUT | `/profile` | Update profile (name, username, bio) |
| PUT | `/profile/password` | Change password |
| POST | `/profile/avatar` | Upload avatar image |
| DELETE | `/profile/avatar` | Remove avatar |
| DELETE | `/profile` | Delete account (requires password) |

#### Feed
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/feed` | Get personalized feed from followed users |

#### Posts (Authenticated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/posts` | Create new post |
| PUT | `/posts/{id}` | Update own post |
| DELETE | `/posts/{id}` | Delete own post |
| POST | `/posts/{id}/like` | Like a post |
| DELETE | `/posts/{id}/like` | Unlike a post |

#### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/posts/{id}/comments` | Add comment to post |
| PUT | `/comments/{id}` | Update own comment |
| DELETE | `/comments/{id}` | Delete own comment |
| POST | `/comments/{id}/like` | Like a comment |
| DELETE | `/comments/{id}/like` | Unlike a comment |

#### Events (Authenticated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/events` | Create new event |
| PUT | `/events/{id}` | Update own event |
| DELETE | `/events/{id}` | Delete/cancel own event |
| GET | `/my-events` | List events I created |
| GET | `/my-registrations` | List events I registered for |
| POST | `/events/{id}/register` | Register for an event |
| DELETE | `/events/{id}/register` | Cancel event registration |
| POST | `/events/{id}/results` | Set event results (organizer only) |

#### Activities
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/activities` | List my activities |
| POST | `/activities` | Create completed activity |
| GET | `/activities/{id}` | Get activity details |
| PUT | `/activities/{id}` | Update activity |
| DELETE | `/activities/{id}` | Delete activity |
| GET | `/activities/{id}/track` | Get GPS track data |
| POST | `/activities/{id}/share` | Share activity as post |
| POST | `/activities/import` | Import GPX file |

#### Activity Social
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/activities/{id}/like` | Like an activity |
| DELETE | `/activities/{id}/like` | Unlike an activity |
| GET | `/activities/{id}/comments` | Get activity comments |
| POST | `/activities/{id}/comments` | Add comment to activity |

#### Live Activity Tracking
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/activities/current` | Get current active activity (if any) |
| POST | `/activities/start` | Start new live activity |
| POST | `/activities/{id}/points` | Add GPS points batch |
| POST | `/activities/{id}/pause` | Pause active activity |
| POST | `/activities/{id}/resume` | Resume paused activity |
| POST | `/activities/{id}/finish` | Finish and save activity |
| DELETE | `/activities/{id}/discard` | Discard/cancel activity |

#### Photos
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/posts/{id}/photos` | Upload photo to post |
| POST | `/activities/{id}/photos` | Upload photo to activity |
| DELETE | `/photos/{id}` | Delete photo |

#### Social (Follows)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users/{id}/follow` | Follow a user |
| DELETE | `/users/{id}/follow` | Unfollow a user |
| GET | `/users/{id}/follow-status` | Check follow relationship |

#### Statistics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats` | Get user summary stats |
| GET | `/stats/activities` | Get detailed activity statistics |
| GET | `/stats/weekly` | Get current week statistics |

#### Leaderboard (Authenticated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/leaderboard/following` | Leaderboard for users you follow |
| GET | `/leaderboard/me` | Your point statistics |
| GET | `/leaderboard/history` | Your point transaction history |

#### Sport Types (Admin Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sport-types` | Create sport type |
| PUT | `/sport-types/{id}` | Update sport type |
| DELETE | `/sport-types/{id}` | Delete sport type |

---

### Admin Endpoints

Require authentication + admin role. Prefix: `/admin`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/stats` | Dashboard statistics |
| GET | `/admin/users` | List all users |
| GET | `/admin/users/{id}` | Get user details |
| POST | `/admin/users/{id}/ban` | Ban user |
| POST | `/admin/users/{id}/unban` | Unban user |
| PATCH | `/admin/users/{id}/role` | Change user role |
| DELETE | `/admin/users/{id}` | Delete user |
| GET | `/admin/posts` | List all posts |
| GET | `/admin/posts/{id}` | Get post details |
| DELETE | `/admin/posts/{id}` | Delete post |
| GET | `/admin/events` | List all events |
| GET | `/admin/events/{id}` | Get event details |
| PATCH | `/admin/events/{id}/status` | Update event status |
| PATCH | `/admin/events/{id}/slug` | Update event friendly URL |
| GET | `/admin/events/check-slug` | Check slug availability |
| DELETE | `/admin/events/{id}` | Delete event |

---

## Network Configuration

The API runs via **Laravel Sail (Docker)** on port **8080**.

### API Base URLs by Platform

| Platform | API Base URL |
|----------|--------------|
| Android Emulator | `http://10.0.2.2:8080/api` |
| iOS Simulator | `http://localhost:8080/api` |
| Physical Device / Expo Go | `http://YOUR_LOCAL_IP:8080/api` |

### Connecting to Local API from React Native

```typescript
// config/api.ts

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Your computer's local IP address (find with: ip addr show | grep "inet ")
const LOCAL_IP = '10.27.198.154';

// API Base URL configuration
const getBaseUrl = (): string => {
  if (__DEV__) {
    // Development - API runs on port 8080 via Laravel Sail/Docker
    if (Platform.OS === 'android') {
      // Android Emulator uses 10.0.2.2 to access host machine's localhost
      return 'http://10.0.2.2:8080/api';
    } else if (Platform.OS === 'ios') {
      // iOS Simulator can use localhost directly
      return 'http://localhost:8080/api';
    }
    // Physical device / Expo Go - use your computer's local IP
    return `http://${LOCAL_IP}:8080/api`;
  }
  // Production
  return 'https://api.racefy.app/api';
};

export const API_BASE_URL = getBaseUrl();
```

### For Physical Device / Expo Go Testing

1. Ensure your phone is on the **same WiFi network** as your computer
2. Find your computer's local IP:
   ```bash
   # Linux
   ip addr show | grep "inet " | grep -v 127.0.0.1

   # macOS
   ifconfig | grep "inet " | grep -v 127.0.0.1

   # Windows
   ipconfig
   ```
3. Update the `LOCAL_IP` constant in `config/api.ts`
4. The API should be accessible at `http://YOUR_IP:8080/api`

### Docker/Sail Services

| Service | Port | Description |
|---------|------|-------------|
| Laravel API | 8080 | Main API (mapped from container port 80) |
| MySQL | 3306 | Database |
| Redis | 6379 | Cache/Queue |

### Starting the API

```bash
# Start all services
./vendor/bin/sail up -d

# Check status
./vendor/bin/sail ps

# View logs
./vendor/bin/sail logs -f

# Reset database with test data
./vendor/bin/sail artisan migrate:fresh --seed
```

---

## TypeScript Interfaces

```typescript
// types/api.ts

// ============ USER & AUTH ============

export interface User {
  id: number;
  name: string;
  username: string;  // URL-safe handle (e.g., "john_doe")
  email: string;
  email_verified_at: string | null;
  avatar: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile extends User {
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_following?: boolean;  // Only when viewing other users
}

export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: 'Bearer';
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ============ SPORT TYPES ============

export interface SportType {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  is_active: boolean;
}

// ============ POSTS ============

export interface Post {
  id: number;
  user_id: number;
  type: 'general' | 'event' | 'activity';
  title: string | null;
  content: string;
  visibility: 'public' | 'followers' | 'private';
  status: 'draft' | 'published';
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  user?: User;
  photos?: Photo[];
  event?: Event;
  activity?: Activity;
  is_liked?: boolean;
}

export interface CreatePostRequest {
  title?: string;
  content: string;
  visibility?: 'public' | 'followers' | 'private';
  status?: 'draft' | 'published';
}

// ============ EVENTS ============

export interface Event {
  id: number;
  post_id: number;
  sport_type_id: number;
  location_name: string;
  latitude: number;
  longitude: number;
  starts_at: string;
  ends_at: string;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  max_participants: number | null;
  participants_count: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
  distance: number | null; // meters
  entry_fee: number | null;
  slug: string | null; // Friendly URL slug (e.g., "city-marathon-2025")
  slug_expires_at: string | null; // When the slug becomes available for other events
  friendly_url: string | null; // Full friendly URL path (e.g., "/events/@city-marathon-2025")
  sport_type?: SportType;
  post?: Post;
  is_registered?: boolean;
  available_spots?: number | null;
}

export interface CreateEventRequest {
  title: string;
  content: string;
  sport_type_id: number;
  location_name: string;
  latitude: number;
  longitude: number;
  starts_at: string; // ISO 8601
  ends_at: string;
  registration_opens_at?: string;
  registration_closes_at?: string;
  max_participants?: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
  distance?: number;
  entry_fee?: number;
}

export interface EventRegistration {
  id: number;
  event_id: number;
  user_id: number;
  status: 'registered' | 'waitlisted' | 'cancelled' | 'attended';
  registration_number: number;
  notes: string | null;
  registered_at: string;
  event?: Event;
  user?: User;
}

// ============ ACTIVITIES ============

export interface Activity {
  id: number;
  user_id: number;
  post_id: number | null;
  sport_type_id: number;
  event_id: number | null;
  title: string;
  description: string | null;
  started_at: string;
  ended_at: string | null;
  duration: number; // seconds
  distance: number; // meters
  elevation_gain: number | null;
  calories: number | null;
  avg_speed: number | null; // m/s
  max_speed: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  source: 'app' | 'garmin' | 'amazfit' | 'strava' | 'gpx_import' | 'manual';
  is_private: boolean;
  // Live tracking fields
  status: 'in_progress' | 'paused' | 'completed';
  is_active: boolean;
  total_paused_duration: number; // seconds
  last_point_at: string | null;
  // Social fields
  likes_count: number;
  comments_count: number;
  is_liked?: boolean; // Present when authenticated
  sport_type?: SportType;
  gps_track?: GpsTrack;
  photos?: Photo[];
  user?: User;
  // Computed
  formatted_duration?: string;
  formatted_distance?: string;
  pace?: number;
}

export interface CreateActivityRequest {
  sport_type_id: number;
  title: string;
  description?: string;
  started_at: string;
  ended_at: string;
  duration: number;
  distance: number;
  elevation_gain?: number;
  calories?: number;
  avg_speed?: number;
  max_speed?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  source: 'app' | 'manual';
  is_private?: boolean;
  // GPS track data (GeoJSON)
  track_data?: GeoJSONLineString;
}

export interface GpsTrack {
  id: number;
  activity_id: number;
  track_data: GeoJSONLineString;
  points_count: number;
  bounds: {
    min_lat: number;
    max_lat: number;
    min_lng: number;
    max_lng: number;
  };
  simplified_track: GeoJSONLineString;
}

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: [number, number][]; // [longitude, latitude][]
}

// GPS Point for live tracking
export interface GpsPoint {
  lat: number;           // Required: latitude (-90 to 90)
  lng: number;           // Required: longitude (-180 to 180)
  ele?: number;          // Optional: elevation in meters
  time?: string;         // Optional: ISO 8601 timestamp
  hr?: number;           // Optional: heart rate (0-300)
  speed?: number;        // Optional: speed in m/s
  cadence?: number;      // Optional: cadence (steps/min or rpm)
}

// ============ COMMENTS ============

export interface Comment {
  id: number;
  user_id: number;
  commentable_type: 'post' | 'activity'; // Polymorphic type
  commentable_id: number;
  parent_id: number | null;
  content: string;
  likes_count: number;
  created_at: string;
  user?: User;
  replies?: Comment[];
  is_liked?: boolean;
}

export interface CreateCommentRequest {
  content: string;
  parent_id?: number;
}

// ============ PHOTOS ============

export interface Photo {
  id: number;
  user_id: number;
  path: string;
  filename: string;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  caption: string | null;
  url: string; // Full URL to image
}

// ============ FOLLOWS ============

export interface FollowStatus {
  is_following: boolean;
  is_followed_by: boolean;
}

export interface UserWithFollowCounts extends User {
  followers_count: number;
  following_count: number;
}

// ============ STATISTICS ============

export interface UserStats {
  activities: {
    total: number;
    this_month: number;
    total_distance: number;
    total_duration: number;
  };
  posts: {
    total: number;
    total_likes: number;
  };
  events: {
    registered: number;
    attended: number;
  };
  social: {
    followers: number;
    following: number;
  };
}

export interface ActivityStats {
  count: number;
  totals: {
    distance: number;
    duration: number;
    elevation_gain: number;
    calories: number;
  };
  averages: {
    distance: number;
    duration: number;
    speed: number;
    heart_rate: number;
  };
  bests: {
    longest_distance: ActivityBest | null;
    longest_duration: ActivityBest | null;
    fastest_speed: ActivityBest | null;
  };
  by_sport_type: Record<number, {
    count: number;
    distance: number;
    duration: number;
  }>;
}

export interface ActivityBest {
  id: number;
  title: string;
  distance?: number;
  duration?: number;
  max_speed?: number;
  date: string;
}

export interface WeeklyStats {
  week_start: string;
  week_end: string;
  totals: {
    count: number;
    distance: number;
    duration: number;
  };
  daily: Record<string, {
    count: number;
    distance: number;
    duration: number;
  }>;
}

// ============ POINTS & LEADERBOARD ============

export interface LeaderboardEntry {
  rank: number;
  points: number;
  user: {
    id: number;
    name: string;
    username: string;
    avatar_url: string | null;
  };
}

export interface LeaderboardResponse {
  period: 'weekly' | 'monthly' | 'all_time';
  leaderboard: LeaderboardEntry[];
}

export interface EventLeaderboardResponse {
  event_id: number;
  leaderboard: LeaderboardEntry[];
}

export interface UserPointStats {
  total_points: number;
  weekly_points: number;
  monthly_points: number;
  global_rank: number;
  weekly_rank: number;
  monthly_rank: number;
  total_transactions: number;
  activity_points: number;
  event_points: number;
}

export interface PointTransaction {
  id: number;
  points: number;
  type: 'activity' | 'event_place' | 'event_finish' | 'bonus' | 'adjustment';
  description: string;
  created_at: string;
}

export interface PointHistoryResponse {
  transactions: PointTransaction[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface EventPointRewards {
  first_place: number | null;
  second_place: number | null;
  third_place: number | null;
  finisher: number | null;
}

export interface SetEventResultsRequest {
  results: Array<{
    user_id: number;
    place: number;  // 1, 2, 3 for podium, 0 for finisher
  }>;
}

// ============ PAGINATION ============

export interface PaginatedResponse<T> {
  data: T[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    path: string;
    per_page: number;
    to: number;
    total: number;
  };
}

// ============ API RESPONSE ============

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
```

---

## API Service Class

```typescript
// services/api.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import type * as Types from '../types/api';

const TOKEN_KEY = '@racefy_token';

class ApiService {
  private token: string | null = null;

  async init() {
    this.token = await AsyncStorage.getItem(TOKEN_KEY);
  }

  // ============ HEALTH CHECK ============

  async healthCheck(): Promise<{ status: string; timestamp: string; service: string }> {
    return this.request('/health');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Language': 'en', // or 'pl' for Polish
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw data as Types.ApiError;
    }

    return data;
  }

  private async setToken(token: string) {
    this.token = token;
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }

  async clearToken() {
    this.token = null;
    await AsyncStorage.removeItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  // ============ AUTH ============

  async register(data: Types.RegisterRequest): Promise<Types.AuthResponse> {
    const response = await this.request<Types.AuthResponse>('/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await this.setToken(response.access_token);
    return response;
  }

  async login(data: Types.LoginRequest): Promise<Types.AuthResponse> {
    const response = await this.request<Types.AuthResponse>('/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await this.setToken(response.access_token);
    return response;
  }

  async logout(): Promise<void> {
    await this.request('/logout', { method: 'POST' });
    await this.clearToken();
  }

  async getUser(): Promise<Types.User> {
    const response = await this.request<Types.ApiResponse<Types.User>>('/user');
    return response.data;
  }

  // ============ SPORT TYPES ============

  async getSportTypes(): Promise<Types.SportType[]> {
    const response = await this.request<Types.ApiResponse<Types.SportType[]>>('/sport-types');
    return response.data;
  }

  // ============ FEED & POSTS ============

  async getFeed(page = 1): Promise<Types.PaginatedResponse<Types.Post>> {
    return this.request(`/feed?page=${page}`);
  }

  async getPosts(page = 1): Promise<Types.PaginatedResponse<Types.Post>> {
    return this.request(`/posts?page=${page}`);
  }

  async getPost(id: number): Promise<Types.Post> {
    const response = await this.request<Types.ApiResponse<Types.Post>>(`/posts/${id}`);
    return response.data;
  }

  async createPost(data: Types.CreatePostRequest): Promise<Types.Post> {
    const response = await this.request<Types.ApiResponse<Types.Post>>('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async updatePost(id: number, data: Partial<Types.CreatePostRequest>): Promise<Types.Post> {
    const response = await this.request<Types.ApiResponse<Types.Post>>(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async deletePost(id: number): Promise<void> {
    await this.request(`/posts/${id}`, { method: 'DELETE' });
  }

  async likePost(id: number): Promise<void> {
    await this.request(`/posts/${id}/like`, { method: 'POST' });
  }

  async unlikePost(id: number): Promise<void> {
    await this.request(`/posts/${id}/like`, { method: 'DELETE' });
  }

  // ============ COMMENTS ============

  async getComments(postId: number): Promise<Types.Comment[]> {
    const response = await this.request<Types.ApiResponse<Types.Comment[]>>(
      `/posts/${postId}/comments`
    );
    return response.data;
  }

  async createComment(postId: number, data: Types.CreateCommentRequest): Promise<Types.Comment> {
    const response = await this.request<Types.ApiResponse<Types.Comment>>(
      `/posts/${postId}/comments`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  async deleteComment(id: number): Promise<void> {
    await this.request(`/comments/${id}`, { method: 'DELETE' });
  }

  async likeComment(id: number): Promise<void> {
    await this.request(`/comments/${id}/like`, { method: 'POST' });
  }

  async unlikeComment(id: number): Promise<void> {
    await this.request(`/comments/${id}/like`, { method: 'DELETE' });
  }

  // ============ EVENTS ============

  async getEvents(params?: {
    status?: 'upcoming' | 'ongoing' | 'completed';
    sport_type_id?: number;
    page?: number;
  }): Promise<Types.PaginatedResponse<Types.Event>> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.sport_type_id) query.append('sport_type_id', String(params.sport_type_id));
    if (params?.page) query.append('page', String(params.page));
    return this.request(`/events?${query}`);
  }

  async getEvent(id: number): Promise<Types.Event> {
    const response = await this.request<Types.ApiResponse<Types.Event>>(`/events/${id}`);
    return response.data;
  }

  async getEventBySlug(slug: string): Promise<Types.Event> {
    const response = await this.request<Types.ApiResponse<Types.Event>>(`/events/slug/${slug}`);
    return response.data;
  }

  async createEvent(data: Types.CreateEventRequest): Promise<Types.Event> {
    const response = await this.request<Types.ApiResponse<Types.Event>>('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async registerForEvent(eventId: number): Promise<Types.EventRegistration> {
    const response = await this.request<Types.ApiResponse<Types.EventRegistration>>(
      `/events/${eventId}/register`,
      { method: 'POST' }
    );
    return response.data;
  }

  async cancelEventRegistration(eventId: number): Promise<void> {
    await this.request(`/events/${eventId}/register`, { method: 'DELETE' });
  }

  async getMyEvents(): Promise<Types.Event[]> {
    const response = await this.request<Types.ApiResponse<Types.Event[]>>('/my-events');
    return response.data;
  }

  async getMyRegistrations(): Promise<Types.EventRegistration[]> {
    const response = await this.request<Types.ApiResponse<Types.EventRegistration[]>>(
      '/my-registrations'
    );
    return response.data;
  }

  // ============ ACTIVITIES ============

  async getActivities(params?: {
    sport_type_id?: number;
    page?: number;
  }): Promise<Types.PaginatedResponse<Types.Activity>> {
    const query = new URLSearchParams();
    if (params?.sport_type_id) query.append('sport_type_id', String(params.sport_type_id));
    if (params?.page) query.append('page', String(params.page));
    return this.request(`/activities?${query}`);
  }

  async getActivity(id: number): Promise<Types.Activity> {
    const response = await this.request<Types.ApiResponse<Types.Activity>>(`/activities/${id}`);
    return response.data;
  }

  async createActivity(data: Types.CreateActivityRequest): Promise<Types.Activity> {
    const response = await this.request<Types.ApiResponse<Types.Activity>>('/activities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async updateActivity(
    id: number,
    data: Partial<Types.CreateActivityRequest>
  ): Promise<Types.Activity> {
    const response = await this.request<Types.ApiResponse<Types.Activity>>(`/activities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async deleteActivity(id: number): Promise<void> {
    await this.request(`/activities/${id}`, { method: 'DELETE' });
  }

  // ============ ACTIVITY SOCIAL ============

  async likeActivity(id: number): Promise<void> {
    await this.request(`/activities/${id}/like`, { method: 'POST' });
  }

  async unlikeActivity(id: number): Promise<void> {
    await this.request(`/activities/${id}/like`, { method: 'DELETE' });
  }

  async getActivityComments(activityId: number): Promise<Types.Comment[]> {
    const response = await this.request<Types.ApiResponse<Types.Comment[]>>(
      `/activities/${activityId}/comments`
    );
    return response.data;
  }

  async createActivityComment(activityId: number, data: Types.CreateCommentRequest): Promise<Types.Comment> {
    const response = await this.request<Types.ApiResponse<Types.Comment>>(
      `/activities/${activityId}/comments`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  async getActivityTrack(id: number): Promise<Types.GpsTrack> {
    const response = await this.request<Types.ApiResponse<Types.GpsTrack>>(
      `/activities/${id}/track`
    );
    return response.data;
  }

  async shareActivity(id: number): Promise<Types.Post> {
    const response = await this.request<Types.ApiResponse<Types.Post>>(
      `/activities/${id}/share`,
      { method: 'POST' }
    );
    return response.data;
  }

  async importGpx(file: FormData): Promise<Types.Activity> {
    const response = await fetch(`${API_BASE_URL}/activities/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/json',
      },
      body: file,
    });
    const data = await response.json();
    if (!response.ok) throw data;
    return data.data;
  }

  // ============ LIVE ACTIVITY TRACKING ============

  /**
   * Get current active activity (if any)
   */
  async getCurrentActivity(): Promise<Types.Activity | null> {
    const response = await this.request<{ data: Types.Activity | null }>('/activities/current');
    return response.data;
  }

  /**
   * Start a new live activity
   */
  async startActivity(data: {
    sport_type_id: number;
    title?: string;
    started_at?: string;
  }): Promise<Types.Activity> {
    const response = await this.request<Types.ApiResponse<Types.Activity>>('/activities/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  /**
   * Add GPS points to an active activity
   */
  async addActivityPoints(activityId: number, points: Types.GpsPoint[]): Promise<{
    points_count: number;
    total_points: number;
    stats: { distance: number; duration: number; elevation_gain: number };
  }> {
    const response = await this.request<any>(`/activities/${activityId}/points`, {
      method: 'POST',
      body: JSON.stringify({ points }),
    });
    return response;
  }

  /**
   * Pause an active activity
   */
  async pauseActivity(activityId: number): Promise<Types.Activity> {
    const response = await this.request<Types.ApiResponse<Types.Activity>>(
      `/activities/${activityId}/pause`,
      { method: 'POST' }
    );
    return response.data;
  }

  /**
   * Resume a paused activity
   */
  async resumeActivity(activityId: number): Promise<Types.Activity> {
    const response = await this.request<Types.ApiResponse<Types.Activity>>(
      `/activities/${activityId}/resume`,
      { method: 'POST' }
    );
    return response.data;
  }

  /**
   * Finish an active activity
   */
  async finishActivity(activityId: number, data?: {
    title?: string;
    description?: string;
    ended_at?: string;
    calories?: number;
    avg_heart_rate?: number;
    max_heart_rate?: number;
  }): Promise<Types.Activity> {
    const response = await this.request<Types.ApiResponse<Types.Activity>>(
      `/activities/${activityId}/finish`,
      {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }
    );
    return response.data;
  }

  /**
   * Discard/cancel an active activity
   */
  async discardActivity(activityId: number): Promise<void> {
    await this.request(`/activities/${activityId}/discard`, { method: 'DELETE' });
  }

  // ============ PHOTOS ============

  async uploadPostPhoto(postId: number, formData: FormData): Promise<Types.Photo> {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/photos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/json',
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw data;
    return data.data;
  }

  async uploadActivityPhoto(activityId: number, formData: FormData): Promise<Types.Photo> {
    const response = await fetch(`${API_BASE_URL}/activities/${activityId}/photos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/json',
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw data;
    return data.data;
  }

  async deletePhoto(id: number): Promise<void> {
    await this.request(`/photos/${id}`, { method: 'DELETE' });
  }

  // ============ FOLLOWS ============

  async followUser(userId: number): Promise<void> {
    await this.request(`/users/${userId}/follow`, { method: 'POST' });
  }

  async unfollowUser(userId: number): Promise<void> {
    await this.request(`/users/${userId}/follow`, { method: 'DELETE' });
  }

  async getFollowStatus(userId: number): Promise<Types.FollowStatus> {
    const response = await this.request<Types.ApiResponse<Types.FollowStatus>>(
      `/users/${userId}/follow-status`
    );
    return response.data;
  }

  async getFollowers(userId: number): Promise<Types.User[]> {
    const response = await this.request<Types.ApiResponse<Types.User[]>>(
      `/users/${userId}/followers`
    );
    return response.data;
  }

  async getFollowing(userId: number): Promise<Types.User[]> {
    const response = await this.request<Types.ApiResponse<Types.User[]>>(
      `/users/${userId}/following`
    );
    return response.data;
  }

  async getUserByUsername(username: string): Promise<Types.UserProfile> {
    const response = await this.request<Types.ApiResponse<Types.UserProfile>>(
      `/users/username/${username}`
    );
    return response.data;
  }

  async getUserActivities(userId: number, page = 1): Promise<Types.PaginatedResponse<Types.Activity>> {
    return this.request(`/users/${userId}/activities?page=${page}`);
  }

  // ============ STATISTICS ============

  async getStats(): Promise<Types.UserStats> {
    const response = await this.request<Types.ApiResponse<Types.UserStats>>('/stats');
    return response.data;
  }

  async getActivityStats(params?: {
    from?: string;
    to?: string;
    sport_type_id?: number;
  }): Promise<Types.ActivityStats> {
    const query = new URLSearchParams();
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    if (params?.sport_type_id) query.append('sport_type_id', String(params.sport_type_id));
    const response = await this.request<Types.ApiResponse<Types.ActivityStats>>(
      `/stats/activities?${query}`
    );
    return response.data;
  }

  async getWeeklyStats(sportTypeId?: number): Promise<Types.WeeklyStats> {
    const query = sportTypeId ? `?sport_type_id=${sportTypeId}` : '';
    const response = await this.request<Types.ApiResponse<Types.WeeklyStats>>(
      `/stats/weekly${query}`
    );
    return response.data;
  }

  // ============ POINTS & LEADERBOARD ============

  async getGlobalLeaderboard(period: 'weekly' | 'monthly' | 'all_time' = 'all_time', limit = 50, offset = 0): Promise<Types.LeaderboardResponse> {
    return this.request(`/leaderboard/global?period=${period}&limit=${limit}&offset=${offset}`);
  }

  async getFollowingLeaderboard(period: 'weekly' | 'monthly' | 'all_time' = 'all_time', limit = 50): Promise<Types.LeaderboardResponse> {
    return this.request(`/leaderboard/following?period=${period}&limit=${limit}`);
  }

  async getEventLeaderboard(eventId: number, limit = 50): Promise<Types.EventLeaderboardResponse> {
    return this.request(`/leaderboard/event/${eventId}?limit=${limit}`);
  }

  async getMyPointStats(): Promise<Types.UserPointStats> {
    return this.request('/leaderboard/me');
  }

  async getUserPointStats(username: string): Promise<{ user: Types.User; stats: Types.UserPointStats }> {
    return this.request(`/leaderboard/user/${username}`);
  }

  async getPointHistory(params?: {
    type?: 'activity' | 'event_place' | 'event_finish' | 'bonus' | 'adjustment';
    limit?: number;
    page?: number;
  }): Promise<Types.PointHistoryResponse> {
    const query = new URLSearchParams();
    if (params?.type) query.append('type', params.type);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.page) query.append('page', String(params.page));
    return this.request(`/leaderboard/history?${query}`);
  }

  async getEventPointRewards(eventId: number): Promise<Types.EventPointRewards> {
    return this.request(`/events/${eventId}/point-rewards`);
  }

  async setEventResults(eventId: number, results: Types.SetEventResultsRequest): Promise<{
    message: string;
    awarded: Array<{
      user_id: number;
      username: string;
      place: number;
      points: number;
    }>;
  }> {
    return this.request(`/events/${eventId}/results`, {
      method: 'POST',
      body: JSON.stringify(results),
    });
  }

  // ============ PROFILE ============

  async getProfile(): Promise<Types.User> {
    const response = await this.request<Types.ApiResponse<Types.User>>('/profile');
    return response.data;
  }

  async updateProfile(data: {
    name?: string;
    username?: string;  // URL-safe, lowercase, underscores allowed
    email?: string;
  }): Promise<Types.User> {
    const response = await this.request<Types.ApiResponse<Types.User>>('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async updatePassword(data: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }): Promise<void> {
    await this.request('/profile/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async uploadAvatar(formData: FormData): Promise<{ avatar: string }> {
    const response = await fetch(`${API_BASE_URL}/profile/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/json',
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw data;
    return data;
  }

  async deleteAvatar(): Promise<void> {
    await this.request('/profile/avatar', { method: 'DELETE' });
  }

  async deleteAccount(password: string): Promise<void> {
    await this.request('/profile', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
    await this.clearToken();
  }
}

export const api = new ApiService();
```

---

## React Native App Structure

```
src/
├── config/
│   └── api.ts              # API configuration
├── types/
│   └── api.ts              # TypeScript interfaces
├── services/
│   └── api.ts              # API service class
├── hooks/
│   ├── useAuth.ts          # Authentication hook
│   ├── useFeed.ts          # Feed data hook
│   ├── useActivities.ts    # Activities hook
│   └── useEvents.ts        # Events hook
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   └── RegisterScreen.tsx
│   ├── main/
│   │   ├── FeedScreen.tsx
│   │   ├── EventsScreen.tsx
│   │   ├── ActivitiesScreen.tsx
│   │   └── ProfileScreen.tsx
│   └── details/
│       ├── PostDetailScreen.tsx
│       ├── EventDetailScreen.tsx
│       └── ActivityDetailScreen.tsx
├── components/
│   ├── PostCard.tsx
│   ├── EventCard.tsx
│   ├── ActivityCard.tsx
│   ├── CommentList.tsx
│   └── MapView.tsx         # For GPS tracks
├── navigation/
│   └── AppNavigator.tsx
└── App.tsx
```

---

## Required React Native Packages

```bash
# Navigation
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context

# Storage
npm install @react-native-async-storage/async-storage

# Maps (for GPS tracks)
npm install react-native-maps

# Image picker (for photos)
npm install react-native-image-picker

# Location tracking
npm install react-native-geolocation-service
# or
npm install @react-native-community/geolocation

# Date handling
npm install date-fns

# Forms
npm install react-hook-form

# State management (optional)
npm install zustand
# or
npm install @tanstack/react-query
```

---

## Example Hooks

```typescript
// hooks/useAuth.ts
import { useState, useEffect, createContext, useContext } from 'react';
import { api } from '../services/api';
import type { User, LoginRequest, RegisterRequest } from '../types/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initAuth();
  }, []);

  async function initAuth() {
    try {
      await api.init();
      if (api.isAuthenticated()) {
        const userData = await api.getUser();
        setUser(userData);
      }
    } catch (error) {
      await api.clearToken();
    } finally {
      setIsLoading(false);
    }
  }

  async function login(data: LoginRequest) {
    const response = await api.login(data);
    setUser(response.user);
  }

  async function register(data: RegisterRequest) {
    const response = await api.register(data);
    setUser(response.user);
  }

  async function logout() {
    await api.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

```typescript
// hooks/useFeed.ts
import { useState, useCallback } from 'react';
import { api } from '../services/api';
import type { Post } from '../types/api';

export function useFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchFeed = useCallback(async (reset = false) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const currentPage = reset ? 1 : page;
      const response = await api.getFeed(currentPage);
      
      setPosts(prev => reset ? response.data : [...prev, ...response.data]);
      setHasMore(response.meta.current_page < response.meta.last_page);
      setPage(currentPage + 1);
    } finally {
      setIsLoading(false);
    }
  }, [page, isLoading]);

  const refresh = () => fetchFeed(true);
  const loadMore = () => hasMore && fetchFeed(false);

  const likePost = async (postId: number) => {
    await api.likePost(postId);
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, likes_count: p.likes_count + 1, is_liked: true }
          : p
      )
    );
  };

  const unlikePost = async (postId: number) => {
    await api.unlikePost(postId);
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, likes_count: p.likes_count - 1, is_liked: false }
          : p
      )
    );
  };

  return {
    posts,
    isLoading,
    hasMore,
    refresh,
    loadMore,
    likePost,
    unlikePost,
  };
}
```

---

## GPS Tracking Example

```typescript
// services/tracking.ts
import Geolocation from 'react-native-geolocation-service';
import type { GeoJSONLineString } from '../types/api';

interface TrackPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed?: number;
}

class TrackingService {
  private watchId: number | null = null;
  private points: TrackPoint[] = [];
  private startTime: number = 0;

  start(onPoint: (point: TrackPoint) => void): void {
    this.points = [];
    this.startTime = Date.now();

    this.watchId = Geolocation.watchPosition(
      (position) => {
        const point: TrackPoint = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: position.timestamp,
          speed: position.coords.speed ?? undefined,
        };
        this.points.push(point);
        onPoint(point);
      },
      (error) => console.error('GPS Error:', error),
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // meters
        interval: 5000, // ms
        fastestInterval: 2000,
      }
    );
  }

  stop(): { trackData: GeoJSONLineString; duration: number; distance: number } {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    const trackData: GeoJSONLineString = {
      type: 'LineString',
      coordinates: this.points.map(p => [p.longitude, p.latitude]),
    };

    const duration = Math.round((Date.now() - this.startTime) / 1000);
    const distance = this.calculateDistance();

    return { trackData, duration, distance };
  }

  private calculateDistance(): number {
    let total = 0;
    for (let i = 1; i < this.points.length; i++) {
      total += this.haversine(
        this.points[i - 1].latitude,
        this.points[i - 1].longitude,
        this.points[i].latitude,
        this.points[i].longitude
      );
    }
    return Math.round(total);
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export const tracking = new TrackingService();
```

---

## Live Activity Tracking Hook

This hook integrates with the API for real-time activity tracking with server sync:

```typescript
// hooks/useLiveActivity.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import Geolocation from 'react-native-geolocation-service';
import { api } from '../services/api';
import type { Activity, GpsPoint } from '../types/api';

interface LiveActivityState {
  activity: Activity | null;
  isTracking: boolean;
  isPaused: boolean;
  currentStats: {
    distance: number;
    duration: number;
    elevation_gain: number;
  };
}

export function useLiveActivity() {
  const [state, setState] = useState<LiveActivityState>({
    activity: null,
    isTracking: false,
    isPaused: false,
    currentStats: { distance: 0, duration: 0, elevation_gain: 0 },
  });

  const watchId = useRef<number | null>(null);
  const pointsBuffer = useRef<GpsPoint[]>([]);
  const syncInterval = useRef<NodeJS.Timeout | null>(null);

  // Check for existing active activity on mount
  useEffect(() => {
    checkExistingActivity();
  }, []);

  const checkExistingActivity = async () => {
    try {
      const activity = await api.getCurrentActivity();
      if (activity) {
        setState(prev => ({
          ...prev,
          activity,
          isTracking: activity.status === 'in_progress',
          isPaused: activity.status === 'paused',
          currentStats: {
            distance: activity.distance,
            duration: activity.duration,
            elevation_gain: activity.elevation_gain || 0,
          },
        }));
      }
    } catch (error) {
      console.error('Failed to check existing activity:', error);
    }
  };

  const startTracking = useCallback(async (sportTypeId: number, title?: string) => {
    try {
      // Start activity on server
      const activity = await api.startActivity({
        sport_type_id: sportTypeId,
        title,
        started_at: new Date().toISOString(),
      });

      setState(prev => ({
        ...prev,
        activity,
        isTracking: true,
        isPaused: false,
      }));

      // Start GPS tracking
      watchId.current = Geolocation.watchPosition(
        (position) => {
          const point: GpsPoint = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            ele: position.coords.altitude ?? undefined,
            time: new Date(position.timestamp).toISOString(),
            speed: position.coords.speed ?? undefined,
          };
          pointsBuffer.current.push(point);
        },
        (error) => console.error('GPS Error:', error),
        {
          enableHighAccuracy: true,
          distanceFilter: 10,
          interval: 5000,
          fastestInterval: 2000,
        }
      );

      // Sync points to server every 30 seconds
      syncInterval.current = setInterval(() => syncPoints(activity.id), 30000);

      return activity;
    } catch (error) {
      console.error('Failed to start activity:', error);
      throw error;
    }
  }, []);

  const syncPoints = async (activityId: number) => {
    if (pointsBuffer.current.length === 0) return;

    const pointsToSync = [...pointsBuffer.current];
    pointsBuffer.current = [];

    try {
      const result = await api.addActivityPoints(activityId, pointsToSync);
      setState(prev => ({
        ...prev,
        currentStats: result.stats,
      }));
    } catch (error) {
      // Re-add points on failure
      pointsBuffer.current = [...pointsToSync, ...pointsBuffer.current];
      console.error('Failed to sync points:', error);
    }
  };

  const pauseTracking = useCallback(async () => {
    if (!state.activity) return;

    try {
      // Stop GPS
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }

      // Sync remaining points
      await syncPoints(state.activity.id);

      // Pause on server
      const activity = await api.pauseActivity(state.activity.id);

      setState(prev => ({
        ...prev,
        activity,
        isTracking: false,
        isPaused: true,
      }));
    } catch (error) {
      console.error('Failed to pause activity:', error);
      throw error;
    }
  }, [state.activity]);

  const resumeTracking = useCallback(async () => {
    if (!state.activity) return;

    try {
      const activity = await api.resumeActivity(state.activity.id);

      // Restart GPS
      watchId.current = Geolocation.watchPosition(
        (position) => {
          const point: GpsPoint = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            ele: position.coords.altitude ?? undefined,
            time: new Date(position.timestamp).toISOString(),
            speed: position.coords.speed ?? undefined,
          };
          pointsBuffer.current.push(point);
        },
        (error) => console.error('GPS Error:', error),
        {
          enableHighAccuracy: true,
          distanceFilter: 10,
          interval: 5000,
          fastestInterval: 2000,
        }
      );

      // Restart sync interval
      syncInterval.current = setInterval(() => syncPoints(activity.id), 30000);

      setState(prev => ({
        ...prev,
        activity,
        isTracking: true,
        isPaused: false,
      }));
    } catch (error) {
      console.error('Failed to resume activity:', error);
      throw error;
    }
  }, [state.activity]);

  const finishTracking = useCallback(async (data?: {
    title?: string;
    description?: string;
    calories?: number;
  }) => {
    if (!state.activity) return;

    try {
      // Stop GPS
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }

      // Clear sync interval
      if (syncInterval.current) {
        clearInterval(syncInterval.current);
        syncInterval.current = null;
      }

      // Sync remaining points
      await syncPoints(state.activity.id);

      // Finish on server
      const activity = await api.finishActivity(state.activity.id, {
        ...data,
        ended_at: new Date().toISOString(),
      });

      setState({
        activity: null,
        isTracking: false,
        isPaused: false,
        currentStats: { distance: 0, duration: 0, elevation_gain: 0 },
      });

      return activity;
    } catch (error) {
      console.error('Failed to finish activity:', error);
      throw error;
    }
  }, [state.activity]);

  const discardTracking = useCallback(async () => {
    if (!state.activity) return;

    try {
      // Stop everything
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      if (syncInterval.current) {
        clearInterval(syncInterval.current);
        syncInterval.current = null;
      }

      await api.discardActivity(state.activity.id);

      setState({
        activity: null,
        isTracking: false,
        isPaused: false,
        currentStats: { distance: 0, duration: 0, elevation_gain: 0 },
      });
    } catch (error) {
      console.error('Failed to discard activity:', error);
      throw error;
    }
  }, [state.activity]);

  return {
    ...state,
    startTracking,
    pauseTracking,
    resumeTracking,
    finishTracking,
    discardTracking,
  };
}
```

### Live Tracking Flow

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
│     └── Calculates final stats, sets status='completed'     │
│                                                             │
│  DISCARD (Cancel without saving)                            │
│     DELETE /api/activities/{id}/discard                     │
│     └── Deletes the activity entirely                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Social Sharing

Share posts and activities to social media using React Native's built-in Share API:

```typescript
// utils/share.ts
import { Share, Platform } from 'react-native';

const APP_URL = 'https://racefy.app'; // Your production URL

interface ShareContent {
  title?: string;
  message: string;
  url: string;
}

export async function sharePost(postId: number, content: string, title?: string) {
  const url = `${APP_URL}/posts/${postId}`;
  const message = title || content.substring(0, 100);

  return shareContent({
    title: title || 'Racefy Post',
    message,
    url,
  });
}

export async function shareActivity(activityId: number, title: string, stats: {
  distance: number;
  duration: number;
}) {
  const url = `${APP_URL}/activities/${activityId}`;
  const distanceKm = (stats.distance / 1000).toFixed(2);
  const durationMins = Math.floor(stats.duration / 60);

  const message = `${title} - ${distanceKm} km in ${durationMins} min`;

  return shareContent({
    title,
    message,
    url,
  });
}

export async function shareEvent(eventId: number, title: string, date: string) {
  const url = `${APP_URL}/events/${eventId}`;
  const formattedDate = new Date(date).toLocaleDateString();

  return shareContent({
    title,
    message: `${title} - ${formattedDate}`,
    url,
  });
}

export async function shareProfile(username: string, name: string) {
  const url = `${APP_URL}/@${username}`;

  return shareContent({
    title: name,
    message: `Check out ${name}'s profile on Racefy`,
    url,
  });
}

async function shareContent({ title, message, url }: ShareContent) {
  try {
    const result = await Share.share(
      Platform.OS === 'ios'
        ? { message: `${message}\n${url}` }
        : { title, message: `${message}\n${url}` },
      { dialogTitle: 'Share' }
    );

    if (result.action === Share.sharedAction) {
      return { shared: true, activityType: result.activityType };
    }
    return { shared: false };
  } catch (error) {
    console.error('Share failed:', error);
    throw error;
  }
}
```

### Usage Example

```typescript
// In a PostCard component
import { sharePost } from '../utils/share';

function PostCard({ post }: { post: Post }) {
  const handleShare = async () => {
    try {
      const result = await sharePost(post.id, post.content, post.title);
      if (result.shared) {
        // Optionally track share analytics
        console.log('Shared via:', result.activityType);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not share post');
    }
  };

  return (
    <TouchableOpacity onPress={handleShare}>
      <ShareIcon />
    </TouchableOpacity>
  );
}
```

### Supported Platforms

The React Native Share API opens the native share sheet which supports:

| Platform | Supported Apps |
|----------|---------------|
| **iOS** | Twitter, Facebook, Instagram Stories, WhatsApp, Telegram, Messages, Mail, Copy Link, etc. |
| **Android** | Twitter, Facebook, WhatsApp, Telegram, Gmail, Copy to Clipboard, etc. |

---

## Points & Leaderboard System

Users earn points for completing activities and placing in events. Points are tracked across three time periods:
- **All Time** - Total accumulated points
- **Monthly** - Points earned this calendar month (resets on 1st)
- **Weekly** - Points earned this week (resets on Monday)

### How Points Are Earned

#### Activity Points
Points are calculated based on distance and sport type configuration:

```
points = (distance_km * points_per_km) + (elevation_gain_100m * points_per_100m_elevation)
```

Default sport type configurations:
| Sport | Points/km | Points/100m elevation |
|-------|-----------|----------------------|
| Running | 10 | 5 |
| Cycling | 5 | 5 |
| Swimming | 20 | 0 |

#### Event Points
Event organizers can configure custom point rewards:
- **1st Place** - Custom points for winner
- **2nd Place** - Custom points for runner-up
- **3rd Place** - Custom points for third place
- **Finisher** - Points for all who complete the event

### API Endpoints

#### Public Endpoints (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/leaderboard/global` | Global leaderboard |
| GET | `/leaderboard/event/{eventId}` | Event-specific leaderboard |
| GET | `/leaderboard/user/{username}` | User's point stats by username |
| GET | `/events/{eventId}/point-rewards` | Event's point reward configuration |

#### Protected Endpoints (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/leaderboard/following` | Leaderboard for users you follow |
| GET | `/leaderboard/me` | Your point statistics |
| GET | `/leaderboard/history` | Your point transaction history |
| POST | `/events/{eventId}/results` | Set event results & award points (organizer only) |

### Query Parameters

**Leaderboard endpoints:**
- `period`: `weekly`, `monthly`, or `all_time` (default: `all_time`)
- `limit`: Number of results (default: 50, max: 100)
- `offset`: Skip first N results (for pagination)

**History endpoint:**
- `type`: Filter by transaction type (`activity`, `event_place`, `event_finish`, `bonus`, `adjustment`)
- `limit`: Number of results per page (default: 20, max: 100)
- `page`: Page number

### Leaderboard Hook

```typescript
// hooks/useLeaderboard.ts
import { useState, useCallback } from 'react';
import { api } from '../services/api';
import type { LeaderboardEntry, UserPointStats } from '../types/api';

type Period = 'weekly' | 'monthly' | 'all_time';
type Tab = 'global' | 'following';

export function useLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myStats, setMyStats] = useState<UserPointStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [period, setPeriod] = useState<Period>('all_time');
  const [tab, setTab] = useState<Tab>('global');

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = tab === 'global'
        ? await api.getGlobalLeaderboard(period)
        : await api.getFollowingLeaderboard(period);

      setLeaderboard(response.leaderboard);

      // Also fetch user's own stats
      const stats = await api.getMyPointStats();
      setMyStats(stats);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tab, period]);

  return {
    leaderboard,
    myStats,
    isLoading,
    period,
    setPeriod,
    tab,
    setTab,
    refresh: fetchLeaderboard,
  };
}
```

### Creating Events with Point Rewards

When creating or updating events, include `point_rewards`:

```typescript
const event = await api.createEvent({
  title: 'City Marathon 2025',
  content: 'Annual city marathon event',
  sport_type_id: 1,
  location_name: 'City Center',
  latitude: 52.2297,
  longitude: 21.0122,
  starts_at: '2025-06-15T08:00:00Z',
  ends_at: '2025-06-15T16:00:00Z',
  difficulty: 'intermediate',
  // Point rewards configuration
  point_rewards: {
    first_place: 500,
    second_place: 300,
    third_place: 150,
    finisher: 50,
  },
});
```

### Setting Event Results (Organizer)

After an event ends, the organizer can set results to award points:

```typescript
const result = await api.setEventResults(eventId, {
  results: [
    { user_id: 123, place: 1 },  // 1st place
    { user_id: 456, place: 2 },  // 2nd place
    { user_id: 789, place: 3 },  // 3rd place
    { user_id: 101, place: 0 },  // Finisher
    { user_id: 102, place: 0 },  // Finisher
  ],
});

// Response:
// {
//   message: 'Results set successfully',
//   awarded: [
//     { user_id: 123, username: 'winner', place: 1, points: 500 },
//     { user_id: 456, username: 'second', place: 2, points: 300 },
//     ...
//   ]
// }
```

### User Profile Points

User profiles now include point totals:

```typescript
interface UserProfile {
  // ... existing fields
  total_points: number;
  weekly_points: number;
  monthly_points: number;
}
```

---

## Test Credentials

```
Email: test@racefy.test
Username: @test_user
Password: password

Email: demo@racefy.test
Username: @demo_user
Password: password

Email: admin@racefy.test
Username: @admin_user
Password: password
```

Profile URLs follow the format: `/@username` (e.g., `/@test_user`)

---

## Quick Start Checklist

1. [ ] Start Laravel API: `./vendor/bin/sail up -d`
2. [ ] Run migrations: `./vendor/bin/sail artisan migrate:fresh --seed`
3. [ ] Create React Native project: `npx react-native init RacefyApp --template react-native-template-typescript`
4. [ ] Install required packages
5. [ ] Copy types and services from this file
6. [ ] Configure API base URL for your platform
7. [ ] Test login with test credentials
8. [ ] Build your screens!
