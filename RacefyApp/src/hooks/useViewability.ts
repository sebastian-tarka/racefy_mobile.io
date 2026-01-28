import { useEffect, useRef, useState, useCallback } from 'react';
import { View } from 'react-native';

interface ViewabilityOptions {
  threshold?: number; // Percentage of view that should be visible (0-100)
  delay?: number; // Delay before triggering viewability change
  pollInterval?: number; // Interval to check viewability (default 500ms)
}

/**
 * Hook to track if a component is viewable (visible on screen)
 * @param threshold - Percentage of view that should be visible (default 50)
 * @param delay - Delay in ms before triggering viewability change (default 100)
 * @param pollInterval - Interval to poll viewability (default 500ms)
 * @returns [viewRef, isViewable, checkViewability] - Ref to attach to component, viewability state, and manual check function
 */
export function useViewability(options: ViewabilityOptions = {}) {
  const { threshold = 50, delay = 100, pollInterval = 500 } = options;
  const [isViewable, setIsViewable] = useState(false);
  const viewRef = useRef<View>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkViewability = useCallback(() => {
    if (!viewRef.current) return;

    viewRef.current.measureInWindow((x, y, width, height) => {
      // Get screen dimensions
      const screenHeight = require('react-native').Dimensions.get('window').height;
      const screenWidth = require('react-native').Dimensions.get('window').width;

      // Calculate visible area
      const visibleTop = Math.max(0, y);
      const visibleBottom = Math.min(screenHeight, y + height);
      const visibleLeft = Math.max(0, x);
      const visibleRight = Math.min(screenWidth, x + width);

      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const visibleWidth = Math.max(0, visibleRight - visibleLeft);
      const visibleArea = visibleHeight * visibleWidth;
      const totalArea = width * height;

      const visiblePercentage = totalArea > 0 ? (visibleArea / totalArea) * 100 : 0;

      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set viewability after delay
      timeoutRef.current = setTimeout(() => {
        setIsViewable(visiblePercentage >= threshold);
      }, delay);
    });
  }, [threshold, delay]);

  // Start polling viewability on mount
  useEffect(() => {
    // Initial check
    checkViewability();

    // Poll periodically
    pollIntervalRef.current = setInterval(() => {
      checkViewability();
    }, pollInterval);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [checkViewability, pollInterval]);

  return { viewRef, isViewable, checkViewability };
}
