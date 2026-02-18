import type * as Types from '../../types/api';
import type { ApiBase } from './base';

type Constructable<T = object> = new (...args: any[]) => T;

export function EventsMixin<TBase extends Constructable<ApiBase>>(Base: TBase) {
  return class EventsMixin extends Base {
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

    /**
     * Get event leaderboard (public, no auth required)
     */
    async getEventLeaderboard(eventId: number, limit = 50): Promise<Types.EventLeaderboardResponse> {
      const query = new URLSearchParams();
      query.append('limit', String(limit));
      return this.request<Types.EventLeaderboardResponse>(`/leaderboard/event/${eventId}?${query}`);
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

    /**
     * Remove boost from a commentary (authenticated)
     * @param eventId - Event ID
     * @param commentaryId - Commentary ID
     */
    async unboostCommentary(
      eventId: number,
      commentaryId: number
    ): Promise<Types.BoostCommentaryResponse> {
      return this.request<Types.BoostCommentaryResponse>(
        `/events/${eventId}/commentary/${commentaryId}/boost`,
        {
          method: 'DELETE',
        }
      );
    }
  };
}
