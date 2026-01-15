/**
 * Format time in seconds to HH:MM:SS or MM:SS format
 */
export const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
};

/**
 * Format distance in meters to km or m
 */
export const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
};

/**
 * Format total distance (without decimals for km)
 */
export const formatTotalDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(0)} km`;
  }
  return `${Math.round(meters)} m`;
};

/**
 * Format total time with hours or minutes only
 */
export const formatTotalTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}h`;
  }
  return `${mins}m`;
};

/**
 * Format average pace from average speed (m/s) to min/km
 */
export const formatAvgPace = (avgSpeed: number): string => {
  if (!avgSpeed || avgSpeed === 0) return '--:--';
  // avgSpeed is in m/s, convert to min/km
  const paceSeconds = 1000 / avgSpeed;
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.floor(paceSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};