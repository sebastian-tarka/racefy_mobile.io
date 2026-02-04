# Nearby Routes API - Quick Reference

## Endpoint
```
GET /api/activities/nearby
```

**Status:** ✅ IMPLEMENTED
**Rate Limit:** 30 requests/minute

## Parameters
```
lat          (required)  User's latitude (-90 to 90)
lng          (required)  User's longitude (-180 to 180)
radius       (optional)  Search radius in meters (default: 5000, min: 500, max: 50000)
sport_type_id (optional) Filter by sport type
limit        (optional)  Max results (default: 10, min: 1, max: 50)
```

## Example Request
```bash
curl -X GET "https://api.racefy.app/api/activities/nearby?lat=52.2297&lng=21.0122&radius=5000&sport_type_id=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Example Response
```json
{
  "data": [
    {
      "id": 42,
      "title": "Morning Run in Park",
      "distance": 5230,
      "elevation_gain": 45,
      "duration": 1560,
      "sport_type_id": 1,
      "user": {
        "id": 7,
        "name": "Jane Runner",
        "username": "@jane_runner",
        "avatar": "https://example.com/storage/avatars/jane.jpg"
      },
      "stats": {
        "likes_count": 12,
        "boosts_count": 3
      },
      "track_data": {
        "type": "LineString",
        "coordinates": [[21.012, 52.229], [21.015, 52.231]]
      },
      "distance_from_user": 450,
      "created_at": "2026-01-15T08:30:00.000000Z"
    }
  ]
}
```

**Backend Features:**
- ✅ Route deduplication (similar routes grouped by start point + distance)
- ✅ Privacy-trimmed GPS tracks (respects owner's gps_preferences)
- ✅ User's own activities excluded
- ✅ Blocked/muted users filtered
- ✅ Results cached per grid cell (15 min TTL)
- ✅ Sorted by distance from user

## Critical Requirements

### 1. Database Setup (PostGIS)
```sql
-- Add spatial column (if not exists)
ALTER TABLE activities ADD COLUMN start_location geography(Point, 4326);

-- Create spatial index
CREATE INDEX idx_activities_start_location
  ON activities USING GIST (start_location);
```

### 2. Activity Filters (ALL must be true)
- ✅ `status = 'completed'`
- ✅ `has_gps_track = true`
- ✅ GPS points count >= 10
- ✅ Privacy: activity is public
- ✅ User not blocked/muted by requester
- ✅ Distance: 500m to 100km

### 3. Spatial Query Example (PostgreSQL)
```sql
SELECT a.*
FROM activities a
WHERE a.status = 'completed'
  AND a.has_gps_track = true
  AND ST_DWithin(
    a.start_location::geography,
    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
    :radius
  )
ORDER BY ST_Distance(
  a.start_location::geography,
  ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
)
LIMIT :limit;
```

### 4. GPS Privacy Zones
```javascript
// Remove first/last ~200m of route if privacy enabled
if (activity.gps_privacy_enabled) {
  trackData = applyPrivacyZones(trackData, 200);
}
```

### 5. Track Simplification
```javascript
// Reduce to max 100 points using Douglas-Peucker
if (coordinates.length > 100) {
  coordinates = simplifyPolyline(coordinates, tolerance: 0.0001);
}
```

## Performance Targets
- Query time: < 200ms
- Response time: < 500ms
- Cache: 30 minutes (per 1km grid)
- Rate limit: 10 req/min/user

## Testing Commands

### Test 1: Basic search (Warsaw)
```bash
curl "https://api.racefy.app/api/activities/nearby?lat=52.2297&lng=21.0122&radius=5000"
```

### Test 2: Sport-specific (Running only)
```bash
curl "https://api.racefy.app/api/activities/nearby?lat=52.2297&lng=21.0122&sport_type_id=1"
```

### Test 3: Large radius (50km)
```bash
curl "https://api.racefy.app/api/activities/nearby?lat=52.2297&lng=21.0122&radius=50000"
```

### Test 4: Invalid coordinates (should fail)
```bash
curl "https://api.racefy.app/api/activities/nearby?lat=200&lng=300"
# Expected: 400 Bad Request
```

## Implementation Checklist
- [ ] PostGIS extension enabled
- [ ] Spatial column and index created
- [ ] Privacy filters implemented
- [ ] GPS privacy zones applied
- [ ] Track simplification working
- [ ] Query performance < 500ms
- [ ] Rate limiting active
- [ ] Unit tests passing
- [ ] Documentation updated

## Common Issues

**Issue:** Slow queries (> 1s)
**Fix:** Check spatial index exists, verify PostGIS extension

**Issue:** Empty results
**Fix:** Verify activities exist within radius, check privacy filters

**Issue:** Too much data per route
**Fix:** Implement track simplification (max 100 points)

**Issue:** Privacy leaks
**Fix:** Apply GPS privacy zones, filter blocked users

## See Full Documentation
📄 **Full Spec:** `docs/api/NEARBY_ROUTES_API.md`
📄 **API Overview:** `docs/api/README.md`
