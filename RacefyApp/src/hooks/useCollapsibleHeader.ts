import { useCallback, useRef } from 'react';
import { Animated } from 'react-native';
import type { EventTabType } from '../components/EventTabs';

export const COLLAPSE_THRESHOLD = 80;
export const EXPAND_THRESHOLD = 20;
export const COLLAPSIBLE_HEIGHT = 290; // image (200) + title section (~90)

export function useCollapsibleHeader() {
  const headerAnim = useRef(new Animated.Value(1)).current;
  const isHeaderCollapsed = useRef(false);

  const collapsibleHeight = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, COLLAPSIBLE_HEIGHT],
  });

  const collapsibleOpacity = headerAnim.interpolate({
    inputRange: [0, 0.6],
    outputRange: [0, 1],
  });

  const handleTabScroll = useCallback(
    (event: {
      nativeEvent: {
        contentOffset: { y: number };
        contentSize: { height: number };
        layoutMeasurement: { height: number };
      };
    }) => {
      const y = event.nativeEvent.contentOffset.y;
      const scrollable =
        event.nativeEvent.contentSize.height - event.nativeEvent.layoutMeasurement.height;

      if (
        y > COLLAPSE_THRESHOLD &&
        scrollable > COLLAPSIBLE_HEIGHT + COLLAPSE_THRESHOLD &&
        !isHeaderCollapsed.current
      ) {
        isHeaderCollapsed.current = true;
        Animated.timing(headerAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }).start();
      } else if (y < EXPAND_THRESHOLD && isHeaderCollapsed.current) {
        isHeaderCollapsed.current = false;
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false,
        }).start();
      }
    },
    [headerAnim]
  );

  const handleTabChange = useCallback(
    (tab: EventTabType, setActiveTab: (t: EventTabType) => void) => {
      setActiveTab(tab);
      isHeaderCollapsed.current = false;
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    },
    [headerAnim]
  );

  return { headerAnim, collapsibleHeight, collapsibleOpacity, handleTabScroll, handleTabChange };
}
