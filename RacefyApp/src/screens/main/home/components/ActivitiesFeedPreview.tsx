import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  LayoutAnimation,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivitySliderCard, ActivityCompactCard } from '../../../../components';
import { useTheme } from '../../../../hooks/useTheme';
import { useAuth } from '../../../../hooks/useAuth';
import { api } from '../../../../services/api';
import { logger } from '../../../../services/logger';
import { spacing, fontSize, borderRadius } from '../../../../theme';
import type { Activity } from '../../../../types/api';

const STORAGE_KEY = '@racefy_activities_display_mode';
const COLLAPSED_STORAGE_KEY = '@racefy_activities_collapsed';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.85;
const CARD_TOTAL_WIDTH = CARD_WIDTH + spacing.md; // card + marginRight
const AUTO_SCROLL_INTERVAL = 6000; // ms between slides

export type ActivitiesDisplayMode = 'slider' | 'compact';

interface ActivitiesFeedPreviewProps {
  onActivityPress: (activityId: number) => void;
  onViewAllPress?: () => void;
  onLoginPress: () => void;
  limit?: number;
  /** Display mode: 'slider' for horizontal carousel, 'compact' for vertical list */
  displayMode?: ActivitiesDisplayMode;
}

export function ActivitiesFeedPreview({
  onActivityPress,
  onViewAllPress,
  onLoginPress,
  limit = 3,
  displayMode: initialDisplayMode = 'slider',
}: ActivitiesFeedPreviewProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isAuthenticated } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [displayMode, setDisplayMode] = useState<ActivitiesDisplayMode>(initialDisplayMode);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const collapseAnim = useRef(new Animated.Value(1)).current; // 1 = expanded, 0 = collapsed

  // Auto-scroll state
  const flatListRef = useRef<FlatList<Activity>>(null);
  const currentIndexRef = useRef(0);
  const autoScrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userHasInteracted = useRef(false);

  // Load saved display mode and collapsed state from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'slider' || saved === 'compact') {
        setDisplayMode(saved);
      }
    });
    AsyncStorage.getItem(COLLAPSED_STORAGE_KEY).then((saved) => {
      if (saved === 'true') {
        setIsCollapsed(true);
        collapseAnim.setValue(0);
      }
    });
  }, []);

  const handleActivityPress = (activityId: number) => {
    if (isAuthenticated) {
      onActivityPress(activityId);
    } else {
      onLoginPress();
    }
  };

  const toggleDisplayMode = useCallback(() => {
    setDisplayMode((prev) => {
      const next = prev === 'slider' ? 'compact' : 'slider';
      AsyncStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const toggleCollapsed = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsCollapsed((prev) => {
      const next = !prev;
      AsyncStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
      Animated.timing(collapseAnim, {
        toValue: next ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      return next;
    });
  }, []);

  const chevronRotation = collapseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Start auto-scroll interval for slider mode
  const startAutoScroll = useCallback(() => {
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
    }
    autoScrollTimerRef.current = setInterval(() => {
      if (!flatListRef.current || activities.length <= 1) return;

      const nextIndex = currentIndexRef.current + 1;

      // Stop at the last card instead of looping back
      if (nextIndex >= activities.length) {
        stopAutoScroll();
        return;
      }

      flatListRef.current.scrollToOffset({
        offset: nextIndex * CARD_TOTAL_WIDTH,
        animated: true,
      });
      currentIndexRef.current = nextIndex;
    }, AUTO_SCROLL_INTERVAL);
  }, [activities.length]);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
  }, []);

  // Manage auto-scroll lifecycle
  useEffect(() => {
    if (displayMode === 'slider' && activities.length > 1 && !userHasInteracted.current && !isCollapsed) {
      startAutoScroll();
    } else {
      stopAutoScroll();
    }
    return stopAutoScroll;
  }, [displayMode, activities.length, startAutoScroll, stopAutoScroll, isCollapsed]);

  // When user starts dragging, stop auto-scroll permanently
  const onScrollBeginDrag = useCallback(() => {
    userHasInteracted.current = true;
    stopAutoScroll();
  }, [stopAutoScroll]);

  // Track current index from manual scroll position
  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      currentIndexRef.current = Math.round(offsetX / CARD_TOTAL_WIDTH);
    },
    [],
  );

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = isAuthenticated
          ? await api.getActivitiesFeed({ per_page: limit })
          : await api.getActivitiesDiscover({ per_page: limit });
        setActivities(response.data);
      } catch (error) {
        logger.debug('api', 'Failed to fetch activities', { error });
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [limit, isAuthenticated]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('home.recentActivities')}
        </Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (activities.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('home.recentActivities')}
        </Text>
        <View style={styles.headerActions}>
          {!isCollapsed && (
            <>
              {/* Display mode toggle */}
              <TouchableOpacity
                onPress={toggleDisplayMode}
                style={[styles.toggleButton, { backgroundColor: colors.borderLight }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={displayMode === 'slider' ? 'list' : 'albums-outline'}
                  size={16}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {isAuthenticated && onViewAllPress && (
                <TouchableOpacity onPress={onViewAllPress}>
                  <Text style={[styles.viewAll, { color: colors.primary }]}>
                    {t('common.viewAll')}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Collapse/expand toggle */}
          <TouchableOpacity
            onPress={toggleCollapsed}
            style={[styles.toggleButton, { backgroundColor: colors.borderLight }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
              <Ionicons
                name="chevron-up"
                size={16}
                color={colors.textSecondary}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>

      {!isCollapsed && (
        displayMode === 'slider' ? (
          <FlatList
            ref={flatListRef}
            data={activities}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            snapToInterval={CARD_TOTAL_WIDTH}
            decelerationRate="fast"
            onScrollBeginDrag={onScrollBeginDrag}
            onMomentumScrollEnd={onMomentumScrollEnd}
            renderItem={({ item }) => (
              <View style={styles.cardWrapper}>
                <ActivitySliderCard
                  activity={item}
                  onPress={() => handleActivityPress(item.id)}
                  isAuthenticated={isAuthenticated}
                />
              </View>
            )}
          />
        ) : (
          <View style={styles.compactList}>
            {activities.map((item) => (
              <View key={item.id} style={styles.compactCardWrapper}>
                <ActivityCompactCard
                  activity={item}
                  onPress={() => handleActivityPress(item.id)}
                  isAuthenticated={isAuthenticated}
                />
              </View>
            ))}
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  viewAll: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  toggleButton: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  listContent: {
    paddingRight: spacing.md,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginRight: spacing.md,
  },
  compactList: {
    gap: spacing.sm,
  },
  compactCardWrapper: {
    // compact cards are full width
  },
});