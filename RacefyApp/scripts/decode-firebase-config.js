#!/usr/bin/env node

/**
 * Decodes Firebase config files from base64 environment variables.
 * Used as EAS Build prebuild hook to restore google-services.json
 * and GoogleService-Info.plist from EAS secrets.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const configs = [
  {
    envVar: 'GOOGLE_SERVICES_JSON',
    outputFile: 'google-services.json',
    description: 'Android Firebase config',
  },
  {
    envVar: 'GOOGLE_SERVICE_INFO_PLIST',
    outputFile: 'GoogleService-Info.plist',
    description: 'iOS Firebase config',
  },
];

let decoded = 0;

for (const config of configs) {
  const base64Value = process.env[config.envVar];

  if (!base64Value) {
    console.log(`⚠️  ${config.envVar} not set, skipping ${config.description}`);
    continue;
  }

  const outputPath = path.join(rootDir, config.outputFile);
  const content = Buffer.from(base64Value, 'base64').toString('utf-8');
  fs.writeFileSync(outputPath, content, 'utf-8');
  console.log(`✅ Decoded ${config.envVar} → ${config.outputFile}`);
  decoded++;
}

if (decoded === 0) {
  console.log('⚠️  No Firebase config env vars found. For local dev, place files manually.');
} else {
  console.log(`✅ Firebase configuration ready (${decoded} files decoded)`);
}