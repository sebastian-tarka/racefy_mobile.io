import { Ionicons } from '@expo/vector-icons';

export interface SportTheme {
  color: string;
  gradient: [string, string];
  accent: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const sportThemes: Record<string, SportTheme> = {
  running: {
    color: '#10b981',
    gradient: ['#10b981', '#059669'],
    accent: '#34d399',
    icon: 'walk',
  },
  cycling: {
    color: '#3b82f6',
    gradient: ['#3b82f6', '#1d4ed8'],
    accent: '#60a5fa',
    icon: 'bicycle',
  },
  swimming: {
    color: '#06b6d4',
    gradient: ['#06b6d4', '#0891b2'],
    accent: '#22d3ee',
    icon: 'water',
  },
  gym: {
    color: '#f97316',
    gradient: ['#f97316', '#ea580c'],
    accent: '#fb923c',
    icon: 'barbell',
  },
  yoga: {
    color: '#a855f7',
    gradient: ['#a855f7', '#7c3aed'],
    accent: '#c084fc',
    icon: 'body',
  },
  hiking: {
    color: '#84cc16',
    gradient: ['#84cc16', '#65a30d'],
    accent: '#a3e635',
    icon: 'trail-sign',
  },
  default: {
    color: '#6366f1',
    gradient: ['#6366f1', '#4f46e5'],
    accent: '#818cf8',
    icon: 'fitness',
  },
};

/**
 * Returns the full sport theme (color, gradient, accent, icon) for a given sport name.
 */
export function getSportTheme(sportName?: string): SportTheme {
  if (!sportName) return sportThemes.default;
  const name = sportName.toLowerCase();

  if (name.includes('run') || name.includes('jog')) return sportThemes.running;
  if (name.includes('cycl') || name.includes('bike')) return sportThemes.cycling;
  if (name.includes('swim')) return sportThemes.swimming;
  if (name.includes('gym') || name.includes('weight') || name.includes('fitness')) return sportThemes.gym;
  if (name.includes('yoga') || name.includes('pilates')) return sportThemes.yoga;
  if (name.includes('hik') || name.includes('walk') || name.includes('trek')) return sportThemes.hiking;

  return sportThemes.default;
}

/**
 * Returns just the primary color for a sport.
 */
export function getSportColor(sportName?: string): string {
  return getSportTheme(sportName).color;
}
