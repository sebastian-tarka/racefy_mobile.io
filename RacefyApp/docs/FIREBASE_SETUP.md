# Firebase & Push Notifications Setup

Complete guide for configuring Firebase Cloud Messaging (FCM) with multiple environments.

## Overview

Racefy uses Firebase for push notifications with separate Firebase projects for each environment:

| Environment | Firebase Project | google-services.json | Build Profile |
|-------------|------------------|---------------------|---------------|
| **Development** | `racefy-local-69c59` | `google-services-dev.json` | `development` |
| **Staging** | `racefy-stage-e46f7` | `google-services-staging.json` | `staging` |
| **Production** | `racefy-prod` | `google-services-production.json` | `production` |

## Prerequisites

- Firebase projects created (see section 1)
- Android package: `com.racefy.app`
- Node.js 18+ with nvm (for switching to Node 20)

---

## 1. Firebase Project Setup

### Create Firebase Projects

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create three projects:
   - `racefy-local` (for development)
   - `racefy-stage` (for staging)
   - `racefy-prod` (for production)

**Note:** Firebase may append a suffix (e.g., `-69c59`) if the name is taken. This is normal.

### Add Android App to Each Project

For **each** Firebase project:

1. Click **Add app** → Android icon
2. **Android package name**: `com.racefy.app` (must match exactly)
3. **App nickname**: "Racefy Mobile" (optional, for your reference)
4. Click **Register app**
5. **Download `google-services.json`**
6. Skip "Add Firebase SDK" (Expo handles this)
7. Click **Continue** and **Finish**

### Enable FCM V1 API

For **each** Firebase project:

1. Go to **Project Settings** → **Cloud Messaging** tab
2. Find: **Firebase Cloud Messaging API (V1)**
3. If disabled, click **⋮** → **Manage API in Google Cloud Console**
4. Click **Enable API**

### Download Service Account Keys

For **each** Firebase project (needed for EAS builds):

1. Go to **Project Settings** → **Service Accounts** tab
2. Click **Generate new private key**
3. Click **Generate key** (downloads a JSON file)
4. Rename downloaded files:
   - `racefy-local-firebase-key.json`
   - `racefy-stage-firebase-key.json`
   - `racefy-prod-firebase-key.json`
5. Store securely (don't commit to git!)

---

## 2. Project Configuration

### File Structure

Your project should have:

```
RacefyApp/
├── google-services-dev.json         # Development (racefy-local-69c59)
├── google-services-staging.json     # Staging (racefy-stage-e46f7)
├── google-services-production.json  # Production (racefy-prod)
├── android/
│   └── app/
│       └── google-services.json     # Active config (copied before build)
└── BUILD_INSTRUCTIONS.md            # Build commands reference
```

### Rename Downloaded Files

After downloading from Firebase:

```bash
cd RacefyApp

# Rename files based on environment
mv ~/Downloads/google-services.json google-services-dev.json       # From racefy-local
mv ~/Downloads/google-services.json google-services-staging.json   # From racefy-stage
mv ~/Downloads/google-services.json google-services-production.json # From racefy-prod
```

---

## 3. Local USB Build (Development)

### Quick Start

```bash
cd RacefyApp

# 1. Use Node 20
nvm use 20

# 2. Copy correct Firebase config
cp google-services-dev.json google-services.json
cp google-services-dev.json android/app/google-services.json

# 3. Connect device via USB
adb devices

# 4. Build and install
npx expo run:android
```

### Build for Different Environments

**Development (local Firebase):**
```bash
cp google-services-dev.json google-services.json
cp google-services-dev.json android/app/google-services.json
npx expo run:android
```

**Staging (staging Firebase):**
```bash
cp google-services-staging.json google-services.json
cp google-services-staging.json android/app/google-services.json
APP_ENV=staging npx expo run:android
```

**Production (production Firebase):**
```bash
cp google-services-production.json google-services.json
cp google-services-production.json android/app/google-services.json
APP_ENV=production npx expo run:android
```

### When to Rebuild

**Rebuild required:**
- ✅ Changed Firebase configuration (switched google-services.json)
- ✅ Added/removed native dependencies
- ✅ Changed native Android code

**No rebuild needed:**
- ✅ Changed JavaScript/TypeScript code (Metro hot-reloads)
- ✅ Changed styles/UI
- ✅ Changed API endpoints

---

## 4. EAS Cloud Build

### Upload FCM Credentials to EAS

For each environment, upload the service account key:

```bash
cd RacefyApp

# Start credentials wizard
eas credentials -p android
```

Then:
1. Select: **Google Service Account**
2. Select: **Add new**
3. Provide file path:
   - Development: `~/Downloads/racefy-local-firebase-key.json`
   - Staging: `~/Downloads/racefy-stage-firebase-key.json`
   - Production: `~/Downloads/racefy-prod-firebase-key.json`
4. Select corresponding environment

### Verify Credentials

Check dashboard: https://expo.dev/accounts/sebastiantarka/projects/RacefyApp/credentials

Should show **FCM V1 service account key** for all three environments.

### Build Commands

**Before building**, copy the correct google-services.json:

```bash
cd RacefyApp
nvm use 20

# Staging build
cp google-services-staging.json google-services.json
eas build --platform android --profile staging

# Production build
cp google-services-production.json google-services.json
eas build --platform android --profile production
```

**Build time:** 15-20 minutes

---

## 5. Testing Push Notifications

### On Physical Device (Required)

Push notifications **don't work on emulators**. You need a physical device with Google Play Services.

### Test Steps

1. **Install app** (USB or EAS build)
2. **Login** with test account
3. **Check logs** in Settings → Developer → Debug Logs:
   ```
   ✅ [INFO][general] Initializing push notifications
   ✅ [INFO][general] Got Expo push token {"token": "ExponentPushToken[...]"}
   ✅ [INFO][general] Device registered for push notifications
   ```

### Troubleshooting Push Notifications

**Error: `SERVICE_NOT_AVAILABLE`**

Causes:
- Google Play Services outdated/missing
- No internet access to Google servers
- Network blocks Google services

Solutions:
1. Update Google Play Services on device
2. Test on different device
3. Test with mobile data (not WiFi if blocked)

**Error: `Firebase not configured`**

Cause: Wrong google-services.json or not copied to android/app

Solution:
```bash
# Verify project ID matches
cat android/app/google-services.json | grep project_id

# Re-copy correct file
cp google-services-staging.json android/app/google-services.json

# Rebuild
npx expo run:android
```

---

## 6. Environment Management

### Check Current Configuration

```bash
cd RacefyApp

# Check which Firebase project is active
cat google-services.json | grep project_id

# Check in android/app too
cat android/app/google-services.json | grep project_id
```

### Switch Environments

**Before switching**, always copy to both locations:

```bash
# Example: Switch to staging
cp google-services-staging.json google-services.json
cp google-services-staging.json android/app/google-services.json

# Rebuild required
npx expo run:android
```

### Quick Reference

| Want to use... | Copy this file | Build command |
|----------------|----------------|---------------|
| **Local dev** | `google-services-dev.json` | `npx expo run:android` |
| **Staging** | `google-services-staging.json` | `APP_ENV=staging npx expo run:android` |
| **Production** | `google-services-production.json` | `APP_ENV=production npx expo run:android` |

---

## 7. Security Best Practices

### DO ✅

- ✅ Keep service account keys secure (don't commit to git)
- ✅ Use separate Firebase projects for each environment
- ✅ Verify package name matches (`com.racefy.app`)
- ✅ Enable FCM V1 API for all projects
- ✅ Test on physical devices only

### DON'T ❌

- ❌ Commit `google-services.json` files to git
- ❌ Share service account keys publicly
- ❌ Use production Firebase for development
- ❌ Test push notifications on emulators
- ❌ Mix up google-services.json files between environments

---

## 8. Common Issues

### Package Name Mismatch

**Error:** Firebase shows different package name

**Solution:**
1. Check `app.config.ts`: `android.package` should be `com.racefy.app`
2. In Firebase Console, verify Android app package is `com.racefy.app`
3. Re-download google-services.json if needed

### Build Works But Push Fails

**Checklist:**
- [ ] FCM V1 API enabled in Firebase project?
- [ ] google-services.json from correct Firebase project?
- [ ] Device has Google Play Services?
- [ ] Device has internet (can reach google.com)?
- [ ] App has notification permission granted?

### Multiple Firebase Projects Confusion

**Problem:** Have both `racefy-stage` and `racefy-stage-e46f7`

**Solution:** Delete unused duplicate:
1. Go to Firebase Console
2. Select unused project
3. Project Settings → General → Delete project
4. Keep the one you have google-services.json for

---

## 9. Quick Commands

```bash
# Switch to Node 20
nvm use 20

# Development build (USB)
cp google-services-dev.json google-services.json && \
cp google-services-dev.json android/app/google-services.json && \
npx expo run:android

# Staging build (USB)
cp google-services-staging.json google-services.json && \
cp google-services-staging.json android/app/google-services.json && \
APP_ENV=staging npx expo run:android

# Staging build (EAS)
cp google-services-staging.json google-services.json && \
eas build --platform android --profile staging

# Check active Firebase project
cat android/app/google-services.json | grep project_id

# Uninstall old app before new build
adb uninstall com.racefy.app

# View logs
adb logcat | grep -i firebase
```

---

## Related Documentation

- [LOCAL_BUILD_SETUP.md](./LOCAL_BUILD_SETUP.md) - Android SDK setup
- [BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md) - Build commands reference
- [CLAUDE.md](../CLAUDE.md) - Project overview