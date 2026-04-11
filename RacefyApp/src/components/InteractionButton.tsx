import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  type StyleProp,
  StyleSheet,
  Text,
  type TextStyle,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {useTheme} from '../hooks/useTheme';
import {api} from '../services/api';
import {logger} from '../services/logger';
import {fontSize, spacing} from '../theme';
import {InteractorsListModal} from './InteractorsListModal';

export type InteractionVariant = 'like' | 'boost' | 'comment';
export type InteractionTargetType =
  | 'post'
  | 'activity'
  | 'comment'
  | 'commentary';

const BOOST_COLOR = '#FF6B35';

export interface InteractionButtonProps {
  variant: InteractionVariant;
  targetType: InteractionTargetType;
  targetId: number;
  /** For commentary boosts: the parent event id */
  parentId?: number;

  count: number;
  /** Only meaningful for like / boost. Ignored for comment. */
  isActive?: boolean;

  /** Disable the action (e.g., owner can't like own content) */
  disabled?: boolean;
  /** Icon size preset (used unless `iconSize` overrides it) */
  size?: 'sm' | 'md' | 'lg';
  /** Explicit icon size (overrides `size` preset) */
  iconSize?: number;
  /** Bordered "pill" appearance (used by commentary footer). Default false. */
  pill?: boolean;
  /** Hide the count when it's zero (used for comment-style buttons) */
  hideCountWhenZero?: boolean;
  /** Layout direction. Default 'horizontal'. 'vertical' stacks icon over count over label. */
  layout?: 'horizontal' | 'vertical';
  /** Optional caption shown below the count (only in vertical layout) */
  label?: string;
  /** Override the count text style (e.g., make it large+bold for detail screens) */
  countStyle?: StyleProp<TextStyle>;

  /**
   * Tap handler for the comment variant (navigate to comments).
   * Ignored for like/boost (handled internally).
   */
  onPress?: () => void;
  /** Fired after server confirms (or after rollback) for like/boost */
  onChange?: (active: boolean, count: number) => void;

  /**
   * Long-press opens the interactors list modal.
   * Default: enabled for like/boost, disabled for comment.
   */
  showInteractors?: boolean;

  /** Override the touchable container style (e.g., add marginRight) */
  containerStyle?: StyleProp<ViewStyle>;
}

const ICON_SIZES: Record<NonNullable<InteractionButtonProps['size']>, number> = {
  sm: 16,
  md: 18,
  lg: 20,
};

const TEXT_SIZES: Record<NonNullable<InteractionButtonProps['size']>, number> = {
  sm: fontSize.xs,
  md: fontSize.sm,
  lg: fontSize.md,
};

function getIcons(variant: InteractionVariant): {
  active: React.ComponentProps<typeof Ionicons>['name'];
  inactive: React.ComponentProps<typeof Ionicons>['name'];
} {
  switch (variant) {
    case 'like':
      return { active: 'heart', inactive: 'heart-outline' };
    case 'boost':
      return { active: 'rocket', inactive: 'rocket-outline' };
    case 'comment':
      return { active: 'chatbubble', inactive: 'chatbubble-outline' };
  }
}

async function performInteraction(
  variant: 'like' | 'boost',
  targetType: InteractionTargetType,
  targetId: number,
  parentId: number | undefined,
  add: boolean
): Promise<{ count?: number }> {
  if (variant === 'like') {
    if (targetType === 'post') {
      add ? await api.likePost(targetId) : await api.unlikePost(targetId);
      return {};
    }
    if (targetType === 'activity') {
      add ? await api.likeActivity(targetId) : await api.unlikeActivity(targetId);
      return {};
    }
    if (targetType === 'comment') {
      add ? await api.likeComment(targetId) : await api.unlikeComment(targetId);
      return {};
    }
    throw new Error(`like is not supported for targetType=${targetType}`);
  }

  // boost
  if (targetType === 'activity') {
    const res = add
      ? await api.boostActivity(targetId)
      : await api.unboostActivity(targetId);
    return { count: res.boosts_count };
  }
  if (targetType === 'commentary') {
    if (parentId == null) {
      throw new Error('commentary boost requires parentId (eventId)');
    }
    const res = add
      ? await api.boostCommentary(parentId, targetId)
      : await api.unboostCommentary(parentId, targetId);
    return { count: res.boosts_count };
  }
  throw new Error(`boost is not supported for targetType=${targetType}`);
}

export function InteractionButton({
  variant,
  targetType,
  targetId,
  parentId,
  count: countProp,
  isActive: isActiveProp = false,
  disabled = false,
  size = 'md',
  pill = false,
  iconSize: iconSizeOverride,
  hideCountWhenZero = false,
  layout = 'horizontal',
  label,
  countStyle,
  onPress,
  onChange,
  showInteractors,
  containerStyle,
}: InteractionButtonProps) {
  const { colors } = useTheme();
  const [count, setCount] = useState(countProp);
  const [isActive, setIsActive] = useState(isActiveProp);
  const [isLoading, setIsLoading] = useState(false);
  const [interactorsVisible, setInteractorsVisible] = useState(false);

  // Sync from props when parent updates them (e.g., feed refresh, parent toggleLike).
  // Skip while we're mid-action so optimistic state isn't clobbered.
  useEffect(() => {
    if (!isLoading) setCount(countProp);
  }, [countProp, isLoading]);
  useEffect(() => {
    if (!isLoading) setIsActive(isActiveProp);
  }, [isActiveProp, isLoading]);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const icons = getIcons(variant);

  // Active color depends on variant
  const activeColor =
    variant === 'like'
      ? colors.error
      : variant === 'boost'
        ? BOOST_COLOR
        : colors.textSecondary;
  const inactiveColor = colors.textSecondary;
  // Comment doesn't really have an "active" state — it's always tinted neutrally
  const tintColor =
    variant === 'comment'
      ? inactiveColor
      : isActive
        ? activeColor
        : inactiveColor;

  const iconSize = iconSizeOverride ?? ICON_SIZES[size];
  const textSize = TEXT_SIZES[size];

  const playAnimation = useCallback(() => {
    const animations: Animated.CompositeAnimation[] = [
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.4,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ];
    if (variant === 'boost') {
      animations.push(
        Animated.sequence([
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
        ])
      );
    }
    Animated.parallel(animations).start();
  }, [variant, scaleAnim, rotateAnim]);

  const handlePress = async () => {
    if (disabled || isLoading) return;

    // Comment is just a navigation trigger
    if (variant === 'comment') {
      onPress?.();
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    const prevActive = isActive;
    const prevCount = count;
    const nextActive = !isActive;
    const nextCount = nextActive ? count + 1 : Math.max(0, count - 1);

    setIsActive(nextActive);
    setCount(nextCount);

    if (nextActive) playAnimation();

    try {
      setIsLoading(true);
      const res = await performInteraction(
        variant,
        targetType,
        targetId,
        parentId,
        nextActive
      );
      const finalCount = res.count ?? nextCount;
      if (res.count != null) setCount(res.count);
      onChange?.(nextActive, finalCount);
    } catch (err: any) {
      // Rollback
      setIsActive(prevActive);
      setCount(prevCount);
      logger.error('api', `${variant} ${targetType} failed`, {
        error: err?.message || err,
        targetId,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const longPressEnabled =
    showInteractors ?? (variant === 'like' || variant === 'boost');

  const handleLongPress = () => {
    if (disabled || !longPressEnabled) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setInteractorsVisible(true);
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-15deg'],
  });

  const showCount = !(hideCountWhenZero && count <= 0);

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={400}
        disabled={disabled}
        activeOpacity={0.7}
        style={[
          layout === 'vertical' ? styles.containerVertical : styles.container,
          pill && [
            styles.pillContainer,
            {
              backgroundColor: isActive
                ? `${activeColor}20`
                : colors.cardBackground,
              borderColor: isActive ? activeColor : colors.border,
            },
          ],
          disabled && styles.disabled,
          containerStyle,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${variant} ${targetType}`}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={tintColor} />
        ) : (
          <Animated.View
            style={{
              transform: [
                { scale: scaleAnim },
                ...(variant === 'boost'
                  ? [{ rotate: rotateInterpolate }]
                  : []),
              ],
            }}
          >
            <Ionicons
              name={
                variant === 'comment'
                  ? icons.inactive
                  : isActive
                    ? icons.active
                    : icons.inactive
              }
              size={iconSize}
              color={tintColor}
            />
          </Animated.View>
        )}
        {showCount && (
          <Text
            style={[
              layout === 'vertical' ? styles.countVertical : styles.count,
              { color: tintColor, fontSize: textSize },
              countStyle,
            ]}
          >
            {count}
          </Text>
        )}
        {layout === 'vertical' && label && (
          <Text style={[styles.label, { color: colors.textMuted }]}>
            {label}
          </Text>
        )}
      </TouchableOpacity>

      {longPressEnabled && variant !== 'comment' && (
        <InteractorsListModal
          visible={interactorsVisible}
          onClose={() => setInteractorsVisible(false)}
          variant={variant}
          targetType={targetType}
          targetId={targetId}
          parentId={parentId}
          totalCount={count}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  containerVertical: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  pillContainer: {
    borderWidth: 1,
    borderRadius: spacing.sm,
  },
  count: {
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
  countVertical: {
    marginTop: spacing.xs,
    fontWeight: '700',
  },
  label: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  disabled: {
    opacity: 0.5,
  },
});