import { logger } from './logger';
import type { HomeCtaAction, HomeSectionType, HomeConfigMeta } from '../types/api';

/**
 * Home screen analytics events.
 *
 * These events track user interactions with the dynamic Home screen.
 * All analytics payloads include the ai_generated flag from the config meta.
 */

interface BaseAnalyticsPayload {
  ai_generated: boolean;
  timestamp: string;
}

interface HomeLoadedPayload extends BaseAnalyticsPayload {
  sections_count: number;
  section_types: HomeSectionType[];
}

interface PrimaryCtaClickedPayload extends BaseAnalyticsPayload {
  action: HomeCtaAction;
  label: string;
}

interface SectionViewedPayload extends BaseAnalyticsPayload {
  section_type: HomeSectionType;
  section_title: string;
  section_priority: number;
}

interface SectionCtaClickedPayload extends BaseAnalyticsPayload {
  section_type: HomeSectionType;
  action: string;
}

/**
 * Home analytics service.
 * Emits events for tracking user interactions with the Home screen.
 *
 * In a production app, these would be sent to an analytics service
 * (e.g., Mixpanel, Amplitude, Firebase Analytics).
 *
 * For now, we log them using the logger service for debugging purposes.
 */
class HomeAnalyticsService {
  private meta: HomeConfigMeta | null = null;

  /**
   * Set the current config meta for analytics payloads.
   * Call this when the home config is loaded/updated.
   */
  setMeta(meta: HomeConfigMeta | null) {
    this.meta = meta;
  }

  private createBasePayload(): BaseAnalyticsPayload {
    return {
      ai_generated: this.meta?.ai_generated ?? false,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Emit when the home screen finishes loading.
   */
  homeLoaded(sectionTypes: HomeSectionType[]) {
    const payload: HomeLoadedPayload = {
      ...this.createBasePayload(),
      sections_count: sectionTypes.length,
      section_types: sectionTypes,
    };

    logger.info('general', 'home_loaded', payload);

    // In production, send to analytics service:
    // analytics.track('home_loaded', payload);
  }

  /**
   * Emit when the primary CTA is clicked.
   */
  primaryCtaClicked(action: HomeCtaAction, label: string) {
    const payload: PrimaryCtaClickedPayload = {
      ...this.createBasePayload(),
      action,
      label,
    };

    logger.info('general', 'primary_cta_clicked', payload);

    // In production, send to analytics service:
    // analytics.track('primary_cta_clicked', payload);
  }

  /**
   * Emit when a section becomes visible (scrolled into view).
   */
  sectionViewed(type: HomeSectionType, title: string, priority: number) {
    const payload: SectionViewedPayload = {
      ...this.createBasePayload(),
      section_type: type,
      section_title: title,
      section_priority: priority,
    };

    logger.info('general', 'section_viewed', payload);

    // In production, send to analytics service:
    // analytics.track('section_viewed', payload);
  }

  /**
   * Emit when a section's CTA is clicked.
   */
  sectionCtaClicked(type: HomeSectionType, action: string) {
    const payload: SectionCtaClickedPayload = {
      ...this.createBasePayload(),
      section_type: type,
      action,
    };

    logger.info('general', 'section_cta_clicked', payload);

    // In production, send to analytics service:
    // analytics.track('section_cta_clicked', payload);
  }
}

export const homeAnalytics = new HomeAnalyticsService();
