/**
 * What a log entry may contain.
 *
 * Logs are kept in AsyncStorage, written to the device console in staging
 * builds, and can be sent to the server from Settings. So before anything is
 * stored or printed it goes through here:
 *
 *  - secrets (tokens, passwords, keys) are removed, by field name and by shape;
 *  - contact data (e-mail, phone, address) is replaced by its length;
 *  - coordinates are rounded to about a kilometre — enough to tell that the GPS
 *    is moving and roughly where, not enough to find someone's home.
 *
 * Field-name rules only see what is passed as context. Do not put a person's
 * name or a free-text field (bio, message, comment) into a log.
 */

/** Fields redacted whole, whatever they hold (case-insensitive, substring). */
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /credential/i,
  /authorization/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /bearer/i,
  /cookie/i,
  /session/i,
];

/** Fields that may hold contact data: the value goes, its length stays. */
const PII_PATTERNS = [/email/i, /phone/i, /address/i];

/**
 * A single coordinate: `lat`, `lng`, `lon`, `latitude`, `longitude`, alone or as
 * the end of a longer name (`start_lat`, `lastLng`). Case decides where a word
 * starts, so `flat` and `plan` are not coordinates.
 */
const COORDINATE_KEY =
  /(?:^|_)(?:lat|lng|lon|latitude|longitude)$|(?:Lat|Lng|Lon|Latitude|Longitude)$/;

/** Lists of coordinates: GeoJSON `coordinates`, a map `center`, a bounding box. */
const COORDINATE_LIST_KEY = /^(?:coordinates?|center|bbox|bounds)$/i;

/** Two decimal places: about 1.1 km north–south, less east–west. */
const COORDINATE_PRECISION = 100;

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 10;

interface SanitizeOptions {
  /**
   * Keep coordinates as they are. Defaults to development builds, where the
   * logs are the developer's own and exact positions are what is being debugged.
   */
  preciseCoordinates?: boolean;
}

function coarsen(value: number): number {
  return Math.round(value * COORDINATE_PRECISION) / COORDINATE_PRECISION;
}

/** Rounds every number in a (possibly nested) coordinate list; drops anything else. */
function coarsenList(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return '[MAX_DEPTH]';
  if (typeof value === 'number') return coarsen(value);
  if (Array.isArray(value)) return value.map((item) => coarsenList(item, depth + 1));
  return REDACTED;
}

function sanitizeValue(key: string, value: any, depth: number, precise: boolean): any {
  // Prevent infinite recursion
  if (depth > MAX_DEPTH) return '[MAX_DEPTH]';

  if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(key))) {
    return REDACTED;
  }

  if (typeof value === 'string' && PII_PATTERNS.some((pattern) => pattern.test(key))) {
    return `[REDACTED:${value.length} chars]`;
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (!precise) {
    if (COORDINATE_KEY.test(key)) {
      return typeof value === 'number' ? coarsen(value) : REDACTED;
    }
    if (COORDINATE_LIST_KEY.test(key) && Array.isArray(value)) {
      return coarsenList(value, depth + 1);
    }
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeString(value.message),
      stack: value.stack ? '[STACK_TRACE]' : undefined,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeValue(String(index), item, depth + 1, precise));
  }

  if (typeof value === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      sanitized[k] = sanitizeValue(k, v, depth + 1, precise);
    }
    return sanitized;
  }

  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  return value;
}

/**
 * Removes secrets and e-mail addresses from free text: a message, an error
 * text, a URL. Works by shape, so it also catches what ends up under a harmless
 * field name.
 */
export function sanitizeString(str: string): string {
  return (
    str
      // `Authorization: Bearer …` — everything up to the next separator, so an
      // API token (`12|AbC…`) does not leave its second half behind.
      .replace(/Bearer\s+[^\s"',;]+/gi, 'Bearer [REDACTED]')
      // Laravel Sanctum personal access token: `<id>|<40+ characters>`.
      .replace(/\b\d+\|[A-Za-z0-9]{40,}\b/g, '[TOKEN_REDACTED]')
      // JWT (xxx.yyy.zzz)
      .replace(/eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g, '[JWT_REDACTED]')
      .replace(/api[_-]?key[=:]\s*["']?[A-Za-z0-9\-_]+["']?/gi, 'api_key=[REDACTED]')
      // Secrets carried in a URL: password reset and sign-in links, signed URLs.
      .replace(
        /([?&](?:token|access_token|signature|code|key|password)=)[^&\s#"']+/gi,
        `$1${REDACTED}`,
      )
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g, '[EMAIL]')
  );
}

/** The context of a log call, safe to store, print and send. */
export function sanitizeContext(
  context: Record<string, any> | undefined,
  options: SanitizeOptions = {},
): Record<string, any> | undefined {
  if (!context) return undefined;
  const precise = options.preciseCoordinates ?? __DEV__;
  return sanitizeValue('root', context, 0, precise) as Record<string, any>;
}
