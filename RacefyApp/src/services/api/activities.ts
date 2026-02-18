import type * as Types from '../../types/api';
import type { ApiBase } from './base';

type Constructable<T = object> = new (...args: any[]) => T;

export function ActivitiesMixin<TBase extends Constructable<ApiBase>>(Base: TBase) {
  return class ActivitiesMixin extends Base {
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

    async deleteActivity(id: number, force: boolean = false): Promise<void> {
      const endpoint = force ? `/activities/${id}?force=true` : `/activities/${id}`;
      await this.request(endpoint, { method: 'DELETE' });
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

    async getActivityAnalysis(id: number): Promise<Types.SingleActivityStats> {
      const response = await this.request<Types.ApiResponse<Types.SingleActivityStats>>(
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
     * Get nearby activities/routes for shadow track feature
     * @param lat User's current latitude
     * @param lng User's current longitude
     * @param radius Search radius in meters (default: 5000m)
     * @param sportTypeId Filter by sport type (optional)
     * @param limit Max number of routes to return (default: 10)
     */
    async getNearbyRoutes(
      lat: number,
      lng: number,
      radius: number = 5000,
      sportTypeId?: number,
      limit: number = 10
    ): Promise<Types.NearbyRoute[]> {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        radius: radius.toString(),
        limit: limit.toString(),
      });

      if (sportTypeId) {
        params.append('sport_type_id', sportTypeId.toString());
      }

      const response = await this.request<Types.ApiResponse<Types.NearbyRoute[]>>(
        `/activities/nearby?${params.toString()}`
      );

      return response.data;
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

    // ============ SOCIAL SHARING ============

    /**
     * Get shareable link for an activity
     * Generates a secure share token and returns platform-specific share URLs
     * @param id - Activity ID
     * @param options - Optional configuration
     * @param options.format - Image format: 'social' (1200x630), 'story' (1080x1920), or 'square' (1080x1080)
     */
    async getActivityShareLink(
      id: number,
      options?: { format?: 'social' | 'story' | 'square' }
    ): Promise<Types.ShareLinkResponse> {
      const queryParams = options?.format ? `?format=${options.format}` : '';
      const response = await this.request<Types.ApiResponse<Types.ShareLinkResponse>>(
        `/activities/${id}/share-link${queryParams}`
      );
      return response.data;
    }
  };
}
