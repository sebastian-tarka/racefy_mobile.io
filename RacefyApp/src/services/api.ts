import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { getCurrentLanguage } from '../i18n';
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
      Accept: 'application/json',
      'Accept-Language': getCurrentLanguage(),
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] =
        `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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

  getToken(): string | null {
    return this.token;
  }

  getBaseUrl(): string {
    return API_BASE_URL;
  }

  // ============ HEALTH CHECK ============

  /**
   * Check if API is reachable
   * Returns { connected: true, latency: number } on success
   * Returns { connected: false, error: string } on failure
   */
  async checkHealth(): Promise<{
    connected: boolean;
    latency?: number;
    error?: string;
    service?: string;
  }> {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        return {
          connected: data.status === 'ok',
          latency,
          service: data.service,
        };
      }
      return { connected: false, error: `Server returned ${response.status}` };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('aborted')) {
        return { connected: false, error: 'Connection timeout' };
      }
      return { connected: false, error: errorMessage };
    }
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
    const response = await this.request<any>('/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    console.log('Login response:', JSON.stringify(response, null, 2));

    // Handle both { user, access_token } and { data: { user, access_token } }
    const authData = response.data || response;
    const token = authData.access_token || authData.token;

    if (!token) {
      throw new Error('No access token in response');
    }

    await this.setToken(token);
    return { user: authData.user, access_token: token, token_type: 'Bearer' };
  }

  async logout(): Promise<void> {
    try {
      await this.request('/logout', { method: 'POST' });
    } finally {
      await this.clearToken();
    }
  }

  async getUser(): Promise<Types.User> {
    const response =
      await this.request<Types.ApiResponse<Types.User>>('/user');
    return response.data;
  }

  // ============ SPORT TYPES ============

  async getSportTypes(): Promise<Types.SportType[]> {
    const response =
      await this.request<Types.ApiResponse<Types.SportType[]>>('/sport-types');
    return response.data;
  }

  // ============ FEED & POSTS ============

  async getFeed(page = 1): Promise<Types.PaginatedResponse<Types.Post>> {
    return this.request(`/feed?page=${page}`);
  }

  async getPosts(params?: {
    user_id?: number;
    page?: number;
  }): Promise<Types.PaginatedResponse<Types.Post>> {
    const query = new URLSearchParams();
    if (params?.user_id) query.append('user_id', String(params.user_id));
    if (params?.page) query.append('page', String(params.page));
    return this.request(`/posts?${query}`);
  }

  async getPost(id: number): Promise<Types.Post> {
    const response =
      await this.request<Types.ApiResponse<Types.Post>>(`/posts/${id}`);
    return response.data;
  }

  async createPost(data: Types.CreatePostRequest): Promise<Types.Post> {
    const response = await this.request<Types.ApiResponse<Types.Post>>(
      '/posts',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  async updatePost(
    id: number,
    data: Partial<Types.CreatePostRequest>
  ): Promise<Types.Post> {
    const response = await this.request<Types.ApiResponse<Types.Post>>(
      `/posts/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
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

  async createComment(
    postId: number,
    data: Types.CreateCommentRequest
  ): Promise<Types.Comment> {
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
    user_id?: number;
    status?: 'upcoming' | 'ongoing' | 'completed';
    sport_type_id?: number;
    page?: number;
    per_page?: number;
  }): Promise<Types.PaginatedResponse<Types.Event>> {
    const query = new URLSearchParams();
    if (params?.user_id) query.append('user_id', String(params.user_id));
    if (params?.status) query.append('status', params.status);
    if (params?.sport_type_id)
      query.append('sport_type_id', String(params.sport_type_id));
    if (params?.page) query.append('page', String(params.page));
    if (params?.per_page) query.append('per_page', String(params.per_page));
    return this.request(`/events?${query}`);
  }

  async getEvent(id: number): Promise<Types.Event> {
    const response =
      await this.request<Types.ApiResponse<Types.Event>>(`/events/${id}`);
    return response.data;
  }

  async createEvent(data: Types.CreateEventRequest): Promise<Types.Event> {
    const response = await this.request<Types.ApiResponse<Types.Event>>(
      '/events',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  async updateEvent(id: number, data: Types.UpdateEventRequest): Promise<Types.Event> {
    const response = await this.request<Types.ApiResponse<Types.Event>>(
      `/events/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  async registerForEvent(eventId: number): Promise<Types.EventRegistration> {
    const response = await this.request<
      Types.ApiResponse<Types.EventRegistration>
    >(`/events/${eventId}/register`, { method: 'POST' });
    return response.data;
  }

  async cancelEventRegistration(eventId: number): Promise<void> {
    await this.request(`/events/${eventId}/register`, { method: 'DELETE' });
  }

  async getEventParticipants(eventId: number): Promise<Types.EventRegistration[]> {
    const response = await this.request<
      Types.ApiResponse<Types.EventRegistration[]>
    >(`/events/${eventId}/participants`);
    return response.data;
  }

  async getMyEvents(): Promise<Types.Event[]> {
    const response =
      await this.request<Types.ApiResponse<Types.Event[]>>('/my-events');
    return response.data;
  }

  async getMyRegistrations(): Promise<Types.EventRegistration[]> {
    const response = await this.request<
      Types.ApiResponse<Types.EventRegistration[]>
    >('/my-registrations');
    return response.data;
  }

  async uploadEventCoverImage(
    eventId: number,
    imageUri: string
  ): Promise<Types.Event> {
    const formData = new FormData();

    // Get file extension from URI
    const uriParts = imageUri.split('.');
    const fileExtension = uriParts[uriParts.length - 1];
    const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';

    formData.append('cover_image', {
      uri: imageUri,
      type: mimeType,
      name: `cover.${fileExtension}`,
    } as any);

    const response = await fetch(`${API_BASE_URL}/events/${eventId}/cover-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
        // Don't set Content-Type - let fetch set it with boundary for multipart
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw data as Types.ApiError;
    }

    return data.data;
  }

  async deleteEventCoverImage(eventId: number): Promise<void> {
    await this.request(`/events/${eventId}/cover-image`, { method: 'DELETE' });
  }

  // ============ ACTIVITIES ============

  async getActivities(params?: {
    user_id?: number;
    sport_type_id?: number;
    page?: number;
  }): Promise<Types.PaginatedResponse<Types.Activity>> {
    const query = new URLSearchParams();
    if (params?.user_id) query.append('user_id', String(params.user_id));
    if (params?.sport_type_id)
      query.append('sport_type_id', String(params.sport_type_id));
    if (params?.page) query.append('page', String(params.page));
    return this.request(`/activities?${query}`);
  }

  async getActivity(id: number): Promise<Types.Activity> {
    const response = await this.request<Types.ApiResponse<Types.Activity>>(
      `/activities/${id}`
    );
    return response.data;
  }

  async createActivity(
    data: Types.CreateActivityRequest
  ): Promise<Types.Activity> {
    const response = await this.request<Types.ApiResponse<Types.Activity>>(
      '/activities',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  async updateActivity(
    id: number,
    data: Partial<Types.CreateActivityRequest>
  ): Promise<Types.Activity> {
    const response = await this.request<Types.ApiResponse<Types.Activity>>(
      `/activities/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
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

  // ============ LIVE ACTIVITY TRACKING ============

  /**
   * Get current active activity (if any)
   */
  async getCurrentActivity(): Promise<Types.Activity | null> {
    const response = await this.request<{ data: Types.Activity | null }>(
      '/activities/current'
    );
    return response.data;
  }

  /**
   * Start a new live activity
   */
  async startLiveActivity(data: {
    sport_type_id: number;
    title?: string;
    started_at?: string;
  }): Promise<Types.Activity> {
    const response = await this.request<Types.ApiResponse<Types.Activity>>(
      '/activities/start',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  /**
   * Add GPS points to an active activity
   * Optionally sync calories and heart rate for crash recovery
   */
  async addActivityPoints(
    activityId: number,
    points: Types.GpsPoint[],
    options?: {
      calories?: number;
      avg_heart_rate?: number;
      max_heart_rate?: number;
    }
  ): Promise<Types.AddActivityPointsResponse> {
    const body: Types.AddActivityPointsRequest = {
      points,
      ...options,
    };

    const response = await this.request<Types.AddActivityPointsResponse>(
      `/activities/${activityId}/points`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );
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
  async finishActivity(
    activityId: number,
    data?: {
      title?: string;
      description?: string;
      ended_at?: string;
      calories?: number;
      avg_heart_rate?: number;
      max_heart_rate?: number;
    }
  ): Promise<Types.Activity> {
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

  async importGpx(file: FormData): Promise<Types.Activity> {
    const response = await fetch(`${API_BASE_URL}/activities/import`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
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
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw data;
    return data.data;
  }

  async uploadActivityPhoto(
    activityId: number,
    formData: FormData
  ): Promise<Types.Photo> {
    const response = await fetch(
      `${API_BASE_URL}/activities/${activityId}/photos`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
        },
        body: formData,
      }
    );
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

  async getUserActivities(
    userId: number,
    page = 1
  ): Promise<Types.PaginatedResponse<Types.Activity>> {
    return this.request(`/users/${userId}/activities?page=${page}`);
  }

  async getUserPosts(
    userId: number,
    page = 1
  ): Promise<Types.PaginatedResponse<Types.Post>> {
    return this.request(`/users/${userId}/posts?page=${page}`);
  }

  // ============ STATISTICS ============

  async getStats(): Promise<Types.UserStats> {
    const response =
      await this.request<Types.ApiResponse<Types.UserStats>>('/stats');
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
    if (params?.sport_type_id)
      query.append('sport_type_id', String(params.sport_type_id));
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

  async getUserActivityStats(userId: number): Promise<Types.ActivityStats> {
    const response = await this.request<Types.ApiResponse<Types.ActivityStats>>(
      `/users/${userId}/stats/activities`
    );
    return response.data;
  }

  async getUserActiveActivityStats(userId: number): Promise<Types.ActivityStats> {
    const response = await this.request<Types.ApiResponse<Types.ActivityStats>>(
      `/users/${userId}/stats/activities/active`
    );
    return response.data;
  }

  // ============ POINTS & LEADERBOARD ============

  async getMyPointStats(): Promise<Types.UserPointStats> {
    const response = await this.request<Types.ApiResponse<Types.UserPointStats>>(
      '/leaderboard/me'
    );
    return response.data;
  }

  // ============ PROFILE ============

  async getProfile(): Promise<Types.User> {
    const response =
      await this.request<Types.ApiResponse<Types.User>>('/profile');
    return response.data;
  }

  async updateProfile(data: {
    name?: string;
    username?: string;
    email?: string;
    bio?: string;
  }): Promise<Types.User> {
    const response = await this.request<Types.ApiResponse<Types.User>>(
      '/profile',
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  async uploadAvatar(imageUri: string): Promise<Types.User> {
    const formData = new FormData();

    // Get file extension from URI
    const uriParts = imageUri.split('.');
    const fileExtension = uriParts[uriParts.length - 1];
    const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';

    formData.append('avatar', {
      uri: imageUri,
      type: mimeType,
      name: `avatar.${fileExtension}`,
    } as any);

    const response = await fetch(`${API_BASE_URL}/profile/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) throw data;
    return data.data;
  }

  async uploadBackgroundImage(imageUri: string): Promise<Types.User> {
    const formData = new FormData();

    const uriParts = imageUri.split('.');
    const fileExtension = uriParts[uriParts.length - 1];
    const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';

    formData.append('background_image', {
      uri: imageUri,
      type: mimeType,
      name: `background.${fileExtension}`,
    } as any);

    const response = await fetch(`${API_BASE_URL}/profile/background-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) throw data;
    return data.data;
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

  async deleteAccount(password: string): Promise<void> {
    await this.request('/profile', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
    await this.clearToken();
  }

  // ============ PREFERENCES ============

  async getPreferences(): Promise<Types.UserPreferences> {
    const response = await this.request<{ preferences: Types.UserPreferences }>(
      '/profile/preferences'
    );
    return response.preferences;
  }

  async updatePreferences(
    data: Partial<Types.UserPreferences> | Record<string, any>
  ): Promise<Types.UserPreferences> {
    const response = await this.request<{ preferences: Types.UserPreferences }>(
      '/profile/preferences',
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response.preferences;
  }

  // ============ MESSAGING ============

  async getConversations(
    page = 1
  ): Promise<Types.PaginatedResponse<Types.Conversation>> {
    return this.request(`/conversations?page=${page}`);
  }

  async startConversation(
    userId: number
  ): Promise<Types.ApiResponse<Types.Conversation>> {
    return this.request('/conversations', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async getConversation(id: number): Promise<Types.Conversation> {
    const response = await this.request<Types.ApiResponse<Types.Conversation>>(
      `/conversations/${id}`
    );
    return response.data;
  }

  async deleteConversation(id: number): Promise<void> {
    await this.request(`/conversations/${id}`, { method: 'DELETE' });
  }

  async getMessages(
    conversationId: number,
    page = 1
  ): Promise<Types.PaginatedResponse<Types.Message>> {
    return this.request(`/conversations/${conversationId}/messages?page=${page}`);
  }

  async sendMessage(
    conversationId: number,
    content: string
  ): Promise<Types.ApiResponse<Types.Message>> {
    return this.request(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, type: 'text' }),
    });
  }

  async markConversationAsRead(conversationId: number): Promise<void> {
    await this.request(`/conversations/${conversationId}/read`, {
      method: 'POST',
    });
  }

  async getUnreadCount(): Promise<number> {
    const response = await this.request<{ unread_count: number }>(
      '/conversations/unread-count'
    );
    return response.unread_count;
  }
}

export const api = new ApiService();
