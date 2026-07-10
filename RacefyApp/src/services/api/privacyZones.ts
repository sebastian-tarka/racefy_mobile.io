import type * as Types from '../../types/api';
import type { ApiBase } from './base';

type Constructable<T = object> = new (...args: any[]) => T;

// The privacy-zones endpoints wrap payloads in `zones` / `zone` / `suggestions`
// (not the usual `data` envelope), so these are typed explicitly.
export function PrivacyZonesMixin<TBase extends Constructable<ApiBase>>(Base: TBase) {
  return class PrivacyZonesMixin extends Base {
    async getPrivacyZones(): Promise<Types.PrivacyZone[]> {
      const response = await this.request<{ zones: Types.PrivacyZone[] }>('/privacy-zones');
      return response.zones ?? [];
    }

    async createPrivacyZone(data: Types.CreatePrivacyZoneRequest): Promise<Types.PrivacyZone> {
      const response = await this.request<{ zone: Types.PrivacyZone }>('/privacy-zones', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.zone;
    }

    async updatePrivacyZone(
      id: number,
      data: Types.UpdatePrivacyZoneRequest,
    ): Promise<Types.PrivacyZone> {
      const response = await this.request<{ zone: Types.PrivacyZone }>(`/privacy-zones/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return response.zone;
    }

    async deletePrivacyZone(id: number): Promise<void> {
      await this.request(`/privacy-zones/${id}`, { method: 'DELETE' });
    }

    async togglePrivacyZone(id: number): Promise<Types.PrivacyZone> {
      const response = await this.request<{ zone: Types.PrivacyZone }>(
        `/privacy-zones/${id}/toggle`,
        { method: 'POST' },
      );
      return response.zone;
    }

    async getPrivacyZoneSuggestions(): Promise<Types.PrivacyZoneSuggestion[]> {
      const response = await this.request<{ suggestions: Types.PrivacyZoneSuggestion[] }>(
        '/privacy-zones/suggestions',
      );
      return response.suggestions ?? [];
    }
  };
}
