import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { colors } from '../theme';

interface RoutePreviewProps {
  routeSvg: string | null;
  height?: number;
  backgroundColor?: string;
}

/**
 * RoutePreview - Displays a pre-generated SVG route from the API
 * This is a lightweight alternative to interactive maps
 */
export function RoutePreview({
  routeSvg,
  height = 250,
  backgroundColor = colors.cardBackground,
}: RoutePreviewProps) {
  if (!routeSvg) {
    return null;
  }

  // Ensure SVG has proper viewBox for scaling
  let processedSvg = routeSvg;
  if (!routeSvg.includes('preserveAspectRatio')) {
    processedSvg = routeSvg.replace('<svg', '<svg preserveAspectRatio="xMidYMid meet"');
  }

  return (
    <View style={[styles.container, { height, backgroundColor }]}>
      <View style={styles.svgWrapper}>
        <SvgXml xml={processedSvg} width="100%" height="100%" />
      </View>
    </View>
  );
}

// Backwards compatible alias - accepts old props but only uses routeSvg
export function LeafletMap(props: RoutePreviewProps & { coordinates?: unknown; bounds?: unknown; strokeColor?: string; strokeWidth?: number }) {
  return <RoutePreview routeSvg={props.routeSvg} height={props.height} backgroundColor={props.backgroundColor} />;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  svgWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
