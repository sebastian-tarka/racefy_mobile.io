import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { colors } from '../theme';

interface RoutePreviewProps {
  routeMapUrl?: string | null;
  routeSvg?: string | null;
  height?: number;
  backgroundColor?: string;
}

/**
 * RoutePreview - Displays activity route using:
 * 1. Pre-generated map image (routeMapUrl) - preferred, includes map background
 * 2. SVG route (routeSvg) - fallback, just the route path
 */
export function RoutePreview({
  routeMapUrl,
  routeSvg,
  height = 250,
  backgroundColor = colors.cardBackground,
}: RoutePreviewProps) {
  // Prefer map image URL over SVG
  if (routeMapUrl) {
    return (
      <View style={[styles.container, { height, backgroundColor }]}>
        <Image
          source={{ uri: routeMapUrl }}
          style={styles.mapImage}
          resizeMode="cover"
        />
      </View>
    );
  }

  // Fallback to SVG
  if (routeSvg) {
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

  return null;
}

// Backwards compatible alias
export function LeafletMap(props: RoutePreviewProps & { coordinates?: unknown; bounds?: unknown; strokeColor?: string; strokeWidth?: number }) {
  return <RoutePreview routeMapUrl={props.routeMapUrl} routeSvg={props.routeSvg} height={props.height} backgroundColor={props.backgroundColor} />;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  svgWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
