import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import type { TrainingWeek } from '../types/api';

export function useActiveWeek(
  isAuthenticated: boolean,
  selectedSportId: number | null | undefined,
): TrainingWeek | null {
  const [activeWeek, setActiveWeek] = useState<TrainingWeek | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !selectedSportId) {
      setActiveWeek(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const program = await api.getCurrentProgram();
        if (cancelled) return;
        if (!program) {
          setActiveWeek(null);
          return;
        }
        if (program.sport_type_id === selectedSportId) {
          const weeks = await api.getWeeks();
          if (cancelled) return;
          const currentWeek = weeks.find(w => w.status === 'current' || w.status === 'active');
          setActiveWeek(currentWeek || null);
        } else {
          setActiveWeek(null);
        }
      } catch (err) {
        logger.error('activity', 'Failed to load active week', { error: err });
        setActiveWeek(null);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, selectedSportId]);

  return activeWeek;
}