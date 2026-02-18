import type * as Types from '../../types/api';
import type { ApiBase } from './base';

type Constructable<T = object> = new (...args: any[]) => T;

export function UsersMixin<TBase extends Constructable<ApiBase>>(Base: TBase) {
  return class UsersMixin extends Base {
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

    async getFollowRequests(page: number = 1): Promise<Types.ApiListResponse<Types.FollowRequest>> {
      const response = await this.request<Types.ApiListResponse<Types.FollowRequest>>(
        `/follow-requests?page=${page}`
      );
      return response;
    }

    async getSentFollowRequests(page: number = 1): Promise<Types.ApiListResponse<Types.FollowRequest>> {
      const response = await this.request<Types.ApiListResponse<Types.FollowRequest>>(
        `/follow-requests/sent?page=${page}`
      );
      return response;
    }

    async acceptFollowRequest(followId: number): Promise<void> {
      await this.request<void>(`/follow-requests/${followId}/accept`, {
        method: 'POST',
      });
    }

    async rejectFollowRequest(followId: number): Promise<void> {
      await this.request<void>(`/follow-requests/${followId}/reject`, {
        method: 'POST',
      });
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

    async getUserActiveActivityStats(
      userId: number,
      params?: {
        from?: string;
        to?: string;
        sport_type_id?: number;
      }
    ): Promise<Types.ActivityStats> {
      const query = new URLSearchParams();
      if (params?.from) query.append('from', params.from);
      if (params?.to) query.append('to', params.to);
      if (params?.sport_type_id)
        query.append('sport_type_id', String(params.sport_type_id));

      const queryString = query.toString();
      const endpoint = queryString
        ? `/users/${userId}/stats/activities/active?${queryString}`
        : `/users/${userId}/stats/activities/active`;

      const response = await this.request<Types.ApiResponse<Types.ActivityStats>>(endpoint);
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
  };
}
