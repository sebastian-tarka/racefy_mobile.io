import { API_BASE_URL, XDEBUG_ENABLED } from '../../config/api';
import { getCurrentLanguage } from '../../i18n';
import { logger } from '../logger';
import { secureStorage } from '../secureStorage';
import type * as Types from '../../types/api';
import { getErrorMessage, getErrorStatus } from '../../utils/errors';

/**
 * Append Xdebug trigger to URL when debugging is enabled
 * Used for all API requests to enable PHP debugging in dev mode
 */
export const appendXdebugTrigger = (url: string): string => {
  if (!XDEBUG_ENABLED) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}XDEBUG_TRIGGER=PHPSTORM`;
};

/**
 * Default timeout for JSON requests. `fetch` has none of its own, and on a
 * connected-but-dead network it can hang for minutes; with GET deduplication a
 * single hung request would also block every later call to that endpoint.
 * Uploads (FormData) get no default - a video on a slow uplink legitimately
 * takes longer. Callers that pass their own `signal` own the timeout.
 */
const DEFAULT_TIMEOUT_MS = 60_000;

export class ApiBase {
  private token: string | null = null;
  private onUnauthorizedCallback: (() => void) | null = null;
  private onMaintenanceModeCallback:
    | ((data: { message?: string; estimated_end?: string }) => void)
    | null = null;
  private onUpgradeRequiredCallback:
    | ((data: {
        feature?: string;
        currentTier: Types.SubscriptionTier;
        limit?: { feature: string; limit: number; current_usage: number; remaining: number };
      }) => void)
    | null = null;
  private onRateLimitCallback: ((data: { retryAfter?: number }) => void) | null = null;
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
   * Set callback to be invoked when a 503 maintenance mode response is received.
   */
  setOnMaintenanceMode(
    callback: ((data: { message?: string; estimated_end?: string }) => void) | null,
  ) {
    this.onMaintenanceModeCallback = callback;
  }

  /**
   * Set callback to be invoked when a 403 response with upgrade_required is received.
   */
  setOnUpgradeRequired(
    callback: ((data: { feature?: string; currentTier: string; limit?: any }) => void) | null,
  ) {
    this.onUpgradeRequiredCallback = callback;
  }

  /**
   * Set callback to be invoked when a 429 rate limit response is received.
   * Use this to surface a global toast/notification to the user.
   */
  setOnRateLimit(callback: ((data: { retryAfter?: number }) => void) | null) {
    this.onRateLimitCallback = callback;
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
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
      // `.finally()` returns a new promise that rejects along with `promise`;
      // swallow it here - the caller handles the rejection of `promise` itself.
      promise.finally(() => this.inflightRequests.delete(endpoint)).catch(() => {});
      return promise;
    }

    return this.doRequest<T>(endpoint, options);
  }

  /**
   * Like `request()`, but hands back the HTTP status alongside the body.
   *
   * Needed by endpoints where the status *is* the answer - e.g.
   * `/activities/{id}/analysis` returns 200 (ready), 202 (being computed) and
   * 204 (will never exist), and collapsing those would make the client poll
   * forever for an analysis that is never coming. `data` is null for empty
   * bodies. Not deduplicated: callers that need it own their caching.
   */
  async requestWithStatus<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<{ status: number; data: T | null }> {
    return this.doRequestWithStatus<T>(endpoint, options);
  }

  private async doRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const { data } = await this.doRequestWithStatus<T>(endpoint, options);
    return data as T;
  }

  private async doRequestWithStatus<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<{ status: number; data: T | null }> {
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

    let timeout: ReturnType<typeof setTimeout> | undefined;
    let signal = options.signal;
    if (!signal && !isFormData) {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
      signal = controller.signal;
    }

    try {
      const response = await fetch(this.buildUrl(endpoint), {
        ...options,
        headers,
        signal,
      });

      const duration = Date.now() - startTime;
      const body = await response.text();
      let data: any = null;
      if (body) {
        try {
          data = JSON.parse(body);
        } catch {
          // Non-JSON body (HTML error page, proxy response) - keep it as null
          // and let the status carry the meaning.
          data = null;
        }
      }

      if (!response.ok) {
        if (shouldLog) {
          logger.error('api', `${method} ${endpoint} failed`, {
            status: response.status,
            duration,
            error: (data as Types.ApiError | null)?.message,
          });
        }

        // Handle 503 Maintenance Mode
        if (response.status === 503 && data?.maintenance) {
          logger.warn('api', 'Server in maintenance mode', { endpoint });
          if (this.onMaintenanceModeCallback) {
            this.onMaintenanceModeCallback(data as any);
          }
        }

        // Handle 401 Unauthorized - token expired or invalid
        if (response.status === 401) {
          logger.warn('auth', 'Received 401 Unauthorized, clearing token', { endpoint });
          await this.clearToken();
          if (this.onUnauthorizedCallback) {
            this.onUnauthorizedCallback();
          }
        }

        // Handle 429 Rate Limit — surface a global toast/notification once
        if (response.status === 429) {
          logger.warn('api', 'Rate limit exceeded', { endpoint });
          if (this.onRateLimitCallback) {
            this.onRateLimitCallback({
              retryAfter: Number(response.headers.get('Retry-After')) || undefined,
            });
          }
        }

        // Handle 403 with upgrade_required - premium feature access denied
        if (response.status === 403 && data?.upgrade_required === true) {
          const premiumData = data as Types.PremiumErrorResponse;
          logger.warn('api', 'Premium feature access denied', {
            endpoint,
            feature: premiumData.feature,
            currentTier: premiumData.current_tier,
          });
          if (this.onUpgradeRequiredCallback) {
            this.onUpgradeRequiredCallback({
              feature: premiumData.feature,
              currentTier: premiumData.current_tier,
              limit: premiumData.limit,
            });
          }
        }

        // Attach HTTP status so callers can branch on it (409, 429, etc.)
        const error: Types.ApiError = data ?? { message: `HTTP ${response.status}` };
        error.status = response.status;
        throw error;
      }

      if (shouldLog) {
        logger.debug('api', `${method} ${endpoint} completed`, {
          status: response.status,
          duration,
        });
      }

      return { status: response.status, data: data as T | null };
    } catch (error) {
      const duration = Date.now() - startTime;
      if (shouldLog && !getErrorStatus(error)) {
        // Network error (not API error which has .status)
        logger.error('api', `${method} ${endpoint} network error`, {
          duration,
          error: getErrorMessage(error) || String(error),
          url: this.buildUrl(endpoint),
        });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
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
