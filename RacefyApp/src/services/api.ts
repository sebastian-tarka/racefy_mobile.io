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
      Accept: 'application/json',
      'Accept-Language': 'en',
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

  async getPosts(page = 1): Promise<Types.PaginatedResponse<Types.Post>> {
    return this.request(`/posts?page=${page}`);
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
    status?: 'upcoming' | 'ongoing' | 'completed';
    sport_type_id?: number;
    page?: number;
  }): Promise<Types.PaginatedResponse<Types.Event>> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.sport_type_id)
      query.append('sport_type_id', String(params.sport_type_id));
    if (params?.page) query.append('page', String(params.page));
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

  async registerForEvent(eventId: number): Promise<Types.EventRegistration> {
    const response = await this.request<
      Types.ApiResponse<Types.EventRegistration>
    >(`/events/${eventId}/register`, { method: 'POST' });
    return response.data;
  }

  async cancelEventRegistration(eventId: number): Promise<void> {
    await this.request(`/events/${eventId}/register`, { method: 'DELETE' });
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

  // ============ ACTIVITIES ============

  async getActivities(params?: {
    sport_type_id?: number;
    page?: number;
  }): Promise<Types.PaginatedResponse<Types.Activity>> {
    const query = new URLSearchParams();
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
}

export const api = new ApiService();
