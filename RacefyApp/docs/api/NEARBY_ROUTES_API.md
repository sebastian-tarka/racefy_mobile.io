# Nearby Routes API Specification

## Overview

This document specifies the new `/api/activities/nearby` endpoint required for the **Shadow Track** feature in the mobile app. This endpoint allows users to discover nearby routes from other users before starting their activity, which they can then use as a "shadow track" for real-time comparison during their workout.

---

## Endpoint

```
GET /api/activities/nearby
```

**Authentication:** Required (Bearer token)

---

## Request Parameters

All parameters are passed as query parameters:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `lat` | float | ✅ Yes | - | User's current latitude (e.g., 52.2297) |
| `lng` | float | ✅ Yes | - | User's current longitude (e.g., 21.0122) |
| `radius` | integer | ❌ No | 5000 | Search radius in meters (max: 50000) |
| `sport_type_id` | integer | ❌ No | - | Filter by sport type (running, cycling, etc.) |
| `limit` | integer | ❌ No | 10 | Max number of routes to return (max: 50) |

### Example Request

```http
GET /api/activities/nearby?lat=52.2297&lng=21.0122&radius=5000&sport_type_id=1&limit=10
Authorization: Bearer {token}
```

---

## Response Format

### Success Response (200 OK)

```json
{
  "data": [
    {
      "id": 12345,
      "title": "Morning Park Run",
      "distance": 5200,
      "elevation_gain": 45,
      "sport_type_id": 1,
      "user": {
        "id": 456,
        "name": "John Doe",
        "avatar_url": "https://storage.racefy.app/avatars/456.jpg"
      },
      "stats": {
        "likes_count": 24,
        "completions_count": 12
      },
      "track_data": {
        "type": "LineString",
        "coordinates": [
          [21.0122, 52.2297],
          [21.0125, 52.2299],
          [21.0128, 52.2301]
        ]
      },
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

### Error Responses

**400 Bad Request** - Invalid parameters
```json
{
  "message": "Invalid coordinates",
  "errors": {
    "lat": ["The lat field must be between -90 and 90."],
    "lng": ["The lng field must be between -180 and 180."]
  }
}
```

**401 Unauthorized** - Missing or invalid token
```json
{
  "message": "Unauthenticated."
}
```

**500 Internal Server Error** - Server error
```json
{
  "message": "An error occurred while fetching nearby routes."
}
```

---

## Response Fields Specification

### Root Object

| Field | Type | Description |
|-------|------|-------------|
| `data` | array | Array of nearby route objects (see below) |

### Route Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Activity ID |
| `title` | string | Activity title (e.g., "Morning Run", "City Loop") |
| `distance` | integer | Total distance in **meters** |
| `elevation_gain` | integer | Total elevation gain in **meters** |
| `sport_type_id` | integer | Sport type ID (1=running, 2=cycling, etc.) |
| `user` | object | User who created the activity (see below) |
| `stats` | object | Activity engagement stats (see below) |
| `track_data` | object | GeoJSON LineString with GPS coordinates (see below) |
| `created_at` | string | ISO 8601 timestamp when activity was created |

### User Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | User ID |
| `name` | string | User's display name |
| `avatar_url` | string | Full URL to user's avatar image |

### Stats Object

| Field | Type | Description |
|-------|------|-------------|
| `likes_count` | integer | Number of likes/kudos this activity has received |
| `completions_count` | integer | Number of times other users have completed this route |

### Track Data Object (GeoJSON LineString)

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always "LineString" |
| `coordinates` | array | Array of `[longitude, latitude]` pairs |

**Important:** Coordinates are in `[lng, lat]` order (GeoJSON standard), not `[lat, lng]`.

---

## Business Logic Requirements

### 1. Activity Filtering

**Include only activities that meet ALL of the following criteria:**

- ✅ Status: `completed` (not in_progress, paused, or discarded)
- ✅ Has GPS track: `has_gps_track = true`
- ✅ Has sufficient GPS points (minimum 10 points recommended)
- ✅ Privacy: User's activity privacy setting allows public viewing
- ✅ Not from blocked/muted users (check authenticated user's blocked/muted lists)
- ✅ Distance: Between 500m and 100km (filter out test activities and ultra-long activities)
- ✅ Within specified radius of user's location

### 2. Sport Type Filtering

If `sport_type_id` is provided:
- Return only activities with matching `sport_type_id`

If `sport_type_id` is NOT provided:
- Return activities from all sport types

### 3. Spatial Query (Most Important)

Use **PostGIS** spatial functions for efficient radius search:

```sql
-- Example PostgreSQL query with PostGIS
SELECT a.*
FROM activities a
WHERE a.status = 'completed'
  AND a.has_gps_track = true
  AND ST_DWithin(
    a.start_location::geography,  -- Activity start point
    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,  -- User's location
    :radius  -- Radius in meters
  )
  AND ... (other filters)
ORDER BY
  ST_Distance(
    a.start_location::geography,
    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
  )
LIMIT :limit
```

**Required Database Setup:**
- `start_location` column should be of type `geography(Point, 4326)` or `geometry(Point, 4326)`
- Create a spatial index: `CREATE INDEX idx_activities_start_location ON activities USING GIST (start_location);`

### 4. GPS Privacy Zones

**Critical Privacy Feature:**

If a user has GPS privacy zones enabled (obscure start/end points):
- Apply privacy zone radius to both start and end coordinates
- Replace actual coordinates with approximate area center
- Ensure first ~200m and last ~200m of route are obscured

**Implementation:**
```javascript
// Pseudocode
if (activity.gps_privacy_enabled) {
  const privacyRadius = activity.gps_privacy_radius || 200; // meters

  // Remove points within privacy zones
  trackData.coordinates = removePrivacyZonePoints(
    trackData.coordinates,
    privacyRadius
  );

  // Or replace with generalized points
  trackData.coordinates[0] = getApproximatePoint(
    trackData.coordinates[0],
    privacyRadius
  );
  trackData.coordinates[trackData.coordinates.length - 1] = getApproximatePoint(
    trackData.coordinates[trackData.coordinates.length - 1],
    privacyRadius
  );
}
```

### 5. Track Data Simplification

To optimize performance and reduce payload size:

**Simplify GPS tracks to ~100 points maximum** using **Douglas-Peucker algorithm**:

```javascript
// Pseudocode
if (trackData.coordinates.length > 100) {
  trackData.coordinates = simplifyPolyline(
    trackData.coordinates,
    tolerance: 0.0001  // Adjust based on testing
  );
}
```

**Benefits:**
- Reduces JSON payload size (each route ~2-5KB instead of 50-100KB)
- Faster map rendering on mobile devices
- Still maintains route shape accuracy

**Libraries:**
- PHP: `geoPHP` or `Simplify.php`
- Python: `simplification` package
- JavaScript: `simplify-js` package

### 6. Sorting and Ranking

**Default sort order (recommended):**

1. **Distance from user** (closest first)
2. **Popularity** (most likes + completions)
3. **Recent activity** (created within last 6 months preferred)

```sql
ORDER BY
  ST_Distance(a.start_location::geography, user_location::geography) ASC,
  (a.likes_count + a.completions_count * 2) DESC,
  a.created_at DESC
LIMIT :limit
```

### 7. Performance Optimization

**Required optimizations:**

1. **Spatial Index:** Ensure `start_location` has a GIST index
2. **Composite Index:** `(status, has_gps_track, sport_type_id, created_at)`
3. **Query Timeout:** Set 2-second timeout to prevent slow queries
4. **Caching:** Cache popular routes per region (optional but recommended)
5. **Rate Limiting:** 10 requests per minute per user

**Example Laravel/PHP caching strategy:**
```php
// Cache key based on location grid (1km x 1km cells)
$gridLat = floor($lat);
$gridLng = floor($lng);
$cacheKey = "nearby_routes:{$gridLat}:{$gridLng}:{$sportTypeId}";

$routes = Cache::remember($cacheKey, now()->addMinutes(30), function() {
    // Fetch routes from database
});
```

---

## Example Responses

### Example 1: Successful Response with Multiple Routes

```json
{
  "data": [
    {
      "id": 12345,
      "title": "Morning Park Run",
      "distance": 5200,
      "elevation_gain": 45,
      "sport_type_id": 1,
      "user": {
        "id": 456,
        "name": "John Doe",
        "avatar_url": "https://storage.racefy.app/avatars/456.jpg"
      },
      "stats": {
        "likes_count": 24,
        "completions_count": 12
      },
      "track_data": {
        "type": "LineString",
        "coordinates": [
          [21.0122, 52.2297],
          [21.0125, 52.2299],
          [21.0128, 52.2301],
          [21.0130, 52.2305],
          [21.0133, 52.2310]
        ]
      },
      "created_at": "2025-01-15T10:30:00Z"
    },
    {
      "id": 12350,
      "title": "City Loop Ride",
      "distance": 12800,
      "elevation_gain": 120,
      "sport_type_id": 2,
      "user": {
        "id": 789,
        "name": "Jane Smith",
        "avatar_url": "https://storage.racefy.app/avatars/789.jpg"
      },
      "stats": {
        "likes_count": 48,
        "completions_count": 8
      },
      "track_data": {
        "type": "LineString",
        "coordinates": [
          [21.0100, 52.2280],
          [21.0115, 52.2285],
          [21.0130, 52.2290]
        ]
      },
      "created_at": "2025-01-14T08:15:00Z"
    }
  ]
}
```

### Example 2: Empty Response (No Routes Found)

```json
{
  "data": []
}
```

### Example 3: Single Route Response

```json
{
  "data": [
    {
      "id": 12345,
      "title": "Afternoon Walk",
      "distance": 3200,
      "elevation_gain": 15,
      "sport_type_id": 3,
      "user": {
        "id": 123,
        "name": "Bob Wilson",
        "avatar_url": "https://storage.racefy.app/avatars/123.jpg"
      },
      "stats": {
        "likes_count": 5,
        "completions_count": 2
      },
      "track_data": {
        "type": "LineString",
        "coordinates": [
          [21.0110, 52.2290],
          [21.0112, 52.2292],
          [21.0115, 52.2295],
          [21.0118, 52.2298],
          [21.0120, 52.2300]
        ]
      },
      "created_at": "2025-01-16T15:45:00Z"
    }
  ]
}
```

---

## Testing Scenarios

### Test Case 1: Basic Search
```bash
GET /api/activities/nearby?lat=52.2297&lng=21.0122&radius=5000
```
**Expected:** Returns up to 10 routes within 5km

### Test Case 2: Sport-Specific Search
```bash
GET /api/activities/nearby?lat=52.2297&lng=21.0122&sport_type_id=1&limit=5
```
**Expected:** Returns up to 5 running routes only

### Test Case 3: Large Radius
```bash
GET /api/activities/nearby?lat=52.2297&lng=21.0122&radius=50000
```
**Expected:** Returns routes within 50km (max radius)

### Test Case 4: No Results
```bash
GET /api/activities/nearby?lat=0.0&lng=0.0&radius=1000
```
**Expected:** Returns empty array (no routes in middle of ocean)

### Test Case 5: Invalid Coordinates
```bash
GET /api/activities/nearby?lat=200&lng=300
```
**Expected:** 400 Bad Request with validation errors

### Test Case 6: Privacy Zones
```bash
GET /api/activities/nearby?lat=52.2297&lng=21.0122
```
**Expected:** Routes with GPS privacy enabled should have obscured start/end points

---

## Implementation Checklist

Backend team should verify:

- [ ] PostGIS extension installed and enabled
- [ ] `start_location` column exists with spatial index
- [ ] Validation rules implemented for lat/lng/radius/limit
- [ ] Privacy filtering (blocked users, activity privacy settings)
- [ ] GPS privacy zones applied to track data
- [ ] Track simplification implemented (max 100 points)
- [ ] Sorting by distance/popularity working
- [ ] Query performance < 500ms for typical requests
- [ ] Rate limiting configured (10 req/min per user)
- [ ] Unit tests for spatial queries
- [ ] Integration tests for privacy features
- [ ] API documentation updated in main API docs

---

## Performance Benchmarks

**Target performance metrics:**

- Query execution time: < 200ms (database query)
- Total response time: < 500ms (including JSON serialization)
- Max concurrent requests: 100 req/sec
- Cache hit rate: > 70% (for popular areas)

**Monitoring:**

- Log slow queries (> 1 second)
- Track cache hit rates
- Monitor PostGIS index usage
- Alert on error rate > 1%

---

## Security Considerations

1. **Authentication:** Require valid Bearer token
2. **Authorization:** Apply user's block/mute lists
3. **Privacy:** Respect activity privacy settings and GPS privacy zones
4. **Rate Limiting:** Prevent abuse with per-user rate limits
5. **Input Validation:** Sanitize and validate all parameters
6. **SQL Injection:** Use parameterized queries only
7. **Data Exposure:** Never expose private activities or blocked users' data

---

## Future Enhancements (Optional)

Consider for v2:

1. **Difficulty filtering:** Filter by estimated difficulty (flat vs hilly)
2. **Weather conditions:** Show routes good for current weather
3. **Surface type:** Road, trail, track filtering
4. **Time of day:** Routes popular at current time
5. **Segment matching:** Find routes with specific segments
6. **Route collections:** Curated route collections by location
7. **Personal history:** "Routes you've completed before"

---

## Questions for Product Team

Before implementation, clarify:

1. Should blocked users' public routes still appear? (Recommendation: **No**)
2. Maximum radius limit? (Recommendation: **50km**)
3. Minimum activity distance to include? (Recommendation: **500m**)
4. Should private activities ever appear? (Recommendation: **No**)
5. Rate limiting per user or per IP? (Recommendation: **Per user**)
6. Cache duration for route data? (Recommendation: **30 minutes**)

---

## Support and Contact

For questions or clarification, contact:
- Mobile Team Lead: [Your Name]
- Backend Team Lead: [Backend Lead Name]
- Project Manager: [PM Name]

---

**Document Version:** 1.0
**Last Updated:** 2026-02-04
**Status:** Ready for Implementation
