import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';

interface ScreenContainerProps {
  children: React.ReactNode;
  edges?: Edge[];
  style?: ViewStyle;
}

export function ScreenContainer({
  children,
  edges = ['top', 'bottom'],
  style,
}: ScreenContainerProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top-left emerald glow */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(16, 185, 129, 0.12)', 'transparent']
            : ['rgba(16, 185, 129, 0.08)', 'transparent']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 0.5 }}
        style={styles.glowTopLeft}
      />
      {/* Bottom-right blue glow */}
      <LinearGradient
        colors={
          isDark
            ? ['transparent', 'rgba(59, 130, 246, 0.08)']
            : ['transparent', 'rgba(59, 130, 246, 0.06)']
        }
        start={{ x: 0.3, y: 0.5 }}
        end={{ x: 1, y: 1 }}
        style={styles.glowBottomRight}
      />
      <SafeAreaView
        style={[styles.container, style]}
        edges={edges}
      >
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glowTopLeft: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  glowBottomRight: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
});