import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../../../../theme';
import type { HomeSection } from '../../../../../types/api';

interface WeatherInsightSectionProps {
  section: HomeSection;
  onPress?: () => void;
}

/**
 * Get weather icon based on condition string.
 */
function getWeatherIcon(condition?: string): keyof typeof Ionicons.glyphMap {
  if (!condition) return 'cloud-outline';

  const lowerCondition = condition.toLowerCase();

  if (lowerCondition.includes('sun') || lowerCondition.includes('clear')) {
    return 'sunny';
  }
  if (lowerCondition.includes('cloud') || lowerCondition.includes('overcast')) {
    return 'cloudy';
  }
  if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) {
    return 'rainy';
  }
  if (lowerCondition.includes('snow')) {
    return 'snow';
  }
  if (lowerCondition.includes('thunder') || lowerCondition.includes('storm')) {
    return 'thunderstorm';
  }
  if (lowerCondition.includes('fog') || lowerCondition.includes('mist')) {
    return 'cloud-outline';
  }
  if (lowerCondition.includes('wind')) {
    return 'flag';
  }

  return 'partly-sunny';
}

/**
 * Get background color based on weather suitability for outdoor activities.
 */
function getWeatherColor(colors: any, isGoodForOutdoor?: boolean): string {
  if (isGoodForOutdoor === true) {
    return colors.success + '15';
  }
  if (isGoodForOutdoor === false) {
    return colors.warning + '15';
  }
  return colors.info + '15';
}

/**
 * Weather Insight section component.
 * Shows current weather conditions with activity recommendations.
 * Helps users decide if it's a good time for outdoor activities.
 */
export function WeatherInsightSection({ section, onPress }: WeatherInsightSectionProps) {
  const { colors } = useTheme();

  const weather = section.weather;
  const bgColor = getWeatherColor(colors, weather?.is_good_for_outdoor);
  const iconColor = weather?.is_good_for_outdoor
    ? colors.success
    : weather?.is_good_for_outdoor === false
      ? colors.warning
      : colors.info;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: bgColor }]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '30' }]}>
          <Ionicons
            name={getWeatherIcon(weather?.condition)}
            size={28}
            color={iconColor}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {section.title}
          </Text>
          {weather && (
            <View style={styles.tempRow}>
              <Text style={[styles.temperature, { color: colors.textPrimary }]}>
                {Math.round(weather.temperature)}°C
              </Text>
              {weather.feels_like !== weather.temperature && (
                <Text style={[styles.feelsLike, { color: colors.textSecondary }]}>
                  (odczuwalna {Math.round(weather.feels_like)}°C)
                </Text>
              )}
            </View>
          )}
          {section.message && (
            <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>
              {section.message}
            </Text>
          )}
        </View>
        {section.cta && (
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        )}
      </View>

      {weather?.recommendation && (
        <View style={[styles.recommendationContainer, { borderTopColor: colors.border }]}>
          <Ionicons name="fitness" size={16} color={iconColor} />
          <Text style={[styles.recommendation, { color: colors.textSecondary }]}>
            {weather.recommendation}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  temperature: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  feelsLike: {
    fontSize: fontSize.sm,
  },
  message: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  recommendationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  recommendation: {
    flex: 1,
    fontSize: fontSize.sm,
  },
});
