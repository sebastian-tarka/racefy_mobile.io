#!/usr/bin/env node

/**
 * App Store Connect API — Create subscription products and set regional prices.
 *
 * Usage:
 *   node scripts/setup-appstore-subscriptions.mjs [--dry-run] [--prices-only]
 *
 * Flags:
 *   --dry-run      Show what would be done without making changes
 *   --prices-only  Skip creating group/subscriptions, only set prices (if products already exist)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { importPKCS8, SignJWT } from 'jose';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG = {
  issuerID: '848f5175-90a7-47f3-9cd7-99474792043f',
  keyID: 'S65JL3K3TG',
  keyPath: resolve(__dirname, '..', 'AuthKey_S65JL3K3TG.p8'),
  appAppleID: '6757979729',
  baseURL: 'https://api.appstoreconnect.apple.com',
};

const DRY_RUN = process.argv.includes('--dry-run');
const PRICES_ONLY = process.argv.includes('--prices-only');

// ─── Subscription products ────────────────────────────────────────────────────

const SUBSCRIPTION_GROUP_NAME = 'Racefy Premium';

const PRODUCTS = [
  {
    productId: 'racefy_plus_monthly',
    name: 'Racefy Plus Monthly',
    duration: 'ONE_MONTH',
    groupLevel: 2, // lower tier (Plus)
    prices: {
      US: { price: '6.99', currency: 'USD' },
      PL: { price: '14.99', currency: 'PLN' },
      CA: { price: '6.99', currency: 'USD' },
      GB: { price: '5.99', currency: 'GBP' },
      AU: { price: '8.99', currency: 'AUD' },
      NZ: { price: '8.99', currency: 'AUD' },
      CH: { price: '8.99', currency: 'CHF' },
      // Western Europe EUR
      DE: { price: '6.99', currency: 'EUR' },
      FR: { price: '6.99', currency: 'EUR' },
      NL: { price: '6.99', currency: 'EUR' },
      BE: { price: '6.99', currency: 'EUR' },
      AT: { price: '6.99', currency: 'EUR' },
      IE: { price: '6.99', currency: 'EUR' },
      FI: { price: '6.99', currency: 'EUR' },
      LU: { price: '6.99', currency: 'EUR' },
      // Southern Europe EUR
      ES: { price: '4.99', currency: 'EUR' },
      PT: { price: '4.99', currency: 'EUR' },
      IT: { price: '4.99', currency: 'EUR' },
      GR: { price: '4.99', currency: 'EUR' },
      // Eastern Europe EUR
      CZ: { price: '3.99', currency: 'EUR' },
      SK: { price: '3.99', currency: 'EUR' },
      HU: { price: '3.99', currency: 'EUR' },
      RO: { price: '3.99', currency: 'EUR' },
      BG: { price: '3.99', currency: 'EUR' },
      HR: { price: '3.99', currency: 'EUR' },
      SI: { price: '3.99', currency: 'EUR' },
      LT: { price: '3.99', currency: 'EUR' },
      LV: { price: '3.99', currency: 'EUR' },
      EE: { price: '3.99', currency: 'EUR' },
      // Scandinavia EUR
      SE: { price: '7.99', currency: 'EUR' },
      NO: { price: '7.99', currency: 'EUR' },
      DK: { price: '7.99', currency: 'EUR' },
      // Latin America USD
      MX: { price: '2.99', currency: 'USD' },
      AR: { price: '2.99', currency: 'USD' },
      CO: { price: '2.99', currency: 'USD' },
      CL: { price: '2.99', currency: 'USD' },
      PE: { price: '2.99', currency: 'USD' },
      BR: { price: '2.99', currency: 'USD' },
      EC: { price: '2.99', currency: 'USD' },
      UY: { price: '2.99', currency: 'USD' },
      TR: { price: '2.99', currency: 'USD' },
      // Asia USD
      IN: { price: '2.49', currency: 'USD' },
      ID: { price: '2.49', currency: 'USD' },
      PH: { price: '2.49', currency: 'USD' },
      VN: { price: '2.49', currency: 'USD' },
      TH: { price: '2.49', currency: 'USD' },
    },
  },
  {
    productId: 'racefy_plus_yearly',
    name: 'Racefy Plus Yearly',
    duration: 'ONE_YEAR',
    groupLevel: 2,
    prices: {
      US: { price: '55.99', currency: 'USD' },
      PL: { price: '119.99', currency: 'PLN' },
      CA: { price: '55.99', currency: 'USD' },
      GB: { price: '47.99', currency: 'GBP' },
      AU: { price: '71.99', currency: 'AUD' },
      NZ: { price: '71.99', currency: 'AUD' },
      CH: { price: '71.99', currency: 'CHF' },
      DE: { price: '55.99', currency: 'EUR' },
      FR: { price: '55.99', currency: 'EUR' },
      NL: { price: '55.99', currency: 'EUR' },
      BE: { price: '55.99', currency: 'EUR' },
      AT: { price: '55.99', currency: 'EUR' },
      IE: { price: '55.99', currency: 'EUR' },
      FI: { price: '55.99', currency: 'EUR' },
      LU: { price: '55.99', currency: 'EUR' },
      ES: { price: '39.99', currency: 'EUR' },
      PT: { price: '39.99', currency: 'EUR' },
      IT: { price: '39.99', currency: 'EUR' },
      GR: { price: '39.99', currency: 'EUR' },
      CZ: { price: '31.99', currency: 'EUR' },
      SK: { price: '31.99', currency: 'EUR' },
      HU: { price: '31.99', currency: 'EUR' },
      RO: { price: '31.99', currency: 'EUR' },
      BG: { price: '31.99', currency: 'EUR' },
      HR: { price: '31.99', currency: 'EUR' },
      SI: { price: '31.99', currency: 'EUR' },
      LT: { price: '31.99', currency: 'EUR' },
      LV: { price: '31.99', currency: 'EUR' },
      EE: { price: '31.99', currency: 'EUR' },
      SE: { price: '63.99', currency: 'EUR' },
      NO: { price: '63.99', currency: 'EUR' },
      DK: { price: '63.99', currency: 'EUR' },
      MX: { price: '23.99', currency: 'USD' },
      AR: { price: '23.99', currency: 'USD' },
      CO: { price: '23.99', currency: 'USD' },
      CL: { price: '23.99', currency: 'USD' },
      PE: { price: '23.99', currency: 'USD' },
      BR: { price: '23.99', currency: 'USD' },
      EC: { price: '23.99', currency: 'USD' },
      UY: { price: '23.99', currency: 'USD' },
      TR: { price: '23.99', currency: 'USD' },
      IN: { price: '19.99', currency: 'USD' },
      ID: { price: '19.99', currency: 'USD' },
      PH: { price: '19.99', currency: 'USD' },
      VN: { price: '19.99', currency: 'USD' },
      TH: { price: '19.99', currency: 'USD' },
    },
  },
  {
    productId: 'racefy_pro_monthly',
    name: 'Racefy Pro Monthly',
    duration: 'ONE_MONTH',
    groupLevel: 1, // higher tier (Pro)
    prices: {
      US: { price: '13.99', currency: 'USD' },
      PL: { price: '29.99', currency: 'PLN' },
      CA: { price: '13.99', currency: 'USD' },
      GB: { price: '11.99', currency: 'GBP' },
      AU: { price: '17.99', currency: 'AUD' },
      NZ: { price: '17.99', currency: 'AUD' },
      CH: { price: '17.99', currency: 'CHF' },
      DE: { price: '13.99', currency: 'EUR' },
      FR: { price: '13.99', currency: 'EUR' },
      NL: { price: '13.99', currency: 'EUR' },
      BE: { price: '13.99', currency: 'EUR' },
      AT: { price: '13.99', currency: 'EUR' },
      IE: { price: '13.99', currency: 'EUR' },
      FI: { price: '13.99', currency: 'EUR' },
      LU: { price: '13.99', currency: 'EUR' },
      ES: { price: '9.99', currency: 'EUR' },
      PT: { price: '9.99', currency: 'EUR' },
      IT: { price: '9.99', currency: 'EUR' },
      GR: { price: '9.99', currency: 'EUR' },
      CZ: { price: '7.99', currency: 'EUR' },
      SK: { price: '7.99', currency: 'EUR' },
      HU: { price: '7.99', currency: 'EUR' },
      RO: { price: '7.99', currency: 'EUR' },
      BG: { price: '7.99', currency: 'EUR' },
      HR: { price: '7.99', currency: 'EUR' },
      SI: { price: '7.99', currency: 'EUR' },
      LT: { price: '7.99', currency: 'EUR' },
      LV: { price: '7.99', currency: 'EUR' },
      EE: { price: '7.99', currency: 'EUR' },
      SE: { price: '15.99', currency: 'EUR' },
      NO: { price: '15.99', currency: 'EUR' },
      DK: { price: '15.99', currency: 'EUR' },
      MX: { price: '5.99', currency: 'USD' },
      AR: { price: '5.99', currency: 'USD' },
      CO: { price: '5.99', currency: 'USD' },
      CL: { price: '5.99', currency: 'USD' },
      PE: { price: '5.99', currency: 'USD' },
      BR: { price: '5.99', currency: 'USD' },
      EC: { price: '5.99', currency: 'USD' },
      UY: { price: '5.99', currency: 'USD' },
      TR: { price: '5.99', currency: 'USD' },
      IN: { price: '4.99', currency: 'USD' },
      ID: { price: '4.99', currency: 'USD' },
      PH: { price: '4.99', currency: 'USD' },
      VN: { price: '4.99', currency: 'USD' },
      TH: { price: '4.99', currency: 'USD' },
    },
  },
  {
    productId: 'racefy_pro_yearly',
    name: 'Racefy Pro Yearly',
    duration: 'ONE_YEAR',
    groupLevel: 1,
    prices: {
      US: { price: '111.99', currency: 'USD' },
      PL: { price: '239.99', currency: 'PLN' },
      CA: { price: '111.99', currency: 'USD' },
      GB: { price: '95.99', currency: 'GBP' },
      AU: { price: '143.99', currency: 'AUD' },
      NZ: { price: '143.99', currency: 'AUD' },
      CH: { price: '143.99', currency: 'CHF' },
      DE: { price: '111.99', currency: 'EUR' },
      FR: { price: '111.99', currency: 'EUR' },
      NL: { price: '111.99', currency: 'EUR' },
      BE: { price: '111.99', currency: 'EUR' },
      AT: { price: '111.99', currency: 'EUR' },
      IE: { price: '111.99', currency: 'EUR' },
      FI: { price: '111.99', currency: 'EUR' },
      LU: { price: '111.99', currency: 'EUR' },
      ES: { price: '79.99', currency: 'EUR' },
      PT: { price: '79.99', currency: 'EUR' },
      IT: { price: '79.99', currency: 'EUR' },
      GR: { price: '79.99', currency: 'EUR' },
      CZ: { price: '63.99', currency: 'EUR' },
      SK: { price: '63.99', currency: 'EUR' },
      HU: { price: '63.99', currency: 'EUR' },
      RO: { price: '63.99', currency: 'EUR' },
      BG: { price: '63.99', currency: 'EUR' },
      HR: { price: '63.99', currency: 'EUR' },
      SI: { price: '63.99', currency: 'EUR' },
      LT: { price: '63.99', currency: 'EUR' },
      LV: { price: '63.99', currency: 'EUR' },
      EE: { price: '63.99', currency: 'EUR' },
      SE: { price: '127.99', currency: 'EUR' },
      NO: { price: '127.99', currency: 'EUR' },
      DK: { price: '127.99', currency: 'EUR' },
      MX: { price: '47.99', currency: 'USD' },
      AR: { price: '47.99', currency: 'USD' },
      CO: { price: '47.99', currency: 'USD' },
      CL: { price: '47.99', currency: 'USD' },
      PE: { price: '47.99', currency: 'USD' },
      BR: { price: '47.99', currency: 'USD' },
      EC: { price: '47.99', currency: 'USD' },
      UY: { price: '47.99', currency: 'USD' },
      TR: { price: '47.99', currency: 'USD' },
      IN: { price: '39.99', currency: 'USD' },
      ID: { price: '39.99', currency: 'USD' },
      PH: { price: '39.99', currency: 'USD' },
      VN: { price: '39.99', currency: 'USD' },
      TH: { price: '39.99', currency: 'USD' },
    },
  },
];

// ─── JWT Token Generation ─────────────────────────────────────────────────────

let _privateKey = null;

async function getPrivateKey() {
  if (!_privateKey) {
    const pem = readFileSync(CONFIG.keyPath, 'utf8');
    _privateKey = await importPKCS8(pem, 'ES256');
  }
  return _privateKey;
}

async function generateJWT() {
  const key = await getPrivateKey();
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: CONFIG.keyID, typ: 'JWT' })
    .setIssuer(CONFIG.issuerID)
    .setIssuedAt()
    .setExpirationTime('20m')
    .setAudience('appstoreconnect-v1')
    .sign(key);
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function api(method, path, body = null) {
  const token = await generateJWT();
  const url = `${CONFIG.baseURL}${path}`;
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();

  if (!res.ok) {
    console.error(`❌ ${method} ${path} → ${res.status}`);
    console.error(text);
    throw new Error(`API error ${res.status}: ${path}`);
  }

  return text ? JSON.parse(text) : null;
}

async function apiGet(path) {
  return api('GET', path);
}

async function apiPost(path, body) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] POST ${path}`);
    console.log(`  Body: ${JSON.stringify(body.data?.attributes || {}, null, 2).substring(0, 200)}`);
    return { data: { id: 'dry-run-id', attributes: body.data?.attributes || {} } };
  }
  return api('POST', path, body);
}

// ─── Step 1: Find or Create Subscription Group ──────────────────────────────

async function findOrCreateSubscriptionGroup() {
  console.log('\n📦 Step 1: Subscription Group');

  // Check if group already exists
  const existing = await apiGet(`/v1/apps/${CONFIG.appAppleID}/subscriptionGroups`);
  const found = existing.data?.find(
    (g) => g.attributes.referenceName === SUBSCRIPTION_GROUP_NAME
  );

  if (found) {
    console.log(`  ✅ Found existing group: "${SUBSCRIPTION_GROUP_NAME}" (${found.id})`);
    return found.id;
  }

  console.log(`  Creating group: "${SUBSCRIPTION_GROUP_NAME}"...`);
  const result = await apiPost('/v1/subscriptionGroups', {
    data: {
      type: 'subscriptionGroups',
      attributes: {
        referenceName: SUBSCRIPTION_GROUP_NAME,
      },
      relationships: {
        app: {
          data: { type: 'apps', id: CONFIG.appAppleID },
        },
      },
    },
  });

  console.log(`  ✅ Created group (${result.data.id})`);
  return result.data.id;
}

// ─── Step 2: Create Subscriptions ───────────────────────────────────────────

async function findOrCreateSubscription(groupId, product) {
  // Check if subscription already exists in the group
  const existing = await apiGet(
    `/v1/subscriptionGroups/${groupId}/subscriptions?limit=200`
  );
  const found = existing.data?.find(
    (s) => s.attributes.productId === product.productId
  );

  if (found) {
    console.log(`  ✅ Found existing: ${product.productId} (${found.id})`);
    return found.id;
  }

  console.log(`  Creating: ${product.productId}...`);
  const result = await apiPost('/v1/subscriptions', {
    data: {
      type: 'subscriptions',
      attributes: {
        productId: product.productId,
        name: product.name,
        subscriptionPeriod: product.duration,
        groupLevel: product.groupLevel,
        reviewNote: '',
        familySharable: false,
      },
      relationships: {
        group: {
          data: { type: 'subscriptionGroups', id: groupId },
        },
      },
    },
  });

  console.log(`  ✅ Created: ${product.productId} (${result.data.id})`);
  return result.data.id;
}

// ─── Step 3: Set Prices ─────────────────────────────────────────────────────

async function getSubscriptionPricePoints(subscriptionId, territoryCode) {
  // Get ALL price points for a specific territory (paginated)
  let allPoints = [];
  let url = `/v1/subscriptions/${subscriptionId}/pricePoints?filter[territory]=${territoryCode}&limit=200`;

  while (url) {
    const res = await apiGet(url);
    allPoints = allPoints.concat(res.data || []);
    // Handle pagination — next link is full URL
    const nextLink = res.links?.next;
    if (nextLink) {
      url = nextLink.replace(CONFIG.baseURL, '');
    } else {
      url = null;
    }
  }

  return allPoints;
}

function findClosestPricePoint(pricePoints, targetPrice) {
  const target = parseFloat(targetPrice);
  let closest = null;
  let minDiff = Infinity;

  for (const pp of pricePoints) {
    const ppPrice = parseFloat(pp.attributes.customerPrice);
    const diff = Math.abs(ppPrice - target);
    if (diff < minDiff) {
      minDiff = diff;
      closest = pp;
    }
  }

  return closest;
}

async function setPricesForSubscription(subscriptionId, product) {
  console.log(`\n💰 Setting prices for ${product.productId}...`);

  // First set the base price (US)
  const usPrice = product.prices.US;
  if (!usPrice) {
    console.error(`  ❌ No US price defined for ${product.productId}`);
    return;
  }

  // Get US price points
  const usPricePoints = await getSubscriptionPricePoints(subscriptionId, 'USA');
  const basePoint = findClosestPricePoint(usPricePoints, usPrice.price);

  if (!basePoint) {
    console.error(`  ❌ No matching US price point for $${usPrice.price}`);
    return;
  }

  console.log(
    `  US: $${usPrice.price} → Apple tier $${basePoint.attributes.customerPrice}`
  );

  // Create the base price (this also sets auto-prices for all territories)
  if (!DRY_RUN) {
    try {
      await api('POST', '/v1/subscriptionPrices', {
        data: {
          type: 'subscriptionPrices',
          attributes: {
            startDate: null, // immediate
            preserveCurrentPrice: false,
          },
          relationships: {
            subscription: {
              data: { type: 'subscriptions', id: subscriptionId },
            },
            subscriptionPricePoint: {
              data: {
                type: 'subscriptionPricePoints',
                id: basePoint.id,
              },
            },
          },
        },
      });
      console.log(`  ✅ Base price set`);
    } catch (e) {
      // Price might already be set
      console.log(`  ⚠️  Base price: ${e.message}`);
    }
  } else {
    console.log(`  [DRY RUN] Would set base price to $${basePoint.attributes.customerPrice}`);
  }

  // Now set custom prices for other territories
  const territoryMap = {
    PL: 'POL', CA: 'CAN', GB: 'GBR', AU: 'AUS', NZ: 'NZL', CH: 'CHE',
    DE: 'DEU', FR: 'FRA', NL: 'NLD', BE: 'BEL', AT: 'AUT', IE: 'IRL',
    FI: 'FIN', LU: 'LUX', ES: 'ESP', PT: 'PRT', IT: 'ITA', GR: 'GRC',
    CZ: 'CZE', SK: 'SVK', HU: 'HUN', RO: 'ROU', BG: 'BGR', HR: 'HRV',
    SI: 'SVN', LT: 'LTU', LV: 'LVA', EE: 'EST', SE: 'SWE', NO: 'NOR',
    DK: 'DNK', MX: 'MEX', AR: 'ARG', CO: 'COL', CL: 'CHL', PE: 'PER',
    BR: 'BRA', EC: 'ECU', UY: 'URY', TR: 'TUR', IN: 'IND', ID: 'IDN',
    PH: 'PHL', VN: 'VNM', TH: 'THA',
  };

  let setCount = 0;
  let skipCount = 0;

  for (const [countryCode, priceInfo] of Object.entries(product.prices)) {
    if (countryCode === 'US') continue;

    const territory = territoryMap[countryCode];
    if (!territory) {
      console.log(`  ⚠️  Unknown territory for ${countryCode}, skipping`);
      skipCount++;
      continue;
    }

    try {
      const pricePoints = await getSubscriptionPricePoints(subscriptionId, territory);
      const point = findClosestPricePoint(pricePoints, priceInfo.price);

      if (!point) {
        console.log(`  ⚠️  No price point for ${countryCode} ~${priceInfo.price} ${priceInfo.currency}`);
        skipCount++;
        continue;
      }

      const actualPrice = point.attributes.customerPrice;

      if (!DRY_RUN) {
        await api('POST', '/v1/subscriptionPrices', {
          data: {
            type: 'subscriptionPrices',
            attributes: {
              startDate: null,
              preserveCurrentPrice: false,
            },
            relationships: {
              subscription: {
                data: { type: 'subscriptions', id: subscriptionId },
              },
              subscriptionPricePoint: {
                data: {
                  type: 'subscriptionPricePoints',
                  id: point.id,
                },
              },
            },
          },
        });
      }

      console.log(
        `  ${countryCode}: ${priceInfo.price} ${priceInfo.currency} → ${actualPrice} (${territory})`
      );
      setCount++;

      // Rate limit — Apple API has limits
      await new Promise((r) => setTimeout(r, 200));
    } catch (e) {
      console.log(`  ⚠️  ${countryCode}: ${e.message}`);
      skipCount++;
    }
  }

  console.log(`  📊 ${setCount} prices set, ${skipCount} skipped`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('🍎 App Store Connect — Subscription Setup');
  console.log(`   App ID: ${CONFIG.appAppleID}`);
  if (DRY_RUN) console.log('   🔸 DRY RUN MODE — no changes will be made');
  if (PRICES_ONLY) console.log('   🔸 PRICES ONLY MODE — skipping product creation');

  // Verify auth
  try {
    await apiGet(`/v1/apps/${CONFIG.appAppleID}`);
    console.log('   ✅ Authentication OK');
  } catch {
    console.error('   ❌ Authentication failed. Check your API key.');
    process.exit(1);
  }

  // Step 1: Subscription group
  const groupId = await findOrCreateSubscriptionGroup();

  // Step 2: Create subscriptions
  console.log('\n📋 Step 2: Subscriptions');
  const subscriptionIds = {};
  for (const product of PRODUCTS) {
    subscriptionIds[product.productId] = await findOrCreateSubscription(
      groupId,
      product
    );
  }

  // Step 3: Set prices
  console.log('\n💰 Step 3: Prices');
  for (const product of PRODUCTS) {
    const subId = subscriptionIds[product.productId];
    if (subId && subId !== 'dry-run-id') {
      await setPricesForSubscription(subId, product);
    } else if (DRY_RUN) {
      console.log(`\n  [DRY RUN] Would set prices for ${product.productId} (${Object.keys(product.prices).length} territories)`);
    }
  }

  console.log('\n✅ Done!');
  console.log('   Check App Store Connect → Subscriptions to verify.');
}

main().catch((err) => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});