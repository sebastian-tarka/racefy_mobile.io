const { withGradleProperties } = require('expo/config-plugins');

/**
 * Expo config plugin to give the Gradle daemon more heap.
 * The template's -Xmx2048m is not enough once R8 is enabled (expo-build-properties
 * `enableMinifyInReleaseBuilds`): :app:minifyReleaseWithR8 dies with
 * "OutOfMemoryError: Java heap space". This is a build-machine setting, not the app's.
 */
const JVM_ARGS = '-Xmx4096m -XX:MaxMetaspaceSize=1024m';

module.exports = function withGradleHeap(config) {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;
    const existing = props.find((p) => p.type === 'property' && p.key === 'org.gradle.jvmargs');
    if (existing) existing.value = JVM_ARGS;
    else props.push({ type: 'property', key: 'org.gradle.jvmargs', value: JVM_ARGS });
    return config;
  });
};
