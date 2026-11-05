/**
 * Transport security that must not depend on configuration being right.
 *
 * The API URL comes from the build (`eas.json` → `app.config.ts`) and the
 * realtime settings from the server (`/config/app`). Both are correct today;
 * these checks make sure a wrong value fails loudly instead of sending the
 * bearer token and GPS tracks in cleartext.
 */

/**
 * The API base URL of a release build, or an error when it is not `https://`.
 * Development builds talk to a local API over plain http and pass unchecked.
 */
export function assertSecureApiUrl(url: string, isDev: boolean = __DEV__): string {
  if (!isDev && !/^https:\/\/[^/?#]/i.test(url)) {
    throw new Error(
      `Refusing to start: the API URL of a release build must be https (got "${url}")`,
    );
  }
  return url;
}

/**
 * Whether the Reverb socket uses TLS. A release build always does; the `scheme`
 * the server sends can only relax it in development (a local Reverb over `ws`).
 * With a server that cannot do TLS the connection fails and the live screen
 * falls back to polling — over https.
 */
export function reverbUsesTls(scheme: string | undefined, isDev: boolean = __DEV__): boolean {
  return !isDev || scheme === 'https';
}
