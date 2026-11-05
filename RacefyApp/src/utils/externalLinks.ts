import { Linking } from 'react-native';
import { logger } from '../services/logger';

/**
 * Opening links that did not come from the app's own code: URLs sent by the API
 * (sponsor and affiliate links, attachments, the update target) and URLs typed by
 * users (exercise videos).
 *
 * `Linking.openURL` hands the string to the OS as it is, and the OS will happily
 * follow `tel:`, `sms:`, `intent:` or another app's scheme — including our own
 * `racefy://`. So everything goes through here, and only web links pass, plus
 * the schemes a caller names for its one purpose.
 */

/** `mailto:` and the like — given per call site, never by default. */
type ExtraScheme = `${string}:`;

/**
 * Where an app update may lead besides a web page: the stores, TestFlight, and
 * the over-the-air install of an ad hoc iOS build. The URL is set by an admin
 * (Admin → App version) and reaches the app in `/config/app`.
 */
const UPDATE_SCHEMES: ExtraScheme[] = ['market:', 'itms-apps:', 'itms-services:', 'itms-beta:'];

const SCHEME = /^([a-z][a-z0-9+.-]*):/i;
// A web URL needs an authority: `https:evil` and `https:///x` are not ones.
const WEB_URL = /^https?:\/\/[^/?#]/i;
// Whitespace or a control character anywhere means it is not one URL.
const UNSAFE_CHARS = /[\s\u0000-\u001f\u007f]/;

/**
 * The URL to hand to the OS, or `null` when it must not be opened.
 *
 * - `https://…` passes as it is;
 * - `http://…` is upgraded to `https://` in release builds — a cleartext link is
 *   a typo or an old habit, and every host we link to speaks TLS. Development
 *   builds keep it, because the local API serves files over plain http;
 * - a scheme listed in `extraSchemes` passes as it is;
 * - anything else — no scheme, another scheme, whitespace inside — is refused.
 */
export function safeExternalUrl(
  raw: string | null | undefined,
  extraSchemes: readonly ExtraScheme[] = [],
  isDev: boolean = __DEV__,
): string | null {
  if (typeof raw !== 'string') return null;
  const url = raw.trim();
  if (!url || UNSAFE_CHARS.test(url)) return null;

  const scheme = SCHEME.exec(url)?.[1].toLowerCase();
  if (!scheme) return null;

  if (scheme === 'https' || scheme === 'http') {
    if (!WEB_URL.test(url)) return null;
    if (scheme === 'http' && !isDev) return `https${url.slice('http'.length)}`;
    return url;
  }
  return extraSchemes.includes(`${scheme}:`) ? url : null;
}

/**
 * Open a link from the API or from a user. Resolves to `false` when the link
 * was refused or the OS could not open it — the caller decides what to tell the
 * user. Never throws.
 *
 * Not gated on `Linking.canOpenURL`: it answers "no" for anything the manifest
 * does not declare (Android package visibility, iOS `LSApplicationQueriesSchemes`)
 * even when opening would work, so it turned working links into dead buttons.
 */
export async function openExternalUrl(
  raw: string | null | undefined,
  extraSchemes: readonly ExtraScheme[] = [],
): Promise<boolean> {
  const url = safeExternalUrl(raw, extraSchemes);
  if (!url) {
    // Scheme only: the rest may be a signed URL or carry a token.
    logger.warn('general', 'Refused to open an external link', {
      scheme: typeof raw === 'string' ? (SCHEME.exec(raw.trim())?.[1] ?? null) : null,
    });
    return false;
  }
  try {
    await Linking.openURL(url);
    return true;
  } catch (error) {
    logger.warn('general', 'Could not open an external link', { error });
    return false;
  }
}

/** Open the update target from `/config/app` — a store, TestFlight, or a download page. */
export function openUpdateUrl(raw: string | null | undefined): Promise<boolean> {
  return openExternalUrl(raw, UPDATE_SCHEMES);
}
