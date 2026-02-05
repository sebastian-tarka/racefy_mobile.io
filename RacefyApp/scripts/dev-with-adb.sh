#!/bin/bash
# Development script with adb reverse for local API access
# This allows physical Android devices to access localhost via USB

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Determine script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Change to project root (RacefyApp directory)
cd "$PROJECT_ROOT"

echo -e "${GREEN}Working directory: $(pwd)${NC}"

# Load NVM if available (for correct Node.js version)
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  export NVM_DIR="$HOME/.nvm"
  source "$NVM_DIR/nvm.sh"

  # Try to use .nvmrc if it exists, otherwise use latest LTS
  if [ -f ".nvmrc" ]; then
    nvm use
  else
    # Use Node 20 (or latest available)
    nvm use 20 2>/dev/null || nvm use --lts 2>/dev/null
  fi

  echo -e "${GREEN}Using Node.js $(node --version)${NC}"
else
  # Check if current Node version is sufficient
  NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18+ required (current: $(node --version))${NC}"
    echo "Please install Node.js 18+ or NVM"
    exit 1
  fi
fi

# Check if .env exists
if [ ! -f ".env" ]; then
  echo -e "${RED}Error: .env file not found in $(pwd)${NC}"
  echo "Please create .env file from .env.example"
  exit 1
fi

# Get port from .env
PORT=$(grep API_LOCAL_PORT .env | cut -d '=' -f2)
if [ -z "$PORT" ]; then
  PORT=8070  # Default port
fi

echo -e "${GREEN}Setting up adb reverse for port ${PORT}...${NC}"

# Add Android SDK to PATH if it exists but adb is not in PATH
if ! command -v adb &> /dev/null; then
  # Try common Android SDK locations
  if [ -d "$HOME/Android/Sdk/platform-tools" ]; then
    export PATH="$PATH:$HOME/Android/Sdk/platform-tools"
    echo -e "${GREEN}Added Android SDK to PATH${NC}"
  elif [ -d "$HOME/Library/Android/sdk/platform-tools" ]; then
    export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"
    echo -e "${GREEN}Added Android SDK to PATH${NC}"
  fi
fi

# Check if adb is available (after potentially adding to PATH)
if ! command -v adb &> /dev/null; then
  echo -e "${YELLOW}Warning: adb command not found${NC}"
  echo "Please install Android SDK platform tools or add them to PATH"
  echo ""
  echo "Continuing without adb reverse (will only work with emulator)..."
else
  # Check if device is connected
  if ! adb devices | grep -q 'device$'; then
    echo -e "${YELLOW}Warning: No Android device detected via adb${NC}"
    echo "Please connect your device via USB and enable USB debugging"
    echo ""
    echo "Continuing anyway (will work with emulator)..."
  else
    # Setup adb reverse
    echo "Running: adb reverse tcp:${PORT} tcp:${PORT}"
    adb reverse tcp:${PORT} tcp:${PORT}

    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✓ adb reverse configured successfully${NC}"
      echo "Your device can now access http://localhost:${PORT}"
    else
      echo -e "${YELLOW}Failed to setup adb reverse${NC}"
    fi
  fi
fi

echo ""
echo -e "${GREEN}Starting Expo dev server...${NC}"
echo ""

# Start Expo using npm script (avoids npx version checks)
npm start