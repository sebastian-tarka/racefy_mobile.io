import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';

interface CollapsibleSectionProps {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  rightElement?: React.ReactNode;
}

export function CollapsibleSection({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
  rightElement,
}: CollapsibleSectionProps) {
  const { colors } = useTheme();
  const rotateAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isExpanded, rotateAnim]);

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.borderLight,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.header}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          {icon && (
            <Ionicons
              name={icon}
              size={20}
              color={colors.primary}
              style={styles.icon}
            />
          )}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {rightElement}
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons
              name="chevron-down"
              size={20}
              color={colors.textSecondary}
            />
          </Animated.View>
        </View>
      </TouchableOpacity>
      {isExpanded && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    marginRight: spacing.sm,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
});
