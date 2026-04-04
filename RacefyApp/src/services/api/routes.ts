import type * as Types from '../../types/api';
import type { ApiBase } from './base';

type Constructable<T = object> = new (...args: any[]) => T;

export function RoutesMixin<TBase extends Constructable<ApiBase>>(Base: TBase) {
  return class RoutesMixin extends Base {
    // ============ PLANNED ROUTES ============

    async getRoutes(params?: {
      sport_type_id?: number;
      page?: number;
      per_page?: number;
    }): Promise<Types.PaginatedResponse<Types.PlannedRoute>> {
      const query = new URLSearchParams();
      if (params?.sport_type_id) query.append('sport_type_id', String(params.sport_type_id));
      if (params?.page) query.append('page', String(params.page));
      if (params?.per_page) query.append('per_page', String(params.per_page));
      return this.request(`/routes?${query}`);
    }

    async getRoute(id: number): Promise<Types.PlannedRoute> {
      const response = await this.request<Types.ApiResponse<Types.PlannedRoute>>(`/routes/${id}`);
      return response.data;
    }

    async createRoute(data: Types.CreateRouteRequest): Promise<Types.PlannedRoute> {
      const response = await this.request<Types.ApiResponse<Types.PlannedRoute>>(
        '/routes',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return response.data;
    }

    async updateRoute(id: number, data: Types.UpdateRouteRequest): Promise<Types.PlannedRoute> {
      const response = await this.request<Types.ApiResponse<Types.PlannedRoute>>(
        `/routes/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        }
      );
      return response.data;
    }

    async deleteRoute(id: number): Promise<void> {
      await this.request(`/routes/${id}`, { method: 'DELETE' });
    }

    async searchRoutes(params: Types.RouteSearchParams): Promise<Types.PaginatedResponse<Types.PlannedRoute>> {
      const query = new URLSearchParams();
      if (params.lat != null) query.append('lat', String(params.lat));
      if (params.lng != null) query.append('lng', String(params.lng));
      if (params.radius) query.append('radius', String(params.radius));
      if (params.sport_type_id) query.append('sport_type_id', String(params.sport_type_id));
      if (params.query) query.append('query', params.query);
      if (params.page) query.append('page', String(params.page));
      if (params.per_page) query.append('per_page', String(params.per_page));
      return this.request(`/routes/search?${query}`);
    }

    async duplicateRoute(id: number): Promise<Types.PlannedRoute> {
      const response = await this.request<Types.ApiResponse<Types.PlannedRoute>>(
        `/routes/${id}/duplicate`,
        { method: 'POST' }
      );
      return response.data;
    }

    async previewRoute(data: Types.RoutePreviewRequest): Promise<Types.RoutePreviewResponse> {
      const response = await this.request<Types.ApiResponse<Types.RoutePreviewResponse>>(
        '/routes/preview',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return response.data;
    }
  };
}
