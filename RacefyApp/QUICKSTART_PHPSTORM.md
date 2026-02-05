# Quick Start for PHPStorm Users

This is a 2-minute setup guide to get you running with PHPStorm.

## Prerequisites Check

```bash
# 1. Check Node.js version (must be 18+)
node --version
# If < v18, run: nvm use 20

# 2. Check if adb is available
adb devices
# If not found, adb will be auto-detected from ~/Android/Sdk
```

## PHPStorm Setup (One-time)

### Step 1: Configure Node.js Interpreter

1. Open **Settings** (`Ctrl+Alt+S`)
2. Navigate to **Languages & Frameworks → Node.js**
3. Set **Node interpreter** to:
   ```
   /home/sebastian-tarka/.nvm/versions/node/v20.19.5/bin/node
   ```
   Or click **Add → Add from NVM** and select version 20

### Step 2: Import Run Configurations (Already Done!)

The project includes pre-configured run configurations in `.run/` directory:
- ✅ **Start with adb** - Development with USB device forwarding
- ✅ **Start Expo** - Standard development server
- ✅ **Run Android** - Build and run on Android

They will automatically appear in your Run Configuration dropdown (top-right corner).

### Step 3: Configure .env (Already Done!)

The `.env` file is already configured with:
```bash
API_LOCAL_IP=localhost
API_LOCAL_PORT=8070
```

## Running the App

### Method 1: Using Run Configurations (Recommended)

1. Select **"Start with adb"** from the run configuration dropdown (top-right)
2. Click the green play button or press `Shift+F10`
3. The script will:
   - Auto-load Node.js 20
   - Setup adb reverse (if device connected via USB)
   - Start Expo dev server

### Method 2: Terminal (Alternative)

Open terminal in PHPStorm (`Alt+F12`):

```bash
cd RacefyApp
npm run start:adb
```

### Method 3: npm Scripts Panel

1. Open **npm scripts** panel (View → Tool Windows → npm)
2. Navigate to **RacefyApp → Scripts**
3. Double-click **start:adb**

## Device Setup

### Physical Android Device (USB)

1. **Enable USB Debugging** on your device:
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"

2. **Connect via USB cable**

3. **Verify connection**:
   ```bash
   adb devices
   # Should show: xxxxxxxxx device
   ```

4. **Run the app** using any method above

The adb reverse tunnel (`localhost:8070`) will be automatically configured.

### Android Emulator

1. Start Android emulator from Android Studio or:
   ```bash
   emulator -avd <your_avd_name>
   ```

2. Run the app using any method above

The emulator automatically maps `10.0.2.2` to host's `localhost`.

## Troubleshooting

### "ReadableStream is not defined"
**Solution:** Node.js version is wrong. Check PHPStorm Node interpreter setting (Step 1).

### "adb: command not found"
**Solution:** The script auto-detects Android SDK. If it fails:
```bash
# Add to ~/.bashrc
export PATH=$PATH:$HOME/Android/Sdk/platform-tools
```

### "Connection refused" when opening app
**Solutions:**
1. Check that Laravel API is running on port 8070
2. Verify adb reverse is active: `adb reverse --list`
3. Re-run adb reverse: `adb reverse tcp:8070 tcp:8070`

### Terminal shows wrong Node.js version
**Solution:** PHPStorm terminal may not load NVM. Either:
- Configure Node interpreter in Settings (Step 1)
- Or manually run: `nvm use 20` before running commands

## Daily Workflow

Once set up, your daily workflow is simple:

1. **Start Laravel API** (in separate terminal):
   ```bash
   cd /path/to/laravel
   ./vendor/bin/sail up
   ```

2. **Connect device via USB** (if using physical device)

3. **Click run button** in PHPStorm (or `Shift+F10`)

4. **Open Expo Go app** on device and scan QR code

That's it! The app will connect to your local API via `localhost:8070`.

## Network-Independent Development

With this setup:
- ✅ Works without WiFi (USB only)
- ✅ No need to update IP when switching networks
- ✅ Faster connection than WiFi
- ✅ Same setup for all developers

## Next Steps

For more advanced configuration, see:
- Full PHPStorm setup: `docs/PHPSTORM_SETUP.md`
- Network setup options: `docs/LOCAL_DEV_NETWORK.md`
- Build guides: `docs/LOCAL_BUILD_SETUP.md`