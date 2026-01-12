# Map Usage Tracking & Cost Management

This document explains how the mobile app tracks Mapbox usage and reports it to your backend API for cost monitoring and management.

## Overview

The mobile app now includes analytics to track when interactive Mapbox maps are displayed vs static map images. This helps you:

- **Monitor Mapbox costs** in real-time
- **Control usage** with feature flags
- **Analyze user behavior** (interactive vs static maps)
- **Make cost-informed decisions** about map rendering strategy

## How It Works

### Mobile App Side

1. **MapboxAnalytics Service** (`services/mapboxAnalytics.ts`)
   - Tracks every map load (interactive or static)
   - Batches reports (10 at a time or every 30 seconds)
   - Sends to backend via `/analytics/map-usage` endpoint

2. **Automatic Tracking**
   - `MapboxRouteMap` component tracks interactive map loads
   - `RoutePreview` component tracks static image views
   - Includes activity ID and timestamp

3. **Smart Batching**
   - Reports are batched to reduce API calls
   - Sent every 30 seconds or when 10 reports accumulate
   - Non-blocking (doesn't affect user experience)

## Backend API Endpoint Required

You need to implement this endpoint in your Laravel API:

### POST /api/analytics/map-usage

**Purpose**: Receive batched map usage reports from mobile clients

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "reports": [
    {
      "activityId": 123,
      "timestamp": "2024-01-15T10:30:00Z",
      "mapType": "interactive"
    },
    {
      "activityId": 124,
      "timestamp": "2024-01-15T10:30:15Z",
      "mapType": "static"
    }
  ]
}
```

**Response**:
```json
{
  "message": "Usage tracked successfully",
  "received": 2
}
```

**Status Codes**:
- `200 OK`: Reports received and processed
- `401 Unauthorized`: Invalid or missing authentication
- `422 Unprocessable Entity`: Invalid request data

### Database Schema Suggestion

Create a `map_usage_logs` table to store this data:

```sql
CREATE TABLE map_usage_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    activity_id BIGINT UNSIGNED NOT NULL,
    map_type ENUM('interactive', 'static') NOT NULL,
    viewed_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_activity_id (activity_id),
    INDEX idx_map_type (map_type),
    INDEX idx_viewed_at (viewed_at),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);
```

### Laravel Controller Example

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    /**
     * Track map usage from mobile clients
     */
    public function trackMapUsage(Request $request)
    {
        $validated = $request->validate([
            'reports' => 'required|array|min:1|max:100',
            'reports.*.activityId' => 'required|integer|exists:activities,id',
            'reports.*.timestamp' => 'required|date',
            'reports.*.mapType' => 'required|in:interactive,static',
        ]);

        $userId = auth()->id();
        $inserts = [];

        foreach ($validated['reports'] as $report) {
            $inserts[] = [
                'user_id' => $userId,
                'activity_id' => $report['activityId'],
                'map_type' => $report['mapType'],
                'viewed_at' => $report['timestamp'],
                'created_at' => now(),
            ];
        }

        DB::table('map_usage_logs')->insert($inserts);

        return response()->json([
            'message' => 'Usage tracked successfully',
            'received' => count($inserts),
        ]);
    }
}
```

### Route Registration

Add to `routes/api.php`:

```php
// Analytics & Usage Tracking
Route::middleware('auth:sanctum')->post('/analytics/map-usage', [AnalyticsController::class, 'trackMapUsage']);
```

## Cost Analysis Queries

Once you're collecting this data, you can run analytics:

### Daily Interactive Map Usage

```sql
SELECT
    DATE(viewed_at) as date,
    COUNT(*) as interactive_views
FROM map_usage_logs
WHERE map_type = 'interactive'
  AND viewed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(viewed_at)
ORDER BY date DESC;
```

### Monthly Cost Estimate

```sql
SELECT
    DATE_FORMAT(viewed_at, '%Y-%m') as month,
    COUNT(CASE WHEN map_type = 'interactive' THEN 1 END) as interactive_loads,
    COUNT(CASE WHEN map_type = 'static' THEN 1 END) as static_loads,
    -- Mapbox pricing: ~$0.10 per 1000 active users with maps
    -- Or free tier: 50,000 map loads/month
    ROUND(COUNT(CASE WHEN map_type = 'interactive' THEN 1 END) / 1000 * 0.10, 2) as estimated_cost_usd
FROM map_usage_logs
GROUP BY DATE_FORMAT(viewed_at, '%Y-%m')
ORDER BY month DESC;
```

### Top Activities by Map Views

```sql
SELECT
    a.id,
    a.title,
    u.username,
    COUNT(*) as total_views,
    COUNT(CASE WHEN mul.map_type = 'interactive' THEN 1 END) as interactive_views,
    COUNT(CASE WHEN mul.map_type = 'static' THEN 1 END) as static_views
FROM map_usage_logs mul
JOIN activities a ON mul.activity_id = a.id
JOIN users u ON a.user_id = u.id
WHERE mul.viewed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY a.id, a.title, u.username
ORDER BY total_views DESC
LIMIT 20;
```

## Cost Control Features

### 1. Feature Flag Toggle

Set `MAPBOX_ENABLED=false` in mobile app `.env` to force static images:

```bash
# In RacefyApp/.env
MAPBOX_ENABLED=false
```

This immediately disables client-side Mapbox for all users while keeping static images working.

### 2. Backend-Driven Configuration (Future)

You could add an API endpoint that returns whether to use Mapbox:

```php
// GET /api/config/maps
{
  "mapbox_enabled": true,
  "prefer_static_over_quota": false,
  "monthly_budget_reached": false
}
```

The mobile app could check this periodically and adjust behavior.

### 3. A/B Testing

Use the tracking data to compare:
- User engagement with interactive vs static maps
- Cost per active user
- Feature adoption rates

## Monitoring Dashboard Ideas

Build an admin dashboard showing:

1. **Real-time usage**
   - Maps loaded in last hour/day/week
   - Interactive vs static ratio
   - Cost burn rate

2. **Alerts**
   - Email when approaching Mapbox free tier limit (50k/month)
   - Slack notification if usage spike detected
   - Monthly cost reports

3. **User patterns**
   - Which users view the most maps
   - Peak usage times
   - Most viewed activities

## Cost Optimization Strategies

### 1. Hybrid Approach (Current)
- Use backend-generated static images (already tracked by Mapbox)
- Offer interactive maps as enhancement (tracked by mobile app)
- Best UX, but highest cost potential

### 2. Lazy Loading
- Show static image by default
- Load interactive map only when user expands/interacts
- Reduces unnecessary map loads

### 3. Cache-First Strategy
- Static images are cached by backend
- Interactive maps use Mapbox's built-in tile caching
- Reduces redundant requests

### 4. User Preference
Let users choose their preference:
- "Always use interactive maps" (power users)
- "Auto (based on connection)" (default)
- "Prefer static images" (data saver mode)

## Testing the Integration

### 1. Enable Logging in Mobile App

The analytics service uses the logger. Check logs in Settings → Developer → Debug Logs:

```
[API] Mapbox map load tracked | activityId: 123, queueSize: 1
[API] Map usage reports sent | count: 10
```

### 2. Monitor Backend Logs

Check your Laravel logs for incoming requests:

```
POST /api/analytics/map-usage
User ID: 456
Reports: 10
```

### 3. Verify Database

```sql
SELECT * FROM map_usage_logs
ORDER BY created_at DESC
LIMIT 10;
```

## Privacy Considerations

The tracking data includes:
- User ID (from authentication)
- Activity ID (which activity's map was viewed)
- Timestamp
- Map type (interactive or static)

This is **analytics data**, not user content. Ensure your privacy policy covers usage analytics.

## Questions?

If you have questions about implementing the backend endpoint or analyzing the data:

1. Check the mobile app code in `services/mapboxAnalytics.ts`
2. Review example controller code above
3. Test with a small number of users first
4. Monitor costs on Mapbox dashboard: https://account.mapbox.com/

## Summary

With this tracking system, you have **full visibility** into your Mapbox costs before they become a problem. You can:

✅ See exactly how many interactive maps are loaded
✅ Compare costs of static vs interactive rendering
✅ Make data-driven decisions about map features
✅ Control costs with feature flags
✅ Optimize for the best UX within budget

The mobile app handles all the tracking automatically - you just need to implement the backend endpoint to receive and store the data!