/**
 * Development Logger Service
 *
 * A comprehensive logging system for development that:
 * - Stores logs locally using AsyncStorage
 * - Can be enabled/disabled via environment variables
 * - Supports different log levels and categories
 * - Allows sending logs to API on demand
 * - Auto-rotates logs to prevent storage bloat
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import {
  loggerConfig,
  shouldLog,
  type LogLevel,
  type LogCategory,
  type LoggerConfig,
} from '../config/logger.config';

// Storage key for logs
const LOGS_STORAGE_KEY = '@racefy_debug_logs';
const SESSION_ID_KEY = '@racefy_session_id';

// Sensitive field patterns to redact (case-insensitive)
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /credential/i,
  /authorization/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /bearer/i,
  /cookie/i,
  /session/i,
];

// Fields that might contain PII but we want to keep type info
const PII_PATTERNS = [
  /email/i,
  /phone/i,
  /address/i,
];

const REDACTED = '[REDACTED]';

/**
 * Check if a field name matches sensitive patterns
 */
function isSensitiveField(fieldName: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(fieldName));
}

/**
 * Check if a field name matches PII patterns
 */
function isPiiField(fieldName: string): boolean {
  return PII_PATTERNS.some(pattern => pattern.test(fieldName));
}

/**
 * Sanitize a value, redacting sensitive content
 */
function sanitizeValue(key: string, value: any, depth: number = 0): any {
  // Prevent infinite recursion
  if (depth > 10) return '[MAX_DEPTH]';

  // Redact sensitive fields entirely
  if (isSensitiveField(key)) {
    return REDACTED;
  }

  // For PII fields, keep type info but redact value
  if (isPiiField(key) && typeof value === 'string') {
    return `[REDACTED:${value.length} chars]`;
  }

  // Handle null/undefined
  if (value === null || value === undefined) {
    return value;
  }

  // Handle Error objects specially
  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeString(value.message),
      stack: value.stack ? '[STACK_TRACE]' : undefined,
    };
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeValue(String(index), item, depth + 1));
  }

  // Handle objects
  if (typeof value === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      sanitized[k] = sanitizeValue(k, v, depth + 1);
    }
    return sanitized;
  }

  // Handle strings - check for embedded sensitive data
  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  // Return primitives as-is
  return value;
}

/**
 * Sanitize a string, redacting potential embedded secrets
 */
function sanitizeString(str: string): string {
  // Redact Bearer tokens
  let sanitized = str.replace(/Bearer\s+[A-Za-z0-9\-_]+\.?[A-Za-z0-9\-_]*\.?[A-Za-z0-9\-_]*/gi, 'Bearer [REDACTED]');

  // Redact JWT-like patterns (xxx.xxx.xxx)
  sanitized = sanitized.replace(/eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g, '[JWT_REDACTED]');

  // Redact API key patterns
  sanitized = sanitized.replace(/api[_-]?key[=:]\s*["']?[A-Za-z0-9\-_]+["']?/gi, 'api_key=[REDACTED]');

  return sanitized;
}

/**
 * Sanitize entire context object
 */
function sanitizeContext(context: Record<string, any> | undefined): Record<string, any> | undefined {
  if (!context) return undefined;
  return sanitizeValue('root', context, 0) as Record<string, any>;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  context?: Record<string, any>;
  stack_trace?: string;
}

export interface DeviceInfo {
  platform: 'android' | 'ios' | 'web';
  osVersion: string;
  appVersion: string;
  deviceModel: string;
  deviceId: string;
}

export interface LogsPayload {
  device_info: {
    platform: string;
    os_version: string;
    app_version: string;
    device_model: string;
    device_id: string;
  };
  session_id: string;
  logs: Array<{
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: Record<string, any>;
    stack_trace?: string;
  }>;
}

class Logger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private sessionId: string = '';
  private isInitialized: boolean = false;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.config = loggerConfig;
    this.initialize();
  }

  /**
   * Initialize logger - load existing logs and session
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Generate or restore session ID
      const storedSessionId = await AsyncStorage.getItem(SESSION_ID_KEY);
      if (storedSessionId) {
        this.sessionId = storedSessionId;
      } else {
        this.sessionId = this.generateSessionId();
        await AsyncStorage.setItem(SESSION_ID_KEY, this.sessionId);
      }

      // Load existing logs
      if (this.config.persist) {
        const storedLogs = await AsyncStorage.getItem(LOGS_STORAGE_KEY);
        if (storedLogs) {
          this.logs = JSON.parse(storedLogs);
        }
      }

      this.isInitialized = true;

      // Log initialization
      this.info('general', 'Logger initialized', {
        sessionId: this.sessionId,
        config: {
          enabled: this.config.enabled,
          level: this.config.level,
          persist: this.config.persist,
          maxEntries: this.config.maxEntries,
          categories: this.config.categories,
        },
      });
    } catch (error) {
      console.error('[Logger] Failed to initialize:', error);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, category: LogCategory, message: string, context?: Record<string, any>): void {
    if (!shouldLog(this.config, level, category)) return;

    // Sanitize context and message to remove sensitive data
    const sanitizedContext = sanitizeContext(context);
    const sanitizedMessage = sanitizeString(message);

    // Include category in message for API (category is app-internal concept)
    const fullMessage = `[${category}] ${sanitizedMessage}`;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message: fullMessage,
      context: sanitizedContext,
    };

    // Add to in-memory logs
    this.logs.push(entry);

    // Console output
    if (this.config.consoleOutput) {
      const prefix = `[${level.toUpperCase()}][${category}]`;
      const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      if (context) {
        console[consoleMethod](prefix, message, context);
      } else {
        console[consoleMethod](prefix, message);
      }
    }

    // Rotate logs if needed
    if (this.logs.length > this.config.maxEntries) {
      this.logs = this.logs.slice(-this.config.maxEntries);
    }

    // Debounced save to storage
    if (this.config.persist) {
      this.debouncedSave();
    }
  }

  /**
   * Debounced save to prevent too many writes
   */
  private debouncedSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveToStorage();
    }, 1000);
  }

  /**
   * Save logs to AsyncStorage
   */
  private async saveToStorage(): Promise<void> {
    try {
      await AsyncStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error('[Logger] Failed to save logs:', error);
    }
  }

  // ============ PUBLIC API ============

  /**
   * Log at debug level
   */
  debug(category: LogCategory, message: string, context?: Record<string, any>): void {
    this.log('debug', category, message, context);
  }

  /**
   * Log at info level
   */
  info(category: LogCategory, message: string, context?: Record<string, any>): void {
    this.log('info', category, message, context);
  }

  /**
   * Log at warn level
   */
  warn(category: LogCategory, message: string, context?: Record<string, any>): void {
    this.log('warn', category, message, context);
  }

  /**
   * Log at error level
   */
  error(category: LogCategory, message: string, context?: Record<string, any>): void {
    this.log('error', category, message, context);
  }

  // ============ CATEGORY SHORTCUTS ============

  /**
   * GPS logging shortcut
   */
  gps(message: string, context?: Record<string, any>): void {
    this.debug('gps', message, context);
  }

  /**
   * API logging shortcut
   */
  api(message: string, context?: Record<string, any>): void {
    this.debug('api', message, context);
  }

  /**
   * Auth logging shortcut
   */
  auth(message: string, context?: Record<string, any>): void {
    this.info('auth', message, context);
  }

  /**
   * Activity logging shortcut
   */
  activity(message: string, context?: Record<string, any>): void {
    this.debug('activity', message, context);
  }

  /**
   * Navigation logging shortcut
   */
  nav(message: string, context?: Record<string, any>): void {
    this.debug('navigation', message, context);
  }

  // ============ LOG MANAGEMENT ============

  /**
   * Get all stored logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get logs filtered by category
   */
  getLogsByCategory(category: LogCategory): LogEntry[] {
    return this.logs.filter(log => log.category === category);
  }

  /**
   * Get logs count
   */
  getLogsCount(): number {
    return this.logs.length;
  }

  /**
   * Clear all logs
   */
  async clearLogs(): Promise<void> {
    this.logs = [];
    try {
      await AsyncStorage.removeItem(LOGS_STORAGE_KEY);
      this.info('general', 'Logs cleared');
    } catch (error) {
      console.error('[Logger] Failed to clear logs:', error);
    }
  }

  /**
   * Start new session (clears session ID)
   */
  async startNewSession(): Promise<void> {
    this.sessionId = this.generateSessionId();
    await AsyncStorage.setItem(SESSION_ID_KEY, this.sessionId);
    this.info('general', 'New session started', { sessionId: this.sessionId });
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get device information
   */
  getDeviceInfo(): DeviceInfo {
    // Generate a unique device ID from available info
    const deviceId = `${Device.modelName || 'unknown'}-${Device.osInternalBuildId || Device.osBuildId || 'unknown'}`;

    return {
      platform: Platform.OS as 'android' | 'ios' | 'web',
      osVersion: Platform.Version?.toString() || 'unknown',
      appVersion: Application.nativeApplicationVersion || '1.0.0',
      deviceModel: Device.modelName || 'unknown',
      deviceId,
    };
  }

  /**
   * Prepare logs payload for API
   */
  prepareLogsPayload(): LogsPayload {
    const deviceInfo = this.getDeviceInfo();

    // Map logs to API format (remove internal category field)
    const apiLogs = this.logs.map(log => ({
      timestamp: log.timestamp,
      level: log.level,
      message: log.message,
      context: log.context,
      stack_trace: log.stack_trace,
    }));

    return {
      device_info: {
        platform: deviceInfo.platform,
        os_version: deviceInfo.osVersion,
        app_version: deviceInfo.appVersion,
        device_model: deviceInfo.deviceModel,
        device_id: deviceInfo.deviceId,
      },
      session_id: this.sessionId,
      logs: apiLogs,
    };
  }

  /**
   * Check if logging is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get current config
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types
export type { LogLevel, LogCategory, LoggerConfig };
