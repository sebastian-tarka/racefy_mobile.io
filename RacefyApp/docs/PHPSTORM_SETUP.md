# PHPStorm / WebStorm Configuration Guide

This guide shows how to configure PHPStorm/WebStorm for running the Racefy Mobile app.

## Prerequisites

### Node.js Version

The app requires **Node.js 18 or higher**. If you're using NVM:

```bash
# Check current version
node --version

# If less than v18, switch to v20
nvm use 20

# Or set default
nvm alias default 20
```

The project includes a `.nvmrc` file (v20.19.5), so the dev script will automatically use the correct version if NVM is installed.

### Android SDK (for adb reverse)

The `adb` command must be available for USB device forwarding. Options:

**Option 1: Let the script find it (Automatic)**
- The script automatically adds `~/Android/Sdk/platform-tools` to PATH if it exists

**Option 2: Add to your shell profile (Permanent)**
```bash
# Add to ~/.bashrc or ~/.zshrc
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

## NPM Scripts Configuration

### 1. Configure Node.js Interpreter

**IMPORTANT:** Configure PHPStorm to use the correct Node.js version (20.x).

1. Open **Settings → Languages & Frameworks → Node.js**
2. Set **Node interpreter** to your NVM Node 20 installation:
   - Click **...** next to Node interpreter field
   - Navigate to: `/home/sebastian-tarka/.nvm/versions/node/v20.19.5/bin/node`
   - Or use **Add** → **Add from NVM** to automatically detect NVM installations
3. Click **OK**

This ensures all npm scripts use Node.js 20, not the system default (v17).

### 2. Configure Working Directory

When creating Run Configurations for npm scripts, you need to set the correct working directory.

**Steps:**

1. Open **Run → Edit Configurations...**
2. Click **+** (Add New Configuration) → **npm**
3. Configure as follows:

```
Name: Start with adb
package.json: /home/sebastian-tarka/PhpstormProjects/racefy_mobile.io/RacefyApp/package.json
Command: run
Scripts: start:adb
```

**IMPORTANT:** The working directory will automatically be set to the directory containing `package.json` (i.e., `RacefyApp/`).

### 2. Alternative Configurations

You can create additional run configurations for different scenarios:

#### Standard Start (without adb reverse)
```
Name: Start Expo
package.json: .../RacefyApp/package.json
Command: run
Scripts: start
```

#### Android Build
```
Name: Run Android
package.json: .../RacefyApp/package.json
Command: run
Scripts: android
```

#### iOS Build
```
Name: Run iOS
package.json: .../RacefyApp/package.json
Command: run
Scripts: ios
```

## Manual Shell Configuration

If you prefer to run commands directly in the terminal:

### 1. Configure Terminal Working Directory

1. Open **Settings → Tools → Terminal**
2. Set **Start directory** to:
   ```
   /home/sebastian-tarka/PhpstormProjects/racefy_mobile.io/RacefyApp
   ```

This ensures all terminal sessions start in the RacefyApp directory.

### 2. Or Use Shell Command

Create a **Shell Script** run configuration:

1. Open **Run → Edit Configurations...**
2. Click **+** → **Shell Script**
3. Configure:

```
Name: Start with adb (Shell)
Script path: /home/sebastian-tarka/PhpstormProjects/racefy_mobile.io/RacefyApp/scripts/dev-with-adb.sh
Working directory: /home/sebastian-tarka/PhpstormProjects/racefy_mobile.io/RacefyApp
```

## Keyboard Shortcuts

Assign keyboard shortcuts to your run configurations:

1. Go to **Settings → Keymap**
2. Search for your run configuration name (e.g., "Start with adb")
3. Right-click → **Add Keyboard Shortcut**
4. Assign your preferred shortcut (e.g., `Ctrl+Shift+R`)

## Troubleshooting

### "ReadableStream is not defined" or "ReferenceError"

This indicates Node.js version is too old (< v18). Solutions:

**Option 1: Configure PHPStorm Node interpreter (Recommended)**
1. Go to **Settings → Languages & Frameworks → Node.js**
2. Set interpreter to NVM's Node 20:
   `/home/sebastian-tarka/.nvm/versions/node/v20.19.5/bin/node`

**Option 2: Set NVM default version**
```bash
nvm alias default 20
nvm use default
```

**Option 3: Manually switch before running**
```bash
nvm use 20
cd RacefyApp
npm run start:adb
```

The dev script now automatically loads NVM and uses the correct version from `.nvmrc`.

### "No such file or directory: ../.env"

This means the script is running from the wrong directory. Make sure:
- NPM run configuration has the correct `package.json` path
- Shell script run configuration has the correct working directory
- Terminal start directory is set to `RacefyApp/`

### "adb: command not found"

Android SDK platform tools are not in your PATH. Options:

**Option 1: Add to PATH (Recommended)**
```bash
# Add to ~/.bashrc or ~/.zshrc
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

**Option 2: Create symlink**
```bash
sudo ln -s $HOME/Android/Sdk/platform-tools/adb /usr/local/bin/adb
```

**Option 3: Use full path in script**
Edit `scripts/dev-with-adb.sh` and replace `adb` commands with full path:
```bash
$HOME/Android/Sdk/platform-tools/adb reverse tcp:8070 tcp:8070
```

### "Need to install the following packages: expo@x.x.x"

This is normal `npx` behavior - it checks for newer versions. Options:

**Option 1: Just press 'y'** - It will use the locally installed version

**Option 2: Use the updated script** - The script now uses `npm start` instead of `npx expo start`, which skips the version check

**Option 3: Add `--yes` flag**
```bash
npx --yes expo start
```

### Script runs but Expo doesn't start

Check the console output for errors. Common issues:
- Port 8081 (Metro bundler) is already in use
- Port 8070 (API) is not accessible
- Node version mismatch (requires Node 18+)

Kill the blocking process:
```bash
# Find process using port 8081
lsof -i :8081

# Kill it
kill -9 <PID>
```

## Recommended Setup

For the best experience:

1. **Create npm configurations** for all scripts (`start:adb`, `start`, `android`, `ios`)
2. **Set terminal working directory** to `RacefyApp/`
3. **Add adb to PATH** for system-wide access
4. **Assign keyboard shortcuts** for frequently used commands

## Example Full Setup

**Run Configurations:**
- `Ctrl+Shift+D` → Start with adb
- `Ctrl+Shift+A` → Run Android
- `Ctrl+Shift+I` → Run iOS

**Terminal:**
- Starts in `RacefyApp/` directory
- Can run `npm run <script>` directly

**Environment:**
- `adb` accessible from any terminal
- `.env` configured with `API_LOCAL_IP=localhost`
- USB debugging enabled on device