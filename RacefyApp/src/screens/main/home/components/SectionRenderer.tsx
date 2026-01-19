import React, { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { logger } from '../../../../services/logger';
import { homeAnalytics } from '../../../../services/homeAnalytics';
import type {
  HomeSection,
  HomeSectionType,
  Event,
} from '../../../../types/api';
import {
  // Original section types
  WeatherInsightSection,
  FriendActivitySection,
  LiveActivitySection,
  UpcomingEventSection,
  LastActivitySummarySection,
  WeeklyInsightSection,
  MotivationBannerSection,
  // New event-related section types
  LiveEventSection,
  EventResultsSection,
  NearbyEventsSection,
  FriendEventsSection,
  // UI-only sections (not from backend config)
  UpcomingEventsSection,
  AuthPromptSection,
  QuickActionsSection,
} from './sections';

/**
 * Data needed by various section types.
 * Only provide what's needed for the sections being rendered.
 */
interface SectionData {
  upcomingEvents?: Event[];
}

/**
 * Navigation callbacks for section interactions.
 */
interface SectionCallbacks {
  onEventPress: (eventId: number) => void;
  onActivityPress: (activityId: number) => void;
  onSignIn: () => void;
  onSignUp: () => void;
  onStartActivity: () => void;
  onCreatePost: () => void;
  onFindEvents: () => void;
  onSectionCtaPress: (section: HomeSection) => void;
}

interface SectionRendererProps {
  /** Sorted list of sections to render (sorted by priority) */
  sections: HomeSection[];
  /** Data for section content */
  data: SectionData;
  /** Navigation callbacks */
  callbacks: SectionCallbacks;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
}

/**
 * SectionRenderer component.
 *
 * Maps section types from the backend to their corresponding UI components.
 * This is the ONLY place where section type → component mapping occurs.
 *
 * Unknown section types are safely ignored (logged and skipped).
 */
export function SectionRenderer({
  sections,
  data,
  callbacks,
  isAuthenticated,
}: SectionRendererProps) {
  const viewedSections = useRef<Set<HomeSectionType>>(new Set());

  // Track section views for analytics
  const trackSectionView = useCallback((section: HomeSection) => {
    if (!viewedSections.current.has(section.type)) {
      viewedSections.current.add(section.type);
      homeAnalytics.sectionViewed(section.type, section.title, section.priority);
    }
  }, []);

  // Track all sections as viewed when they mount
  useEffect(() => {
    sections.forEach(trackSectionView);
  }, [sections, trackSectionView]);

  /**
   * Render a single section based on its type.
   * Returns null for unknown section types (safe fallback).
   */
  const renderSection = (section: HomeSection): React.ReactNode => {
    const handleCtaPress = () => callbacks.onSectionCtaPress(section);

    switch (section.type) {
      case 'live_activity':
        return (
          <LiveActivitySection
            key={section.type}
            section={section}
            onPress={section.cta ? handleCtaPress : undefined}
          />
        );

      case 'weather_insight':
        return (
          <WeatherInsightSection
            key={section.type}
            section={section}
            onPress={section.cta ? handleCtaPress : undefined}
          />
        );

      case 'last_activity_summary':
        return (
          <LastActivitySummarySection
            key={section.type}
            section={section}
            onPress={section.cta ? handleCtaPress : undefined}
          />
        );

      case 'weekly_insight':
        return (
          <WeeklyInsightSection
            key={section.type}
            section={section}
            onPress={section.cta ? handleCtaPress : undefined}
          />
        );

      case 'motivation_banner':
        return (
          <MotivationBannerSection
            key={section.type}
            section={section}
            onPress={section.cta ? handleCtaPress : undefined}
          />
        );

      case 'friend_activity':
        return (
          <FriendActivitySection
            key={section.type}
            section={section}
            onPress={section.cta ? handleCtaPress : undefined}
            onActivityPress={callbacks.onActivityPress}
          />
        );

      case 'upcoming_event':
        return (
          <UpcomingEventSection
            key={section.type}
            section={section}
            onPress={section.cta ? handleCtaPress : undefined}
            onEventPress={callbacks.onEventPress}
          />
        );

      case 'live_event':
        return (
          <LiveEventSection
            key={section.type}
            section={section}
            onPress={section.cta ? handleCtaPress : undefined}
            onEventPress={callbacks.onEventPress}
          />
        );

      case 'event_results':
        return (
          <EventResultsSection
            key={section.type}
            section={section}
            onPress={section.cta ? handleCtaPress : undefined}
            onEventPress={callbacks.onEventPress}
          />
        );

      case 'nearby_events':
        return (
          <NearbyEventsSection
            key={section.type}
            section={section}
            onPress={section.cta ? handleCtaPress : undefined}
            onEventPress={callbacks.onEventPress}
          />
        );

      case 'friend_events':
        return (
          <FriendEventsSection
            key={section.type}
            section={section}
            onPress={section.cta ? handleCtaPress : undefined}
            onEventPress={callbacks.onEventPress}
          />
        );

      case 'upcoming_events':
        // UI-only section - uses local data
        return (
          <UpcomingEventsSection
            key={section.type}
            section={section}
            events={data.upcomingEvents || []}
            onEventPress={callbacks.onEventPress}
          />
        );

      case 'auth_prompt':
        // Only render auth prompt for non-authenticated users
        if (isAuthenticated) {
          return null;
        }
        return (
          <AuthPromptSection
            key={section.type}
            section={section}
            onSignIn={callbacks.onSignIn}
            onSignUp={callbacks.onSignUp}
          />
        );

      case 'quick_actions':
        return (
          <QuickActionsSection
            key={section.type}
            section={section}
            isAuthenticated={isAuthenticated}
            onStartActivity={callbacks.onStartActivity}
            onCreatePost={callbacks.onCreatePost}
            onFindEvents={callbacks.onFindEvents}
          />
        );

      default:
        // Unknown section type - log and skip
        logger.warn('general', `Unknown section type: ${(section as any).type}`, { section });
        return null;
    }
  };

  return (
    <View>
      {sections.map(renderSection)}
    </View>
  );
}

/**
 * Get the component name for a section type.
 * Useful for debugging and analytics.
 */
export function getSectionComponentName(type: HomeSectionType): string {
  const mapping: Record<HomeSectionType, string> = {
    // Original section types
    weather_insight: 'WeatherInsightSection',
    friend_activity: 'FriendActivitySection',
    live_activity: 'LiveActivitySection',
    upcoming_event: 'UpcomingEventSection',
    last_activity_summary: 'LastActivitySummarySection',
    weekly_insight: 'WeeklyInsightSection',
    motivation_banner: 'MotivationBannerSection',
    // New event-related section types
    live_event: 'LiveEventSection',
    event_results: 'EventResultsSection',
    nearby_events: 'NearbyEventsSection',
    friend_events: 'FriendEventsSection',
    // UI-only sections
    upcoming_events: 'UpcomingEventsSection',
    auth_prompt: 'AuthPromptSection',
    quick_actions: 'QuickActionsSection',
  };

  return mapping[type] || 'UnknownSection';
}
