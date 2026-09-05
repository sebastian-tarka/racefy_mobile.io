import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { getSportTile } from '../config/sportTiles';
import { borderRadius, fontSize, spacing } from '../theme';

interface Props {
  sport: { id: number; slug: string; name: string };
  selected: boolean;
  onPress: () => void;
  /** Tile side in px. */
  size: number;
  style?: ViewStyle;
}

/**
 * Illustrated sport tile: the brand illustration fills the square, the
 * translated name sits on a bottom gradient, selection is a primary ring plus
 * a check badge. Illustrations follow the theme (dark/light sets).
 */
export function SportTile({ sport, selected, onPress, size, style }: Props) {
  const { colors, isDark } = useTheme();
  const source = getSportTile(sport, isDark);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={sport.name}
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderColor: selected ? colors.primary : 'transparent',
          backgroundColor: colors.cardBackground,
        },
        style,
      ]}
    >
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} />
      <LinearGradient
        colors={
          isDark
            ? ['transparent', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.78)']
            : ['transparent', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.92)']
        }
        locations={[0.45, 0.6, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Text
        style={[styles.name, { color: selected ? colors.primary : isDark ? '#ffffff' : '#0A1A14' }]}
        numberOfLines={1}
      >
        {sport.name}
      </Text>
      {selected && (
        <View style={[styles.check, { backgroundColor: colors.primary }]}>
          <Ionicons name="checkmark" size={12} color="#ffffff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  name: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  check: {
    position: 'absolute',
    top: spacing.xs + 2,
    right: spacing.xs + 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
