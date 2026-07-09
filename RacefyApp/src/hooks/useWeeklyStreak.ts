import { startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { api } from '../services/api';
import { useFetch } from './useFetch';
import type { Activity } from '../types/api';

interface WeeklyStreakData {
  weekActivity: boolean[]; // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  completedDays: number;
  goalDays: number;
  todayIndex: number; // 0-6 (Monday = 0)
  isLoading: boolean;
}

// Today's index 0-6 with Monday = 0 (JS getDay has Sunday = 0).
function getTodayIndex(): number {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}

export function useWeeklyStreak(): WeeklyStreakData {
  const { data, isLoading } = useFetch<boolean[]>(
    async () => {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
      const response = await api.getActivities();
      const activities = response.data || [];

      // One flag per day Mon..Sun: did any activity start that day?
      return Array.from({ length: 7 }, (_, i) => {
        const dayDate = addDays(weekStart, i);
        return activities.some((activity: Activity) =>
          isSameDay(parseISO(activity.started_at), dayDate),
        );
      });
    },
    { logCategory: 'activity' },
  );

  const weekActivity = data ?? [false, false, false, false, false, false, false];

  return {
    weekActivity,
    completedDays: weekActivity.filter(Boolean).length,
    goalDays: 7,
    todayIndex: getTodayIndex(),
    isLoading,
  };
}
