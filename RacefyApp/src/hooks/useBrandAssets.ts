import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useTheme } from './useTheme';
import type { BrandAsset, BrandAssetCategory, BrandAssetVariant, BrandAssetsResponse } from '../types/api';

// Cache for brand assets to avoid refetching
let cachedAssets: BrandAssetsResponse | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

interface UseBrandAssetsResult {
  assets: BrandAssetsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getAsset: (category: BrandAssetCategory, variant?: BrandAssetVariant) => BrandAsset | null;
  getLogoUrl: (category?: BrandAssetCategory) => string | null;
}

export function useBrandAssets(): UseBrandAssetsResult {
  const { isDark } = useTheme();
  const [assets, setAssets] = useState<BrandAssetsResponse | null>(cachedAssets);
  const [isLoading, setIsLoading] = useState(!cachedAssets);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async (force = false) => {
    // Use cache if valid and not forcing refresh
    if (!force && cachedAssets && Date.now() - cacheTimestamp < CACHE_DURATION) {
      setAssets(cachedAssets);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getBrandAssets();
      cachedAssets = response;
      cacheTimestamp = Date.now();
      setAssets(response);
    } catch (err: any) {
      console.error('Failed to fetch brand assets:', err);
      setError(err.message || 'Failed to load brand assets');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const refetch = useCallback(async () => {
    await fetchAssets(true);
  }, [fetchAssets]);

  /**
   * Get a specific asset by category and variant
   * If variant is not specified, auto-selects based on theme (dark/light/default)
   */
  const getAsset = useCallback(
    (category: BrandAssetCategory, variant?: BrandAssetVariant): BrandAsset | null => {
      if (!assets?.data) return null;

      const categoryAssets = assets.data[category];
      if (!categoryAssets) return null;

      // If variant specified, use it directly
      if (variant) {
        return categoryAssets[variant] || categoryAssets.default || null;
      }

      // Auto-select variant based on theme
      const themeVariant = isDark ? 'dark' : 'light';
      return categoryAssets[themeVariant] || categoryAssets.default || null;
    },
    [assets, isDark]
  );

  /**
   * Convenience method to get logo URL with automatic theme selection
   */
  const getLogoUrl = useCallback(
    (category: BrandAssetCategory = 'logo-full'): string | null => {
      const asset = getAsset(category);
      return asset?.url || null;
    },
    [getAsset]
  );

  return {
    assets,
    isLoading,
    error,
    refetch,
    getAsset,
    getLogoUrl,
  };
}
