import type * as Types from '../../types/api';
import type { ApiBase } from './base';

type Constructable<T = object> = new (...args: any[]) => T;

export function MiscMixin<TBase extends Constructable<ApiBase>>(Base: TBase) {
  return class MiscMixin extends Base {
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

    // ============ MENTIONS ============

    async searchMentionUsers(query: string, limit = 10): Promise<Types.ApiResponse<Types.MentionSearchUser[]>> {
      return this.request<Types.ApiResponse<Types.MentionSearchUser[]>>(
        `/mentions/search/users?q=${encodeURIComponent(query)}&limit=${limit}`
      );
    }

    async searchMentionEvents(query: string, limit = 10): Promise<Types.ApiResponse<Types.MentionSearchEvent[]>> {
      return this.request<Types.ApiResponse<Types.MentionSearchEvent[]>>(
        `/mentions/search/events?q=${encodeURIComponent(query)}&limit=${limit}`
      );
    }

    async searchMentionActivities(query: string, limit = 10): Promise<Types.ApiResponse<Types.MentionSearchActivity[]>> {
      return this.request<Types.ApiResponse<Types.MentionSearchActivity[]>>(
        `/mentions/search/activities?q=${encodeURIComponent(query)}&limit=${limit}`
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

    /**
     * Get user rewards
     * @param filters - Optional filters (type, event_id)
     */
    async getUserRewards(
      filters?: Types.RewardsQueryParams
    ): Promise<Types.RewardsResponse> {
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.event_id) params.append('event_id', filters.event_id.toString());

      const endpoint = `/user/rewards${params.toString() ? `?${params.toString()}` : ''}`;

      return await this.request<Types.RewardsResponse>(endpoint);
    }
  };
}
