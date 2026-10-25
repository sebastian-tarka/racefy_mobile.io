import type * as Types from '../../types/api';
import type { ApiBase } from './base';
import { withQuery } from './query';

type Constructable<T = object> = new (...args: any[]) => T;

export function RoutesMixin<TBase extends Constructable<ApiBase>>(Base: TBase) {
  return class RoutesMixin extends Base {
    // ============ PLANNED ROUTES ============

    async getRoutes(params?: {
      sport_type_id?: number;
      page?: number;
      per_page?: number;
    }): Promise<Types.PaginatedResponse<Types.PlannedRoute>> {
      return this.request(
        withQuery('/routes', {
          sport_type_id: params?.sport_type_id,
          page: params?.page,
          per_page: params?.per_page,
        }),
      );
    }

    async getRoute(id: number): Promise<Types.PlannedRoute> {
      const response = await this.request<Types.ApiResponse<Types.PlannedRoute>>(`/routes/${id}`);
      return response.data;
    }

    async createRoute(data: Types.CreateRouteRequest): Promise<Types.PlannedRoute> {
      const response = await this.request<Types.ApiResponse<Types.PlannedRoute>>('/routes', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data;
    }

    async updateRoute(id: number, data: Types.UpdateRouteRequest): Promise<Types.PlannedRoute> {
      const response = await this.request<Types.ApiResponse<Types.PlannedRoute>>(`/routes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return response.data;
    }

    async deleteRoute(id: number): Promise<void> {
      await this.request(`/routes/${id}`, { method: 'DELETE' });
    }

    async searchRoutes(
      params: Types.RouteSearchParams,
    ): Promise<Types.PaginatedResponse<Types.PlannedRoute>> {
      return this.request(
        withQuery('/routes/search', {
          lat: params.lat?.toString(),
          lng: params.lng?.toString(),
          radius: params.radius,
          sport_type_id: params.sport_type_id,
          query: params.query,
          page: params.page,
          per_page: params.per_page,
        }),
      );
    }

    async duplicateRoute(id: number): Promise<Types.PlannedRoute> {
      const response = await this.request<Types.ApiResponse<Types.PlannedRoute>>(
        `/routes/${id}/duplicate`,
        { method: 'POST' },
      );
      return response.data;
    }

    async previewRoute(data: Types.RoutePreviewRequest): Promise<Types.RoutePreviewResponse> {
      const response = await this.request<Types.ApiResponse<Types.RoutePreviewResponse>>(
        '/routes/preview',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      );
      return response.data;
    }
  };
}
