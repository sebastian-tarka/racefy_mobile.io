import React, {useCallback, useMemo} from 'react';
import {Pressable, StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {useTheme} from '../../../../hooks/useTheme';
import {logger} from '../../../../services/logger';
import {borderRadius, fontSize, fontWeight, spacing} from '../../../../theme';
import type {
  HomeActionPayload,
  HomeCtaAction,
  HomePrimaryCta,
  HomeSection,
  HomeSectionAction,
  TodaysTrainingSessionMeta,
} from '../../../../types/api';

type GradientPair = readonly [string, string];
type TimeOfDay = 'dawn' | 'morning' | 'day' | 'evening' | 'dusk' | 'night';

const ATMOSPHERE_CONDITIONS = new Set([
  'Mist', 'Smoke', 'Haze', 'Dust', 'Fog', 'Sand', 'Ash', 'Squall', 'Tornado',
]);

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 16) return 'day';
  if (hour >= 16 && hour < 19) return 'evening';
  if (hour >= 19 && hour < 22) return 'dusk';
  return 'night';
}

const PALETTE: Record<TimeOfDay, Record<string, GradientPair>> = {
  dawn: {
    Clear: ['#f59e0b', '#7c3aed'],
    Clouds: ['#a78bfa', '#475569'],
    Rain: ['#475569', '#1e293b'],
    Drizzle: ['#64748b', '#334155'],
    Thunderstorm: ['#312e81', '#0f172a'],
    Snow: ['#cbd5e1', '#475569'],
    atmosphere: ['#94a3b8', '#475569'],
  },
  morning: {
    Clear: ['#10b981', '#0891b2'],
    Clouds: ['#475569', '#0f766e'],
    Rain: ['#475569', '#1e3a8a'],
    Drizzle: ['#6366f1', '#1e3a8a'],
    Thunderstorm: ['#4c1d95', '#0c0a09'],
    Snow: ['#7dd3fc', '#0891b2'],
    atmosphere: ['#94a3b8', '#475569'],
  },
  day: {
    Clear: ['#10b981', '#047857'],
    Clouds: ['#0891b2', '#475569'],
    Rain: ['#1e40af', '#1e293b'],
    Drizzle: ['#3b82f6', '#1e40af'],
    Thunderstorm: ['#312e81', '#0f172a'],
    Snow: ['#7dd3fc', '#0369a1'],
    atmosphere: ['#64748b', '#334155'],
  },
  evening: {
    Clear: ['#f97316', '#7c2d12'],
    Clouds: ['#9333ea', '#1e1b4b'],
    Rain: ['#1e3a8a', '#0f172a'],
    Drizzle: ['#3730a3', '#1e1b4b'],
    Thunderstorm: ['#1e1b4b', '#020617'],
    Snow: ['#c7d2fe', '#3730a3'],
    atmosphere: ['#475569', '#1e293b'],
  },
  dusk: {
    Clear: ['#7c3aed', '#1e1b4b'],
    Clouds: ['#4338ca', '#1e1b4b'],
    Rain: ['#1e1b4b', '#020617'],
    Drizzle: ['#3730a3', '#0f172a'],
    Thunderstorm: ['#1e1b4b', '#000000'],
    Snow: ['#a5b4fc', '#1e1b4b'],
    atmosphere: ['#334155', '#020617'],
  },
  night: {
    Clear: ['#1e293b', '#020617'],
    Clouds: ['#1e1b4b', '#020617'],
    Rain: ['#0f172a', '#020617'],
    Drizzle: ['#0f172a', '#020617'],
    Thunderstorm: ['#020617', '#000000'],
    Snow: ['#1e293b', '#0f172a'],
    atmosphere: ['#1e293b', '#020617'],
  },
};

function getWeatherGradient(
  condition: string | undefined,
  hour: number,
): GradientPair | null {
  if (!condition) return null;
  const tod = getTimeOfDay(hour);
  const key = ATMOSPHERE_CONDITIONS.has(condition) ? 'atmosphere' : condition;
  return PALETTE[tod][key] ?? null;
}

/**
 * Optional rich-content for the primary CTA, fed from the
 * `todays_training_session` section in /home/config.
 * When provided, the CTA renders an enriched layout (overline + title
 * + subtitle + tags). Missing fields gracefully fall back to the simple
 * label/subtitle from `cta`.
 */
export interface PrimaryCtaHero {
  label?: string;
  title?: string;
  message?: string;
  cta?: string | null;
  action?: HomeSectionAction;
  meta?: TodaysTrainingSessionMeta;
}

interface PrimaryCtaProps {
  cta: HomePrimaryCta;
  hero?: PrimaryCtaHero;
  /** Weather payload from the `weather_insight` section (OpenWeather `main`). */
  weather?: HomeSection['weather'];
  onPress: (action: HomeCtaAction | string, payload?: HomeActionPayload) => void;
  onLongPress?: (action: HomeCtaAction | string) => void;
}

/**
 * Get icon for CTA action.
 * Icons are hardcoded client-side as they don't change based on backend logic.
 */
function getIconForAction(action: HomeCtaAction | string): keyof typeof Ionicons.glyphMap {
  switch (action) {
    case 'start_activity':
    case 'start_planned_training':
    case 'resume_training':
      return 'play-circle';
    case 'view_events':
      return 'calendar';
    case 'view_feed':
      return 'newspaper';
    case 'view_training_week':
      return 'list-circle';
    case 'view_goal':
      return 'flag';
    case 'register':
      return 'person-add';
    default:
      return 'arrow-forward-circle';
  }
}

/**
 * Primary CTA component for the Home screen.
 * Renders a prominent call-to-action button based on backend configuration.
 *
 * When `hero` props are provided (from `todays_training_session` section),
 * an enriched layout shows an overline, large title, subtitle and tag pills
 * above the action row.
 */
export function PrimaryCTA({ cta, hero, weather, onPress, onLongPress }: PrimaryCtaProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  // Linear scaling vs. a 375pt baseline, capped 1.3× on large screens.
  const scale = Math.min(width / 375, 1.3);
  const iconSize = Math.round(44 * scale);
  const iconBox = Math.round(56 * scale);

  const gradientColors = useMemo<GradientPair>(() => {
    const dynamic = getWeatherGradient(weather?.condition, new Date().getHours());
    return dynamic ?? [colors.primary, colors.primaryDark];
  }, [weather?.condition, colors.primary, colors.primaryDark]);

  // Resolve effective action + payload: section.action wins over cta if present.
  const resolvedAction = hero?.action?.type ?? cta.action;
  const resolvedPayload = hero?.action?.payload ?? cta.payload;
  const ctaLabel = hero?.cta || cta.label;
  const subtitle = hero?.message ?? cta.subtitle;

  const handlePress = useCallback(() => {
    onPress(resolvedAction, resolvedPayload);
  }, [resolvedAction, resolvedPayload, onPress]);

  const handleLongPress = useCallback(() => {
    logger.debug('navigation', 'PrimaryCTA long press', { action: resolvedAction });
    onLongPress?.(resolvedAction);
  }, [resolvedAction, onLongPress]);

  const icon = getIconForAction(resolvedAction);
  const isHero = Boolean(hero && (hero.label || hero.title || hero.meta));

  const tags = useMemo(() => hero?.meta?.tags?.filter(Boolean) ?? [], [hero?.meta?.tags]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { shadowColor: colors.primary, opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={handlePress}
      onLongPress={onLongPress ? handleLongPress : undefined}
      delayLongPress={350}
      android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false }}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, isHero && styles.gradientHero]}
      >
        {isHero ? (
          <View style={styles.heroContent}>
            {(hero?.label || hero?.meta?.program_name) && (
              <Text style={styles.overline} numberOfLines={1}>
                {[hero?.label, hero?.meta?.program_name].filter(Boolean).join(' · ')}
              </Text>
            )}
            {!!hero?.title && (
              <Text style={styles.heroTitle} numberOfLines={2}>
                {hero.title}
              </Text>
            )}
            {!!subtitle && (
              <Text style={styles.heroSubtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            )}
            {/*{tags.length > 0 && (*/}
            {/*  <View style={styles.tagsRow}>*/}
            {/*    {tags.slice(0, 4).map((tag) => (*/}
            {/*      <View key={tag} style={styles.tagChip}>*/}
            {/*        <Text style={styles.tagText}>{tag}</Text>*/}
            {/*      </View>*/}
            {/*    ))}*/}
            {/*  </View>*/}
            {/*)}*/}
            <View style={styles.heroActionRow}>
              <View style={[styles.heroIconCircle, { width: iconBox, height: iconBox, borderRadius: iconBox / 2 }]}>
                <Ionicons name={icon} size={iconSize} color={colors.primary} />
              </View>
              <Text style={styles.heroCtaLabel} numberOfLines={1}>
                {ctaLabel}
              </Text>
              {onLongPress && (
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color="rgba(255,255,255,0.7)"
                  style={styles.heroHintIcon}
                />
              )}
            </View>
          </View>
        ) : (
          <View style={styles.content}>
            <Ionicons name={icon} size={22} color="#ffffff" style={styles.leadingIcon} />
            <View style={styles.textContainer}>
              <Text style={styles.label} numberOfLines={1}>
                {ctaLabel}
              </Text>
              {subtitle && (
                <Text style={styles.subtitle} numberOfLines={2}>
                  {subtitle}
                </Text>
              )}
            </View>
            {onLongPress && (
              <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.7)" style={styles.hintIcon} />
            )}
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 8,
  },
  gradient: {
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  gradientHero: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  // Legacy (simple) layout
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  leadingIcon: {
    marginRight: spacing.xs,
  },
  textContainer: {
    alignItems: 'center',
  },
  label: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: '#ffffff',
  },
  subtitle: {
    fontSize: fontSize.md,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: spacing.xs,
  },
  hintIcon: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  // Hero (enriched) layout
  heroContent: {
    width: '100%',
  },
  overline: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  heroTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: '#ffffff',
    lineHeight: fontSize.xxl * 1.2,
  },
  heroSubtitle: {
    fontSize: fontSize.md,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: spacing.xs,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  tagChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  tagText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: '#ffffff',
    textTransform: 'lowercase',
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  heroIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  heroCtaLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: '#ffffff',
    flex: 1,
  },
  heroHintIcon: {
    marginLeft: spacing.sm,
  },
});