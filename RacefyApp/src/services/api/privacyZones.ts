import type * as Types from '../../types/api';
import type { ApiBase } from './base';

type Constructable<T = object> = new (...args: any[]) => T;

export function PrivacyZonesMixin<TBase extends Constructable<ApiBase>>(Base: TBase) {
  return class PrivacyZonesMixin extends Base {

    async getPrivacyZones(): Promise<Types.PrivacyZone[]> {
      const response = await this.request<Types.ApiResponse<Types.PrivacyZone[]>>('/privacy-zones');
      return response.data;
    }

    async createPrivacyZone(data: Types.CreatePrivacyZoneRequest): Promise<Types.PrivacyZone> {
      const response = await this.request<Types.ApiResponse<Types.PrivacyZone>>(
        '/privacy-zones',
        { method: 'POST', body: JSON.stringify(data) },
      );
      return response.data;
    }

    async updatePrivacyZone(id: number, data: Types.UpdatePrivacyZoneRequest): Promise<Types.PrivacyZone> {
      const response = await this.request<Types.ApiResponse<Types.PrivacyZone>>(
        `/privacy-zones/${id}`,
        { method: 'PATCH', body: JSON.stringify(data) },
      );
      return response.data;
    }

    async deletePrivacyZone(id: number): Promise<void> {
      await this.request(`/privacy-zones/${id}`, { method: 'DELETE' });
    }

    async togglePrivacyZone(id: number): Promise<Types.PrivacyZone> {
      const response = await this.request<Types.ApiResponse<Types.PrivacyZone>>(
        `/privacy-zones/${id}/toggle`,
        { method: 'POST' },
      );
      return response.data;
    }

    async getPrivacyZoneSuggestions(): Promise<Types.PrivacyZoneSuggestion[]> {
      const response = await this.request<Types.ApiResponse<Types.PrivacyZoneSuggestion[]>>(
        '/privacy-zones/suggestions',
      );
      return response.data;
    }
  };
}