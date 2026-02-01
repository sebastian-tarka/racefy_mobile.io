/**
 * Logger Configuration
 *
 * Environment-based logging configuration for development debugging.
 * All settings can be controlled via .env file.
 */

import Constants from 'expo-constants';

// Get config from app.config.ts extra field
const extra = Constants.expoConfig?.extra ?? {};

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory = 'gps' | 'api' | 'auth' | 'activity' | 'navigation' | 'general' | 'home' | 'training'| 'commentary';

// Log level priority (lower = more verbose)
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface LoggerConfig {
  /** Master switch - disables all logging when false */
  enabled: boolean;
  /** Minimum log level to capture */
  level: LogLevel;
  /** Whether to persist logs to local storage */
  persist: boolean;
  /** Maximum number of log entries to keep */
  maxEntries: number;
  /** Categories to log ('all' or specific categories) */
  categories: LogCategory[] | 'all';
  /** Whether to also output to console */
  consoleOutput: boolean;
}

/**
 * Parse categories from env string
 * Accepts: 'all', 'gps,api,auth', etc.
 */
function parseCategories(value: string | undefined): LogCategory[] | 'all' {
  if (!value || value === 'all') return 'all';

  const validCategories: LogCategory[] = ['gps', 'api', 'auth', 'activity', 'navigation', 'general'];
  const parsed = value.split(',').map(s => s.trim().toLowerCase()) as LogCategory[];

  return parsed.filter(cat => validCategories.includes(cat));
}

/**
 * Parse log level from env string
 */
function parseLogLevel(value: string | undefined): LogLevel {
  const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  const level = value?.toLowerCase() as LogLevel;

  return validLevels.includes(level) ? level : 'debug';
}

/**
 * Get logger configuration from environment
 */
export function getLoggerConfig(): LoggerConfig {
  // Default: enabled in dev mode, disabled in production
  const enabled = extra.logEnabled !== undefined
    ? extra.logEnabled === true
    : __DEV__;

  return {
    enabled,
    level: parseLogLevel(extra.logLevel),
    persist: extra.logPersist !== false, // Default true
    maxEntries: extra.logMaxEntries || 2000,
    categories: parseCategories(extra.logCategories),
    consoleOutput: extra.logConsoleOutput !== false, // Default true in dev
  };
}

/**
 * Check if a log should be captured based on current config
 */
export function shouldLog(
  config: LoggerConfig,
  level: LogLevel,
  category: LogCategory
): boolean {
  if (!config.enabled) return false;

  // Check level
  if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[config.level]) {
    return false;
  }

  // Check category
  if (config.categories !== 'all' && !config.categories.includes(category)) {
    return false;
  }

  return true;
}

// Export singleton config
export const loggerConfig = getLoggerConfig();
