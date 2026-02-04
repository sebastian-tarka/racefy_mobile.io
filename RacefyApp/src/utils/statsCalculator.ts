import { startOfDay, subDays, parseISO } from 'date-fns';
import type { Activity, ActivityStats } from '../types/api';

/**
 * Oblicza statystyki tygodniowe z listy aktywności
 *
 * @param activities - Lista aktywności użytkownika
 * @param days - Liczba dni wstecz do uwzględnienia (domyślnie 7)
 * @returns Statystyki w formacie ActivityStats
 */
export function calculateWeeklyStats(
  activities: Activity[],
  days: number = 7
): ActivityStats {
  // Oblicz datę początkową (X dni temu)
  const today = startOfDay(new Date());
  const startDate = subDays(today, days);

  // Filtruj aktywności z ostatnich X dni (tylko completed)
  const recentActivities = activities.filter(activity => {
    if (activity.status !== 'completed') return false;

    const activityDate = parseISO(activity.started_at);
    return activityDate >= startDate;
  });

  // Oblicz sumy
  const totals = recentActivities.reduce(
    (acc, activity) => ({
      distance: acc.distance + (activity.distance || 0),
      duration: acc.duration + (activity.duration || 0),
      elevation_gain: acc.elevation_gain + (activity.elevation_gain || 0),
      calories: acc.calories + (activity.calories || 0),
    }),
    {
      distance: 0,
      duration: 0,
      elevation_gain: 0,
      calories: 0,
    }
  );

  // Oblicz średnie (tylko jeśli są aktywności)
  const count = recentActivities.length;
  const averages = count > 0
    ? {
        distance: totals.distance / count,
        duration: totals.duration / count,
        speed: totals.duration > 0 ? totals.distance / totals.duration : 0,
        heart_rate: 0, // Nie obliczamy bez danych
      }
    : {
        distance: 0,
        duration: 0,
        speed: 0,
        heart_rate: 0,
      };

  return {
    count,
    totals,
    averages,
    bests: {
      longest_distance: null,
      longest_duration: null,
      fastest_speed: null,
    },
    by_sport_type: {},
  };
}
