# Local Development Network Setup

This guide explains how to connect your mobile device to the local Laravel API during development.

## Problem

When developing with a physical device, the app needs to connect to your local API server. The challenge is that the device's network configuration changes frequently:
- Disconnecting/reconnecting from WiFi changes your local IP
- Switching networks (home, office, mobile hotspot) requires different IPs
- Constantly updating `.env` with new IPs is tedious

## Solution: adb reverse (Recommended)

The best solution for **physical Android devices connected via USB** is to use `adb reverse`, which creates a port tunnel from your computer to the device. This allows the device to access `localhost` just as if it were running on your computer.

### Setup

1. **Update .env to use localhost mode:**
   ```bash
   API_LOCAL_IP=localhost
   API_LOCAL_PORT=8070
   ```

2. **Connect your Android device via USB** and enable USB debugging

3. **Run the development server with adb reverse:**
   ```bash
   cd RacefyApp
   npm run start:adb
   ```

   This script automatically:
   - Sets up `adb reverse tcp:8070 tcp:8070`
   - Starts the Expo dev server

### How it Works

- `adb reverse tcp:8070 tcp:8070` forwards port 8070 from your computer to the device
- The app config detects `API_LOCAL_IP=localhost` and uses `http://localhost:8070` instead of an IP address
- Works **independently of network changes** - as long as USB is connected, it works!

### Benefits

✅ No need to update IP when switching networks
✅ Works even when not connected to WiFi
✅ More secure (no network traffic, just USB)
✅ Faster connection than WiFi
✅ Same setup for all developers

### Requirements

- Android device connected via USB
- USB debugging enabled on device
- adb installed (comes with Android Studio)

## Alternative: WiFi with IP Address

If you can't use USB or prefer WiFi development:

1. **Find your computer's local IP:**
   ```bash
   # Linux
   ip addr show | grep "inet " | grep -v 127.0.0.1

   # macOS
   ipconfig getifaddr en0
   ```

2. **Update .env with your IP:**
   ```bash
   API_LOCAL_IP=192.168.1.100  # Your actual IP
   API_LOCAL_PORT=8070
   ```

3. **Make sure device and computer are on same network**

4. **Start development:**
   ```bash
   cd RacefyApp
   npm start
   ```

### Drawbacks

❌ IP changes when switching networks
❌ Requires updating .env frequently
❌ Device must be on same WiFi network
❌ Slower than USB connection

## Alternative: Staging API

If you don't need the local API and can test against staging:

1. **Update .env:**
   ```bash
   USE_STAGING_IN_DEV=true
   ```

2. **Start development:**
   ```bash
   cd RacefyApp
   npm start
   ```

This uses `https://app.dev.racefy.io/api` instead of your local API.

### Drawbacks

❌ Can't test local API changes
❌ Requires internet connection
❌ Slower response times
❌ Can't debug backend with Xdebug

## iOS Development

For iOS Simulator (not physical devices):
- The simulator can access `localhost` directly without any special setup
- No need for adb reverse
- Just keep `API_LOCAL_IP=localhost` in `.env`

For **physical iOS devices**, you'll need to use WiFi with IP address method.

## Troubleshooting

### "Connection refused" errors

1. Check that your API server is running:
   ```bash
   curl http://localhost:8070/api/health
   ```

2. For adb reverse mode, verify the tunnel is active:
   ```bash
   adb reverse --list
   # Should show: tcp:8070 -> tcp:8070
   ```

3. Re-run adb reverse if needed:
   ```bash
   adb reverse tcp:8070 tcp:8070
   ```

### Device not detected

```bash
# Check if device is connected
adb devices

# If empty, check:
# - USB debugging is enabled on device
# - USB cable supports data transfer (not just charging)
# - Device is authorized (check device screen for prompt)
```

### Port already in use

If port 8070 is in use:
```bash
# Find what's using the port
lsof -i :8070

# Kill the process or change API_LOCAL_PORT in .env
```

## Quick Reference

| Method | Setup Command | .env Setting | Best For |
|--------|---------------|--------------|----------|
| **adb reverse** | `npm run start:adb` | `API_LOCAL_IP=localhost` | Physical Android via USB ✅ |
| WiFi with IP | `npm start` | `API_LOCAL_IP=192.168.x.x` | Physical devices via WiFi |
| Staging API | `npm start` | `USE_STAGING_IN_DEV=true` | Testing without local API |
| iOS Simulator | `npm start` | `API_LOCAL_IP=localhost` | iOS Simulator |

## Related Files

- Configuration: `src/config/api.ts`
- Dev script: `scripts/dev-with-adb.sh`
- Environment: `.env`