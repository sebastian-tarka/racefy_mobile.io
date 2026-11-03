// The jest-expo environment, plus one thing: a test file can run as a phone in
// another time zone by declaring it in its docblock:
//
//   /** @time-zone Pacific/Auckland */
//
// Setting process.env.TZ on the real process object resets V8's date cache, so
// every Date in that file (construction, getters, Intl) follows the zone. The
// zone is restored in teardown, because Jest reuses a worker for later files.
// (A custom tag rather than @jest-environment-options, so knip does not read
// the environment path as a dependency.)
const ReactNativeEnvironment = require('react-native/jest/react-native-env.js');

class TimeZoneEnvironment extends ReactNativeEnvironment {
  constructor(config, context) {
    super(config, context);
    this.previousTz = process.env.TZ;
    const tz = context.docblockPragmas?.['time-zone'];
    if (typeof tz === 'string' && tz.trim()) process.env.TZ = tz.trim();
  }

  async teardown() {
    if (this.previousTz === undefined) delete process.env.TZ;
    else process.env.TZ = this.previousTz;
    await super.teardown();
  }
}

module.exports = TimeZoneEnvironment;
