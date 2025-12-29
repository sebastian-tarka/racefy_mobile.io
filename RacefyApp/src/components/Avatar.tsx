import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { avatarSizes } from '../theme';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}

export function Avatar({ uri, name, size = 'md' }: AvatarProps) {
  const { colors } = useTheme();
  const dimension = avatarSizes[size];
  const fontSizeValue = dimension * 0.4;

  const getInitial = () => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.image,
          {
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
            backgroundColor: colors.border,
          },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: colors.primary,
        },
      ]}
    >
      <Text style={[styles.initial, { fontSize: fontSizeValue, color: colors.white }]}>{getInitial()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {},
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    fontWeight: '600',
  },
});
