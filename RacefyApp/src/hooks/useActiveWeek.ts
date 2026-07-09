import { api } from '../services/api';
import { useFetch } from './useFetch';
import type { TrainingWeek } from '../types/api';

export function useActiveWeek(
  isAuthenticated: boolean,
  selectedSportId: number | null | undefined,
): TrainingWeek | null {
  const { data } = useFetch<TrainingWeek | null>(
    async () => {
      const program = await api.getCurrentProgram();
      if (!program || program.sport_type_id !== selectedSportId) return null;
      const weeks = await api.getWeeks();
      return weeks.find((w) => w.status === 'current' || w.status === 'active') ?? null;
    },
    {
      enabled: isAuthenticated && !!selectedSportId,
      deps: [isAuthenticated, selectedSportId],
      logCategory: 'activity',
      errorMessage: 'Failed to load active week',
    },
  );

  return data ?? null;
}
