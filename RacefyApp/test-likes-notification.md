# Test Likes Notification - Quick Guide

## Backend Testing (Laravel)

### Step 1: Open Tinker
```bash
cd /home/sebastian-tarka/PhpstormProjects/racefy_api.io
./vendor/bin/sail artisan tinker
```

### Step 2: Create Test Data
```php
// Get test users
$liker = User::find(1);  // User who likes
$owner = User::find(2);  // Post/activity owner

// Ensure owner has a push token (fake for testing)
$owner->update([
    'fcm_token' => 'ExponentPushToken[test123]',
    'device_type' => 'android'
]);
```

### Step 3: Test Post Like Notification
```php
use App\Notifications\NotificationTypes\LikeNotification;
use App\Notifications\Providers\PushNotificationProvider;

// Create a post (or use existing)
$post = \App\Models\Post::first();

// Create like notification
$notification = new LikeNotification(
    actor: $liker,
    likeableType: 'post',
    likeableId: $post->id,
    likeableTitle: $post->title
);

// Check data structure
dd($notification->getData());

// Expected output:
// [
//   "type" => "likes"
//   "actor_id" => 1
//   "actor_name" => "Test User"
//   "actor_username" => "testuser"
//   "actor_avatar" => "https://..."
//   "timestamp" => "2026-02-06T..."
//   "url" => "/posts/123"  // ✅ Should be present
//   "likeable_type" => "post"
//   "likeable_id" => 123
//   "likeable_title" => "..."
// ]
```

### Step 4: Test Activity Like Notification
```php
$activity = \App\Models\Activity::first();

$notification = new LikeNotification(
    actor: $liker,
    likeableType: 'activity',
    likeableId: $activity->id,
    likeableTitle: $activity->title
);

dd($notification->getData());

// Expected URL: "/activities/456"
```

### Step 5: Send Actual Push Notification
```php
$provider = new PushNotificationProvider();

$notification = new LikeNotification(
    actor: $liker,
    likeableType: 'post',
    likeableId: $post->id
);

// This will send to owner's device
$provider->send($owner, $notification);

// Check logs: storage/logs/laravel.log
// Look for: "Expo push notification sent successfully"
```

---

## Mobile Testing (React Native)

### Step 1: Enable Debug Logging

Check your `.env` file:
```bash
LOG_ENABLED=true
LOG_LEVEL=debug
LOG_CONSOLE_OUTPUT=true
```

### Step 2: Run the App

```bash
cd /home/sebastian-tarka/PhpstormProjects/racefy_mobile.io/RacefyApp
npm run start:adb
```

### Step 3: Monitor Logs

In a separate terminal:
```bash
npx react-native log-android | grep -E "notification|navigation|general"
```

### Step 4: Send Test Notification

From backend tinker (see Step 5 above), send notification while mobile app is:

#### Test Case 1: App in Foreground
1. Open mobile app
2. Send notification from backend
3. ✅ Should see banner appear at top
4. Tap banner
5. ✅ Should navigate to PostDetail

**Expected logs:**
```
LOG [general] Notification received in foreground
LOG [general] Notification tapped {type: "likes", url: "/posts/123"}
LOG [general] Handling notification navigation
```

#### Test Case 2: App in Background
1. Minimize mobile app (press home button)
2. Send notification from backend
3. ✅ Should see system notification
4. Tap notification
5. ✅ App opens and navigates to PostDetail

**Expected logs:**
```
LOG [general] Notification tapped
LOG [general] Handling notification navigation {type: "likes", url: "/posts/123"}
```

#### Test Case 3: App Closed (Cold Start)
1. Force close mobile app (swipe away)
2. Send notification from backend
3. Tap notification
4. ✅ App starts and navigates to PostDetail

**Expected logs:**
```
LOG [general] Cold start from notification {type: "likes", url: "/posts/123"}
LOG [general] Handling notification navigation
```

---

## Expected Payload (What Mobile Receives)

```json
{
  "title": "New Like",
  "body": "John Doe liked your post",
  "data": {
    "type": "likes",
    "url": "/posts/123",
    "actor_id": "456",
    "actor_name": "John Doe",
    "actor_username": "johndoe",
    "actor_avatar": "https://api.racefy.app/storage/avatars/johndoe.jpg",
    "timestamp": "2026-02-06T10:30:00Z",
    "likeable_type": "post",
    "likeable_id": "123"
  }
}
```

**Note:** FCM converts all data values to strings, so numbers become strings.

---

## Troubleshooting

### Issue: No notification received

**Check:**
1. User has fcm_token in database: `User::find(2)->fcm_token`
2. Backend logs show "sent successfully": `tail -f storage/logs/laravel.log`
3. Mobile app registered: Check Settings → Developer → Push Token
4. Mobile device has internet connection
5. Notifications permission granted in Android/iOS settings

### Issue: Notification received but no navigation

**Check mobile logs for:**
```
WARN [general] Navigation not ready for notification deep link
WARN [general] Notification has no type, skipping navigation
ERROR [general] Error parsing notification URL
```

**Common causes:**
- `url` field is null/empty in backend
- Mobile app not authenticated
- Navigation not initialized yet

### Issue: Wrong screen opens

**Check:**
- Backend URL format matches mobile patterns exactly
- URL doesn't have extra slashes or query params
- likeable_type matches URL (post → /posts/, activity → /activities/)

---

## Quick Checklist

Before testing, verify:

**Backend:**
- [ ] User has fcm_token in database
- [ ] FIREBASE_CREDENTIALS configured (if using FCM)
- [ ] Like model triggers notification event
- [ ] LikeNotification generates correct URL

**Mobile:**
- [ ] Push notifications permission granted
- [ ] Device registered (check Settings → Developer)
- [ ] App is logged in
- [ ] Debug logging enabled in .env

**Test Each State:**
- [ ] Foreground notification (app open)
- [ ] Background notification (app minimized)
- [ ] Cold start notification (app closed)
- [ ] Post like notification
- [ ] Activity like notification

---

## Success Criteria

✅ **Notification appears** in system tray
✅ **Tapping notification** opens correct screen
✅ **URL field is present** in notification payload
✅ **Navigation works** in all app states
✅ **Logs show successful** navigation

---

## Next Steps After Likes Work

Once likes notifications work perfectly:

1. Test other notification types (comments, follows, boosts)
2. Fix the comment likes URL issue (see main document)
3. Test on both Android and iOS
4. Test with real device (not just emulator)
5. Monitor production logs for errors
