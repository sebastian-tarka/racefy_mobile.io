// The SQLite suites (trackingDb, pointsUploader, finishSync…) run against a real
// better-sqlite3, a native module compiled for one Node ABI. Under another Node
// version it fails to load, trackingDb swallows the error, and the suites fail
// with plain assertion errors (`Received: null`) that look like a regression.
// Fail the whole run up front with the actual cause instead.
const fs = require('fs');
const path = require('path');

module.exports = (globalConfig) => {
  try {
    const Database = require('better-sqlite3');
    new Database(':memory:').close();
  } catch (error) {
    const wanted = fs.readFileSync(path.join(globalConfig.rootDir, '.nvmrc'), 'utf8').trim();
    throw new Error(
      `better-sqlite3 does not load under Node ${process.version} (.nvmrc wants ${wanted}).\n` +
        'Switch with `nvm use`, or rebuild for this Node with `npm rebuild better-sqlite3`.\n' +
        `Original error: ${error.message}`,
    );
  }
};
