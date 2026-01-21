#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const APP_ENV = process.env.APP_ENV || 'development';

console.log(`📱 Selecting google-services.json for environment: ${APP_ENV}`);

let sourceFile;
switch (APP_ENV) {
  case 'development':
    sourceFile = 'google-services-dev.json';
    break;
  case 'staging':
    sourceFile = 'google-services-staging.json';
    break;
  case 'production':
    sourceFile = 'google-services-production.json';
    break;
  default:
    console.warn(`⚠️  Unknown APP_ENV: ${APP_ENV}, defaulting to development`);
    sourceFile = 'google-services-dev.json';
}

const rootDir = process.cwd();
const sourcePath = path.join(rootDir, sourceFile);
const targetPath = path.join(rootDir, 'google-services.json');
const androidTargetPath = path.join(rootDir, 'android', 'app', 'google-services.json');

// Check if source file exists
if (!fs.existsSync(sourcePath)) {
  console.error(`❌ Error: ${sourceFile} not found!`);
  process.exit(1);
}

// Copy to root
console.log(`✅ Copying ${sourceFile} to google-services.json`);
fs.copyFileSync(sourcePath, targetPath);

// Copy to android/app if directory exists
if (fs.existsSync(path.join(rootDir, 'android', 'app'))) {
  console.log(`✅ Copying to android/app/google-services.json`);
  fs.copyFileSync(sourcePath, androidTargetPath);
}

console.log(`✅ Firebase configuration ready for ${APP_ENV}`);
