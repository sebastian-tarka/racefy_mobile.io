import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { colors, avatarSizes } from '../theme';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}

export function Avatar({ uri, name, size = 'md' }: AvatarProps) {
  const dimension = avatarSizes[size];
  const fontSize = dimension * 0.4;

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
        },
      ]}
    >
      <Text style={[styles.initial, { fontSize }]}>{getInitial()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.border,
  },
  placeholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    color: colors.white,
    fontWeight: '600',
  },
});
