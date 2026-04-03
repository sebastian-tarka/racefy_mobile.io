#!/usr/bin/env node

/**
 * Set subscription localizations (display name + description) via App Store Connect API.
 * Reads from scripts/subscription-localizations.json.
 *
 * Usage:
 *   node scripts/set-subscription-localizations.mjs [--dry-run]
 *
 * The script will:
 *   1. For each subscription, fetch existing localizations
 *   2. Update existing localizations or create new ones
 *   3. Report what was changed
 */

import { api } from 'node-app-store-connect-api';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');

const { create, read, update } = await api({
  issuerId: '848f5175-90a7-47f3-9cd7-99474792043f',
  apiKey: 'S65JL3K3TG',
  privateKey: readFileSync(resolve(__dirname, '..', 'AuthKey_S65JL3K3TG.p8'), 'utf8'),
});

// ─── Load localizations from JSON ───────────────────────────────────────────

const localizations = JSON.parse(
  readFileSync(resolve(__dirname, 'subscription-localizations.json'), 'utf8')
);

// ─── Main ───────────────────────────────────────────────────────────────────

console.log('🍎 Setting subscription localizations');
if (DRY_RUN) console.log('   🔸 DRY RUN MODE\n');

let totalCreated = 0;
let totalUpdated = 0;
let totalSkipped = 0;
let totalErrors = 0;

for (const sub of localizations.subscriptions) {
  console.log(`\n📦 ${sub.productId} (${sub.id})`);

  // Fetch existing localizations for this subscription
  let existing = [];
  try {
    const resp = await read(`subscriptions/${sub.id}/subscriptionLocalizations`);
    existing = resp.data || [];
  } catch (e) {
    console.log(`  ⚠️  Could not fetch existing localizations: ${e.message || e}`);
  }

  // Build map of existing: locale -> { id, name, description }
  const existingMap = new Map();
  for (const loc of existing) {
    existingMap.set(loc.attributes.locale, {
      id: loc.id,
      name: loc.attributes.name,
      description: loc.attributes.description,
    });
  }

  for (const [locale, { name, description }] of Object.entries(sub.localizations)) {
    const existingLoc = existingMap.get(locale);

    if (existingLoc) {
      // Check if update needed
      if (existingLoc.name === name && existingLoc.description === description) {
        console.log(`  ⏭️  ${locale}: already up to date`);
        totalSkipped++;
        continue;
      }

      // Update existing
      if (DRY_RUN) {
        console.log(`  🔄 ${locale}: would update "${name}" [dry-run]`);
        totalUpdated++;
        continue;
      }

      try {
        await update(
          { type: 'subscriptionLocalizations', id: existingLoc.id },
          { attributes: { name, description } },
        );
        console.log(`  🔄 ${locale}: updated "${name}"`);
        totalUpdated++;
      } catch (e) {
        const msg = (e.message || String(e)).substring(0, 150);
        console.log(`  ❌ ${locale}: update failed — ${msg}`);
        totalErrors++;
      }
    } else {
      // Create new
      if (DRY_RUN) {
        console.log(`  ✨ ${locale}: would create "${name}" [dry-run]`);
        totalCreated++;
        continue;
      }

      try {
        await create({
          type: 'subscriptionLocalizations',
          attributes: { locale, name, description },
          relationships: {
            subscription: { data: { type: 'subscriptions', id: sub.id } },
          },
        });
        console.log(`  ✅ ${locale}: created "${name}"`);
        totalCreated++;
      } catch (e) {
        const msg = (e.message || String(e)).substring(0, 150);
        console.log(`  ❌ ${locale}: create failed — ${msg}`);
        totalErrors++;
      }
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 300));
  }
}

console.log(`\n📊 Done: ${totalCreated} created, ${totalUpdated} updated, ${totalSkipped} unchanged, ${totalErrors} errors`);
