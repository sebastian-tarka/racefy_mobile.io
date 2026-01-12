# Mapbox Integration Setup Guide

This guide explains how to set up interactive Mapbox maps in the Racefy mobile app for a better user experience when viewing activity routes.

## Overview

Currently, the app displays static map images generated on the backend. By integrating Mapbox, you get:

- **Native interactive maps** with smooth zooming and panning
- **Vector tiles** for better performance and quality
- **Better user experience** with touch controls
- **Real-time map rendering** on the client side
- **Start/end markers** for activities
- **Automatic route fitting** to optimal zoom level

## Prerequisites

1. Mapbox account (free tier available)
2. Mapbox public access token
3. React Native project with Expo

## Step 1: Get Mapbox Access Token

1. Go to [Mapbox Account](https://account.mapbox.com/)
2. Sign up or log in
3. Navigate to **Access tokens**
4. Create a new token or use your default public token
5. Copy the token (starts with `pk.`)

**Note**: Only use public tokens (starting with `pk.`) in mobile apps. Never use secret tokens (`sk.`).

## Step 2: Install Mapbox SDK

The app uses `@rnmapbox/maps` which is compatible with Expo:

```bash
cd RacefyApp
npx expo install @rnmapbox/maps
```

## Step 3: Configure Mapbox Tokens

Add your Mapbox tokens to `.env`:

```bash
# Copy from .env.example if needed
cp .env.example .env

# Edit .env and add your tokens
MAPBOX_ACCESS_TOKEN=pk.your_token_here
RNMAPBOX_MAPS_DOWNLOAD_TOKEN=pk.your_token_here  # Usually same as access token
MAPBOX_ENABLED=true  # Set to false to use static images instead
```

**Note**: `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` is required by the Mapbox SDK during build. Use the same public token as `MAPBOX_ACCESS_TOKEN`.

## Step 4: Configure Expo Plugins

The Mapbox plugin is already configured in `app.config.ts`:

```typescript
plugins: [
  // ... existing plugins
  '@rnmapbox/maps',
],
```

The plugin automatically reads `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` from environment variables.

## Step 5: Rebuild the App

Since Mapbox requires native code, you need to rebuild:

### For Development

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

### For EAS Build

#### Option A: Use Static Images (Recommended for Testing)

```bash
# Disable Mapbox, use static images from backend
eas secret:create --name MAPBOX_ENABLED --value "false" --scope project

# Build
eas build --platform android --profile staging
```

#### Option B: Use Interactive Mapbox Maps

```bash
# Set all required secrets
eas secret:create --name MAPBOX_ACCESS_TOKEN --value "pk.your_token_here" --scope project
eas secret:create --name RNMAPBOX_MAPS_DOWNLOAD_TOKEN --value "pk.your_token_here" --scope project
eas secret:create --name MAPBOX_ENABLED --value "true" --scope project

# Build for staging/production
eas build --platform android --profile staging
eas build --platform ios --profile production
```

## Controlling Mapbox Usage

### The `MAPBOX_ENABLED` Flag

You can easily switch between interactive Mapbox maps and static images using the `MAPBOX_ENABLED` environment variable:

```bash
# Use interactive Mapbox maps
MAPBOX_ENABLED=true

# Use static images from backend (default when not set)
MAPBOX_ENABLED=false
```

**This is useful for:**
- 💰 **Cost Control**: Disable Mapbox if costs are too high
- 🧪 **A/B Testing**: Test user preference for interactive vs static maps
- 🚀 **Quick Deployment**: Use static images while setting up Mapbox
- 📊 **Gradual Rollout**: Enable for specific environments

### Important: No Code Changes Needed

**Do NOT comment out the plugin in `app.config.ts`**. The plugin should always be present:

```typescript
// ✅ CORRECT - Keep plugin in config
plugins: [
  '@rnmapbox/maps',
],

// ❌ WRONG - Don't comment it out
// plugins: [
//   // '@rnmapbox/maps',  // Don't do this!
// ],
```

Just use `MAPBOX_ENABLED=false` to disable Mapbox instead.

## How It Works

The app now has a smart fallback system:

1. **If Mapbox is enabled** (`@rnmapbox/maps` installed + `MAPBOX_ENABLED=true` + token set):
   - Uses interactive Mapbox map with route overlay
   - Shows start (green) and end (red) markers
   - Supports native zoom, pan, rotate gestures
   - Auto-fits the route to optimal view

2. **If Mapbox is disabled** (`MAPBOX_ENABLED=false` or no token):
   - Falls back to static map image from backend (current behavior)
   - Or SVG route if image not available
   - Pinch-to-zoom on static images when map is expanded

## Component Usage

### In RoutePreview Component

```typescript
<RoutePreview
  routeMapUrl={fixStorageUrl(gpsTrack.route_map_url)}  // Fallback static image
  routeSvg={gpsTrack.route_svg}                         // Fallback SVG
  trackData={gpsTrack?.track_data}                      // GeoJSON for Mapbox
  height={500}
  enableZoom={true}
/>
```

The component automatically:
- Uses Mapbox if `trackData` is provided and Mapbox is configured
- Falls back to static image if Mapbox is not available
- Falls back to SVG if no image available

### In ActivityDetailScreen

The map section now supports both:
- **Collapsed (250px)**: Shows overview with expand button
- **Expanded (500px)**: Larger view with zoom controls (if static) or full Mapbox interaction

## Mapbox Map Features

When using Mapbox, users can:
- **Pinch** to zoom in/out
- **Drag** with one finger to pan
- **Rotate** with two fingers
- **Double-tap** to zoom in
- See **start marker** (green) and **end marker** (red)
- View on **outdoor style map** (shows trails, topography)

## Backend Considerations

### Current Behavior
- Backend generates static map images via Mapbox Static API
- Images are stored and served to mobile app
- Works offline once images are cached

### With Client-Side Mapbox
- Backend still generates static images as fallback
- Mobile app uses Mapbox SDK for interactive rendering
- Requires internet connection for map tiles
- Better UX with native performance

### API Response
Ensure your backend returns `track_data` in the GPS track response:

```json
{
  "id": 123,
  "track_data": {
    "type": "LineString",
    "coordinates": [[lng, lat], [lng, lat], ...]
  },
  "route_map_url": "https://...",
  "route_svg": "<svg>...</svg>"
}
```

## Troubleshooting

### Build Errors

If you get build errors:

```bash
# Clear cache and rebuild
npx expo start --clear
npx expo run:ios --no-build-cache
npx expo run:android --no-build-cache
```

### Maps Not Showing

1. Check token is valid: `console.log(MAPBOX_ACCESS_TOKEN)`
2. Verify `@rnmapbox/maps` is installed: `npm list @rnmapbox/maps`
3. Check logs for Mapbox initialization errors
4. Ensure app was rebuilt after adding Mapbox (not just reloaded)

### Using Static Images Only

If you don't want to set up Mapbox, that's fine! The app will continue working with static images from the backend. Just don't set `MAPBOX_ACCESS_TOKEN` in `.env`.

## Cost Considerations

Mapbox pricing (as of 2024):
- **Free tier**: 50,000 map loads/month
- **Static API** (backend images): $0.50 per 1,000 requests
- **Mobile SDK** (interactive maps): $0.10 per 1,000 active users/month

For most apps, the free tier is sufficient. The client-side rendering is more cost-effective than static image generation for active users.

## Deployment Checklist

### For Local Development
- [ ] `@rnmapbox/maps` installed: `npx expo install @rnmapbox/maps`
- [ ] `.env` configured with tokens (or `MAPBOX_ENABLED=false`)
- [ ] Plugin present in `app.config.ts` (already configured)
- [ ] App rebuilt: `npx expo run:android` (one-time, then use `npx expo start`)

### For EAS Build / Production
- [ ] Decide: Interactive maps or static images?
- [ ] Set EAS secrets:
  - If using Mapbox: `MAPBOX_ACCESS_TOKEN`, `RNMAPBOX_MAPS_DOWNLOAD_TOKEN`, `MAPBOX_ENABLED=true`
  - If using static images: `MAPBOX_ENABLED=false`
- [ ] Plugin stays in `app.config.ts` (don't comment it out)
- [ ] Build with: `eas build --platform android --profile staging`

### Remember
- ✅ Control Mapbox with `MAPBOX_ENABLED` flag, not by commenting plugin
- ✅ Same token for both `MAPBOX_ACCESS_TOKEN` and `RNMAPBOX_MAPS_DOWNLOAD_TOKEN`
- ✅ Static images work automatically as fallback
- ✅ No code changes needed to switch between modes

## Resources

- [Mapbox Account Dashboard](https://account.mapbox.com/)
- [@rnmapbox/maps Documentation](https://github.com/rnmapbox/maps)
- [Expo with Mapbox](https://docs.expo.dev/versions/latest/sdk/mapbox/)
- [Mapbox Pricing](https://www.mapbox.com/pricing/)
- [MAP_USAGE_TRACKING.md](./MAP_USAGE_TRACKING.md) - Cost monitoring and analytics