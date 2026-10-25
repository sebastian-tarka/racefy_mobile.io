import type * as Types from '../../types/api';
import type { ApiBase } from './base';
import { withQuery } from './query';

type Constructable<T = object> = new (...args: any[]) => T;

export function TeamsMixin<TBase extends Constructable<ApiBase>>(Base: TBase) {
  return class TeamsMixin extends Base {
    // ============ STANDALONE TEAMS ============

    async getTeams(params?: {
      search?: string;
      page?: number;
      per_page?: number;
    }): Promise<Types.PaginatedResponse<Types.Team>> {
      return this.request(
        withQuery('/teams', {
          search: params?.search,
          page: params?.page,
          per_page: params?.per_page,
        }),
      );
    }

    async getTeam(slug: string): Promise<Types.Team> {
      const response = await this.request<Types.ApiResponse<Types.Team>>(`/teams/${slug}`);
      return response.data;
    }

    async getMyTeams(): Promise<Types.Team[]> {
      const response = await this.request<Types.ApiResponse<Types.Team[]>>('/my-teams');
      return response.data;
    }

    async createTeam(data: Types.CreateTeamRequest): Promise<Types.Team> {
      const response = await this.request<Types.ApiResponse<Types.Team>>('/teams', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data;
    }

    async updateTeam(id: number, data: Types.UpdateTeamRequest): Promise<Types.Team> {
      const response = await this.request<Types.ApiResponse<Types.Team>>(`/teams/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return response.data;
    }

    async deleteTeam(id: number): Promise<void> {
      await this.request(`/teams/${id}`, { method: 'DELETE' });
    }

    async uploadTeamAvatar(teamId: number, imageUri: string): Promise<Types.Team> {
      const formData = new FormData();
      const mimeType = imageUri.endsWith('.png') ? 'image/png' : 'image/jpeg';
      formData.append('avatar', {
        uri: imageUri,
        type: mimeType,
        name: `avatar.${imageUri.split('.').pop()}`,
      } as any);
      const result = await this.request<Types.ApiResponse<Types.Team>>(`/teams/${teamId}/avatar`, {
        method: 'POST',
        body: formData,
      });
      return result.data;
    }

    async deleteTeamAvatar(teamId: number): Promise<void> {
      await this.request(`/teams/${teamId}/avatar`, { method: 'DELETE' });
    }

    // ============ TEAM MEMBERSHIP ============

    async inviteTeamMember(teamId: number, userId: number): Promise<void> {
      await this.request(`/teams/${teamId}/invite`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
    }

    async requestToJoinTeam(teamId: number): Promise<void> {
      await this.request(`/teams/${teamId}/request-to-join`, { method: 'POST' });
    }

    async acceptTeamInvitation(teamId: number): Promise<void> {
      await this.request(`/teams/${teamId}/accept-invitation`, { method: 'POST' });
    }

    async declineTeamInvitation(teamId: number): Promise<void> {
      await this.request(`/teams/${teamId}/decline-invitation`, { method: 'POST' });
    }

    async acceptJoinRequest(teamId: number, membershipId: number): Promise<void> {
      await this.request(`/teams/${teamId}/join-requests/${membershipId}/accept`, {
        method: 'POST',
      });
    }

    async declineJoinRequest(teamId: number, membershipId: number): Promise<void> {
      await this.request(`/teams/${teamId}/join-requests/${membershipId}/decline`, {
        method: 'POST',
      });
    }

    async leaveTeam(teamId: number): Promise<void> {
      await this.request(`/teams/${teamId}/leave`, { method: 'DELETE' });
    }

    async kickTeamMember(teamId: number, userId: number): Promise<void> {
      await this.request(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' });
    }

    async transferTeamCaptain(teamId: number, userId: number): Promise<void> {
      await this.request(`/teams/${teamId}/transfer-captain/${userId}`, { method: 'POST' });
    }

    /**
     * Shortcut endpoint: get the team's group conversation directly.
     * Path parameter is the team's numeric id (Laravel route model binding defaults to id).
     * Returns 403 if current user is not an active member, 404 if team has no chat.
     */
    async getTeamConversation(teamId: number): Promise<Types.Conversation> {
      const response = await this.request<Types.ApiResponse<Types.Conversation>>(
        `/teams/${teamId}/conversation`,
      );
      return response.data;
    }

    // ============ TEAM STATS ============

    async getTeamStats(
      slug: string,
      period?: Types.StatsPeriod,
    ): Promise<Types.TeamSummaryResponse> {
      return this.request(withQuery(`/teams/${slug}/stats`, { period }));
    }

    async getTeamRanking(
      slug: string,
      params?: {
        sort_by?: Types.RankingSortBy;
        period?: Types.StatsPeriod;
        sport_type_id?: number;
      },
    ): Promise<Types.TeamRankingResponse> {
      return this.request(
        withQuery(`/teams/${slug}/stats/ranking`, {
          sort_by: params?.sort_by,
          period: params?.period,
          sport_type_id: params?.sport_type_id,
        }),
      );
    }

    async getTeamTrends(
      slug: string,
      params?: {
        granularity?: Types.TrendGranularity;
        periods?: number;
        sport_type_id?: number;
      },
    ): Promise<Types.TeamTrendsResponse> {
      return this.request(
        withQuery(`/teams/${slug}/stats/trends`, {
          granularity: params?.granularity,
          periods: params?.periods,
          sport_type_id: params?.sport_type_id,
        }),
      );
    }

    async getTeamsLeaderboard(params?: {
      sort_by?: Types.LeaderboardSortBy;
      period?: Types.StatsPeriod;
      limit?: number;
      offset?: number;
    }): Promise<Types.TeamLeaderboardResponse> {
      return this.request(
        withQuery('/teams/leaderboard', {
          sort_by: params?.sort_by,
          period: params?.period,
          limit: params?.limit,
          offset: params?.offset,
        }),
      );
    }

    // ============ REGISTER TEAM FOR EVENT ============

    async registerTeamForEvent(
      teamId: number,
      eventId: number,
      memberIds?: number[],
    ): Promise<void> {
      await this.request(`/teams/${teamId}/register-for-event`, {
        method: 'POST',
        body: JSON.stringify({
          event_id: eventId,
          ...(memberIds ? { member_ids: memberIds } : {}),
        }),
      });
    }

    // ============ EVENT TEAMS ============

    async getEventTeams(eventId: number): Promise<Types.EventTeam[]> {
      const response = await this.request<Types.ApiResponse<Types.EventTeam[]>>(
        `/events/${eventId}/teams`,
      );
      return response.data;
    }

    async createEventTeam(eventId: number, name: string): Promise<Types.EventTeam> {
      const response = await this.request<Types.ApiResponse<Types.EventTeam>>(
        `/events/${eventId}/teams`,
        { method: 'POST', body: JSON.stringify({ name }) },
      );
      return response.data;
    }

    async joinEventTeam(eventId: number, teamId: number, code: string): Promise<void> {
      await this.request(`/events/${eventId}/teams/${teamId}/join`, {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
    }

    async leaveEventTeam(eventId: number, teamId: number): Promise<void> {
      await this.request(`/events/${eventId}/teams/${teamId}/leave`, { method: 'DELETE' });
    }

    async updateEventTeam(eventId: number, teamId: number, name: string): Promise<Types.EventTeam> {
      const response = await this.request<Types.ApiResponse<Types.EventTeam>>(
        `/events/${eventId}/teams/${teamId}`,
        { method: 'PUT', body: JSON.stringify({ name }) },
      );
      return response.data;
    }

    async deleteEventTeam(eventId: number, teamId: number): Promise<void> {
      await this.request(`/events/${eventId}/teams/${teamId}`, { method: 'DELETE' });
    }

    async removeEventTeamMember(eventId: number, teamId: number, userId: number): Promise<void> {
      await this.request(`/events/${eventId}/teams/${teamId}/members/${userId}`, {
        method: 'DELETE',
      });
    }

    async transferEventTeamCaptain(eventId: number, teamId: number, userId: number): Promise<void> {
      await this.request(`/events/${eventId}/teams/${teamId}/transfer-captain`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
    }
  };
}
