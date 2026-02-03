import { useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { VideoPlayerManager } from '../services/VideoPlayerManager';
import { logger } from '../services/logger';

/**
 * Hook to pause all videos when screen loses focus
 * Use this in screens that contain video players to ensure videos stop playing when navigating away
 *
 * @example
 * function FeedScreen() {
 *   useVideoPauseOnBlur();
 *   // ... rest of component
 * }
 */
export function useVideoPauseOnBlur() {
  useFocusEffect(
    () => {
      // When screen gains focus
      logger.nav('[useVideoPauseOnBlur] Screen focused');

      return () => {
        // When screen loses focus (navigating away)
        logger.nav('[useVideoPauseOnBlur] Screen blurred, pausing all videos');
        VideoPlayerManager.pauseAll();
      };
    }
  );
}