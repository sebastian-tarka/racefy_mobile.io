import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, XDEBUG_ENABLED } from '../config/api';
import { getCurrentLanguage } from '../i18n';
import { logger } from './logger';
import { secureStorage } from './secureStorage';
import type * as Types from '../types/api';

/**
 * Append Xdebug trigger to URL when debugging is enabled
 * Used for all API requests to enable PHP debugging in dev mode
 */
export const appendXdebugTrigger = (url: string): string => {
  if (!XDEBUG_ENABLED) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}XDEBUG_TRIGGER=PHPSTORM`;
};

class ApiService {
  private token: string | null = null;
  private onUnauthorizedCallback: (() => void) | null = null;

  async init() {
    // First, migrate any legacy tokens to secure storage
    await secureStorage.migrateLegacyTokens();
    // Then load the token from secure storage
    this.token = await secureStorage.getToken();
    logger.debug('auth', 'API service initialized', { hasToken: !!this.token });
  }

  /**
   * Set callback to be invoked when a 401 Unauthorized response is received.
   * This allows the app to trigger re-authentication flow.
   */
  setOnUnauthorized(callback: () => void) {
    this.onUnauthorizedCallback = callback;
  }

  /**
   * Build full API URL with Xdebug trigger automatically appended
   */
  private buildUrl(endpoint: string): string {
    return appendXdebugTrigger(`${API_BASE_URL}${endpoint}`);
  }

  /**
   * Universal API request method. Handles both JSON and FormData requests.
   * - Auto-detects FormData and skips Content-Type (browser sets it with boundary)
   * - Adds Authorization, Accept, Accept-Language headers
   * - Appends Xdebug trigger when enabled
   * - Parses JSON response and throws on error
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const method = options.method || 'GET';
    const startTime = Date.now();
    const isFormData = options.body instanceof FormData;

    // Log request start (skip logging for debug/logs endpoint to avoid infinite loop)
    const shouldLog = !endpoint.includes('/debug/logs');
    if (shouldLog) {
      logger.api(`${method} ${endpoint}`, {
        hasBody: !!options.body,
        isFormData,
      });
    }

    const headers: HeadersInit = {
      Accept: 'application/json',
      'Accept-Language': getCurrentLanguage(),
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(this.buildUrl(endpoint), {
        ...options,
        headers,
      });

      const duration = Date.now() - startTime;
      const data = await response.json();

      if (!response.ok) {
        if (shouldLog) {
          logger.error('api', `${method} ${endpoint} failed`, {
            status: response.status,
            duration,
            error: (data as Types.ApiError).message,
          });
        }

        // Handle 401 Unauthorized - token expired or invalid
        if (response.status === 401) {
          logger.warn('auth', 'Received 401 Unauthorized, clearing token', { endpoint });
          await this.clearToken();
          if (this.onUnauthorizedCallback) {
            this.onUnauthorizedCallback();
          }
        }

        throw data as Types.ApiError;
      }

      if (shouldLog) {
        logger.debug('api', `${method} ${endpoint} completed`, {
          status: response.status,
          duration,
        });
      }

      return data;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      if (shouldLog && !error.message) {
        // Network error (not API error)
        logger.error('api', `${method} ${endpoint} network error`, {
          duration,
          error: error.toString(),
        });
      }
      throw error;
    }
  }

  async setToken(token: string) {
    this.token = token;
    await secureStorage.setToken(token);
  }

  async clearToken() {
    this.token = null;
    await secureStorage.clearToken();
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
    logger.auth('Login response received', { response });

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

  // ============ DRAFTS ============

  async getDrafts(params?: {
    page?: number;
    per_page?: number;
  }): Promise<Types.DraftsResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.per_page) query.append('per_page', String(params.per_page));
    const queryString = query.toString();
    return this.request(`/posts/drafts${queryString ? `?${queryString}` : ''}`);
  }

  async publishDraft(postId: number): Promise<Types.Post> {
    return this.updatePost(postId, { status: 'published' });
  }

  async deleteDraft(postId: number): Promise<void> {
    return this.deletePost(postId);
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
    // Use FormData if photo is included
    if (data.photo) {
      const formData = new FormData();
      formData.append('content', data.content);
      if (data.parent_id) {
        formData.append('parent_id', String(data.parent_id));
      }

      const filename = data.photo.uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';

      formData.append('photo', {
        uri: data.photo.uri,
        name: filename,
        type: mimeType,
      } as any);

      const result = await this.request<Types.ApiResponse<Types.Comment>>(
        `/posts/${postId}/comments`,
        { method: 'POST', body: formData }
      );
      return result.data;
    }

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

  async updateComment(
    id: number,
    content: string,
    photo?: Types.MediaItem
  ): Promise<Types.Comment> {
    // Use FormData if photo is included (replaces existing photos)
    if (photo) {
      const formData = new FormData();
      formData.append('content', content);

      const filename = photo.uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';

      formData.append('photo', {
        uri: photo.uri,
        name: filename,
        type: mimeType,
      } as any);

      const result = await this.request<Types.ApiResponse<Types.Comment>>(
        `/comments/${id}`,
        { method: 'PUT', body: formData }
      );
      return result.data;
    }

    const response = await this.request<Types.ApiResponse<Types.Comment>>(
      `/comments/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify({ content }),
      }
    );
    return response.data;
  }

  async addCommentPhoto(commentId: number, photo: Types.MediaItem): Promise<Types.Photo> {
    const formData = new FormData();

    const filename = photo.uri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1].toLowerCase() : 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';

    formData.append('photo', {
      uri: photo.uri,
      name: filename,
      type: mimeType,
    } as any);

    const result = await this.request<Types.ApiResponse<Types.Photo>>(
      `/comments/${commentId}/photos`,
      { method: 'POST', body: formData }
    );
    return result.data;
  }

  async deleteCommentPhoto(commentId: number, photoId: number): Promise<void> {
    await this.request(`/comments/${commentId}/photos/${photoId}`, { method: 'DELETE' });
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

  async getEventRankingModes(): Promise<Types.RankingModeOption[]> {
    const response =
        await this.request<Types.ApiResponse<Types.RankingModeOption[]>>('/events/ranking-modes');

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

  async deleteEvent(id: number): Promise<void> {
    await this.request(`/events/${id}`, { method: 'DELETE' });
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

  async getEventActivities(eventId: number): Promise<Types.Activity[]> {
    const response = await this.request<
      Types.ApiResponse<Types.Activity[]>
    >(`/events/${eventId}/activities`);
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

  async getMyOngoingEvents(): Promise<Types.Event[]> {
    const response = await this.request<Types.ApiResponse<Types.Event[]>>(
      '/my-registrations/ongoing-events'
    );
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

    const result = await this.request<Types.ApiResponse<Types.Event>>(
      `/events/${eventId}/cover-image`,
      { method: 'POST', body: formData }
    );
    return result.data;
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

  async getActivitiesFeed(params?: {
    page?: number;
    per_page?: number;
  }): Promise<Types.PaginatedResponse<Types.Activity>> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.per_page) query.append('per_page', String(params.per_page));
    const queryString = query.toString();
    return this.request(`/activities/feed${queryString ? `?${queryString}` : ''}`);
  }

  async getActivitiesDiscover(params?: {
    page?: number;
    per_page?: number;
  }): Promise<Types.PaginatedResponse<Types.Activity>> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.per_page) query.append('per_page', String(params.per_page));
    const queryString = query.toString();
    return this.request(`/activities/discover${queryString ? `?${queryString}` : ''}`);
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

  async updateActivityGpsPrivacy(
    id: number,
    showStartFinishPoints: boolean
  ): Promise<Types.Activity> {
    const response = await this.request<Types.ApiResponse<Types.Activity>>(
      `/activities/${id}/gps-privacy`,
      {
        method: 'PATCH',
        body: JSON.stringify({ show_start_finish_points: showStartFinishPoints }),
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

  async getActivityTrackPoints(id: number): Promise<Types.TrackPointsResponse> {
    // Note: This endpoint returns data directly, not wrapped in ApiResponse
    const response = await this.request<Types.TrackPointsResponse>(
      `/activities/${id}/track-points`
    );
    return response;
  }

  async getActivityAnalysis(id: number): Promise<Types.ActivityStats> {
    const response = await this.request<Types.ApiResponse<Types.ActivityStats>>(
      `/activities/${id}/stats`
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
   * @param event_id - Optional event ID to link activity to (event must be ongoing, user must be registered)
   * @param gps_profile - Optional GPS tracking settings used by the mobile app
   */
  async startLiveActivity(data: {
    sport_type_id: number;
    title?: string;
    started_at?: string;
    event_id?: number;
    gps_profile?: Types.GpsProfileRequest;
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
   * Returns activity data plus optional auto-created post info
   */
  async finishActivity(
    activityId: number,
    data?: Types.FinishActivityRequest
  ): Promise<Types.FinishActivityResponse> {
    const response = await this.request<Types.FinishActivityResponse>(
      `/activities/${activityId}/finish`,
      {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }
    );
    return response;
  }

  /**
   * Discard/cancel an active activity
   */
  async discardActivity(activityId: number): Promise<void> {
    await this.request(`/activities/${activityId}/discard`, { method: 'DELETE' });
  }

  /**
   * Import a GPX file as an activity
   * FormData should contain:
   * - file: GPX file
   * - sport_type_id: Sport type ID
   * - event_id (optional): Event ID to link activity to (event must be ongoing, user must be registered)
   */
  async importGpx(file: FormData): Promise<Types.Activity> {
    const result = await this.request<Types.ApiResponse<Types.Activity>>(
      '/activities/import',
      { method: 'POST', body: file }
    );
    return result.data;
  }

  // ============ PHOTOS ============

  async uploadPostPhoto(postId: number, formData: FormData): Promise<Types.Photo> {
    const result = await this.request<Types.ApiResponse<Types.Photo>>(
      `/posts/${postId}/photos`,
      { method: 'POST', body: formData }
    );
    return result.data;
  }

  async uploadPostMedia(postId: number, mediaItem: Types.MediaItem): Promise<Types.Media> {
    const formData = new FormData();

    // Get file extension and determine mime type
    const filename = mediaItem.uri.split('/').pop() || 'file';
    const match = /\.(\w+)$/.exec(filename);
    let mimeType = 'application/octet-stream';

    if (match) {
      const ext = match[1].toLowerCase();
      if (mediaItem.type === 'video') {
        if (ext === 'mp4') mimeType = 'video/mp4';
        else if (ext === 'mov') mimeType = 'video/quicktime';
        else if (ext === 'avi') mimeType = 'video/x-msvideo';
        else if (ext === 'webm') mimeType = 'video/webm';
        else mimeType = 'video/mp4';
      } else {
        if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'gif') mimeType = 'image/gif';
        else if (ext === 'heic' || ext === 'heif') mimeType = 'image/heic';
        else mimeType = 'image/jpeg';
      }
    }

    // Use correct field name based on media type
    const fieldName = mediaItem.type === 'video' ? 'video' : 'photo';
    formData.append(fieldName, {
      uri: mediaItem.uri,
      name: filename,
      type: mimeType,
    } as any);

    if (mediaItem.duration) {
      formData.append('duration', String(mediaItem.duration));
    }

    // Use separate endpoints for photos and videos
    const mediaEndpoint = mediaItem.type === 'video' ? 'videos' : 'photos';
    const result = await this.request<Types.ApiResponse<Types.Media>>(
      `/posts/${postId}/${mediaEndpoint}`,
      { method: 'POST', body: formData }
    );
    return result.data;
  }

  async uploadActivityPhoto(
    activityId: number,
    formData: FormData
  ): Promise<Types.Photo> {
    const result = await this.request<Types.ApiResponse<Types.Photo>>(
      `/activities/${activityId}/photos`,
      { method: 'POST', body: formData }
    );
    return result.data;
  }

  async deletePhoto(id: number): Promise<void> {
    await this.request(`/photos/${id}`, { method: 'DELETE' });
  }

  async deleteVideo(id: number): Promise<void> {
    await this.request(`/videos/${id}`, { method: 'DELETE' });
  }

  async deletePostMedia(mediaId: number, mediaType: 'image' | 'video'): Promise<void> {
    const endpoint = mediaType === 'video' ? 'videos' : 'photos';
    await this.request(`/${endpoint}/${mediaId}`, { method: 'DELETE' });
  }

  // ============ ACTIVITY BOOSTS ============

  async boostActivity(activityId: number): Promise<Types.BoostResponse> {
    const response = await this.request<Types.BoostResponse>(
      `/activities/${activityId}/boost`,
      { method: 'POST' }
    );
    return response;
  }

  async unboostActivity(activityId: number): Promise<Types.BoostResponse> {
    const response = await this.request<Types.BoostResponse>(
      `/activities/${activityId}/boost`,
      { method: 'DELETE' }
    );
    return response;
  }

  // ============ ACTIVITY LIKES ============

  async likeActivity(id: number): Promise<void> {
    await this.request(`/activities/${id}/like`, { method: 'POST' });
  }

  async unlikeActivity(id: number): Promise<void> {
    await this.request(`/activities/${id}/like`, { method: 'DELETE' });
  }

  // ============ ACTIVITY COMMENTS ============

  async getActivityComments(activityId: number): Promise<Types.Comment[]> {
    const response = await this.request<Types.ApiResponse<Types.Comment[]>>(
      `/activities/${activityId}/comments`
    );
    return response.data;
  }

  async createActivityComment(
    activityId: number,
    data: Types.CreateCommentRequest
  ): Promise<Types.Comment> {
    // Use FormData if photo is included
    if (data.photo) {
      const formData = new FormData();
      formData.append('content', data.content);
      if (data.parent_id) {
        formData.append('parent_id', String(data.parent_id));
      }

      const filename = data.photo.uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';

      formData.append('photo', {
        uri: data.photo.uri,
        name: filename,
        type: mimeType,
      } as any);

      const result = await this.request<Types.ApiResponse<Types.Comment>>(
        `/activities/${activityId}/comments`,
        { method: 'POST', body: formData }
      );
      return result.data;
    }

    const response = await this.request<Types.ApiResponse<Types.Comment>>(
      `/activities/${activityId}/comments`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  // ============ EVENT COMMENTS ============

  async getEventComments(eventId: number): Promise<Types.Comment[]> {
    const response = await this.request<Types.ApiResponse<Types.Comment[]>>(
      `/events/${eventId}/comments`
    );
    return response.data;
  }

  async createEventComment(
    eventId: number,
    data: Types.CreateCommentRequest
  ): Promise<Types.Comment> {
    // Use FormData if photo is included
    if (data.photo) {
      const formData = new FormData();
      formData.append('content', data.content);
      if (data.parent_id) {
        formData.append('parent_id', String(data.parent_id));
      }

      const filename = data.photo.uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';

      formData.append('photo', {
        uri: data.photo.uri,
        name: filename,
        type: mimeType,
      } as any);

      const result = await this.request<Types.ApiResponse<Types.Comment>>(
        `/events/${eventId}/comments`,
        { method: 'POST', body: formData }
      );
      return result.data;
    }

    const response = await this.request<Types.ApiResponse<Types.Comment>>(
      `/events/${eventId}/comments`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
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

  // ============ USER BLOCKING ============

  async blockUser(userId: number): Promise<void> {
    await this.request(`/users/${userId}/block`, { method: 'POST' });
  }

  async unblockUser(userId: number): Promise<void> {
    await this.request(`/users/${userId}/block`, { method: 'DELETE' });
  }

  async getBlockedUsers(params?: {
    page?: number;
    per_page?: number;
  }): Promise<Types.BlockedUsersResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.per_page) query.append('per_page', String(params.per_page));
    const queryString = query.toString();
    return this.request<Types.BlockedUsersResponse>(
      `/blocks${queryString ? `?${queryString}` : ''}`
    );
  }

  async getBlockStatus(userId: number): Promise<Types.BlockStatus> {
    const response = await this.request<Types.ApiResponse<Types.BlockStatus>>(
      `/users/${userId}/block-status`
    );
    return response.data;
  }

  // ============ CONTENT REPORTING ============

  async createReport(data: Types.CreateReportRequest): Promise<Types.ReportResponse> {
    const response = await this.request<Types.ReportResponse>(
      '/reports',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response;
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

  async getMilestones(sportTypeId?: number): Promise<Types.MilestonesData> {
    const query = sportTypeId ? `?sport_type_id=${sportTypeId}` : '';
    const response = await this.request<Types.ApiResponse<Types.MilestonesData>>(
      `/stats/milestones${query}`
    );
    return response.data;
  }

  async getUserMilestones(userId: number, sportTypeId?: number): Promise<Types.MilestonesData> {
    const query = sportTypeId ? `?sport_type_id=${sportTypeId}` : '';
    const response = await this.request<Types.ApiResponse<Types.MilestonesData>>(
      `/users/${userId}/stats/milestones${query}`
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
    return this.request<Types.UserPointStats>('/leaderboard/me');
  }

  /**
   * Get global leaderboard (public, no auth required)
   */
  async getGlobalLeaderboard(
    period: Types.LeaderboardPeriod = 'all_time',
    limit = 50,
    offset = 0
  ): Promise<Types.LeaderboardResponse> {
    const query = new URLSearchParams();
    query.append('period', period);
    query.append('limit', String(limit));
    query.append('offset', String(offset));
    return this.request<Types.LeaderboardResponse>(`/leaderboard/global?${query}`);
  }

  /**
   * Get leaderboard for followed users (auth required)
   */
  async getFollowingLeaderboard(
    period: Types.LeaderboardPeriod = 'all_time',
    limit = 50
  ): Promise<Types.LeaderboardResponse> {
    const query = new URLSearchParams();
    query.append('period', period);
    query.append('limit', String(limit));
    return this.request<Types.LeaderboardResponse>(`/leaderboard/following?${query}`);
  }

  /**
   * Get event leaderboard (public, no auth required)
   */
  async getEventLeaderboard(eventId: number, limit = 50): Promise<Types.EventLeaderboardResponse> {
    const query = new URLSearchParams();
    query.append('limit', String(limit));
    return this.request<Types.EventLeaderboardResponse>(`/leaderboard/event/${eventId}?${query}`);
  }

  /**
   * Get user's point stats by username (public, no auth required)
   */
  async getUserPointStats(username: string): Promise<Types.UserStatsResponse> {
    return this.request<Types.UserStatsResponse>(`/leaderboard/user/${username}`);
  }

  /**
   * Get current user's point transaction history (auth required)
   */
  async getPointHistory(
    page = 1,
    limit = 20,
    type?: Types.PointTransactionType
  ): Promise<Types.PointHistoryResponse> {
    const query = new URLSearchParams();
    query.append('page', String(page));
    query.append('limit', String(limit));
    if (type) {
      query.append('type', type);
    }
    return this.request<Types.PointHistoryResponse>(`/leaderboard/history?${query}`);
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

    const result = await this.request<Types.ApiResponse<Types.User>>(
      '/profile/avatar',
      { method: 'POST', body: formData }
    );
    return result.data;
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

    const result = await this.request<Types.ApiResponse<Types.User>>(
      '/profile/background-image',
      { method: 'POST', body: formData }
    );
    return result.data;
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

  // ============ AI FEATURES ============

  /**
   * Check if current user has access to AI features
   */
  async getAiFeatures(): Promise<Types.AiFeaturesResponse> {
    return this.request<Types.AiFeaturesResponse>('/profile/ai-features');
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

  // ============ DEBUG LOGS ============

  /**
   * Send debug logs to server for analysis
   * Used during development to help diagnose issues
   */
  async sendDebugLogs(
    payload: Types.DebugLogsRequest
  ): Promise<Types.DebugLogsResponse> {
    const response = await this.request<Types.DebugLogsResponse>(
      '/debug/logs',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return response;
  }

  // ============ BRAND ASSETS (PUBLIC) ============

  /**
   * Get all brand assets organized by category and variant
   * No authentication required
   */
  async getBrandAssets(): Promise<Types.BrandAssetsResponse> {
    return this.request<Types.BrandAssetsResponse>('/brand-assets');
  }

  /**
   * Get a specific brand asset by category and optional variant
   * No authentication required
   * @param category - logo-full, logo-icon, or logo-text
   * @param variant - default, dark, or light (optional, defaults to 'default')
   */
  async getBrandAsset(
    category: Types.BrandAssetCategory,
    variant?: Types.BrandAssetVariant
  ): Promise<Types.BrandAsset> {
    const endpoint = variant
      ? `/brand-assets/${category}/${variant}`
      : `/brand-assets/${category}`;
    const response = await this.request<Types.BrandAssetResponse>(endpoint);
    return response.data;
  }

  // ============ SEARCH ============

  /**
   * Unified search for users, events, and posts
   * @param query - Search query (min 2 characters)
   * @param type - Filter results: all, users, events, posts (default: all)
   * @param perType - Results per category, 1-20 (default: 5)
   */
  async search(params: {
    query: string;
    type?: 'all' | 'users' | 'events' | 'posts';
    per_type?: number;
  }): Promise<Types.SearchResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append('q', params.query);
    if (params.type) searchParams.append('type', params.type);
    if (params.per_type) searchParams.append('per_type', String(params.per_type));
    return this.request<Types.SearchResponse>(`/search?${searchParams}`);
  }

  /**
   * Search users only (for autocomplete)
   * @param query - Search query (min 2 characters)
   */
  async searchUsers(query: string): Promise<Types.SearchUsersResponse> {
    return this.request<Types.SearchUsersResponse>(`/search/users?q=${encodeURIComponent(query)}`);
  }

  // ============ SOCIAL SHARING ============

  /**
   * Get shareable link for an activity
   * Generates a secure share token and returns platform-specific share URLs
   */
  async getActivityShareLink(id: number): Promise<Types.ShareLinkResponse> {
    const response = await this.request<Types.ApiResponse<Types.ShareLinkResponse>>(
      `/activities/${id}/share-link`
    );
    return response.data;
  }

  /**
   * Get shareable link for a post
   * Generates a secure share token and returns platform-specific share URLs
   */
  async getPostShareLink(id: number): Promise<Types.ShareLinkResponse> {
    const response = await this.request<Types.ApiResponse<Types.ShareLinkResponse>>(
      `/posts/${id}/share-link`
    );
    return response.data;
  }

  /**
   * Get shareable link for an event
   * Events use slugs for public URLs
   */
  async getEventShareLink(id: number): Promise<Types.ShareLinkResponse> {
    const response = await this.request<Types.ApiResponse<Types.ShareLinkResponse>>(
      `/events/${id}/share-link`
    );
    return response.data;
  }

  /**
   * Get shareable link for a comment
   * Note: This endpoint may need to be added to the backend API
   */
  async getCommentShareLink(id: number): Promise<Types.ShareLinkResponse> {
    const response = await this.request<Types.ApiResponse<Types.ShareLinkResponse>>(
      `/comments/${id}/share-link`
    );
    return response.data;
  }

  // ============ ADMIN - IMPERSONATION ============

  /**
   * Search users for impersonation (admin only, excludes admins)
   * @param query - Search query for name, username, or email
   */
  async searchUsersForImpersonation(query: string): Promise<Types.User[]> {
    const response = await this.request<Types.ApiResponse<Types.User[]>>(
      `/admin/users/search?q=${encodeURIComponent(query)}`
    );
    return response.data;
  }

  /**
   * Start impersonating a user (admin only)
   * @param userId - ID of user to impersonate
   */
  async startImpersonation(userId: number): Promise<Types.StartImpersonationResponse> {
    return await this.request<Types.StartImpersonationResponse>(
      '/admin/impersonate/start',
      {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      }
    );
  }

  /**
   * Stop impersonating and return to admin account
   */
  async stopImpersonation(): Promise<Types.StopImpersonationResponse> {
    return await this.request<Types.StopImpersonationResponse>(
      '/admin/impersonate/stop',
      { method: 'POST' }
    );
  }

  /**
   * Check if currently impersonating
   */
  async getImpersonationStatus(): Promise<Types.ImpersonationStatusResponse> {
    return await this.request<Types.ImpersonationStatusResponse>(
      '/admin/impersonate/status'
    );
  }

  // ============ NOTIFICATIONS ============

  /**
   * Get paginated notifications
   */
  async getNotifications(
    page: number = 1,
    perPage: number = 20
  ): Promise<Types.NotificationListResponse> {
    return await this.request<Types.NotificationListResponse>(
      `/notifications?per_page=${perPage}&page=${page}`
    );
  }

  /**
   * Get unread notification count
   */
  async getUnreadNotificationCount(): Promise<Types.UnreadCountResponse> {
    return await this.request<Types.UnreadCountResponse>(
      '/notifications/unread-count'
    );
  }

  /**
   * Mark a notification as read
   */
  async markNotificationAsRead(
    notificationId: string
  ): Promise<Types.MarkAsReadResponse> {
    return await this.request<Types.MarkAsReadResponse>(
      `/notifications/${notificationId}/read`,
      { method: 'POST' }
    );
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(): Promise<Types.MarkAllAsReadResponse> {
    return await this.request<Types.MarkAllAsReadResponse>(
      '/notifications/read-all',
      { method: 'POST' }
    );
  }

  // ============ ANALYTICS & USAGE TRACKING ============

  /**
   * Report map usage to backend for cost tracking
   * Helps monitor Mapbox SDK usage and costs
   */
  async reportMapUsage(reports: Array<{
    activityId: number;
    timestamp: string;
    mapType: 'interactive' | 'static';
  }>): Promise<void> {
    await this.request('/analytics/map-usage', {
      method: 'POST',
      body: JSON.stringify({ reports }),
    });
  }

  // ============ HOME FEED ============

  /**
   * Get home feed (live events, upcoming events, recent activities)
   * @param params - Query parameters (language, per_page, include_activities, include_upcoming)
   */
  async getHome(params?: {
    language?: Types.CommentaryLanguage;
    per_page?: number;
    include_activities?: boolean;
    include_upcoming?: boolean;
  }): Promise<Types.HomeData> {
    const query = new URLSearchParams();
    if (params?.language) query.append('language', params.language);
    if (params?.per_page) query.append('per_page', String(params.per_page));
    // Laravel expects "1" or "0" for boolean values in query params
    if (params?.include_activities !== undefined) {
      query.append('include_activities', params.include_activities ? '1' : '0');
    }
    if (params?.include_upcoming !== undefined) {
      query.append('include_upcoming', params.include_upcoming ? '1' : '0');
    }
    const queryString = query.toString();
    const response = await this.request<{ data: Types.HomeData }>(
      `/home${queryString ? `?${queryString}` : ''}`
    );
    return response.data;
  }

  // ============ EVENT COMMENTARY ============

  /**
   * Get commentary stream for an event (public)
   * @param eventId - Event ID
   * @param params - Query parameters (per_page, page, language)
   */
  async getEventCommentary(
    eventId: number,
    params?: {
      per_page?: number;
      page?: number;
      language?: Types.CommentaryLanguage;
    }
  ): Promise<Types.CommentaryListResponse> {
    const query = new URLSearchParams();
    if (params?.per_page) query.append('per_page', String(params.per_page));
    if (params?.page) query.append('page', String(params.page));
    if (params?.language) query.append('language', params.language);
    const queryString = query.toString();
    return this.request<Types.CommentaryListResponse>(
      `/events/${eventId}/commentary${queryString ? `?${queryString}` : ''}`
    );
  }

  /**
   * Get single commentary item (public)
   * @param eventId - Event ID
   * @param commentaryId - Commentary ID
   */
  async getCommentary(
    eventId: number,
    commentaryId: number
  ): Promise<Types.EventCommentary> {
    const response = await this.request<Types.ApiResponse<Types.EventCommentary>>(
      `/events/${eventId}/commentary/${commentaryId}`
    );
    return response.data;
  }

  /**
   * Get available commentary styles (public)
   */
  async getCommentaryStyles(): Promise<Types.CommentaryStylesResponse> {
    return this.request<Types.CommentaryStylesResponse>('/commentary/styles');
  }

  /**
   * Get available commentary languages (public)
   */
  async getCommentaryLanguages(): Promise<Types.CommentaryLanguagesResponse> {
    return this.request<Types.CommentaryLanguagesResponse>('/commentary/languages');
  }

  /**
   * Get commentary settings for an event (organizer only)
   * @param eventId - Event ID
   */
  async getCommentarySettings(eventId: number): Promise<Types.CommentarySettings> {
    return this.request<Types.CommentarySettings>(
      `/events/${eventId}/commentary/settings`
    );
  }

  /**
   * Update commentary settings for an event (organizer only)
   * @param eventId - Event ID
   * @param settings - Updated settings
   */
  async updateCommentarySettings(
    eventId: number,
    settings: Types.UpdateCommentarySettingsRequest
  ): Promise<Types.CommentarySettings> {
    return this.request<Types.CommentarySettings>(
      `/events/${eventId}/commentary/settings`,
      {
        method: 'PUT',
        body: JSON.stringify(settings),
      }
    );
  }

  /**
   * Manually trigger commentary generation (organizer only)
   * @param eventId - Event ID
   * @param type - Commentary type to generate
   */
  async generateCommentary(
    eventId: number,
    type: Types.CommentaryType
  ): Promise<Types.GenerateCommentaryResponse> {
    return this.request<Types.GenerateCommentaryResponse>(
      `/events/${eventId}/commentary/generate`,
      {
        method: 'POST',
        body: JSON.stringify({ type }),
      }
    );
  }

  /**
   * Delete a commentary item (organizer only)
   * @param eventId - Event ID
   * @param commentaryId - Commentary ID
   */
  async deleteCommentary(eventId: number, commentaryId: number): Promise<void> {
    await this.request(`/events/${eventId}/commentary/${commentaryId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Boost a commentary (authenticated)
   * @param eventId - Event ID
   * @param commentaryId - Commentary ID
   */
  async boostCommentary(
    eventId: number,
    commentaryId: number
  ): Promise<Types.BoostCommentaryResponse> {
    return this.request<Types.BoostCommentaryResponse>(
      `/events/${eventId}/commentary/${commentaryId}/boost`,
      {
        method: 'POST',
      }
    );
  }

  // ============ HOME CONFIG (Dynamic Home Screen) ============

  /**
   * Get home screen configuration
   * Returns primary CTA and sections to render based on backend logic
   * Mobile should render exactly what the backend returns - no business logic
   */
  async getHomeConfig(): Promise<Types.HomeConfigResponse> {
    return this.request<Types.HomeConfigResponse>('/home/config');
  }

  // ============ APP CONFIG (Public) ============

  /**
   * Get app configuration from server
   * Used to determine which push notification provider to use
   * No authentication required
   */
  async getAppConfig(): Promise<Types.AppConfigResponse> {
    return this.request<Types.AppConfigResponse>('/config/app');
  }

  // ============ DEVICE REGISTRATION (Push Notifications) ============

  /**
   * Register device for push notifications
   * @param fcmToken - Push token (Expo or FCM)
   * @param deviceType - 'ios' or 'android'
   */
  async registerDevice(
    fcmToken: string,
    deviceType: Types.DeviceType
  ): Promise<Types.DeviceRegistrationResponse> {
    return this.request<Types.DeviceRegistrationResponse>('/device/register', {
      method: 'POST',
      body: JSON.stringify({
        fcm_token: fcmToken,
        device_type: deviceType,
      }),
    });
  }

  /**
   * Unregister device from push notifications
   * Called on logout to remove the device token
   */
  async unregisterDevice(): Promise<Types.DeviceUnregisterResponse> {
    return this.request<Types.DeviceUnregisterResponse>('/device/unregister', {
      method: 'POST',
    });
  }
}

export const api = new ApiService();
