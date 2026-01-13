# Local Android Build Setup

This guide explains how to set up your local environment for building the Racefy Android app.

## Prerequisites

- Linux (Ubuntu/Debian) or macOS
- Node.js 18+ and npm
- At least 8GB RAM (16GB recommended)
- ~15GB free disk space

## 1. Install Android Studio

### Linux

```bash
# Download Android Studio
wget https://dl.google.com/dl/android/studio/ide-zips/2025.2.2.8/android-studio-2025.2.2.8-linux.tar.gz

# Extract to home directory
tar -xzf android-studio-*.tar.gz -C ~/

# Or extract to /opt (requires sudo)
sudo tar -xzf android-studio-*.tar.gz -C /opt/
```

### macOS

Download from https://developer.android.com/studio and install via DMG.

## 2. Configure Environment Variables

Add to `~/.bashrc` (Linux) or `~/.zshrc` (macOS):

```bash
# Android Studio and SDK
export ANDROID_HOME=$HOME/Android/Sdk
export JAVA_HOME=$HOME/android-studio/jbr  # Android Studio bundled Java
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$HOME/android-studio/bin
```

Apply changes:

```bash
source ~/.bashrc  # or source ~/.zshrc
```

## 3. Install Android SDK

Run Android Studio for the first time to install the SDK:

```bash
~/android-studio/bin/studio.sh
```

Choose "Standard" setup. This will download:
- Android SDK
- Android SDK Platform
- Android Virtual Device

After installation, verify:

```bash
echo $ANDROID_HOME  # Should show path to SDK
adb --version       # Should show ADB version
```

## 4. Mapbox Setup

Mapbox requires two tokens:

| Token Type | Purpose | Format | Where to Use |
|------------|---------|--------|--------------|
| Public Token | Runtime API access | `pk.xxx` | `.env` as `MAPBOX_ACCESS_TOKEN` |
| Secret Token | SDK download during build | `sk.xxx` | `~/.gradle/gradle.properties` |

### Create Mapbox Tokens

1. Go to https://account.mapbox.com/access-tokens/
2. **Public token**: Use the default public token or create one
3. **Secret token**: Create new token with **only** `DOWNLOADS:READ` scope

### Configure Tokens

**In `.env`:**
```env
MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbXh4...
RNMAPBOX_MAPS_DOWNLOAD_TOKEN=sk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbXh4...
MAPBOX_ENABLED=true
```

**In `~/.gradle/gradle.properties`:**
```properties
MAPBOX_DOWNLOADS_TOKEN=sk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbXh4...
```

### Verify Token Works

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -u "mapbox:YOUR_SECRET_TOKEN" \
  "https://api.mapbox.com/downloads/v2/releases/maven/com/mapbox/maps/android-ndk27/11.16.2/android-ndk27-11.16.2.pom"
```

Should return `200`. If `403` - token lacks `DOWNLOADS:READ` scope.

## 5. Connect Android Device

### Enable USB Debugging

On your Android device:
1. Go to **Settings > About phone**
2. Tap **Build number** 7 times to enable Developer Options
3. Go to **Settings > Developer options**
4. Enable **USB debugging**
5. For Xiaomi devices, also enable:
   - **Install via USB**
   - **USB debugging (Security settings)**

### Connect and Verify

```bash
adb devices
```

Should show your device. If shows `unauthorized`:
- Check phone screen for authorization popup
- Tap **Allow**

## 6. Build Commands

### Generate Native Project (first time or after native changes)

```bash
cd RacefyApp
npx expo prebuild --platform android --clean
```

### Development Build

```bash
npx expo run:android
```

### Release Build

```bash
# Direct Gradle build (faster, skips lint)
JAVA_HOME=$HOME/android-studio/jbr \
ANDROID_HOME=$HOME/Android/Sdk \
./android/gradlew app:assembleRelease \
  -x lint -x lintRelease -x lintVitalRelease

# APK location
ls android/app/build/outputs/apk/release/app-release.apk
```

### Install on Device

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Build Script (Recommended)

Use the provided build script that loads `.env` automatically:

```bash
./build-local.sh
```

## 7. EAS Build (Alternative)

### Cloud Build (no local setup needed)

```bash
eas build --platform android --profile staging
```

### Local Build via EAS

```bash
eas build --platform android --profile staging --local
```

**Note:** EAS local builds require all environment variables in `eas.json` or EAS secrets.

---

# Troubleshooting

## JAVA_HOME Not Set

**Error:**
```
ERROR: JAVA_HOME is not set and no 'java' command could be found
```

**Solution:**
```bash
export JAVA_HOME=$HOME/android-studio/jbr
```

Or add to `~/.bashrc` permanently.

---

## ANDROID_HOME Not Set

**Error:**
```
SDK location not found
```

**Solution:**
```bash
export ANDROID_HOME=$HOME/Android/Sdk
```

---

## Mapbox 401 Unauthorized

**Error:**
```
Could not GET 'https://api.mapbox.com/downloads/v2/releases/maven/...'.
Received status code 401 from server: Unauthorized
```

**Causes:**
1. Token not in `~/.gradle/gradle.properties`
2. Old token cached

**Solution:**
```bash
# Update global gradle.properties
echo "MAPBOX_DOWNLOADS_TOKEN=sk.your_secret_token" > ~/.gradle/gradle.properties

# Clear Gradle cache
rm -rf ~/.gradle/caches/modules-2/files-2.1/com.mapbox*

# Verify token is used
cd RacefyApp/android
./gradlew properties -q | grep MAPBOX
```

---

## Mapbox 403 Forbidden

**Error:**
```
Received status code 403 from server: Forbidden
```

**Cause:** Token doesn't have `DOWNLOADS:READ` scope.

**Solution:**
1. Go to https://account.mapbox.com/access-tokens/
2. Create new secret token with `DOWNLOADS:READ` scope
3. Update `~/.gradle/gradle.properties`

---

## Device Not Detected (adb devices empty)

**Possible causes:**
1. USB debugging not enabled
2. Wrong USB mode
3. Computer not authorized

**Solution:**
1. Enable USB debugging (see section 5)
2. Set USB mode to "File Transfer" (MTP)
3. Check phone for authorization popup
4. Try different USB cable/port

```bash
# Restart ADB
adb kill-server && adb devices
```

---

## Install Failed: INSTALL_FAILED_UPDATE_INCOMPATIBLE

**Error:**
```
Existing package signatures do not match newer version
```

**Cause:** App signed with different key.

**Solution:**
```bash
adb uninstall com.racefy.app
adb install android/app/build/outputs/apk/release/app-release.apk
```

---

## Out of Memory During Build

**Error:**
```
java.lang.OutOfMemoryError: Java heap space
```

**Solution:**

1. Skip lint tasks:
```bash
./gradlew app:assembleRelease -x lint -x lintRelease -x lintVitalRelease
```

2. Increase memory in `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m
```

---

## Network Errors During Dependency Download

**Error:**
```
Could not GET 'https://repo.maven.apache.org/...'
```

**Cause:** Temporary network issue.

**Solution:**
1. Check internet connection
2. Retry the build
3. If persists, try VPN or different DNS

---

## Gradle Cache Issues

**Symptoms:** Build fails with strange errors after config changes.

**Solution:**
```bash
cd RacefyApp/android

# Clean build
./gradlew clean

# Refresh dependencies
./gradlew --refresh-dependencies

# Or nuclear option - clear all caches
rm -rf ~/.gradle/caches/
rm -rf android/.gradle/
rm -rf android/app/build/
```

---

## prebuild Fails

**Error:**
```
Cannot find module 'xxx'
```

**Solution:**
```bash
# Clear and reinstall
rm -rf node_modules
rm -rf android
npm install
npx expo prebuild --platform android --clean
```

---

## Build Succeeds But App Crashes

**Debug steps:**

1. Check logs:
```bash
adb logcat | grep -i racefy
```

2. Build debug version:
```bash
npx expo run:android  # debug by default
```

3. Check if all env variables are set correctly in `.env`

---

## EAS Local Build Fails with Mapbox

**Cause:** EAS local builds don't read `~/.gradle/gradle.properties`.

**Solution:** Use direct Gradle build instead:
```bash
JAVA_HOME=$HOME/android-studio/jbr \
ANDROID_HOME=$HOME/Android/Sdk \
./android/gradlew app:assembleRelease -x lint -x lintRelease -x lintVitalRelease
```

Or use cloud build:
```bash
eas build --platform android --profile staging
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Check Java | `java -version` |
| Check ADB | `adb --version` |
| List devices | `adb devices` |
| Install APK | `adb install path/to/app.apk` |
| Uninstall app | `adb uninstall com.racefy.app` |
| View logs | `adb logcat \| grep racefy` |
| Clean build | `cd android && ./gradlew clean` |
| Check Gradle props | `./gradlew properties -q \| grep MAPBOX` |