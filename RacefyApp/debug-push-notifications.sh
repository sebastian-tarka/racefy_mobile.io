#!/bin/bash
# Debug Push Notifications Script
# Usage: ./debug-push-notifications.sh

echo "🔍 Push Notifications Debug Tool"
echo "=================================="
echo ""

# Check if device is connected
echo "📱 Checking for connected Android device..."
if ! adb devices | grep -q "device$"; then
    echo "❌ No Android device connected!"
    echo "   Connect your device and enable USB debugging"
    exit 1
fi
echo "✅ Device connected"
echo ""

# Check app package
PACKAGE="com.racefy.app"
echo "📦 Checking if Racefy app is installed..."
if ! adb shell pm list packages | grep -q "$PACKAGE"; then
    echo "❌ Racefy app not installed!"
    echo "   Run: npm run android"
    exit 1
fi
echo "✅ App installed"
echo ""

# Get AsyncStorage data for push token
echo "🔑 Fetching push token from device..."
echo "   This may take a moment..."
echo ""

# Try to read the token from AsyncStorage
# Note: This requires the app to be running at least once
adb shell "run-as $PACKAGE cat /data/data/$PACKAGE/files/AsyncStorage/*" 2>/dev/null | grep -A2 "@racefy_token\|fcm_token\|expo.*token" | head -20

echo ""
echo "📋 Next Steps:"
echo "1. Open the Racefy app on your device"
echo "2. Go to: Settings → Developer → Debug Info"
echo "3. Copy the 'Push Token' value"
echo "4. Verify this token matches what's in your database"
echo ""
echo "💡 Common Issues:"
echo "   - Token in database is old/different"
echo "   - App didn't request notification permissions"
echo "   - Firebase not properly configured"
echo "   - Expo project ID mismatch"
echo ""
