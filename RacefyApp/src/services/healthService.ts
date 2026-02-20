import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';
import type { HeartRateSample, HealthDataSource } from '../types/api';

const HEALTH_SYNC_KEY = '@racefy_health_sync_enabled';

// ============ TYPES ============

export type HealthServiceStatus = 'available' | 'not_available' | 'not_installed';

export interface HealthService {
  isAvailable(): Promise<boolean>;
  requestHeartRatePermission(): Promise<boolean>;
  hasHeartRatePermission(): Promise<boolean>;
  getHeartRateSamples(startTime: Date, endTime: Date): Promise<HeartRateSample[]>;
  getStatus(): Promise<HealthServiceStatus>;
  getSource(): HealthDataSource;
}

// ============ UTILITY FUNCTIONS ============

export async function isHealthSyncEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(HEALTH_SYNC_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function setHealthSyncEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(HEALTH_SYNC_KEY, enabled ? 'true' : 'false');
  } catch (error) {
    logger.error('general', 'Failed to save health sync setting', { error });
  }
}

/**
 * Downsample HR data using LTTB-like approach to reduce payload size.
 * Keeps first and last samples, selects evenly-spaced representative samples.
 */
export function downsampleIfNeeded(
  samples: HeartRateSample[],
  maxSamples: number = 5000,
): HeartRateSample[] {
  if (samples.length <= maxSamples) {
    return samples;
  }

  const result: HeartRateSample[] = [samples[0]];
  const step = (samples.length - 2) / (maxSamples - 2);

  for (let i = 1; i < maxSamples - 1; i++) {
    const index = Math.round(1 + i * step);
    result.push(samples[index]);
  }

  result.push(samples[samples.length - 1]);
  return result;
}

/**
 * Wrap a promise with a timeout.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Health data query timed out')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

// ============ HEALTH CONNECT (Android) ============

class HealthConnectService implements HealthService {
  private sdk: typeof import('react-native-health-connect') | null = null;

  private async getSdk() {
    if (!this.sdk) {
      this.sdk = await import('react-native-health-connect');
    }
    return this.sdk;
  }

  getSource(): HealthDataSource {
    return 'health_connect';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const sdk = await this.getSdk();
      const status = await sdk.getSdkStatus();
      return status === sdk.SdkAvailabilityStatus.SDK_AVAILABLE;
    } catch (error) {
      logger.debug('general', 'Health Connect not available', { error });
      return false;
    }
  }

  async getStatus(): Promise<HealthServiceStatus> {
    try {
      const sdk = await this.getSdk();
      const status = await sdk.getSdkStatus();
      if (status === sdk.SdkAvailabilityStatus.SDK_AVAILABLE) {
        return 'available';
      }
      if (status === sdk.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
        return 'not_installed';
      }
      return 'not_available';
    } catch {
      return 'not_available';
    }
  }

  async requestHeartRatePermission(): Promise<boolean> {
    try {
      const sdk = await this.getSdk();
      await sdk.initialize();
      const granted = await sdk.requestPermission([
        { accessType: 'read', recordType: 'HeartRate' },
      ]);
      const hasHr = granted.some(
        (p: any) => p.recordType === 'HeartRate' && p.accessType === 'read',
      );
      logger.info('general', 'Health Connect HR permission result', { granted: hasHr });
      return hasHr;
    } catch (error) {
      logger.error('general', 'Failed to request Health Connect permission', { error });
      return false;
    }
  }

  async hasHeartRatePermission(): Promise<boolean> {
    try {
      const sdk = await this.getSdk();
      await sdk.initialize();
      const granted = await sdk.requestPermission([
        { accessType: 'read', recordType: 'HeartRate' },
      ]);
      return granted.some(
        (p: any) => p.recordType === 'HeartRate' && p.accessType === 'read',
      );
    } catch {
      return false;
    }
  }

  async getHeartRateSamples(startTime: Date, endTime: Date): Promise<HeartRateSample[]> {
    try {
      const sdk = await this.getSdk();
      await sdk.initialize();

      const result = await withTimeout(
        sdk.readRecords('HeartRate', {
          timeRangeFilter: {
            operator: 'between',
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
          },
        }),
        10000,
      );

      const samples: HeartRateSample[] = [];
      for (const record of result.records) {
        if (record.samples) {
          for (const sample of record.samples) {
            samples.push({
              timestamp: sample.time,
              bpm: Math.round(sample.beatsPerMinute),
            });
          }
        }
      }

      // Sort by timestamp
      samples.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      logger.info('general', 'Health Connect HR samples retrieved', {
        count: samples.length,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      return downsampleIfNeeded(samples);
    } catch (error) {
      logger.error('general', 'Failed to read Health Connect HR data', { error });
      return [];
    }
  }
}

// ============ HEALTHKIT (iOS) ============

class HealthKitService implements HealthService {
  private hk: typeof import('react-native-health') | null = null;

  private async getHk() {
    if (!this.hk) {
      this.hk = await import('react-native-health');
    }
    return this.hk;
  }

  getSource(): HealthDataSource {
    return 'apple_health';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const hk = await this.getHk();
      return new Promise((resolve) => {
        hk.default.isAvailable((err: any, available: boolean) => {
          resolve(!err && available);
        });
      });
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<HealthServiceStatus> {
    const available = await this.isAvailable();
    return available ? 'available' : 'not_available';
  }

  async requestHeartRatePermission(): Promise<boolean> {
    try {
      const hk = await this.getHk();
      const permissions = {
        permissions: {
          read: [hk.HealthPermission.HeartRate],
          write: [] as any[],
        },
      };

      return new Promise((resolve) => {
        hk.default.initHealthKit(permissions, (err: any) => {
          if (err) {
            logger.error('general', 'Failed to init HealthKit', { error: err });
            resolve(false);
            return;
          }
          logger.info('general', 'HealthKit HR permission granted');
          resolve(true);
        });
      });
    } catch (error) {
      logger.error('general', 'Failed to request HealthKit permission', { error });
      return false;
    }
  }

  async hasHeartRatePermission(): Promise<boolean> {
    // HealthKit doesn't have a direct "check permission" API.
    // We attempt to init and see if it succeeds.
    return this.requestHeartRatePermission();
  }

  async getHeartRateSamples(startTime: Date, endTime: Date): Promise<HeartRateSample[]> {
    try {
      const hk = await this.getHk();

      const samples: HeartRateSample[] = await withTimeout(
        new Promise((resolve, reject) => {
          hk.default.getHeartRateSamples(
            {
              startDate: startTime.toISOString(),
              endDate: endTime.toISOString(),
              ascending: true,
            },
            (err: any, results: any[]) => {
              if (err) {
                reject(err);
                return;
              }
              resolve(
                (results || []).map((r: any) => ({
                  timestamp: r.startDate || r.endDate,
                  bpm: Math.round(r.value),
                })),
              );
            },
          );
        }),
        10000,
      );

      logger.info('general', 'HealthKit HR samples retrieved', {
        count: samples.length,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      return downsampleIfNeeded(samples);
    } catch (error) {
      logger.error('general', 'Failed to read HealthKit HR data', { error });
      return [];
    }
  }
}

// ============ NULL SERVICE (Web / Fallback) ============

class NullHealthService implements HealthService {
  getSource(): HealthDataSource {
    return 'health_connect';
  }

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async getStatus(): Promise<HealthServiceStatus> {
    return 'not_available';
  }

  async requestHeartRatePermission(): Promise<boolean> {
    return false;
  }

  async hasHeartRatePermission(): Promise<boolean> {
    return false;
  }

  async getHeartRateSamples(): Promise<HeartRateSample[]> {
    return [];
  }
}

// ============ SERVICE FACTORY ============

function createHealthService(): HealthService {
  if (Platform.OS === 'android') {
    return new HealthConnectService();
  }
  if (Platform.OS === 'ios') {
    return new HealthKitService();
  }
  return new NullHealthService();
}

export const healthService = createHealthService();
