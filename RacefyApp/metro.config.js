const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Fix: diff@5.0.0 uses a deprecated "./" exports wildcard that Metro can't resolve.
// Its internal require("./convert/dmp") fails because Metro checks the exports map.
// Redirect "diff" to its browser bundle (single file, no sub-requires).
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'diff') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/diff/dist/diff.js'),
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
