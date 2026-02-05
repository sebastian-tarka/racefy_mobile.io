# Mapbox Implementation Guide for React SPA

This guide shows how to implement Mapbox in your React SPA (Single Page Application) using the same patterns and API as the Racefy mobile app.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Environment Setup](#environment-setup)
5. [TypeScript Types](#typescript-types)
6. [API Service](#api-service)
7. [Mapbox Components](#mapbox-components)
8. [Usage Tracking](#usage-tracking)
9. [Live Activity Tracking](#live-activity-tracking)
10. [Example Usage](#example-usage)
11. [Cost Optimization](#cost-optimization)

---

## Overview

The React SPA will use:
- **Mapbox GL JS** for interactive maps (browser version of Mapbox)
- **Same API endpoints** as the mobile app
- **Same data structures** (GeoJSON, GPS points, activities)
- **Usage tracking** for cost monitoring
- **Live GPS tracking** for recording activities

### Feature Parity with Mobile App

| Feature | Mobile App | Web SPA |
|---------|-----------|---------|
| Interactive maps | ✅ `@rnmapbox/maps` | ✅ `mapbox-gl` + `react-map-gl` |
| Route display | ✅ LineString overlay | ✅ LineString overlay |
| Start/end markers | ✅ Green/Red circles | ✅ Green/Red circles |
| GPS tracking | ✅ Native GPS | ✅ Browser Geolocation API |
| API integration | ✅ REST API | ✅ Same REST API |
| Usage analytics | ✅ Cost tracking | ✅ Same tracking |

---

## Prerequisites

1. **Mapbox Account**
   - Sign up at [mapbox.com](https://www.mapbox.com/)
   - Get your **public access token** (`pk.xxx...`)
   - Free tier: 50,000 map loads/month

2. **React SPA Project**
   - React 18+ with TypeScript
   - Axios or Fetch for API calls
   - Authentication system (Bearer token)

3. **Backend API**
   - Same Laravel API as mobile app
   - Endpoints documented in `docs/api/API_SPEC.md`

---

## Installation

### Core Dependencies

```bash
npm install mapbox-gl react-map-gl
npm install --save-dev @types/mapbox-gl
```

### Optional Dependencies

```bash
# For date formatting (if needed)
npm install date-fns

# For GPS coordinate utilities
npm install geolib
```

---

## Environment Setup

Create `.env` or `.env.local`:

```bash
# API Configuration
VITE_API_BASE_URL=https://api.racefy.app/api
# or for local development:
# VITE_API_BASE_URL=http://localhost:8080/api

# Mapbox Configuration
VITE_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token_here
VITE_MAPBOX_ENABLED=true  # Set to false to disable Mapbox

# Environment
VITE_APP_ENV=production  # or 'staging' or 'development'
```

### Config Module

Create `src/config/api.ts`:

```typescript
// API Base URL
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.racefy.app/api';

// Mapbox Configuration
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || null;
const MAPBOX_FEATURE_ENABLED = import.meta.env.VITE_MAPBOX_ENABLED !== 'false';

// Only use Mapbox if both token is set AND feature is enabled
export const MAPBOX_ACCESS_TOKEN = MAPBOX_FEATURE_ENABLED ? MAPBOX_TOKEN : null;

// Environment
export const APP_ENV = import.meta.env.VITE_APP_ENV || 'production';

/**
 * Fix storage URLs returned from API
 * Handles relative URLs and localhost replacements
 */
export const fixStorageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;

  // Get base URL without /api suffix
  const storageBase = API_BASE_URL.replace('/api', '');

  // Handle relative URLs (e.g., /storage/videos/...)
  if (url.startsWith('/')) {
    return `${storageBase}${url}`;
  }

  // Replace localhost with the correct host
  if (url.includes('localhost:')) {
    return url.replace(/http:\/\/localhost:\d+/, storageBase);
  }

  // Replace 127.0.0.1 with the correct host
  if (url.includes('127.0.0.1:')) {
    return url.replace(/http:\/\/127\.0\.0\.1:\d+/, storageBase);
  }

  return url;
};
```

---

## TypeScript Types

Create `src/types/api.ts` (matching mobile app types):

```typescript
// ============ GPS & ACTIVITIES ============

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: [number, number][]; // [longitude, latitude]
}

export interface GpsPoint {
  lat: number;
  lng: number;
  ele?: number;      // Elevation in meters
  time?: string;     // ISO timestamp
  hr?: number;       // Heart rate (bpm)
  speed?: number;    // Speed in m/s
  cadence?: number;  // Steps per minute
}

export interface GpsTrack {
  id: number;
  activity_id: number;
  track_data: GeoJSONLineString;
  points_count: number;
  bounds: {
    min_lat: number;
    max_lat: number;
    min_lng: number;
    max_lng: number;
  };
  simplified_track: GeoJSONLineString;
  route_svg: string | null;
  route_map_url: string | null;
  svg_generated_at: string | null;
  map_generated_at: string | null;
}

export interface Activity {
  id: number;
  user_id: number;
  post_id: number | null;
  sport_type_id: number;
  event_id: number | null;
  title: string;
  description: string | null;
  started_at: string;
  ended_at: string | null;
  duration: number;        // seconds
  distance: number;        // meters
  elevation_gain: number | null;
  calories: number | null;
  avg_speed: number | null;    // m/s
  max_speed: number | null;    // m/s
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  source: 'app' | 'garmin' | 'amazfit' | 'strava' | 'gpx_import' | 'manual';
  is_private: boolean;
  // Live tracking fields
  status: 'in_progress' | 'paused' | 'completed';
  is_active: boolean;
  total_paused_duration: number;
  last_point_at: string | null;
  has_gps_track: boolean;
  route_svg?: string | null;
  route_map_url?: string | null;
  gps_track?: GpsTrack;
  is_owner?: boolean;
}

export interface AddActivityPointsRequest {
  points: GpsPoint[];
  calories?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
}

export interface AddActivityPointsResponse {
  message: string;
  points_count: number;
  total_points: number;
  stats: {
    distance: number;
    duration: number;
    elevation_gain: number;
    calories?: number;
    avg_speed?: number;
    max_speed?: number;
  };
}

// ============ API RESPONSE ============

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
```

---

## API Service

Create `src/services/api.ts`:

```typescript
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config/api';
import type {
  Activity,
  GpsPoint,
  AddActivityPointsRequest,
  AddActivityPointsResponse,
  ApiResponse,
} from '../types/api';

class ApiService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add auth interceptor
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  /**
   * Set authentication token
   */
  setToken(token: string | null) {
    this.token = token;
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    return this.token;
  }

  // ============ ACTIVITIES ============

  /**
   * Get current active activity
   */
  async getCurrentActivity(): Promise<Activity | null> {
    try {
      const response = await this.client.get<ApiResponse<Activity>>('/activities/current');
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Start a new live activity
   */
  async startLiveActivity(data: {
    sport_type_id: number;
    title?: string;
    started_at: string;
    event_id?: number;
  }): Promise<Activity> {
    const response = await this.client.post<ApiResponse<Activity>>('/activities/live/start', data);
    return response.data.data;
  }

  /**
   * Add GPS points to live activity
   */
  async addActivityPoints(
    activityId: number,
    points: GpsPoint[],
    extraData?: { calories?: number; avg_heart_rate?: number; max_heart_rate?: number }
  ): Promise<AddActivityPointsResponse> {
    const payload: AddActivityPointsRequest = {
      points,
      ...extraData,
    };
    const response = await this.client.post<AddActivityPointsResponse>(
      `/activities/${activityId}/points`,
      payload
    );
    return response.data;
  }

  /**
   * Pause live activity
   */
  async pauseActivity(activityId: number): Promise<Activity> {
    const response = await this.client.post<ApiResponse<Activity>>(
      `/activities/${activityId}/pause`
    );
    return response.data.data;
  }

  /**
   * Resume paused activity
   */
  async resumeActivity(activityId: number): Promise<Activity> {
    const response = await this.client.post<ApiResponse<Activity>>(
      `/activities/${activityId}/resume`
    );
    return response.data.data;
  }

  /**
   * Finish live activity
   */
  async finishActivity(
    activityId: number,
    data?: {
      title?: string;
      description?: string;
      ended_at?: string;
      calories?: number;
      skip_auto_post?: boolean;
    }
  ): Promise<{ data: Activity; post?: any }> {
    const response = await this.client.post(`/activities/${activityId}/finish`, data);
    return response.data;
  }

  /**
   * Discard live activity
   */
  async discardActivity(activityId: number): Promise<void> {
    await this.client.delete(`/activities/${activityId}`);
  }

  /**
   * Get activity by ID
   */
  async getActivity(activityId: number): Promise<Activity> {
    const response = await this.client.get<ApiResponse<Activity>>(`/activities/${activityId}`);
    return response.data.data;
  }

  // ============ MAP USAGE TRACKING ============

  /**
   * Report map usage for cost tracking
   */
  async reportMapUsage(
    reports: Array<{
      activityId: number;
      timestamp: string;
      mapType: 'interactive' | 'static';
    }>
  ): Promise<void> {
    try {
      await this.client.post('/analytics/map-usage', { reports });
    } catch (error) {
      console.error('Failed to report map usage:', error);
      // Don't throw - usage tracking should not block the app
    }
  }
}

export const api = new ApiService();
```

---

## Mapbox Components

### 1. MapboxRouteMap Component

Create `src/components/MapboxRouteMap.tsx`:

```typescript
import React, { useRef, useEffect, useState } from 'react';
import Map, { Source, Layer, MapRef } from 'react-map-gl';
import type { LngLatBoundsLike } from 'mapbox-gl';
import { MAPBOX_ACCESS_TOKEN } from '../config/api';
import { mapboxAnalytics } from '../services/mapboxAnalytics';
import type { GeoJSONLineString } from '../types/api';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapboxRouteMapProps {
  trackData: GeoJSONLineString;
  activityId: number;
  height?: number;
  initialZoom?: number;
  darkMode?: boolean;
}

/**
 * MapboxRouteMap - Interactive Mapbox map with route overlay
 * Provides map interaction (zoom, pan, rotate) with GPS route displayed as a line
 */
export function MapboxRouteMap({
  trackData,
  activityId,
  height = 400,
  initialZoom = 13,
  darkMode = false,
}: MapboxRouteMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [isLoading, setIsLoading] = useState(true);

  // If Mapbox is not available, return null
  if (!MAPBOX_ACCESS_TOKEN) {
    return null;
  }

  // Track map load for analytics/cost monitoring
  useEffect(() => {
    mapboxAnalytics.trackMapLoad(activityId);
  }, [activityId]);

  // Calculate map bounds from trackData
  const getBounds = (): LngLatBoundsLike | undefined => {
    const coordinates = trackData.coordinates;
    if (!coordinates || coordinates.length === 0) {
      return undefined;
    }

    const lngs = coordinates.map((coord) => coord[0]);
    const lats = coordinates.map((coord) => coord[1]);

    return [
      [Math.min(...lngs), Math.min(...lats)], // Southwest
      [Math.max(...lngs), Math.max(...lats)], // Northeast
    ];
  };

  const bounds = getBounds();

  // Fit camera to bounds when map is ready
  const onMapLoad = () => {
    if (bounds && mapRef.current) {
      mapRef.current.fitBounds(bounds, {
        padding: 40,
        duration: 1000,
      });
    }
    setIsLoading(false);
  };

  // GeoJSON for the route line
  const routeGeoJSON: GeoJSON.Feature<GeoJSON.LineString> = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: trackData.coordinates,
    },
  };

  // GeoJSON for start marker
  const startMarkerGeoJSON: GeoJSON.Feature<GeoJSON.Point> | null =
    trackData.coordinates.length > 0
      ? {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: trackData.coordinates[0],
          },
        }
      : null;

  // GeoJSON for end marker
  const endMarkerGeoJSON: GeoJSON.Feature<GeoJSON.Point> | null =
    trackData.coordinates.length > 1
      ? {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: trackData.coordinates[trackData.coordinates.length - 1],
          },
        }
      : null;

  // Select map style based on theme
  const mapStyle = darkMode
    ? 'mapbox://styles/mapbox/navigation-night-v1'
    : 'mapbox://styles/mapbox/outdoors-v12';

  // Theme-aware colors
  const routeColor = darkMode ? '#34d399' : '#10b981'; // Emerald green
  const startMarkerColor = darkMode ? '#4ade80' : '#22c55e';
  const endMarkerColor = darkMode ? '#fb7185' : '#ef4444';

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
        initialViewState={{
          longitude: trackData.coordinates[0]?.[0] || 0,
          latitude: trackData.coordinates[0]?.[1] || 0,
          zoom: initialZoom,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        onLoad={onMapLoad}
      >
        {/* Route line */}
        <Source id="route" type="geojson" data={routeGeoJSON}>
          <Layer
            id="route-line"
            type="line"
            paint={{
              'line-color': routeColor,
              'line-width': 4,
              'line-opacity': 1,
            }}
            layout={{
              'line-cap': 'round',
              'line-join': 'round',
            }}
          />
        </Source>

        {/* Start marker */}
        {startMarkerGeoJSON && (
          <Source id="start-marker" type="geojson" data={startMarkerGeoJSON}>
            <Layer
              id="start-circle"
              type="circle"
              paint={{
                'circle-radius': 10,
                'circle-color': startMarkerColor,
                'circle-stroke-width': 3,
                'circle-stroke-color': '#ffffff',
              }}
            />
          </Source>
        )}

        {/* End marker */}
        {endMarkerGeoJSON && (
          <Source id="end-marker" type="geojson" data={endMarkerGeoJSON}>
            <Layer
              id="end-circle"
              type="circle"
              paint={{
                'circle-radius': 10,
                'circle-color': endMarkerColor,
                'circle-stroke-width': 3,
                'circle-stroke-color': '#ffffff',
              }}
            />
          </Source>
        )}
      </Map>

      {/* Loading overlay */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: darkMode ? '#1f2937' : '#f9fafb',
          }}
        >
          <div className="spinner">Loading map...</div>
        </div>
      )}
    </div>
  );
}
```

### 2. RoutePreview Component (with Fallback)

Create `src/components/RoutePreview.tsx`:

```typescript
import React, { useState } from 'react';
import { MapboxRouteMap } from './MapboxRouteMap';
import { MAPBOX_ACCESS_TOKEN } from '../config/api';
import type { GeoJSONLineString } from '../types/api';

interface RoutePreviewProps {
  routeMapUrl?: string | null;     // Static image from backend
  routeSvg?: string | null;         // SVG fallback
  trackData?: GeoJSONLineString;    // GeoJSON for Mapbox
  activityId: number;
  height?: number;
  darkMode?: boolean;
}

/**
 * RoutePreview - Smart route display with automatic fallback
 * Priority: Mapbox interactive > Static image > SVG
 */
export function RoutePreview({
  routeMapUrl,
  routeSvg,
  trackData,
  activityId,
  height = 400,
  darkMode = false,
}: RoutePreviewProps) {
  const [imageError, setImageError] = useState(false);

  // 1st priority: Use Mapbox if available and trackData provided
  if (MAPBOX_ACCESS_TOKEN && trackData && trackData.coordinates.length > 0) {
    return (
      <MapboxRouteMap
        trackData={trackData}
        activityId={activityId}
        height={height}
        darkMode={darkMode}
      />
    );
  }

  // 2nd priority: Use static image from backend
  if (routeMapUrl && !imageError) {
    return (
      <div style={{ width: '100%', height }}>
        <img
          src={routeMapUrl}
          alt="Activity route"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // 3rd priority: Use SVG
  if (routeSvg) {
    return (
      <div
        style={{ width: '100%', height }}
        dangerouslySetInnerHTML={{ __html: routeSvg }}
      />
    );
  }

  // No route data available
  return (
    <div
      style={{
        width: '100%',
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: darkMode ? '#1f2937' : '#f3f4f6',
        color: darkMode ? '#9ca3af' : '#6b7280',
      }}
    >
      No route data available
    </div>
  );
}
```

---

## Usage Tracking

Create `src/services/mapboxAnalytics.ts`:

```typescript
import { api } from './api';

/**
 * Format date for MySQL datetime format (YYYY-MM-DD HH:MM:SS)
 */
function formatMySQLDateTime(date: Date): string {
  const pad = (num: number) => String(num).padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * MapboxAnalytics - Tracks Mapbox SDK usage for cost monitoring
 */
class MapboxAnalytics {
  private pendingReports: Array<{
    activityId: number;
    timestamp: string;
    mapType: 'interactive' | 'static';
  }> = [];

  private reportInterval: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly REPORT_INTERVAL_MS = 30000; // 30 seconds

  constructor() {
    this.startPeriodicReporting();
  }

  /**
   * Track when a Mapbox map is loaded (interactive SDK)
   */
  trackMapLoad(activityId: number) {
    const report = {
      activityId,
      timestamp: formatMySQLDateTime(new Date()),
      mapType: 'interactive' as const,
    };

    this.pendingReports.push(report);

    // Send immediately if batch size reached
    if (this.pendingReports.length >= this.BATCH_SIZE) {
      this.sendPendingReports();
    }
  }

  /**
   * Track when a static map image is displayed
   */
  trackStaticMapView(activityId: number) {
    const report = {
      activityId,
      timestamp: formatMySQLDateTime(new Date()),
      mapType: 'static' as const,
    };

    this.pendingReports.push(report);

    if (this.pendingReports.length >= this.BATCH_SIZE) {
      this.sendPendingReports();
    }
  }

  /**
   * Send pending reports to backend
   */
  private async sendPendingReports() {
    if (this.pendingReports.length === 0) return;

    const reportsToSend = [...this.pendingReports];
    this.pendingReports = [];

    try {
      await api.reportMapUsage(reportsToSend);
      console.log(`Map usage reports sent: ${reportsToSend.length} reports`);
    } catch (error) {
      console.error('Failed to send map usage reports:', error);
      // Don't re-queue to avoid memory buildup
    }
  }

  /**
   * Start periodic reporting
   */
  private startPeriodicReporting() {
    if (this.reportInterval) return;

    this.reportInterval = setInterval(() => {
      this.sendPendingReports();
    }, this.REPORT_INTERVAL_MS);
  }

  /**
   * Stop periodic reporting (cleanup)
   */
  stopPeriodicReporting() {
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }
  }

  /**
   * Force send pending reports
   */
  async flush() {
    await this.sendPendingReports();
  }
}

export const mapboxAnalytics = new MapboxAnalytics();
```

---

## Live Activity Tracking

Create `src/hooks/useLiveActivity.ts`:

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../services/api';
import type { Activity, GpsPoint } from '../types/api';

interface LiveActivityStats {
  distance: number;
  duration: number;
  elevation_gain: number;
  points_count: number;
  avg_speed: number;
  max_speed: number;
}

interface UseLiveActivityReturn {
  activity: Activity | null;
  isTracking: boolean;
  isPaused: boolean;
  isLoading: boolean;
  error: string | null;
  currentStats: LiveActivityStats;
  startTracking: (sportTypeId: number, title?: string) => Promise<void>;
  pauseTracking: () => Promise<void>;
  resumeTracking: () => Promise<void>;
  finishTracking: (data?: { title?: string; description?: string }) => Promise<Activity | null>;
  discardTracking: () => Promise<void>;
}

const initialStats: LiveActivityStats = {
  distance: 0,
  duration: 0,
  elevation_gain: 0,
  points_count: 0,
  avg_speed: 0,
  max_speed: 0,
};

export function useLiveActivity(): UseLiveActivityReturn {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStats, setCurrentStats] = useState<LiveActivityStats>(initialStats);

  const pointsBuffer = useRef<GpsPoint[]>([]);
  const watchId = useRef<number | null>(null);
  const syncInterval = useRef<NodeJS.Timeout | null>(null);
  const lastPosition = useRef<{ lat: number; lng: number } | null>(null);

  // Haversine distance calculation
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Start GPS tracking
  const startGpsTracking = (activityId: number) => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const point: GpsPoint = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          ele: position.coords.altitude ?? undefined,
          time: new Date().toISOString(),
          speed: position.coords.speed ?? undefined,
        };

        // Calculate local distance
        if (lastPosition.current) {
          const dist = calculateDistance(
            lastPosition.current.lat,
            lastPosition.current.lng,
            point.lat,
            point.lng
          );

          if (dist > 5) {
            // Min 5 meters threshold
            setCurrentStats((prev) => ({
              ...prev,
              distance: prev.distance + dist,
            }));
          }
        }

        lastPosition.current = { lat: point.lat, lng: point.lng };
        pointsBuffer.current.push(point);
      },
      (err) => {
        console.error('GPS error:', err);
        setError(`GPS error: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );

    // Sync points every 30 seconds
    syncInterval.current = setInterval(() => {
      syncPoints(activityId);
    }, 30000);
  };

  // Stop GPS tracking
  const stopGpsTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (syncInterval.current) {
      clearInterval(syncInterval.current);
      syncInterval.current = null;
    }
  };

  // Sync points to server
  const syncPoints = async (activityId: number) => {
    if (pointsBuffer.current.length === 0) return;

    const pointsToSync = [...pointsBuffer.current];
    pointsBuffer.current = [];

    try {
      const result = await api.addActivityPoints(activityId, pointsToSync);
      setCurrentStats({
        distance: result.stats.distance,
        duration: result.stats.duration,
        elevation_gain: result.stats.elevation_gain,
        points_count: result.total_points,
        avg_speed: result.stats.avg_speed ?? 0,
        max_speed: result.stats.max_speed ?? 0,
      });
    } catch (err: any) {
      console.error('Failed to sync GPS points:', err);
      // Re-add points to buffer
      pointsBuffer.current.unshift(...pointsToSync);
    }
  };

  // Start tracking
  const startTracking = useCallback(async (sportTypeId: number, title?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const newActivity = await api.startLiveActivity({
        sport_type_id: sportTypeId,
        title,
        started_at: new Date().toISOString(),
      });

      setActivity(newActivity);
      setIsTracking(true);
      setIsPaused(false);
      setCurrentStats(initialStats);

      startGpsTracking(newActivity.id);
    } catch (err: any) {
      setError(err.message || 'Failed to start activity');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Pause tracking
  const pauseTracking = useCallback(async () => {
    if (!activity) return;

    try {
      setIsLoading(true);
      stopGpsTracking();

      if (activity.id) {
        await syncPoints(activity.id);
        await api.pauseActivity(activity.id);
      }

      setIsTracking(false);
      setIsPaused(true);
    } catch (err: any) {
      setError(err.message || 'Failed to pause activity');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [activity]);

  // Resume tracking
  const resumeTracking = useCallback(async () => {
    if (!activity) return;

    try {
      setIsLoading(true);
      await api.resumeActivity(activity.id);

      setIsTracking(true);
      setIsPaused(false);

      startGpsTracking(activity.id);
    } catch (err: any) {
      setError(err.message || 'Failed to resume activity');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [activity]);

  // Finish tracking
  const finishTracking = useCallback(
    async (data?: { title?: string; description?: string }) => {
      if (!activity) return null;

      try {
        setIsLoading(true);
        stopGpsTracking();

        if (activity.id) {
          await syncPoints(activity.id);
          const response = await api.finishActivity(activity.id, {
            ...data,
            ended_at: new Date().toISOString(),
          });

          setActivity(null);
          setIsTracking(false);
          setIsPaused(false);
          setCurrentStats(initialStats);

          return response.data;
        }
        return null;
      } catch (err: any) {
        setError(err.message || 'Failed to finish activity');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [activity]
  );

  // Discard tracking
  const discardTracking = useCallback(async () => {
    if (!activity) return;

    try {
      setIsLoading(true);
      stopGpsTracking();

      if (activity.id) {
        await api.discardActivity(activity.id);
      }

      setActivity(null);
      setIsTracking(false);
      setIsPaused(false);
      setCurrentStats(initialStats);
    } catch (err: any) {
      setError(err.message || 'Failed to discard activity');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [activity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopGpsTracking();
    };
  }, []);

  return {
    activity,
    isTracking,
    isPaused,
    isLoading,
    error,
    currentStats,
    startTracking,
    pauseTracking,
    resumeTracking,
    finishTracking,
    discardTracking,
  };
}
```

---

## Example Usage

### 1. Activity Detail Page

```typescript
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { RoutePreview } from '../components/RoutePreview';
import { api } from '../services/api';
import { fixStorageUrl } from '../config/api';
import type { Activity } from '../types/api';

export function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);

  useEffect(() => {
    if (id) {
      api.getActivity(parseInt(id)).then(setActivity);
    }
  }, [id]);

  if (!activity) return <div>Loading...</div>;

  return (
    <div>
      <h1>{activity.title}</h1>

      {/* Map Preview */}
      {activity.gps_track && (
        <RoutePreview
          routeMapUrl={fixStorageUrl(activity.gps_track.route_map_url)}
          routeSvg={activity.gps_track.route_svg}
          trackData={activity.gps_track.simplified_track}
          activityId={activity.id}
          height={400}
        />
      )}

      {/* Activity Stats */}
      <div>
        <p>Distance: {(activity.distance / 1000).toFixed(2)} km</p>
        <p>Duration: {Math.floor(activity.duration / 60)} min</p>
        <p>Elevation: {activity.elevation_gain || 0} m</p>
      </div>
    </div>
  );
}
```

### 2. Live Activity Recording

```typescript
import React from 'react';
import { useLiveActivity } from '../hooks/useLiveActivity';

export function ActivityRecordingPage() {
  const {
    activity,
    isTracking,
    isPaused,
    currentStats,
    startTracking,
    pauseTracking,
    resumeTracking,
    finishTracking,
  } = useLiveActivity();

  const handleStart = () => {
    startTracking(1, 'My Run'); // sportTypeId = 1
  };

  const handleFinish = async () => {
    const finished = await finishTracking({
      title: 'Morning Run',
      description: 'Great workout!',
    });
    if (finished) {
      console.log('Activity finished:', finished);
    }
  };

  return (
    <div>
      <h1>Record Activity</h1>

      {!isTracking && !activity && (
        <button onClick={handleStart}>Start Recording</button>
      )}

      {isTracking && (
        <>
          <div>
            <p>Distance: {(currentStats.distance / 1000).toFixed(2)} km</p>
            <p>Duration: {Math.floor(currentStats.duration / 60)} min</p>
            <p>Elevation: {currentStats.elevation_gain} m</p>
          </div>

          {!isPaused && <button onClick={pauseTracking}>Pause</button>}
          {isPaused && <button onClick={resumeTracking}>Resume</button>}
          <button onClick={handleFinish}>Finish</button>
        </>
      )}
    </div>
  );
}
```

---

## Cost Optimization

### Best Practices

1. **Enable/Disable Mapbox via Flag**
   ```bash
   # Disable Mapbox to use static images
   VITE_MAPBOX_ENABLED=false
   ```

2. **Batch Usage Tracking**
   - Reports sent every 30 seconds or 10 reports
   - Non-blocking (won't affect UX)

3. **Smart Fallback**
   - Use Mapbox for interactive view
   - Fall back to static images when Mapbox disabled
   - SVG as final fallback

4. **Cache Static Images**
   - Browser cache for backend-generated images
   - Only load Mapbox when needed

5. **Monitor Costs**
   - Backend receives usage reports
   - Query `map_usage_logs` table for analytics

### Free Tier Limits

- **50,000 map loads/month** (free)
- After: ~$0.10 per 1,000 active users/month

---

## Summary

This implementation provides:

✅ **Full API compatibility** with mobile app
✅ **Interactive Mapbox maps** with route overlay
✅ **Live GPS tracking** in the browser
✅ **Usage analytics** for cost monitoring
✅ **Smart fallbacks** (Mapbox → static → SVG)
✅ **TypeScript types** matching mobile app
✅ **Cost optimization** with feature flags

Your React SPA now has the same Mapbox functionality as the mobile app!