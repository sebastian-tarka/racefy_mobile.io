# 🔴 Push Notifications Not Working - Debug Guide

## Current Situation
- ✅ App is registered with API (has token)
- ✅ API sends notifications (backend logs show success)
- ❌ Mobile app doesn't receive notifications
- Mode: Development with Expo Push (auto mode)

---

## 🔍 Root Cause Analysis

### Most Common Issues in Development:

1. **Token Mismatch** (80% of cases)
   - Database has old/wrong token
   - App generated new token but didn't update backend

2. **Expo Push Service Rejects Token** (15% of cases)
   - Invalid token format
   - Token expired or device not registered with Expo

3. **Firebase Configuration** (5% of cases)
   - google-services.json mismatch
   - Firebase not initialized properly

---

## ✅ Step-by-Step Fix

### Step 1: Get Current Token from Mobile App

**On your physical device/emulator:**

1. Open Racefy app
2. Go to: **Settings → Developer → Debug Info**
3. Find "Push Token" section
4. Copy the ENTIRE token (should look like one of these):
   - `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]` (Expo Push)
   - Long alphanumeric string (FCM token)

**Example:**
```
ExponentPushToken[abc123XYZ789...]
```

---

### Step 2: Verify Token in Database

**In backend terminal:**

```bash
cd ~/PhpstormProjects/racefy_api.io
./vendor/bin/sail artisan tinker
```

```php
// Get your test user
$user = User::find(2); // Replace with your user ID

// Check current token
echo "Database token: " . $user->fcm_token . "\n";

// Compare with token from Step 1
// If they DON'T match, that's your problem!
```

**If tokens don't match:**

```php
// Update with correct token from mobile app
$user->update([
    'fcm_token' => 'ExponentPushToken[paste_from_mobile_here]',
    'device_type' => 'android' // or 'ios'
]);

echo "✅ Token updated!\n";
```

---

### Step 3: Test Notification Immediately

**Still in tinker:**

```php
// Send test notification
$liker = User::first();
$notification = new \App\Notifications\NotificationTypes\LikeNotification(
    $liker,
    'post',
    1
);

$provider = new \App\Notifications\Providers\PushNotificationProvider();
$provider->send($user, $notification);

echo "📤 Notification sent!\n";
echo "Check your device now...\n";
```

**Expected Result:**
- Notification appears on device within 5 seconds
- Tap it → opens PostDetail screen

---

### Step 4: If Still Not Working - Check Expo Response

**Create this test file in backend:**

```bash
cd ~/PhpstormProjects/racefy_api.io
cat > test-expo-push.php << 'EOF'
<?php
require __DIR__.'/vendor/autoload.php';

$token = 'ExponentPushToken[YOUR_TOKEN_HERE]'; // Replace with token from Step 1

$data = [
    'to' => $token,
    'title' => 'Test Notification',
    'body' => 'Testing from PHP script',
    'sound' => 'default',
    'priority' => 'high',
];

$ch = curl_init('https://exp.host/--/api/v2/push/send');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json',
    'Content-Type: application/json',
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Response:\n";
echo json_encode(json_decode($response), JSON_PRETTY_PRINT);
echo "\n";
EOF

php test-expo-push.php
```

**Check the response:**

✅ **Success Response:**
```json
{
    "data": {
        "status": "ok",
        "id": "abc123..."
    }
}
```

❌ **Error Responses:**

**A) DeviceNotRegistered:**
```json
{
    "data": {
        "status": "error",
        "message": "\"ExponentPushToken[...]\" is not a registered push notification recipient"
    }
}
```
**Fix:** App needs to run in development client or EAS build (not Expo Go)

**B) Invalid Token:**
```json
{
    "data": {
        "status": "error",
        "message": "Invalid push token"
    }
}
```
**Fix:** Token format is wrong, regenerate token in mobile app

---

## 🎯 Common Solutions

### Solution 1: Force Token Refresh in Mobile App

**Add this to your mobile app (temporary debugging):**

```typescript
// src/services/pushNotifications.ts

// Add this method to PushNotificationService class
async forceTokenRefresh(): Promise<string | null> {
  logger.info('general', 'Force refreshing push token...');

  // Clear old state
  this.pushToken = null;
  this.isRegistered = false;

  // Re-initialize
  return await this.initialize();
}
```

**Then in your app:**
1. Go to Settings → Developer
2. Add a button "Refresh Push Token"
3. Call `pushNotificationService.forceTokenRefresh()`
4. Re-register with backend

---

### Solution 2: Verify Backend is Sending to Expo

**Check backend logs:**

```bash
cd ~/PhpstormProjects/racefy_api.io
tail -f storage/logs/laravel.log | grep -i "push\|notification"
```

**Look for:**

✅ Should see:
```
Expo push notification sent successfully
```

❌ If you see:
```
PUSH NOTIFICATION (FCM not configured)
```

**This means:** Backend is trying to use FCM, but you have an Expo token!

**Fix:** Check `config/services.php`:

```bash
./vendor/bin/sail artisan tinker
```

```php
// Check current config
echo config('services.push.provider') . "\n";
// Should be: "auto" or "expo"

// If it's "fcm", change it:
config(['services.push.provider' => 'auto']);
```

Or edit `.env`:
```bash
PUSH_NOTIFICATION_PROVIDER=auto
```

---

### Solution 3: Check App is Using Correct Build

**Important:** Expo Go vs Development Build vs EAS Build

| Build Type | Push Notifications | How to Check |
|------------|-------------------|--------------|
| **Expo Go** | ❌ Limited/Broken | App title says "Expo Go" |
| **Development Build** | ✅ Works | Custom app icon, no "Expo Go" branding |
| **EAS Build** | ✅ Works | Production build |

**If using Expo Go:**

1. Create development build:
```bash
cd ~/PhpstormProjects/racefy_mobile.io/RacefyApp
npx expo run:android
```

2. This builds a proper development APK with Firebase/FCM support

---

## 🧪 Complete Test Flow

### Test 1: Manual Token Check

```bash
# Backend
cd ~/PhpstormProjects/racefy_api.io
./vendor/bin/sail artisan tinker
```

```php
$user = User::find(2);
echo "Token: " . $user->fcm_token . "\n";
echo "Device: " . $user->device_type . "\n";
```

**Compare** with mobile app (Settings → Developer → Push Token)

---

### Test 2: Direct Expo Test

```bash
# Replace TOKEN with your actual token from mobile app
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "ExponentPushToken[YOUR_TOKEN_HERE]",
    "title": "Direct Test",
    "body": "This is a direct test from curl",
    "sound": "default"
  }'
```

**If this works:** Backend integration is the problem
**If this fails:** Token/app configuration is the problem

---

### Test 3: Backend Send with Full Logging

```php
// In tinker:
use Illuminate\Support\Facades\Log;

// Enable detailed logging
Log::debug('Starting push notification test');

$user = User::find(2);
$liker = User::first();

$notification = new \App\Notifications\NotificationTypes\LikeNotification(
    $liker,
    'post',
    1
);

// Check notification data
$data = $notification->getData();
print_r($data);

// Check URL is present
echo "URL: " . ($data['url'] ?? 'MISSING!') . "\n";

// Send
$provider = new \App\Notifications\Providers\PushNotificationProvider();
$provider->send($user, $notification);

// Check logs
echo "Check storage/logs/laravel.log for result\n";
```

---

## 📊 Troubleshooting Matrix

| Symptom | Cause | Fix |
|---------|-------|-----|
| Backend says "sent successfully" but no notification | Token mismatch | Update token in database (Step 1-2) |
| "DeviceNotRegistered" error | Using Expo Go or token not valid | Use development build (`npx expo run:android`) |
| "FCM not configured" in logs | Backend trying to use FCM | Set `PUSH_NOTIFICATION_PROVIDER=auto` in .env |
| Token is null in database | App didn't register | Check mobile logs for registration errors |
| Different token each time | Token regenerating | Check Firebase/google-services.json is correct |

---

## ✅ Success Checklist

Before reporting as "not working", verify:

- [ ] Mobile app shows push token in Settings → Developer
- [ ] Database has same token as mobile app
- [ ] Direct curl test to Expo API works
- [ ] Backend logs show "sent successfully"
- [ ] Using development build (not Expo Go)
- [ ] Notification permissions granted in Android/iOS settings
- [ ] EAS project ID in app.config.ts matches Expo dashboard

---

## 🆘 Still Not Working?

If none of the above works, collect this information:

1. **Mobile token:**
   ```
   Settings → Developer → Push Token: [paste here]
   ```

2. **Database token:**
   ```bash
   User::find(X)->fcm_token
   ```

3. **Backend logs:**
   ```bash
   tail -50 storage/logs/laravel.log | grep -i push
   ```

4. **Expo test response:**
   ```bash
   curl -X POST https://exp.host/--/api/v2/push/send \
     -H "Content-Type: application/json" \
     -d '{"to": "YOUR_TOKEN", "title": "Test", "body": "Test"}'
   ```

5. **Build type:**
   - [ ] Expo Go
   - [ ] Development build (expo run:android)
   - [ ] EAS build

Share this information for further debugging.

---

## 💡 Quick Fix (90% of Cases)

**Most likely issue:** Token mismatch

**Quick fix:**
1. Open mobile app → Settings → Developer → copy Push Token
2. Backend tinker: `User::find(X)->update(['fcm_token' => 'PASTE_HERE']);`
3. Backend tinker: Send test notification (see Step 3)
4. Should work immediately!

---

Generated: 2026-02-06
Project: Racefy Mobile Push Notifications
