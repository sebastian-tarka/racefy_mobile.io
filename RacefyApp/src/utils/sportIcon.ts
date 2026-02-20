import { Ionicons } from '@expo/vector-icons';

/**
 * Returns an Ionicons outline icon name for a given sport type name.
 * Used in EventCard, EventDetailScreen, etc.
 */
export function getSportIcon(sportName?: string): keyof typeof Ionicons.glyphMap {
  const name = sportName?.toLowerCase() || '';

  if (name.includes('run') || name.includes('jog')) return 'walk-outline';
  if (name.includes('cycling') || name.includes('bike')) return 'bicycle-outline';
  if (name.includes('swim')) return 'water-outline';
  if (name.includes('gym') || name.includes('weight') || name.includes('fitness')) return 'barbell-outline';
  if (name.includes('yoga') || name.includes('pilates')) return 'body-outline';
  if (name.includes('hik') || name.includes('trek')) return 'trail-sign-outline';

  return 'fitness-outline';
}