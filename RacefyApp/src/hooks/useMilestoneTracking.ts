import { useState, useEffect } from 'react';
import { Vibration } from 'react-native';
import type { MilestoneSingle } from '../types/api';

/**
 * Custom hook to track milestone achievements during activity
 * Triggers vibration when a new milestone is reached
 */
export function useMilestoneTracking(
  distance: number,
  milestones: MilestoneSingle[]
) {
  const [passedMilestones, setPassedMilestones] = useState<number[]>([]);

  // Check milestones during activity recording
  useEffect(() => {
    milestones.forEach((milestone) => {
      if (
        distance >= milestone.threshold &&
        !passedMilestones.includes(milestone.threshold)
      ) {
        setPassedMilestones((prev) => [...prev, milestone.threshold]);
        Vibration.vibrate(200);
      }
    });
  }, [distance, passedMilestones, milestones]);

  const resetMilestones = () => {
    setPassedMilestones([]);
  };

  return { passedMilestones, resetMilestones };
}