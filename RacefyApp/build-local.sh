#!/bin/bash
# Set Android/Java environment
export JAVA_HOME=$HOME/android-studio/jbr
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$JAVA_HOME/bin

# Load .env file
set -a
source .env
set +a

# Set Mapbox download token for Gradle
export MAPBOX_DOWNLOADS_TOKEN=$RNMAPBOX_MAPS_DOWNLOAD_TOKEN

# Run local build with env vars
eas build --platform android --profile staging --local
