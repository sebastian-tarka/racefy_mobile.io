# iOS Build Guide - Racefy Mobile

This guide explains how to build and distribute iOS apps for different environments and purposes.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Build Profiles Overview](#build-profiles-overview)
- [Staging Build (Internal/Ad-Hoc)](#staging-build-internalad-hoc)
- [TestFlight Build (Testing with Friends)](#testflight-build-testing-with-friends)
- [Production Build (App Store Release)](#production-build-app-store-release)
- [Managing Testers](#managing-testers)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required:
- ✅ Apple Developer Account ($99/year) - https://developer.apple.com/
- ✅ EAS CLI installed: `npm install -g eas-cli`
- ✅ Logged in to EAS: `eas login`
- ✅ Apple ID with Admin/App Manager role in App Store Connect

### First-time setup:
1. Accept agreements in App Store Connect: https://appstoreconnect.apple.com/
2. Configure credentials: `eas credentials` (done automatically on first build)

---

## Build Profiles Overview

| Profile | API URL | Distribution | Use Case | Command |
|---------|---------|--------------|----------|---------|
| **staging** | `https://app.dev.racefy.io/api` | Internal/Ad-Hoc | Internal team testing (requires device UDIDs) | `eas build --platform ios --profile staging` |
| **production** (current) | `https://app.dev.racefy.io/api` | TestFlight/App Store | Testing with friends via TestFlight (staging API) | `eas build --platform ios --profile production` |
| **production** (future) | `https://api.racefy.app/api` | App Store | Final production release to public | Update `APP_ENV` to `production` in eas.json |

### Current Configuration:

The **production** profile is currently configured to use the **staging API** for TestFlight testing. When ready for final App Store release, you'll need to update it to use the production API.

---

## Staging Build (Internal/Ad-Hoc)

**Use this for:** Internal testing on specific registered devices (max 100 devices).

### Configuration

- **API:** `https://app.dev.racefy.io/api` (staging)
- **Distribution:** Internal (Ad-Hoc)
- **Logging:** Enabled (debug level)
- **Requires:** Device UDIDs for installation

### Build Command

```bash
eas build --platform ios --profile staging
```

### What happens:

1. Prompts for Apple Developer credentials (first time)
2. Creates Ad-Hoc provisioning profile with registered devices
3. Builds and uploads to EAS
4. Provides `.ipa` download link

### Installing on Devices

**Option 1: Using a Mac with Xcode**
```bash
# Download .ipa from build URL
# Connect iPhone via USB
# Open Xcode → Window → Devices and Simulators
# Drag and drop .ipa onto device
```

**Option 2: Using Apple Configurator (Mac)**
- Download Apple Configurator from Mac App Store
- Connect device and drag .ipa to install

**Option 3: Over-the-air (requires web hosting)**
- Host .ipa and manifest.plist on HTTPS server
- Users visit URL on device to install

### Adding Test Devices

To add more devices to Ad-Hoc builds:

```bash
eas device:create
```

Or register devices manually in Apple Developer Portal:
1. Go to https://developer.apple.com/account/resources/devices
2. Add device UDID
3. Rebuild with new provisioning profile

---

## TestFlight Build (Testing with Friends)

**Use this for:** Sharing with friends and external testers via TestFlight (easiest method, no device UDIDs needed).

### Configuration

- **API:** `https://app.dev.racefy.io/api` (staging)
- **Distribution:** App Store (TestFlight)
- **Logging:** Enabled (debug level)
- **Max testers:** 10,000 (external), 100 (internal)

### Step 1: Build

```bash
eas build --platform ios --profile production
```

### Step 2: Submit to TestFlight

**Option A: Auto-submit during build (recommended)**
```bash
eas build --platform ios --profile production --auto-submit
```

**Option B: Submit after build completes**
```bash
eas submit --platform ios --latest
```

### Step 3: Wait for Processing

1. Go to https://appstoreconnect.apple.com/
2. Navigate to **My Apps** → **RacefyApp** → **TestFlight**
3. Wait for Apple to process the build (~5-15 minutes)
4. Status will change from "Processing" to "Ready to Test"

### Step 4: Add Testers

**Internal Testing** (instant access, no review):
1. In TestFlight tab, click **Internal Testing**
2. Click **Add Group** or use existing group
3. Add testers by email (must have App Store Connect access)
4. Testers receive invite immediately

**External Testing** (requires Apple review, ~24 hours):
1. In TestFlight tab, click **External Testing**
2. Click **Add Group** or use existing group
3. Add testers by email (anyone with an iPhone)
4. Add "What to Test" notes
5. Submit for review
6. After approval, testers receive invite

### Step 5: Friends Install

Your friends will:
1. Receive email invite from TestFlight
2. Install **TestFlight app** from App Store (if not already installed)
3. Open the invite link
4. Tap **Install** in TestFlight app
5. App appears on home screen

### Updating TestFlight Builds

To release a new version:
```bash
# Increment version in app.config.ts
# Build and submit again
eas build --platform ios --profile production --auto-submit
```

Existing testers will automatically get the update notification in TestFlight.

---

## Production Build (App Store Release)

**Use this for:** Final public release on the App Store.

### Prerequisites

Before releasing to production:

1. **Update API configuration** - Switch from staging to production API
2. **Create App Store listing** - Screenshots, description, keywords
3. **Complete App Store Connect setup** - Privacy policy, ratings, pricing
4. **Test thoroughly** - On TestFlight with production API

### Step 1: Update Configuration for Production

Edit `RacefyApp/eas.json` and change the production profile:

```json
"production": {
  "environment": "production",  // Change from "preview"
  "android": {
    "buildType": "app-bundle",
    "gradleCommand": ":app:bundleRelease"
  },
  "ios": {
    "buildConfiguration": "Release"
  },
  "distribution": "store",
  "env": {
    "APP_ENV": "production",  // Change from "staging"
    "LOG_ENABLED": "false",   // Disable logging for production
    "MAPBOX_ENABLED": "true"
  }
}
```

**Important:** Ensure production environment variables are set in EAS:

```bash
# Check production environment variables
eas env:list production --include-sensitive

# Add production API URL if needed
eas env:create --name API_PRODUCTION_URL \
  --value "https://api.racefy.app/api" \
  --scope project \
  --type string \
  --visibility secret \
  --environment production \
  --non-interactive
```

### Step 2: Build for Production

```bash
# Build with production API
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --latest
```

Or combine both:
```bash
eas build --platform ios --profile production --auto-submit
```

### Step 3: Complete App Store Listing

1. Go to https://appstoreconnect.apple.com/
2. Navigate to **My Apps** → **RacefyApp** → **App Store** tab
3. Fill in required fields:
   - App name
   - Subtitle
   - Description
   - Keywords
   - Screenshots (required for all device sizes)
   - App icon (1024x1024)
   - Privacy Policy URL
   - Support URL
   - Age rating

### Step 4: Submit for Review

1. Select the build you just uploaded
2. Add version release notes
3. Add reviewer notes (test credentials, special instructions)
4. Click **Add for Review**
5. Click **Submit to App Review**

### Step 5: Wait for Apple Review

- **Review time:** 24-48 hours typically
- **Check status:** App Store Connect → App Store tab
- **Possible outcomes:**
  - ✅ **Approved** - App goes live (or scheduled release)
  - ❌ **Rejected** - Review feedback in Resolution Center

### Step 6: Release

After approval:
- **Automatic release** - Goes live immediately
- **Manual release** - You control when to publish
- **Scheduled release** - Set a specific date/time

---

## Managing Testers

### Check TestFlight Status

```bash
# View current builds
eas submit:list --platform ios
```

### Add Internal Testers (App Store Connect users)

1. Go to **App Store Connect** → **Users and Access**
2. Add users with "Admin", "App Manager", or "Developer" role
3. Go to **TestFlight** → **Internal Testing**
4. Add them to test group

### Add External Testers (Anyone)

1. Go to **TestFlight** → **External Testing**
2. Create or select group
3. Add emails
4. Submit group for Beta App Review (first time only)

### Remove Tester

1. Go to **TestFlight** → Testing group
2. Find tester → Click remove

---

## Troubleshooting

### "No environment variables found for preview environment"

This is a warning, not an error. The build will still work. Secret environment variables (like Mapbox tokens) are automatically injected and not shown.

### "Failed to display prompt: Do you want to log in to your Apple account?"

This means you're running the command through a tool that doesn't support interactive input. Run the command directly in your terminal:

```bash
eas build --platform ios --profile production
```

### "Invalid provisioning profile"

Regenerate provisioning profiles:

```bash
eas credentials
# Select iOS → Build Credentials → Provisioning Profile → Remove
# Run build again - EAS will create a new one
```

### "Build failed during Xcode build"

Check build logs at the provided URL. Common issues:
- Missing Mapbox token - Ensure `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` is set in EAS environment
- Code signing issues - Regenerate certificates with `eas credentials`
- TypeScript errors - Run `npx tsc --noEmit` locally first

### "TestFlight build stuck in processing"

Apple's processing can take up to 24 hours, but usually completes in 5-15 minutes. If stuck:
- Check App Store Connect for error messages
- Ensure you accepted all agreements
- Try uploading again

### Device UDID for Ad-Hoc builds

To find iPhone UDID:

**Using Mac:**
1. Connect iPhone via USB
2. Open Finder (macOS Catalina+) or iTunes
3. Click device → Click on Serial Number to reveal UDID
4. Right-click → Copy

**Using iPhone:**
1. Settings → General → About
2. Look for UDID (may need Mac/PC to view full UDID)

**Register with EAS:**
```bash
eas device:create
```

---

## Quick Reference Commands

```bash
# Check EAS login
eas whoami

# Configure credentials
eas credentials

# Build staging (Ad-Hoc)
eas build --platform ios --profile staging

# Build TestFlight (with staging API)
eas build --platform ios --profile production --auto-submit

# Build production (App Store with production API)
# First: Update eas.json to use production environment
eas build --platform ios --profile production --auto-submit

# Submit existing build to TestFlight
eas submit --platform ios --latest

# List environment variables
eas env:list preview --include-sensitive
eas env:list production --include-sensitive

# View build history
eas build:list --platform ios

# View builds on dashboard
# https://expo.dev/accounts/sebastiantarka/projects/RacefyApp/builds
```

---

## Links

- **Expo Dashboard:** https://expo.dev/accounts/sebastiantarka/projects/RacefyApp
- **Build History:** https://expo.dev/accounts/sebastiantarka/projects/RacefyApp/builds
- **App Store Connect:** https://appstoreconnect.apple.com/
- **Apple Developer Portal:** https://developer.apple.com/account/
- **TestFlight App:** https://apps.apple.com/app/testflight/id899247664
- **EAS Build Docs:** https://docs.expo.dev/build/introduction/
- **TestFlight Docs:** https://developer.apple.com/testflight/

---

## Support

For issues or questions:
- EAS Build Issues: https://github.com/expo/eas-cli/issues
- Apple Developer Support: https://developer.apple.com/support/
- Racefy Project Issues: Check project documentation in `RacefyApp/docs/`