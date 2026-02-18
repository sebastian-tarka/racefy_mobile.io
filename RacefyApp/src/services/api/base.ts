import { API_BASE_URL, XDEBUG_ENABLED } from '../../config/api';
import { getCurrentLanguage } from '../../i18n';
import { logger } from '../logger';
import { secureStorage } from '../secureStorage';
import type * as Types from '../../types/api';

/**
 * Append Xdebug trigger to URL when debugging is enabled
 * Used for all API requests to enable PHP debugging in dev mode
 */
export const appendXdebugTrigger = (url: string): string => {
  if (!XDEBUG_ENABLED) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}XDEBUG_TRIGGER=PHPSTORM`;
};

export class ApiBase {
  private token: string | null = null;
  private onUnauthorizedCallback: (() => void) | null = null;
  /** In-flight GET requests — concurrent identical calls share the same Promise */
  private readonly inflightRequests = new Map<string, Promise<unknown>>();

  async init() {
    // First, migrate any legacy tokens to secure storage
    await secureStorage.migrateLegacyTokens();
    // Then load the token from secure storage
    this.token = await secureStorage.getToken();
    logger.debug('auth', 'API service initialized', { hasToken: !!this.token });
  }

  /**
   * Set callback to be invoked when a 401 Unauthorized response is received.
   * This allows the app to trigger re-authentication flow.
   */
  setOnUnauthorized(callback: () => void) {
    this.onUnauthorizedCallback = callback;
  }

  /**
   * Build full API URL with Xdebug trigger automatically appended
   */
  private buildUrl(endpoint: string): string {
    return appendXdebugTrigger(`${API_BASE_URL}${endpoint}`);
  }

  /**
   * Universal API request method. Handles both JSON and FormData requests.
   * - Auto-detects FormData and skips Content-Type (browser sets it with boundary)
   * - Adds Authorization, Accept, Accept-Language headers
   * - Appends Xdebug trigger when enabled
   * - Parses JSON response and throws on error
   * - Deduplicates concurrent GET requests (same endpoint → shared Promise)
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const method = options.method || 'GET';

    // Deduplicate concurrent GET requests — if the same endpoint is already in-flight,
    // return the existing Promise instead of issuing a second network call.
    if (method === 'GET') {
      const existing = this.inflightRequests.get(endpoint);
      if (existing) {
        logger.debug('api', `Deduplicating GET ${endpoint}`);
        return existing as Promise<T>;
      }
      const promise = this.doRequest<T>(endpoint, options);
      this.inflightRequests.set(endpoint, promise);
      promise.finally(() => this.inflightRequests.delete(endpoint));
      return promise;
    }

    return this.doRequest<T>(endpoint, options);
  }

  private async doRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const method = options.method || 'GET';
    const startTime = Date.now();
    const isFormData = options.body instanceof FormData;

    // Log request start (skip logging for debug/logs endpoint to avoid infinite loop)
    const shouldLog = !endpoint.includes('/debug/logs');
    if (shouldLog) {
      logger.api(`${method} ${endpoint}`, {
        hasBody: !!options.body,
        isFormData,
      });
    }

    const headers: HeadersInit = {
      Accept: 'application/json',
      'Accept-Language': getCurrentLanguage(),
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(this.buildUrl(endpoint), {
        ...options,
        headers,
      });

      const duration = Date.now() - startTime;
      const data = await response.json();

      if (!response.ok) {
        if (shouldLog) {
          logger.error('api', `${method} ${endpoint} failed`, {
            status: response.status,
            duration,
            error: (data as Types.ApiError).message,
          });
        }

        // Handle 401 Unauthorized - token expired or invalid
        if (response.status === 401) {
          logger.warn('auth', 'Received 401 Unauthorized, clearing token', { endpoint });
          await this.clearToken();
          if (this.onUnauthorizedCallback) {
            this.onUnauthorizedCallback();
          }
        }

        throw data as Types.ApiError;
      }

      if (shouldLog) {
        logger.debug('api', `${method} ${endpoint} completed`, {
          status: response.status,
          duration,
        });
      }

      return data;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      if (shouldLog && !error.status) {
        // Network error (not API error which has .status)
        logger.error('api', `${method} ${endpoint} network error`, {
          duration,
          error: error.message || error.toString(),
          url: this.buildUrl(endpoint),
        });
      }
      throw error;
    }
  }

  async setToken(token: string) {
    this.token = token;
    await secureStorage.setToken(token);
  }

  async clearToken() {
    this.token = null;
    await secureStorage.clearToken();
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }

  getBaseUrl(): string {
    return API_BASE_URL;
  }
}
