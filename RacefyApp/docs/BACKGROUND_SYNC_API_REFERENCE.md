# Background Sync API Reference

This document describes the API changes needed to support background GPS synchronization in the mobile app.

## Overview

The mobile app now supports periodic background synchronization of GPS points while tracking activities. This feature allows GPS points to be uploaded to the server every 3-5 minutes (configurable per sport) instead of waiting until the app returns to foreground.

## API Changes Required

### 1. GPS Profile Response (Sport Types)

Update the `gps_profile` object in the `/sport-types` endpoint response to include background sync settings.

**Endpoint:** `GET /api/sport-types`

**Updated GPS Profile Schema:**

```json
{
  "id": 1,
  "name": "Running",
  "slug": "running",
  "icon": "🏃",
  "is_active": true,
  "gps_profile": {
    "enabled": true,
    "accuracy_threshold": 25,
    "min_distance_threshold": 3,
    "max_realistic_speed": 12,
    "min_elevation_change": 3,
    "time_interval": 3000,
    "distance_interval": 5,
    "smoothing_buffer_size": 3,

    // Pace display settings (existing - optional)
    "pace_smoothing_factor": 0.3,
    "pace_window_seconds": 30,
    "min_distance_for_pace": 50,
    "min_segment_distance": 20,

    // 🆕 NEW: Background sync settings (optional)
    "background_sync_interval": 240000,  // milliseconds (4 minutes)
    "background_sync_enabled": true      // boolean
  }
}
```

### 2. GPS Profile in Activity Start Request

The mobile app sends GPS profile settings when starting a live activity. These now include background sync settings.

**Endpoint:** `POST /api/activities/start`

**Request Body:**

```json
{
  "sport_type_id": 1,
  "title": "Morning Run",
  "started_at": "2026-01-18T08:00:00Z",
  "event_id": null,
  "gps_profile": {
    "enabled": true,
    "accuracy_threshold": 25,
    "min_distance_threshold": 3,
    "max_realistic_speed": 12,
    "min_elevation_change": 3,
    "time_interval": 3000,
    "distance_interval": 5,
    "smoothing_buffer_size": 3,
    "pace_smoothing_factor": 0.3,
    "pace_window_seconds": 30,
    "min_distance_for_pace": 50,
    "min_segment_distance": 20,

    // 🆕 NEW: Background sync settings
    "background_sync_interval": 240000,
    "background_sync_enabled": true
  }
}
```

**Note:** The backend should store these settings with the activity for analytics/debugging purposes but doesn't need to use them functionally (they're only used by the mobile app).

## Field Specifications

### `background_sync_interval`

- **Type:** `integer` (nullable)
- **Unit:** Milliseconds
- **Range:** 60000 - 600000 (1-10 minutes)
- **Default:** 240000 (4 minutes)
- **Description:** How often the background task syncs buffered GPS points to the server

**Recommended values by sport:**
- Running: 240000 (4 minutes)
- Cycling: 180000 (3 minutes) - faster speeds generate more points
- Walking/Hiking: 300000 (5 minutes) - slower, fewer points
- Indoor sports: N/A (GPS disabled)

### `background_sync_enabled`

- **Type:** `boolean` (nullable)
- **Default:** Same as `enabled` (if GPS is enabled, background sync is enabled)
- **Description:** Whether background sync is enabled for this sport type

**Use cases for disabling:**
- Indoor sports (GPS already disabled)
- Sports with poor GPS signal (reduces failed sync attempts)
- Battery-critical scenarios (future feature)

## Database Schema (Recommended)

### sport_types table

Add columns to the `sport_types` table to store default GPS profiles:

```sql
-- Existing GPS profile columns (already implemented)
-- ...

-- NEW: Background sync settings
ALTER TABLE sport_types
  ADD COLUMN gps_background_sync_interval INT NULL DEFAULT 240000
    COMMENT 'Background GPS sync interval in milliseconds (60000-600000)',
  ADD COLUMN gps_background_sync_enabled BOOLEAN NULL DEFAULT TRUE
    COMMENT 'Enable background GPS sync for this sport';
```

### activities table

Optionally store the GPS profile used for each activity:

```sql
-- NEW: Store GPS profile snapshot
ALTER TABLE activities
  ADD COLUMN gps_profile JSON NULL
    COMMENT 'GPS profile settings used for this activity (includes background sync)';
```

## Implementation Notes

### Backend Changes Required

1. **Sport Types Migration:**
   ```php
   // Add columns to sport_types table
   Schema::table('sport_types', function (Blueprint $table) {
       $table->integer('gps_background_sync_interval')
             ->nullable()
             ->default(240000);
       $table->boolean('gps_background_sync_enabled')
             ->nullable()
             ->default(true);
   });
   ```

2. **Sport Type Model/Resource:**
   ```php
   // In SportTypeResource.php (or equivalent)
   'gps_profile' => [
       'enabled' => $this->gps_enabled,
       // ... existing fields
       'background_sync_interval' => $this->gps_background_sync_interval,
       'background_sync_enabled' => $this->gps_background_sync_enabled,
   ]
   ```

3. **Activity Start Endpoint:**
   ```php
   // In StartActivityRequest.php (or controller)
   $validated = $request->validate([
       // ... existing validation
       'gps_profile.background_sync_interval' => 'nullable|integer|min:60000|max:600000',
       'gps_profile.background_sync_enabled' => 'nullable|boolean',
   ]);

   // Store GPS profile with activity
   $activity->gps_profile = $request->input('gps_profile');
   $activity->save();
   ```

### Backward Compatibility

These fields are **optional** and have sensible defaults:
- Old mobile app versions (without background sync) will continue to work
- New mobile app versions will work with old API (uses defaults)
- All fields use `??` null coalescing in mobile app for safe fallbacks

### Testing

1. **Verify API Response:**
   ```bash
   curl -X GET https://api.racefy.app/api/sport-types \
     -H "Accept: application/json" | jq '.data[].gps_profile'
   ```

2. **Verify Activity Start:**
   ```bash
   curl -X POST https://api.racefy.app/api/activities/start \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer TOKEN" \
     -d '{
       "sport_type_id": 1,
       "gps_profile": {
         "enabled": true,
         "background_sync_interval": 240000,
         "background_sync_enabled": true
       }
     }'
   ```

## Benefits

1. **Reduced Data Loss:** GPS points synced every few minutes instead of waiting for foreground
2. **Better User Experience:** Long activities (30+ min) more reliable
3. **Network Resilience:** Smaller batches are more likely to succeed on poor connections
4. **Analytics:** Backend can track which sports use background sync, failure rates, etc.
5. **Battery Efficient:** HTTP requests every 3-5 minutes have minimal impact vs continuous GPS

## Mobile App Behavior

The mobile app will:
1. Read `background_sync_interval` and `background_sync_enabled` from API
2. Start a timer on first GPS update in background
3. Sync buffered points to `/activities/{id}/points` every N minutes
4. Track which points have been synced to avoid duplicates
5. Sync remaining points when returning to foreground
6. Fall back to defaults if API doesn't provide these fields

## Questions?

For questions about this feature, see:
- Implementation plan: `/docs/BACKGROUND_SYNC_PLAN.md` (if available)
- Mobile app code:
  - `src/services/backgroundApiClient.ts` - Background API calls
  - `src/services/backgroundLocation.ts` - Background sync logic
  - `src/config/gpsProfiles.ts` - Profile configuration
  - `src/types/api.ts` - TypeScript types
