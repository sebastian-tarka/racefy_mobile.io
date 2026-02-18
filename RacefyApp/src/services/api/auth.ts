import { API_BASE_URL } from '../../config/api';
import type * as Types from '../../types/api';
import { assertUser, assertToken } from '../../utils/apiGuards';
import type { ApiBase } from './base';

/**
 * Raw auth response shape — the API may return the payload directly
 * or wrapped in a { data: ... } envelope depending on Laravel version/middleware.
 */
type RawAuthPayload = {
  user: Types.User;
  access_token?: string;
  token?: string;
  is_new_user?: boolean;
};
type RawAuthResponse = RawAuthPayload | { data: RawAuthPayload };

function unwrapAuth(response: RawAuthResponse): RawAuthPayload {
  return 'data' in response ? response.data : response;
}

type Constructable<T = object> = new (...args: any[]) => T;

export function AuthMixin<TBase extends Constructable<ApiBase>>(Base: TBase) {
  return class AuthMixin extends Base {
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
      assertUser(response.user);
      assertToken(response.access_token, 'register');
      await this.setToken(response.access_token);
      return response;
    }

    async login(data: Types.LoginRequest): Promise<Types.AuthResponse> {
      const response = await this.request<RawAuthResponse>('/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const authData = unwrapAuth(response);
      const token = authData.access_token ?? authData.token;
      assertUser(authData.user);
      assertToken(token, 'login');

      await this.setToken(token);
      return { user: authData.user, access_token: token, token_type: 'Bearer' };
    }

    async googleAuth(idToken: string): Promise<Types.GoogleAuthResponse> {
      const response = await this.request<RawAuthResponse>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ id_token: idToken }),
      });
      const authData = unwrapAuth(response);
      const token = authData.access_token ?? authData.token;
      assertUser(authData.user);
      assertToken(token, 'googleAuth');

      await this.setToken(token);
      return {
        user: authData.user,
        access_token: token,
        token_type: 'Bearer',
        is_new_user: !!authData.is_new_user,
      };
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
  };
}
