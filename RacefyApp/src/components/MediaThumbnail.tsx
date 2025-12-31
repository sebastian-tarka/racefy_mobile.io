import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { borderRadius, spacing } from '../theme';
import type { MediaItem } from '../types/api';

interface MediaThumbnailProps {
  item: MediaItem;
  onRemove?: () => void;
  onPress?: () => void;
  size?: number;
}

export function MediaThumbnail({
  item,
  onRemove,
  onPress,
  size = 80,
}: MediaThumbnailProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { width: size, height: size, backgroundColor: colors.background },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
    >
      <Image
        source={{ uri: item.uri }}
        style={styles.image}
        resizeMode="cover"
      />
      {item.type === 'video' && (
        <View style={[styles.playIconContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <Ionicons name="play" size={24} color="#FFFFFF" />
        </View>
      )}
      {onRemove && (
        <TouchableOpacity
          style={[styles.removeButton, { backgroundColor: colors.error }]}
          onPress={onRemove}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={14} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  playIconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
