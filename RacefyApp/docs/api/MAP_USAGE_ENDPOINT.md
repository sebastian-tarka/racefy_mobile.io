# Map Usage Tracking API Endpoint

## Implementation Request for Backend

The mobile app now tracks Mapbox usage and needs a backend endpoint to report this data for cost monitoring and analytics.

## Endpoint Specification

### POST /api/analytics/map-usage

**Purpose**: Receive batched map usage reports from mobile clients to track Mapbox costs and usage patterns.

**Authentication**: Required (Bearer token via `Authorization` header)

**Rate Limiting**: Recommended 100 requests/minute per user (batched reports)

---

## Request Format

### Headers
```http
POST /api/analytics/map-usage HTTP/1.1
Authorization: Bearer <user_token>
Content-Type: application/json
Accept: application/json
```

### Request Body
```json
{
  "reports": [
    {
      "activityId": 123,
      "timestamp": "2024-01-15T10:30:00.000Z",
      "mapType": "interactive"
    },
    {
      "activityId": 124,
      "timestamp": "2024-01-15T10:30:15.000Z",
      "mapType": "static"
    }
  ]
}
```

### Request Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reports` | Array | Yes | Array of map usage reports (1-100 items) |
| `reports[].activityId` | Integer | Yes | ID of the activity whose map was viewed |
| `reports[].timestamp` | String (ISO 8601) | Yes | When the map was loaded/viewed |
| `reports[].mapType` | Enum | Yes | Type of map: `"interactive"` or `"static"` |

### Map Types

- `"interactive"`: User viewed Mapbox SDK interactive map (costs apply)
- `"static"`: User viewed static image from backend (already tracked server-side)

---

## Response Format

### Success Response (200 OK)
```json
{
  "message": "Usage tracked successfully",
  "received": 2
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "message": "Unauthenticated."
}
```

#### 422 Unprocessable Entity (Validation Error)
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "reports": ["The reports field is required."],
    "reports.0.activityId": ["The activity does not exist."],
    "reports.1.mapType": ["The selected map type is invalid."]
  }
}
```

#### 429 Too Many Requests
```json
{
  "message": "Too many requests. Please try again later."
}
```

---

## Database Schema

### Suggested Table: `map_usage_logs`

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
    INDEX idx_user_viewed_at (user_id, viewed_at),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_create;
```

### Field Descriptions

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT | Primary key |
| `user_id` | BIGINT | User who viewed the map (from auth token) |
| `activity_id` | BIGINT | Activity that was viewed |
| `map_type` | ENUM | `'interactive'` or `'static'` |
| `viewed_at` | TIMESTAMP | When the map was viewed (from mobile client) |
| `created_at` | TIMESTAMP | When record was inserted (server time) |

---

## Laravel Implementation Example

### 1. Migration

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('map_usage_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('activity_id')->constrained()->onDelete('cascade');
            $table->enum('map_type', ['interactive', 'static']);
            $table->timestamp('viewed_at');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'viewed_at']);
            $table->index('map_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('map_usage_logs');
    }
};
```

### 2. Controller

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AnalyticsController extends Controller
{
    /**
     * Track map usage from mobile clients
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function trackMapUsage(Request $request)
    {
        $validated = $request->validate([
            'reports' => 'required|array|min:1|max:100',
            'reports.*.activityId' => 'required|integer|exists:activities,id',
            'reports.*.timestamp' => 'required|date|before_or_equal:now',
            'reports.*.mapType' => ['required', Rule::in(['interactive', 'static'])],
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

        // Bulk insert for performance
        DB::table('map_usage_logs')->insert($inserts);

        return response()->json([
            'message' => 'Usage tracked successfully',
            'received' => count($inserts),
        ], 200);
    }
}
```

### 3. Route Registration

```php
// routes/api.php

use App\Http\Controllers\Api\AnalyticsController;

Route::middleware('auth:sanctum')->group(function () {
    // Analytics & Usage Tracking
    Route::post('/analytics/map-usage', [AnalyticsController::class, 'trackMapUsage']);
});
```

### 4. Optional: Model (if you want Eloquent)

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MapUsageLog extends Model
{
    const UPDATED_AT = null; // No updated_at column

    protected $fillable = [
        'user_id',
        'activity_id',
        'map_type',
        'viewed_at',
    ];

    protected $casts = [
        'viewed_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }
}
```

---

## Testing the Endpoint

### Using cURL

```bash
curl -X POST https://api.racefy.app/api/analytics/map-usage \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reports": [
      {
        "activityId": 123,
        "timestamp": "2024-01-15T10:30:00.000Z",
        "mapType": "interactive"
      }
    ]
  }'
```

### Expected Response
```json
{
  "message": "Usage tracked successfully",
  "received": 1
}
```

---

## Mobile App Behavior

### Batching Strategy
- Reports are batched in groups of **10** or every **30 seconds**
- Non-blocking (won't affect user experience)
- Failures are logged but not retried (to prevent memory buildup)

### What Gets Tracked
- **Interactive maps**: When `MapboxRouteMap` component loads (Mapbox SDK)
- **Static images**: When `RoutePreview` displays backend-generated image
- **Activity ID**: Which activity's map was viewed
- **Timestamp**: Client-side timestamp when map loaded

### Mobile Code Reference
- Service: `RacefyApp/src/services/mapboxAnalytics.ts`
- API call: `RacefyApp/src/services/api.ts` → `reportMapUsage()`

---

## Cost Analysis Queries

Once data is being collected, you can analyze Mapbox costs:

### Daily Interactive Map Loads
```sql
SELECT
    DATE(viewed_at) as date,
    COUNT(*) as interactive_loads,
    COUNT(DISTINCT user_id) as unique_users
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
    COUNT(DISTINCT user_id) as unique_users,
    -- Mapbox pricing: ~$0.10 per 1000 active users/month
    ROUND(COUNT(DISTINCT user_id) / 1000 * 0.10, 2) as estimated_cost_usd
FROM map_usage_logs
WHERE viewed_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
GROUP BY DATE_FORMAT(viewed_at, '%Y-%m')
ORDER BY month DESC;
```

### Top Users by Map Views
```sql
SELECT
    u.id,
    u.username,
    u.email,
    COUNT(*) as total_views,
    COUNT(CASE WHEN mul.map_type = 'interactive' THEN 1 END) as interactive,
    COUNT(CASE WHEN mul.map_type = 'static' THEN 1 END) as static
FROM map_usage_logs mul
JOIN users u ON mul.user_id = u.id
WHERE mul.viewed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY u.id, u.username, u.email
ORDER BY total_views DESC
LIMIT 20;
```

### Most Viewed Activities
```sql
SELECT
    a.id,
    a.title,
    u.username as owner,
    COUNT(*) as view_count,
    COUNT(DISTINCT mul.user_id) as unique_viewers
FROM map_usage_logs mul
JOIN activities a ON mul.activity_id = a.id
JOIN users u ON a.user_id = u.id
WHERE mul.viewed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY a.id, a.title, u.username
ORDER BY view_count DESC
LIMIT 20;
```

---

## Performance Considerations

### Indexing
The suggested schema includes indexes for:
- `user_id` - Fast user-based queries
- `activity_id` - Fast activity lookup
- `map_type` - Filter by interactive/static
- `viewed_at` - Time-based queries
- Composite `(user_id, viewed_at)` - User activity over time

### Storage Estimates
- ~50 bytes per row
- 1M views/month = ~50 MB/month
- 12 months = ~600 MB storage

### Archiving Strategy (Optional)
Consider archiving old logs after 6-12 months:

```sql
-- Archive logs older than 6 months
CREATE TABLE map_usage_logs_archive LIKE map_usage_logs;

INSERT INTO map_usage_logs_archive
SELECT * FROM map_usage_logs
WHERE viewed_at < DATE_SUB(NOW(), INTERVAL 6 MONTH);

DELETE FROM map_usage_logs
WHERE viewed_at < DATE_SUB(NOW(), INTERVAL 6 MONTH);
```

---

## Privacy & Compliance

### Data Collected
- User ID (authenticated user)
- Activity ID (which map was viewed)
- Timestamp (when it was viewed)
- Map type (interactive or static)

### Privacy Considerations
- This is **usage analytics**, not user content
- Include in your privacy policy under "Analytics Data"
- Consider GDPR/CCPA compliance:
  - Allow users to request data deletion
  - Include in user account deletion flow

### Data Retention
Recommended: Keep logs for 12 months for cost analysis, then archive/delete

---

## Priority & Timeline

**Priority**: Medium
**Complexity**: Low (simple CRUD endpoint)
**Estimated Time**: 1-2 hours

### Implementation Steps
1. ✅ Run migration to create `map_usage_logs` table
2. ✅ Create controller with validation
3. ✅ Add route to API
4. ✅ Test with cURL/Postman
5. ✅ Deploy to staging
6. ✅ Verify mobile app can connect
7. ✅ Deploy to production

---

## Questions?

If you have questions about:
- Request format: See examples above
- Validation rules: See Laravel controller
- Performance: Bulk inserts handle 100 reports efficiently
- Mobile implementation: Check `src/services/mapboxAnalytics.ts`

**Contact**: Mobile team has full implementation ready - just need this endpoint deployed!