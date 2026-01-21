#!/bin/bash
# Script to select the correct google-services.json based on APP_ENV

set -e

APP_ENV=${APP_ENV:-development}

echo "📱 Selecting google-services.json for environment: $APP_ENV"

case "$APP_ENV" in
  "development")
    SOURCE_FILE="google-services-dev.json"
    ;;
  "staging")
    SOURCE_FILE="google-services-staging.json"
    ;;
  "production")
    SOURCE_FILE="google-services-production.json"
    ;;
  *)
    echo "⚠️  Unknown APP_ENV: $APP_ENV, defaulting to development"
    SOURCE_FILE="google-services-dev.json"
    ;;
esac

if [ ! -f "$SOURCE_FILE" ]; then
  echo "❌ Error: $SOURCE_FILE not found!"
  exit 1
fi

echo "✅ Copying $SOURCE_FILE to google-services.json"
cp "$SOURCE_FILE" google-services.json

if [ -d "android/app" ]; then
  echo "✅ Copying to android/app/google-services.json"
  cp "$SOURCE_FILE" android/app/google-services.json
fi

echo "✅ Firebase configuration ready for $APP_ENV"