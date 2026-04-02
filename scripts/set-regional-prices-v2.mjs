#!/usr/bin/env node

/**
 * Set custom regional subscription prices via App Store Connect API.
 * Uses equalizations to correctly map EUR/USD/GBP prices to local currencies.
 *
 * Usage: node scripts/set-regional-prices-v2.mjs [--dry-run]
 */

import { api } from 'node-app-store-connect-api';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');

const { create, read } = await api({
  issuerId: '848f5175-90a7-47f3-9cd7-99474792043f',
  apiKey: 'S65JL3K3TG',
  privateKey: readFileSync(resolve(__dirname, '..', 'AuthKey_S65JL3K3TG.p8'), 'utf8'),
});

// ─── Reference territories for each currency ─────────────────────────────────
// We find the price point in the reference territory, then use equalizations
// to get the correct local currency price for the target territory.
const CURRENCY_REF_TERRITORY = {
  USD: 'USA',
  EUR: 'DEU', // Germany for EUR
  GBP: 'GBR',
  AUD: 'AUS',
  CHF: 'CHE',
  PLN: 'POL',
};

// Country → Apple territory code
const TERRITORY_MAP = {
  PL: 'POL', CA: 'CAN', GB: 'GBR', AU: 'AUS', NZ: 'NZL', CH: 'CHE',
  DE: 'DEU', FR: 'FRA', NL: 'NLD', BE: 'BEL', AT: 'AUT', IE: 'IRL',
  FI: 'FIN', LU: 'LUX', ES: 'ESP', PT: 'PRT', IT: 'ITA', GR: 'GRC',
  CZ: 'CZE', SK: 'SVK', HU: 'HUN', RO: 'ROU', BG: 'BGR', HR: 'HRV',
  SI: 'SVN', LT: 'LTU', LV: 'LVA', EE: 'EST', SE: 'SWE', NO: 'NOR',
  DK: 'DNK', MX: 'MEX', AR: 'ARG', CO: 'COL', CL: 'CHL', PE: 'PER',
  BR: 'BRA', EC: 'ECU', UY: 'URY', TR: 'TUR', IN: 'IND', ID: 'IDN',
  PH: 'PHL', VN: 'VNM', TH: 'THA',
};

const SUBSCRIPTIONS = [
  {
    id: '6761525815',
    name: 'racefy_plus_monthly',
    prices: {
      PL: { price: '14.99', currency: 'PLN' },
      CA: { price: '6.99', currency: 'USD' },
      GB: { price: '5.99', currency: 'GBP' },
      AU: { price: '8.99', currency: 'AUD' },
      NZ: { price: '8.99', currency: 'AUD' },
      CH: { price: '8.99', currency: 'CHF' },
      DE: { price: '6.99', currency: 'EUR' }, FR: { price: '6.99', currency: 'EUR' },
      NL: { price: '6.99', currency: 'EUR' }, BE: { price: '6.99', currency: 'EUR' },
      AT: { price: '6.99', currency: 'EUR' }, IE: { price: '6.99', currency: 'EUR' },
      FI: { price: '6.99', currency: 'EUR' }, LU: { price: '6.99', currency: 'EUR' },
      ES: { price: '4.99', currency: 'EUR' }, PT: { price: '4.99', currency: 'EUR' },
      IT: { price: '4.99', currency: 'EUR' }, GR: { price: '4.99', currency: 'EUR' },
      CZ: { price: '3.99', currency: 'EUR' }, SK: { price: '3.99', currency: 'EUR' },
      HU: { price: '3.99', currency: 'EUR' }, RO: { price: '3.99', currency: 'EUR' },
      BG: { price: '3.99', currency: 'EUR' }, HR: { price: '3.99', currency: 'EUR' },
      SI: { price: '3.99', currency: 'EUR' }, LT: { price: '3.99', currency: 'EUR' },
      LV: { price: '3.99', currency: 'EUR' }, EE: { price: '3.99', currency: 'EUR' },
      SE: { price: '7.99', currency: 'EUR' }, NO: { price: '7.99', currency: 'EUR' },
      DK: { price: '7.99', currency: 'EUR' },
      MX: { price: '2.99', currency: 'USD' }, AR: { price: '2.99', currency: 'USD' },
      CO: { price: '2.99', currency: 'USD' }, CL: { price: '2.99', currency: 'USD' },
      PE: { price: '2.99', currency: 'USD' }, BR: { price: '2.99', currency: 'USD' },
      EC: { price: '2.99', currency: 'USD' }, UY: { price: '2.99', currency: 'USD' },
      TR: { price: '2.99', currency: 'USD' },
      IN: { price: '2.49', currency: 'USD' }, ID: { price: '2.49', currency: 'USD' },
      PH: { price: '2.49', currency: 'USD' }, VN: { price: '2.49', currency: 'USD' },
      TH: { price: '2.49', currency: 'USD' },
    },
  },
  {
    id: '6761538189',
    name: 'racefy_plus_yearly',
    prices: {
      PL: { price: '119.99', currency: 'PLN' },
      CA: { price: '55.99', currency: 'USD' }, GB: { price: '47.99', currency: 'GBP' },
      AU: { price: '71.99', currency: 'AUD' }, NZ: { price: '71.99', currency: 'AUD' },
      CH: { price: '71.99', currency: 'CHF' },
      DE: { price: '55.99', currency: 'EUR' }, FR: { price: '55.99', currency: 'EUR' },
      NL: { price: '55.99', currency: 'EUR' }, BE: { price: '55.99', currency: 'EUR' },
      AT: { price: '55.99', currency: 'EUR' }, IE: { price: '55.99', currency: 'EUR' },
      FI: { price: '55.99', currency: 'EUR' }, LU: { price: '55.99', currency: 'EUR' },
      ES: { price: '39.99', currency: 'EUR' }, PT: { price: '39.99', currency: 'EUR' },
      IT: { price: '39.99', currency: 'EUR' }, GR: { price: '39.99', currency: 'EUR' },
      CZ: { price: '31.99', currency: 'EUR' }, SK: { price: '31.99', currency: 'EUR' },
      HU: { price: '31.99', currency: 'EUR' }, RO: { price: '31.99', currency: 'EUR' },
      BG: { price: '31.99', currency: 'EUR' }, HR: { price: '31.99', currency: 'EUR' },
      SI: { price: '31.99', currency: 'EUR' }, LT: { price: '31.99', currency: 'EUR' },
      LV: { price: '31.99', currency: 'EUR' }, EE: { price: '31.99', currency: 'EUR' },
      SE: { price: '63.99', currency: 'EUR' }, NO: { price: '63.99', currency: 'EUR' },
      DK: { price: '63.99', currency: 'EUR' },
      MX: { price: '23.99', currency: 'USD' }, AR: { price: '23.99', currency: 'USD' },
      CO: { price: '23.99', currency: 'USD' }, CL: { price: '23.99', currency: 'USD' },
      PE: { price: '23.99', currency: 'USD' }, BR: { price: '23.99', currency: 'USD' },
      EC: { price: '23.99', currency: 'USD' }, UY: { price: '23.99', currency: 'USD' },
      TR: { price: '23.99', currency: 'USD' },
      IN: { price: '19.99', currency: 'USD' }, ID: { price: '19.99', currency: 'USD' },
      PH: { price: '19.99', currency: 'USD' }, VN: { price: '19.99', currency: 'USD' },
      TH: { price: '19.99', currency: 'USD' },
    },
  },
  {
    id: '6761538417',
    name: 'racefy_pro_monthly',
    prices: {
      PL: { price: '29.99', currency: 'PLN' },
      CA: { price: '13.99', currency: 'USD' }, GB: { price: '11.99', currency: 'GBP' },
      AU: { price: '17.99', currency: 'AUD' }, NZ: { price: '17.99', currency: 'AUD' },
      CH: { price: '17.99', currency: 'CHF' },
      DE: { price: '13.99', currency: 'EUR' }, FR: { price: '13.99', currency: 'EUR' },
      NL: { price: '13.99', currency: 'EUR' }, BE: { price: '13.99', currency: 'EUR' },
      AT: { price: '13.99', currency: 'EUR' }, IE: { price: '13.99', currency: 'EUR' },
      FI: { price: '13.99', currency: 'EUR' }, LU: { price: '13.99', currency: 'EUR' },
      ES: { price: '9.99', currency: 'EUR' }, PT: { price: '9.99', currency: 'EUR' },
      IT: { price: '9.99', currency: 'EUR' }, GR: { price: '9.99', currency: 'EUR' },
      CZ: { price: '7.99', currency: 'EUR' }, SK: { price: '7.99', currency: 'EUR' },
      HU: { price: '7.99', currency: 'EUR' }, RO: { price: '7.99', currency: 'EUR' },
      BG: { price: '7.99', currency: 'EUR' }, HR: { price: '7.99', currency: 'EUR' },
      SI: { price: '7.99', currency: 'EUR' }, LT: { price: '7.99', currency: 'EUR' },
      LV: { price: '7.99', currency: 'EUR' }, EE: { price: '7.99', currency: 'EUR' },
      SE: { price: '15.99', currency: 'EUR' }, NO: { price: '15.99', currency: 'EUR' },
      DK: { price: '15.99', currency: 'EUR' },
      MX: { price: '5.99', currency: 'USD' }, AR: { price: '5.99', currency: 'USD' },
      CO: { price: '5.99', currency: 'USD' }, CL: { price: '5.99', currency: 'USD' },
      PE: { price: '5.99', currency: 'USD' }, BR: { price: '5.99', currency: 'USD' },
      EC: { price: '5.99', currency: 'USD' }, UY: { price: '5.99', currency: 'USD' },
      TR: { price: '5.99', currency: 'USD' },
      IN: { price: '4.99', currency: 'USD' }, ID: { price: '4.99', currency: 'USD' },
      PH: { price: '4.99', currency: 'USD' }, VN: { price: '4.99', currency: 'USD' },
      TH: { price: '4.99', currency: 'USD' },
    },
  },
  {
    id: '6761538303',
    name: 'racefy_pro_yearly',
    prices: {
      PL: { price: '239.99', currency: 'PLN' },
      CA: { price: '111.99', currency: 'USD' }, GB: { price: '95.99', currency: 'GBP' },
      AU: { price: '143.99', currency: 'AUD' }, NZ: { price: '143.99', currency: 'AUD' },
      CH: { price: '143.99', currency: 'CHF' },
      DE: { price: '111.99', currency: 'EUR' }, FR: { price: '111.99', currency: 'EUR' },
      NL: { price: '111.99', currency: 'EUR' }, BE: { price: '111.99', currency: 'EUR' },
      AT: { price: '111.99', currency: 'EUR' }, IE: { price: '111.99', currency: 'EUR' },
      FI: { price: '111.99', currency: 'EUR' }, LU: { price: '111.99', currency: 'EUR' },
      ES: { price: '79.99', currency: 'EUR' }, PT: { price: '79.99', currency: 'EUR' },
      IT: { price: '79.99', currency: 'EUR' }, GR: { price: '79.99', currency: 'EUR' },
      CZ: { price: '63.99', currency: 'EUR' }, SK: { price: '63.99', currency: 'EUR' },
      HU: { price: '63.99', currency: 'EUR' }, RO: { price: '63.99', currency: 'EUR' },
      BG: { price: '63.99', currency: 'EUR' }, HR: { price: '63.99', currency: 'EUR' },
      SI: { price: '63.99', currency: 'EUR' }, LT: { price: '63.99', currency: 'EUR' },
      LV: { price: '63.99', currency: 'EUR' }, EE: { price: '63.99', currency: 'EUR' },
      SE: { price: '127.99', currency: 'EUR' }, NO: { price: '127.99', currency: 'EUR' },
      DK: { price: '127.99', currency: 'EUR' },
      MX: { price: '47.99', currency: 'USD' }, AR: { price: '47.99', currency: 'USD' },
      CO: { price: '47.99', currency: 'USD' }, CL: { price: '47.99', currency: 'USD' },
      PE: { price: '47.99', currency: 'USD' }, BR: { price: '47.99', currency: 'USD' },
      EC: { price: '47.99', currency: 'USD' }, UY: { price: '47.99', currency: 'USD' },
      TR: { price: '47.99', currency: 'USD' },
      IN: { price: '39.99', currency: 'USD' }, ID: { price: '39.99', currency: 'USD' },
      PH: { price: '39.99', currency: 'USD' }, VN: { price: '39.99', currency: 'USD' },
      TH: { price: '39.99', currency: 'USD' },
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Cache: subId -> refTerritory -> priceStr -> pricePointId
const refPointCache = new Map();

async function getRefPricePoint(subId, currency, targetPrice) {
  const refTerritory = CURRENCY_REF_TERRITORY[currency];
  if (!refTerritory) return null;

  const cacheKey = `${subId}:${refTerritory}`;
  if (!refPointCache.has(cacheKey)) {
    // Fetch ALL price points with pagination
    let allPoints = [];
    let url = `subscriptions/${subId}/pricePoints`;
    let params = { 'filter[territory]': refTerritory, limit: 200 };
    let page = 0;
    while (true) {
      const resp = await read(url, { params });
      allPoints = allPoints.concat(resp.data || []);
      if (!resp.links?.next || (resp.data || []).length < 200) break;
      // Extract cursor from next link
      const nextUrl = resp.links.next.replace('https://api.appstoreconnect.apple.com/v1/', '');
      url = nextUrl.split('?')[0];
      const nextParams = Object.fromEntries(new URL(resp.links.next).searchParams);
      params = nextParams;
      page++;
      if (page > 10) break; // safety limit
    }
    refPointCache.set(cacheKey, allPoints);
  }

  const points = refPointCache.get(cacheKey);
  const target = parseFloat(targetPrice);

  // Find exact or closest match
  let closest = null;
  let minDiff = Infinity;
  for (const p of points) {
    const diff = Math.abs(parseFloat(p.attributes.customerPrice) - target);
    if (diff < minDiff) {
      minDiff = diff;
      closest = p;
    }
  }
  return closest;
}

// Cache: pricePointId -> territory -> equalized price point
const eqCache = new Map();

async function getEqualizedPricePoint(refPricePoint, targetTerritory) {
  const cacheKey = refPricePoint.id;
  if (!eqCache.has(cacheKey)) {
    // Fetch all equalizations with pagination (175+ territories)
    let allEq = [];
    let url = `subscriptionPricePoints/${refPricePoint.id}/equalizations`;
    let params = { limit: 200 };
    while (true) {
      const resp = await read(url, { params });
      allEq = allEq.concat(resp.data || []);
      if (!resp.links?.next || (resp.data || []).length < 200) break;
      const nextUrl = resp.links.next.replace('https://api.appstoreconnect.apple.com/v1/', '');
      url = nextUrl.split('?')[0];
      params = Object.fromEntries(new URL(resp.links.next).searchParams);
    }
    eqCache.set(cacheKey, allEq);
  }

  const eqs = eqCache.get(cacheKey);
  // Price point ID encodes territory: decode to find match
  return eqs.find((eq) => {
    try {
      const decoded = JSON.parse(Buffer.from(eq.id, 'base64url').toString());
      return decoded.t === targetTerritory;
    } catch {
      return false;
    }
  });
}

// ─── Main ───────────────────────────────────────────────────────────────────

console.log('🍎 Setting regional subscription prices (v2 — with currency-aware equalizations)');
if (DRY_RUN) console.log('   🔸 DRY RUN MODE');
console.log('');

let totalSet = 0;
let totalSkipped = 0;
let totalErrors = 0;

for (const sub of SUBSCRIPTIONS) {
  console.log(`\n📦 ${sub.name} (${sub.id})`);

  for (const [country, { price, currency }] of Object.entries(sub.prices)) {
    const targetTerritory = TERRITORY_MAP[country];
    if (!targetTerritory) {
      console.log(`  ⚠️  ${country}: unknown territory`);
      totalSkipped++;
      continue;
    }

    try {
      // Step 1: Find the price point in the reference territory (same currency)
      const refPoint = await getRefPricePoint(sub.id, currency, price);
      if (!refPoint) {
        console.log(`  ⚠️  ${country}: no ref price point for ${price} ${currency}`);
        totalSkipped++;
        continue;
      }

      // Step 2: Is target territory same as reference? Use directly
      const refTerritory = CURRENCY_REF_TERRITORY[currency];
      let pricePointToSet;
      let actualPrice;

      if (targetTerritory === refTerritory) {
        pricePointToSet = refPoint;
        actualPrice = `${refPoint.attributes.customerPrice} ${currency}`;
      } else {
        // Step 3: Get equalized price point for target territory
        const eqPoint = await getEqualizedPricePoint(refPoint, targetTerritory);
        if (!eqPoint) {
          console.log(`  ⚠️  ${country}: no equalization for ${targetTerritory}`);
          totalSkipped++;
          continue;
        }
        pricePointToSet = eqPoint;
        actualPrice = `${eqPoint.attributes.customerPrice} (local, eq from ${price} ${currency})`;
      }

      if (DRY_RUN) {
        console.log(`  ${country}: ${price} ${currency} → ${actualPrice} [dry-run]`);
        totalSet++;
        continue;
      }

      await create({
        type: 'subscriptionPrices',
        attributes: { startDate: null, preserveCurrentPrice: false },
        relationships: {
          subscription: { data: { type: 'subscriptions', id: sub.id } },
          subscriptionPricePoint: { data: { type: 'subscriptionPricePoints', id: pricePointToSet.id } },
        },
      });

      console.log(`  ✅ ${country}: ${price} ${currency} → ${actualPrice}`);
      totalSet++;

      await new Promise((r) => setTimeout(r, 300));
    } catch (e) {
      const msg = typeof e === 'string' ? e.substring(0, 150) : (e.message?.substring(0, 150) || String(e).substring(0, 150));
      console.log(`  ❌ ${country}: ${msg}`);
      totalErrors++;
    }
  }
}

console.log(`\n📊 Done: ${totalSet} set, ${totalSkipped} skipped, ${totalErrors} errors`);