import type { RealtimeConfig } from './live';

// ============ DEBUG LOGS ============

export type DebugLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface DebugLogEntry {
  timestamp: string;
  level: DebugLogLevel;
  message: string;
  context?: Record<string, any>;
  stack_trace?: string;
}

export interface DebugLogsRequest {
  device_info: {
    platform: string;
    os_version: string;
    app_version: string;
    device_model: string;
    device_id: string;
  };
  session_id: string;
  logs: DebugLogEntry[];
}

export interface DebugLogsResponse {
  message: string;
  log_reference: string;
}

// ============ BRAND ASSETS ============

export interface BrandAsset {
  filename: string;
  url: string;
  type: string;
  size: number;
  category: string;
  variant: string;
}

export type BrandAssetVariant = 'default' | 'dark' | 'light';
export type BrandAssetCategory = 'logo-full' | 'logo-icon' | 'logo-text';

export interface BrandAssetsResponse {
  data: Record<BrandAssetCategory, Record<BrandAssetVariant, BrandAsset>>;
  meta: {
    base_url: string;
    total_assets: number;
  };
}

export interface BrandAssetResponse {
  data: BrandAsset;
}

// ============ APP CONFIG (Public) ============

export type PushProvider = 'expo' | 'fcm';

export interface AppConfigPush {
  /** Which push provider the server expects: 'expo' or 'fcm' */
  provider: PushProvider;
  /** Which Expo method to use: 'getExpoPushTokenAsync' or 'getDevicePushTokenAsync' */
  token_method: 'getExpoPushTokenAsync' | 'getDevicePushTokenAsync';
}

export interface AppConfigMaintenance {
  enabled: boolean;
  message: string | null;
  estimated_end: string | null;
}

export interface AppUpdateConfig {
  /** Latest available version (used for soft update prompt). */
  current_version: string;
  /** Below this version the app is blocked. */
  minimum_version: string;
  /** Store URL the user is sent to when tapping "Update". May be empty. */
  update_url: string;
  /** Soft-update banner message (already localized by backend via Accept-Language). */
  update_message?: string;
  /** Force-update screen message (already localized by backend via Accept-Language). */
  force_update_message?: string;
  /**
   * Server-side decision: when true, the running version must be blocked.
   * Client also compares versions as a fallback when this flag is missing.
   */
  force_update?: boolean;
}

export interface AppConfigFeatures {
  event_entry_fee: boolean;
}

export interface AppConfigResponse {
  push: AppConfigPush;
  maintenance: AppConfigMaintenance;
  /** Optional — when omitted, version checking is disabled client-side. */
  update?: AppUpdateConfig;
  /** Feature flags — controlled by admin panel. */
  features?: AppConfigFeatures;
  /**
   * Realtime transport for live broadcasting. Optional so an older backend
   * simply reads as "no realtime"; callers should default to polling.
   */
  realtime?: RealtimeConfig;
}

export interface AppConfigQuery {
  platform: 'ios' | 'android';
  app_version: string;
}
