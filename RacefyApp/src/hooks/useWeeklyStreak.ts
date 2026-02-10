import { useState, useEffect } from 'react';
import { startOfWeek, addDays, isSameDay, parseISO, endOfWeek } from 'date-fns';
import { api } from '../services/api';
import { logger } from '../services/logger';
import type { Activity } from '../types/api';

interface WeeklyStreakData {
  weekActivity: boolean[];  // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  completedDays: number;
  goalDays: number;
  todayIndex: number;       // 0-6 (Monday = 0)
  isLoading: boolean;
}

export function useWeeklyStreak(): WeeklyStreakData {
  const [weekActivity, setWeekActivity] = useState<boolean[]>([false, false, false, false, false, false, false]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyActivities();
  }, []);

  const fetchWeeklyActivities = async () => {
    try {
      setIsLoading(true);

      // Calculate current week (Monday to Sunday)
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // 1 = Monday
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      logger.activity('Fetching weekly streak', {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
      });

      // Fetch activities for current week
      const response = await api.getActivities();
      const activities = response.data || [];

      // Filter activities from this week
      const thisWeekActivities = activities.filter((activity: Activity) => {
        const activityDate = parseISO(activity.started_at);
        return activityDate >= weekStart && activityDate <= weekEnd;
      });

      // Create array for each day of the week
      const activityMap = [false, false, false, false, false, false, false];

      // Mark days with activities
      for (let i = 0; i < 7; i++) {
        const dayDate = addDays(weekStart, i);
        const hasActivity = thisWeekActivities.some((activity: Activity) =>
          isSameDay(parseISO(activity.started_at), dayDate)
        );
        activityMap[i] = hasActivity;
      }

      setWeekActivity(activityMap);
      logger.activity('Weekly streak updated', {
        activityMap,
        completedDays: activityMap.filter(Boolean).length,
      });
    } catch (error) {
      logger.error('activity', 'Failed to fetch weekly streak', { error });
      // Keep default empty week on error
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate today's index (0-6, Monday = 0)
  const getTodayIndex = () => {
    const day = new Date().getDay();
    // Convert Sunday (0) to 6, and shift others down by 1
    return day === 0 ? 6 : day - 1;
  };

  const completedDays = weekActivity.filter(Boolean).length;
  const goalDays = 7;

  return {
    weekActivity,
    completedDays,
    goalDays,
    todayIndex: getTodayIndex(),
    isLoading,
  };
}
