import React from 'react';
import { View, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { useBrandAssets } from '../hooks/useBrandAssets';
import { useTheme } from '../hooks/useTheme';
import type { BrandAssetCategory, BrandAssetVariant } from '../types/api';

interface BrandLogoProps {
  /**
   * Logo category: 'logo-full' (icon + text), 'logo-icon' (icon only), 'logo-text' (text only)
   */
  category?: BrandAssetCategory;
  /**
   * Force a specific variant (overrides theme-based selection)
   */
  variant?: BrandAssetVariant;
  /**
   * Width of the logo (height auto-scales based on aspect ratio)
   */
  width?: number;
  /**
   * Height of the logo (use either width or height, not both for aspect ratio)
   */
  height?: number;
  /**
   * Custom style for the container
   */
  style?: object;
  /**
   * Show loading indicator while fetching
   */
  showLoading?: boolean;
}

// Default sizes for each category
const DEFAULT_SIZES: Record<BrandAssetCategory, { width: number; height: number }> = {
  'logo-full': { width: 180, height: 50 },
  'logo-icon': { width: 48, height: 48 },
  'logo-text': { width: 120, height: 32 },
};

export function BrandLogo({
  category = 'logo-full',
  variant,
  width,
  height,
  style,
  showLoading = true,
}: BrandLogoProps) {
  const { colors } = useTheme();
  const { getAsset, isLoading } = useBrandAssets();

  const asset = getAsset(category, variant);
  const defaultSize = DEFAULT_SIZES[category];

  // Use provided dimensions or defaults
  const logoWidth = width || defaultSize.width;
  const logoHeight = height || defaultSize.height;

  if (isLoading && showLoading) {
    return (
      <View style={[styles.container, { width: logoWidth, height: logoHeight }, style]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!asset?.url) {
    // Return empty view with same dimensions to prevent layout shift
    return <View style={[styles.container, { width: logoWidth, height: logoHeight }, style]} />;
  }

  // Check if the asset is SVG
  const isSvg = asset.type === 'svg' || asset.url.endsWith('.svg');

  if (isSvg) {
    return (
      <View style={[styles.container, style]}>
        <SvgUri
          uri={asset.url}
          width={logoWidth}
          height={logoHeight}
        />
      </View>
    );
  }

  // For non-SVG images (PNG, JPG, etc.)
  return (
    <View style={[styles.container, style]}>
      <Image
        source={{ uri: asset.url }}
        style={{ width: logoWidth, height: logoHeight }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
});
