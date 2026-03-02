const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Expo config plugin to set android:largeHeap="true" on the application tag.
 * This increases the Java heap limit from ~256MB to ~512MB on most devices,
 * preventing OutOfMemoryError crashes on media-heavy screens.
 */
module.exports = function withLargeHeap(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (application) {
      application.$['android:largeHeap'] = 'true';
    }
    return config;
  });
};