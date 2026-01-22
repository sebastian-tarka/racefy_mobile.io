# Mapbox Quick Reference: Mobile vs Web

This document provides a side-by-side comparison of Mapbox implementations in the Racefy mobile app (React Native) and web app (React SPA).

## Technology Stack Comparison

| Feature | Mobile (React Native) | Web (React SPA) |
|---------|----------------------|-----------------|
| **Mapbox SDK** | `@rnmapbox/maps` | `mapbox-gl` + `react-map-gl` |
| **GPS** | Native GPS (Expo Location) | Browser Geolocation API |
| **Platform** | iOS + Android | Web browsers |
| **Map Rendering** | Native rendering | WebGL rendering |
| **Performance** | Native performance | Browser performance |

---

## Installation Commands

### Mobile (React Native + Expo)
```bash
cd RacefyApp
npx expo install @rnmapbox/maps
```

### Web (React SPA)
```bash
npm install mapbox-gl react-map-gl
npm install --save-dev @types/mapbox-gl
```

---

## Environment Variables

### Mobile (.env in RacefyApp/)
```bash
MAPBOX_ACCESS_TOKEN=pk.your_token_here
RNMAPBOX_MAPS_DOWNLOAD_TOKEN=pk.your_token_here  # Same token, for SDK build
MAPBOX_ENABLED=true
```

### Web (.env.local)
```bash
VITE_MAPBOX_ACCESS_TOKEN=pk.your_token_here
VITE_MAPBOX_ENABLED=true
```

---

## Component Comparison

### Map Component

**Mobile:** `RacefyApp/src/components/MapboxRouteMap.tsx`
```typescript
import MapboxGL from '@rnmapbox/maps';

<MapboxGL.MapView
  style={styles.map}
  styleURL={mapStyle}
>
  <MapboxGL.Camera ref={cameraRef} />
  <MapboxGL.ShapeSource id="route" shape={lineGeoJSON}>
    <MapboxGL.LineLayer id="routeLine" style={...} />
  </MapboxGL.ShapeSource>
</MapboxGL.MapView>
```

**Web:** `src/components/MapboxRouteMap.tsx`
```typescript
import Map, { Source, Layer } from 'react-map-gl';

<Map
  mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
  mapStyle={mapStyle}
>
  <Source id="route" type="geojson" data={routeGeoJSON}>
    <Layer id="route-line" type="line" paint={...} />
  </Source>
</Map>
```

### Route Preview (with Fallbacks)

**Mobile:** `RacefyApp/src/components/LeafletMap.tsx` (wraps MapboxRouteMap)
```typescript
// Priority: Mapbox → Static Image → SVG
if (MAPBOX_ACCESS_TOKEN && trackData) {
  return <MapboxRouteMap trackData={trackData} />;
}
if (routeMapUrl) {
  return <Image source={{ uri: routeMapUrl }} />;
}
if (routeSvg) {
  return <SvgXml xml={routeSvg} />;
}
```

**Web:** `src/components/RoutePreview.tsx`
```typescript
// Priority: Mapbox → Static Image → SVG
if (MAPBOX_ACCESS_TOKEN && trackData) {
  return <MapboxRouteMap trackData={trackData} />;
}
if (routeMapUrl) {
  return <img src={routeMapUrl} />;
}
if (routeSvg) {
  return <div dangerouslySetInnerHTML={{ __html: routeSvg }} />;
}
```

---

## GPS Tracking Comparison

### Mobile (React Native)

**Location Permission:**
```typescript
import * as Location from 'expo-location';

const { status } = await Location.requestForegroundPermissionsAsync();
```

**GPS Tracking:**
```typescript
const subscription = await Location.watchPositionAsync(
  {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 5,
    timeInterval: 3000,
  },
  (location) => {
    const point: GpsPoint = {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      ele: location.coords.altitude ?? undefined,
      time: new Date(location.timestamp).toISOString(),
      speed: location.coords.speed ?? undefined,
    };
    // Process point...
  }
);
```

### Web (Browser)

**Location Permission:**
```typescript
// Permission requested on first geolocation call
// No explicit permission API in most browsers
```

**GPS Tracking:**
```typescript
const watchId = navigator.geolocation.watchPosition(
  (position) => {
    const point: GpsPoint = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      ele: position.coords.altitude ?? undefined,
      time: new Date().toISOString(),
      speed: position.coords.speed ?? undefined,
    };
    // Process point...
  },
  (error) => console.error(error),
  {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0,
  }
);
```

---

## API Service Patterns

Both mobile and web use **identical API patterns**:

### Common Types (Both Platforms)
```typescript
export interface GpsPoint {
  lat: number;
  lng: number;
  ele?: number;
  time?: string;
  speed?: number;
}

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface Activity {
  id: number;
  title: string;
  distance: number;  // meters
  duration: number;  // seconds
  status: 'in_progress' | 'paused' | 'completed';
  gps_track?: GpsTrack;
}
```

### API Calls (Identical on Both Platforms)
```typescript
// Start activity
const activity = await api.startLiveActivity({
  sport_type_id: 1,
  title: 'Morning Run',
  started_at: new Date().toISOString(),
});

// Add GPS points
const result = await api.addActivityPoints(activityId, points);

// Finish activity
const finished = await api.finishActivity(activityId, {
  title: 'Updated Title',
  ended_at: new Date().toISOString(),
});
```

---

## Usage Tracking (Identical)

### Mobile
```typescript
// RacefyApp/src/services/mapboxAnalytics.ts
import { mapboxAnalytics } from '../services/mapboxAnalytics';

mapboxAnalytics.trackMapLoad(activityId);
```

### Web
```typescript
// src/services/mapboxAnalytics.ts (same implementation)
import { mapboxAnalytics } from '../services/mapboxAnalytics';

mapboxAnalytics.trackMapLoad(activityId);
```

**Backend Endpoint (Same for Both):**
```
POST /api/analytics/map-usage
{
  "reports": [
    {
      "activityId": 123,
      "timestamp": "2024-01-15T10:30:00.000Z",
      "mapType": "interactive"
    }
  ]
}
```

---

## Map Styles (Identical)

### Mobile
```typescript
const mapStyle = isDark
  ? 'mapbox://styles/mapbox/navigation-night-v1'
  : MapboxGL.StyleURL.Outdoors;
```

### Web
```typescript
const mapStyle = darkMode
  ? 'mapbox://styles/mapbox/navigation-night-v1'
  : 'mapbox://styles/mapbox/outdoors-v12';
```

---

## Route Display (Identical Patterns)

### GeoJSON Format (Same on Both)
```typescript
const routeGeoJSON: GeoJSON.Feature<GeoJSON.LineString> = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'LineString',
    coordinates: trackData.coordinates, // [lng, lat][]
  },
};
```

### Route Styling (Same Colors)
```typescript
// Route line
lineColor: isDark ? '#34d399' : '#10b981'  // Emerald green
lineWidth: 4

// Start marker
circleColor: isDark ? '#4ade80' : '#22c55e'  // Green

// End marker
circleColor: isDark ? '#fb7185' : '#ef4444'  // Red
```

---

## Feature Toggle (Same Pattern)

### Mobile
```bash
# Disable Mapbox, use static images
MAPBOX_ENABLED=false
```

### Web
```bash
# Disable Mapbox, use static images
VITE_MAPBOX_ENABLED=false
```

**Code Check (Identical Pattern):**
```typescript
// Both platforms check this before rendering Mapbox
if (!MAPBOX_ACCESS_TOKEN) {
  return null; // Fall back to static image
}
```

---

## Live Activity Hook Comparison

### Mobile: `useLiveActivity.ts`
```typescript
export function useLiveActivityContext() {
  const {
    activity,
    isTracking,
    currentStats,
    startTracking,
    pauseTracking,
    resumeTracking,
    finishTracking,
  } = useContext(LiveActivityContext);

  return {
    activity,
    isTracking,
    currentStats,
    startTracking,    // Uses Expo Location
    pauseTracking,
    resumeTracking,
    finishTracking,
  };
}
```

### Web: `useLiveActivity.ts`
```typescript
export function useLiveActivity() {
  const {
    activity,
    isTracking,
    currentStats,
    startTracking,
    pauseTracking,
    resumeTracking,
    finishTracking,
  } = useState(...);

  return {
    activity,
    isTracking,
    currentStats,
    startTracking,    // Uses navigator.geolocation
    pauseTracking,
    resumeTracking,
    finishTracking,
  };
}
```

**Usage (Identical Interface):**
```typescript
const { startTracking, finishTracking } = useLiveActivity(); // or useLiveActivityContext()

// Start
await startTracking(1, 'Morning Run');

// Finish
const activity = await finishTracking({ title: 'Finished!' });
```

---

## Distance Calculation (Identical)

Both use **Haversine formula**:

```typescript
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};
```

---

## Key Differences Summary

| Aspect | Mobile | Web |
|--------|--------|-----|
| **GPS API** | `expo-location` | `navigator.geolocation` |
| **Background tracking** | ✅ Native support | ❌ Browser limitation |
| **Battery optimization** | ✅ Native optimizations | ⚠️ Browser-dependent |
| **Accuracy** | Better (native GPS) | Good (browser geolocation) |
| **Offline maps** | ⚠️ Needs extra setup | ❌ Requires connection |
| **Build complexity** | More complex (native deps) | Simpler (pure web) |

---

## Recommended Usage

### When to Use Mobile App
- Long outdoor activities (running, cycling)
- Background tracking needed
- Best GPS accuracy required
- Battery efficiency matters

### When to Use Web App
- Quick activity recording
- Desktop/laptop users
- No app installation wanted
- View/analyze existing activities

---

## Common Pitfalls

### Mobile
❌ **Forgetting background permissions**
```json
// app.json
"permissions": [
  "ACCESS_FINE_LOCATION",
  "ACCESS_COARSE_LOCATION",
  "ACCESS_BACKGROUND_LOCATION"  // Don't forget!
]
```

✅ **Include in app.json/app.config.ts**

### Web
❌ **HTTPS requirement**
- Geolocation only works on HTTPS (except localhost)

✅ **Deploy with SSL certificate**

❌ **Browser compatibility**
- Not all browsers support high accuracy GPS

✅ **Check `navigator.geolocation` availability**

---

## Testing Checklist

### Mobile
- [ ] Test on physical device (not emulator for accurate GPS)
- [ ] Test background tracking (app minimized)
- [ ] Test app killed and resumed
- [ ] Test poor GPS signal scenarios
- [ ] Test on iOS and Android

### Web
- [ ] Test on HTTPS (production domain)
- [ ] Test location permission prompt
- [ ] Test on different browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile browsers
- [ ] Test GPS accuracy in browser

---

## Resources

### Documentation
- Mobile: [RacefyApp/docs/MAPBOX_SETUP.md](MAPBOX_SETUP.md)
- Web: [MAPBOX_SPA_IMPLEMENTATION_GUIDE.md](MAPBOX_SPA_IMPLEMENTATION_GUIDE.md)
- API: [RacefyApp/docs/api/API_SPEC.md](RacefyApp/docs/api/API_SPEC.md)

### Mapbox Docs
- Mobile SDK: https://github.com/rnmapbox/maps
- Web SDK: https://docs.mapbox.com/mapbox-gl-js/
- React Map GL: https://visgl.github.io/react-map-gl/

### Backend Implementation
- Usage tracking: [RacefyApp/docs/api/MAP_USAGE_ENDPOINT.md](api/MAP_USAGE_ENDPOINT.md)
- Cost analysis: [RacefyApp/docs/MAP_USAGE_TRACKING.md](MAP_USAGE_TRACKING.md)

---

## Quick Start Commands

### Mobile Development
```bash
cd RacefyApp
npx expo install @rnmapbox/maps
# Edit .env with MAPBOX_ACCESS_TOKEN
npx expo run:android  # or run:ios
```

### Web Development
```bash
npm install mapbox-gl react-map-gl
# Edit .env.local with VITE_MAPBOX_ACCESS_TOKEN
npm run dev
```

### Production Build
```bash
# Mobile
eas build --platform android --profile production

# Web
npm run build
```

---

## Support

For questions or issues:
1. Check mobile implementation: `RacefyApp/src/components/MapboxRouteMap.tsx`
2. Check web guide: `MAPBOX_SPA_IMPLEMENTATION_GUIDE.md`
3. Review API docs: `RacefyApp/docs/api/`
4. Check Mapbox account dashboard for usage/costs

**Remember:** Both platforms use the **same API** and **same data structures** - just different rendering technologies!