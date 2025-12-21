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
  ended_at: string;
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
  sport_type?: SportType;
  gps_track?: GpsTrack;
  photos?: Photo[];
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

// ============ COMMENTS ============

export interface Comment {
  id: number;
  user_id: number;
  post_id: number;
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
