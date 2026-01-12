import { logger } from './logger';
import { api } from './api';

/**
 * MapboxAnalytics - Tracks Mapbox SDK usage to help monitor costs
 * Reports map loads to backend for usage tracking and cost management
 */
class MapboxAnalytics {
  private pendingReports: Array<{
    activityId: number;
    timestamp: string;
    mapType: 'interactive' | 'static';
  }> = [];

  private reportInterval: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly REPORT_INTERVAL_MS = 30000; // Report every 30 seconds

  constructor() {
    // Start periodic reporting
    this.startPeriodicReporting();
  }

  /**
   * Track when a Mapbox map is loaded (interactive SDK)
   */
  trackMapLoad(activityId: number) {
    const report = {
      activityId,
      timestamp: new Date().toISOString(),
      mapType: 'interactive' as const,
    };

    this.pendingReports.push(report);
    logger.debug('api', 'Mapbox map load tracked', { activityId, queueSize: this.pendingReports.length });

    // If we hit batch size, send immediately
    if (this.pendingReports.length >= this.BATCH_SIZE) {
      this.sendPendingReports();
    }
  }

  /**
   * Track when a static map image is displayed
   * (Backend already tracks generation, but this helps with client-side analytics)
   */
  trackStaticMapView(activityId: number) {
    const report = {
      activityId,
      timestamp: new Date().toISOString(),
      mapType: 'static' as const,
    };

    this.pendingReports.push(report);

    if (this.pendingReports.length >= this.BATCH_SIZE) {
      this.sendPendingReports();
    }
  }

  /**
   * Send pending reports to backend
   */
  private async sendPendingReports() {
    if (this.pendingReports.length === 0) return;

    const reportsToSend = [...this.pendingReports];
    this.pendingReports = [];

    try {
      await api.reportMapUsage(reportsToSend);
      logger.info('api', 'Map usage reports sent', { count: reportsToSend.length });
    } catch (error) {
      logger.error('api', 'Failed to send map usage reports', { error, count: reportsToSend.length });
      // Don't re-queue failed reports to avoid memory buildup
    }
  }

  /**
   * Start periodic reporting (every 30 seconds)
   */
  private startPeriodicReporting() {
    if (this.reportInterval) return;

    this.reportInterval = setInterval(() => {
      this.sendPendingReports();
    }, this.REPORT_INTERVAL_MS);
  }

  /**
   * Stop periodic reporting (cleanup)
   */
  stopPeriodicReporting() {
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }
  }

  /**
   * Force send any pending reports (e.g., before app closes)
   */
  async flush() {
    await this.sendPendingReports();
  }
}

export const mapboxAnalytics = new MapboxAnalytics();