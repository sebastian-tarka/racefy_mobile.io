# Release Checklist — Google Sign-In + Płatności (iOS & Android)

## Stan wyjściowy

| Obszar | iOS | Android |
|--------|-----|---------|
| Konto deweloperskie | ✅ Masz | ❌ Brak ($25 jednorazowo) |
| Google Sign-In | ⚠️ Brak `GOOGLE_IOS_CLIENT_ID` | ✅ Działa z dev key |
| RevenueCat | ❌ Brak `REVENUECAT_APPLE_API_KEY` | ⚠️ Tylko test key |
| Firebase | ✅ 3 środowiska (dev/staging/prod) | ✅ 3 środowiska |
| Build config | ✅ EAS production profile | ✅ EAS production profile |
| Signing | ✅ EAS managed | ⚠️ Debug keystore w release! |
| Produkty w Store | ❌ Nie skonfigurowane | ❌ Nie skonfigurowane |

## Kolejność zależności

```
FAZA 1 (Google Cloud)  ──→  FAZA 4 (EAS Secrets iOS)
FAZA 2 (Apple Developer) ─→ FAZA 3 (RevenueCat) ──→ FAZA 6 (TestFlight)
FAZA 5 (Backend Laravel) ─────────────────────────→ FAZA 6 (TestFlight)

FAZA 7 (Google Play account) → FAZA 8 (Android build)
FAZA 9 (Web React) — niezależna, równolegle z resztą
CLEANUP — w dowolnym momencie
```

**Zacznij od FAZY 1 + 2 równolegle** — obie to konfiguracja w konsolach webowych.
Potem FAZA 3 (RevenueCat potrzebuje danych z obu).

---

## FAZA 1: Google Cloud Console — OAuth Client IDs (prod)

W projekcie Firebase `racefy-prod` (console.cloud.google.com):

- [x] Utwórz OAuth 2.0 Client ID typu **iOS** (Bundle ID: `com.racefy.app`) ✅ `681971140441-a7pomkp4vh6vuubb3l4mr8gdvpk5e9i5.apps.googleusercontent.com`
- [x] Utwórz OAuth 2.0 Client ID typu **Web** (do backendu Laravel + web React) ✅ `681971140441-voaupb4n3mgj9dhchunviklvsb2m8gha.apps.googleusercontent.com`
- [x] Android Client ID — ustawiony w EAS jako `GOOGLE_ANDROID_CLIENT_ID` ✅ `681971140441-8qq6vbk774t5375mkqmdh21284npo0it.apps.googleusercontent.com`
- [ ] Zapisz wszystkie Client IDs w bezpiecznym miejscu (np. 1Password)

---

## FAZA 2: Apple Developer — App ID + capabilities

Apple Developer Portal (developer.apple.com):

- [x] Zarejestruj App ID: `com.racefy.app` ✅ (Apple ID: 6757979729)
- [x] Włącz capabilities: **Push Notifications**, **Associated Domains**, **In-App Purchase** ✅
- [x] App Store Connect → utwórz aplikację "Racefy" ✅ (SKU: EX1768745013794)
- [x] Skonfiguruj Subscription Group: "Racefy Premium" ✅ (ID: 22009722)
- [x] Utwórz produkty subskrypcyjne: ✅
  - `racefy_plus_monthly` (ID: 6761525815)
  - `racefy_plus_yearly` (ID: 6761538189)
  - `racefy_pro_monthly` (ID: 6761538417)
  - `racefy_pro_yearly` (ID: 6761538303)
- [x] Ustaw ceny regionalne dla 45 terytoriów ✅ (via API, skrypt `scripts/set-regional-prices-v2.mjs`)
- [x] Dodaj lokalizacje (en-US) dla subskrypcji ✅
- [ ] Dodaj lokalizacje polskie (pl) dla subskrypcji
- [ ] Ustaw okresy próbne (opcjonalnie)
- [ ] Dodaj sandbox test accounts w App Store Connect
- [ ] Wypełnij Paid Applications agreement (formularz W-8BEN, dane bankowe) — ✅ złożony 2026-04-02, czeka na przetworzenie
- [ ] Digital Services Act (DSA) — trader status do ustawienia

---

## FAZA 3: RevenueCat Dashboard — projekt + Apple config

RevenueCat (app.revenuecat.com):

- [ ] Utwórz projekt (lub użyj istniejącego)
- [ ] Apple config: dodaj App Store Connect API Key (In-App Purchase type) + Shared Secret
- [ ] Skopiuj **Apple API Key** (`appl_xxxxx`) → `REVENUECAT_APPLE_API_KEY`
- [ ] Products: dodaj identyfikatory produktów (muszą matchować App Store Connect)
- [ ] Entitlements: utwórz `Racefy Plus` i `Racefy Pro` (dokładnie te nazwy — match z kodem w `src/services/revenuecat.ts`)
- [ ] Offerings: utwórz "default" offering z packages (monthly/annual per tier)
- [ ] Zweryfikuj że offerings ładują się w dashboard

---

## FAZA 4: EAS Secrets — iOS production env vars

```bash
# Production
eas env:create --name GOOGLE_IOS_CLIENT_ID --value "<iOS Client ID>" \
  --scope project --type string --visibility secret --environment production --non-interactive
eas env:create --name GOOGLE_WEB_CLIENT_ID --value "<prod Web Client ID>" \
  --scope project --type string --visibility secret --environment production --non-interactive
eas env:create --name REVENUECAT_APPLE_API_KEY --value "appl_xxxxx" \
  --scope project --type string --visibility secret --environment production --non-interactive

# Staging (preview) — opcjonalnie te same lub osobne klucze
eas env:create --name GOOGLE_IOS_CLIENT_ID --value "<iOS Client ID>" \
  --scope project --type string --visibility secret --environment preview --non-interactive
eas env:create --name REVENUECAT_APPLE_API_KEY --value "appl_xxxxx" \
  --scope project --type string --visibility secret --environment preview --non-interactive
```

- [x] Ustaw `GOOGLE_IOS_CLIENT_ID` (production) ✅ ustawiony 2026-04-01
- [x] Ustaw `GOOGLE_WEB_CLIENT_ID` (production) ✅ ustawiony 2026-04-01
- [ ] Ustaw `REVENUECAT_APPLE_API_KEY` (production)
- [x] Ustaw `GOOGLE_IOS_CLIENT_ID` dla preview (staging) — ⚠️ tymczasowo prod klucze, docelowo potrzeba kluczy z projektu `racefy-stage-e46f7`
- [x] Ustaw `GOOGLE_WEB_CLIENT_ID` dla preview (staging) — ⚠️ tymczasowo prod klucze, docelowo potrzeba kluczy z projektu `racefy-stage-e46f7`
- [ ] Zaktualizuj lokalny `.env` z nowymi kluczami
- [ ] Zweryfikuj: `eas env:list production --include-sensitive`

---

## FAZA 5: Backend Laravel — Google Auth + RevenueCat webhook

W repo backendu Laravel:

- [ ] Dodaj `GOOGLE_CLIENT_ID` (Web Client ID) + `GOOGLE_CLIENT_SECRET` do `.env`
- [ ] Zweryfikuj endpoint `/auth/google` — walidacja `id_token` z Google API używając Web Client ID
- [ ] Utwórz webhook endpoint `/webhooks/revenuecat` do syncowania subskrypcji
- [ ] Dodaj `REVENUECAT_WEBHOOK_SECRET` do `.env` backendu (do weryfikacji podpisów)
- [ ] Logika syncowania `user.subscription` na podstawie RevenueCat events:
  - `INITIAL_PURCHASE` — aktywuj subskrypcję
  - `RENEWAL` — przedłuż subskrypcję
  - `CANCELLATION` — oznacz jako cancelled (ale aktywna do końca okresu)
  - `EXPIRATION` — dezaktywuj subskrypcję
- [ ] RevenueCat Dashboard → Integrations → Webhooks → podaj URL backendu
- [ ] Przetestuj webhook z RevenueCat test events

---

## FAZA 6: iOS Build + TestFlight — test Google Sign-In i zakupów

```bash
eas build --platform ios --profile staging
eas submit --platform ios --latest   # → TestFlight
```

- [ ] Build staging
- [ ] Submit do TestFlight
- [ ] Przetestuj Google Sign-In na fizycznym urządzeniu iOS
- [ ] Przetestuj zakupy sandbox (sandbox account z App Store Connect)
- [ ] Przetestuj restore purchases
- [ ] Przetestuj webhook flow (zakup → RevenueCat → backend → user.subscription updated)
- [ ] Build production: `eas build --platform ios --profile production`
- [ ] Submit do App Store Review

---

## FAZA 7: Google Play Developer Account + konfiguracja Android

Po zakupie konta ($25 jednorazowo, play.google.com/console):

- [ ] Kup Google Play Developer account
- [ ] Utwórz aplikację "Racefy" w Play Console
- [ ] Build AAB: `eas build --platform android --profile production`
- [ ] Upload AAB na **Internal Testing** track (wymagane żeby produkty działały!)
- [ ] Signing: pozwól EAS zarządzać kluczem (nie używaj debug keystore do prod!)
- [ ] Skonfiguruj subskrypcje w Play Console (te same ID produktów co iOS):
  - `racefy_plus_monthly`, `racefy_plus_annual`
  - `racefy_pro_monthly`, `racefy_pro_annual`
- [ ] Google Cloud Console → IAM → utwórz Service Account z rolą **Android Management User**
- [ ] Pobierz Service Account JSON key
- [ ] Google Play Console → API access → linkuj service account
- [ ] RevenueCat Dashboard → Settings → Google Play → upload JSON key
- [ ] Skopiuj **Google API Key** z RevenueCat (`goog_xxxxx`) → `REVENUECAT_GOOGLE_API_KEY`

---

## FAZA 8: EAS Secrets + build Android production

```bash
eas env:create --name REVENUECAT_GOOGLE_API_KEY --value "goog_xxxxx" \
  --scope project --type string --visibility secret --environment production --non-interactive
```

- [ ] Ustaw `REVENUECAT_GOOGLE_API_KEY` w EAS (production + preview)
- [ ] Ustaw `GOOGLE_WEB_CLIENT_ID` dla production (jeśli jeszcze nie ustawiony)
- [ ] Build staging APK: `eas build --platform android --profile staging`
- [ ] Przetestuj Google Sign-In na urządzeniu Android
- [ ] Przetestuj zakupy sandbox
- [ ] Build production AAB: `eas build --platform android --profile production`
- [ ] Upload do Play Console → Internal Testing → Closed Testing → Open Testing → Production

---

## FAZA 9: Web React — Google Sign-In + subskrypcje webowe

W repo webowym React:

- [ ] Skonfiguruj Google Sign-In z **Web Client ID** (ten sam co backend)
- [ ] Przetestuj flow: web login → backend `/auth/google` → token
- [ ] Opcjonalnie: Stripe/Paddle do subskrypcji webowych (App Store/Play Store nie działają w web)
- [ ] Jeśli Stripe: skonfiguruj webhook Stripe → backend → sync z RevenueCat (lub osobna logika)

---

## CLEANUP: Znane problemy do naprawienia

Problemy wykryte podczas analizy — można naprawiać w dowolnym momencie:

- [ ] **Android signing**: przestań używać debug keystore do release builds → EAS managed lub wygeneruj production keystore
- [ ] **Wersja iOS**: `Info.plist` ma `1.5.0`, `app.config.ts` ma `1.9.3` — zweryfikuj czy EAS prebuild nadpisuje poprawnie
- [ ] **eas.json production**: `GOOGLE_WEB_CLIENT_ID` jest pusty — ustaw prod Web Client ID
- [ ] **Test key**: usuń hardcoded `test_imuKPattskGISWCnJMolGWUNmzI` z `src/services/revenuecat.ts` (linia 43) po skonfigurowaniu prawdziwych kluczy
- [ ] **Cleartext traffic**: rozważ wyłączenie `usesCleartextTraffic` w production builds (`AndroidManifest.xml`)

---

## Co w repo, a co nie — deploy z dowolnej maszyny

Cel: każdy deweloper (lub CI) powinien móc sklonować repo, ustawić kilka sekretów i zrobić deploy.

### ✅ W REPO (commitowane, publiczne)

| Plik | Powód |
|------|-------|
| `google-services-{dev,staging,production}.json` | Firebase config Android — zawierają tylko publiczne klucze API, sender ID, project ID. **Nie są tajne** — Google oficjalnie potwierdza że te pliki można commitować |
| `GoogleService-Info-{dev,staging,production}.plist` | Firebase config iOS — j.w., publiczne identyfikatory |
| `.env.example` | Szablon zmiennych środowiskowych (bez wartości) |
| `eas.json` | Build profiles, env mapping — **nie** zawiera sekretów |
| `app.config.ts` | Dynamiczna konfiguracja, czyta sekrety z env vars |
| `scripts/` | Helper scripts (deploy, select-google-services) |

### ❌ NIE W REPO (gitignored lub w zewnętrznych systemach)

| Sekret | Gdzie trzymać | Potrzebne do |
|--------|---------------|--------------|
| `.env` | Lokalna kopia per maszyna (z `.env.example`) | Dev server |
| `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` | `~/.gradle/gradle.properties` (local build) + EAS env (cloud build) | Build Android/iOS |
| `REVENUECAT_APPLE_API_KEY` | EAS env (production + preview) | iOS purchases |
| `REVENUECAT_GOOGLE_API_KEY` | EAS env (production + preview) | Android purchases |
| `GOOGLE_IOS_CLIENT_ID` | EAS env (production + preview) | iOS Google Sign-In |
| `GOOGLE_WEB_CLIENT_ID` (prod) | EAS env (production) | Google Sign-In token validation |
| `MAPBOX_ACCESS_TOKEN` | `.env` lokalne + EAS env | Mapy w runtime |
| Keystory / signing credentials | EAS managed (automatycznie) | Signing builds |
| Apple certificates / provisioning | EAS managed (automatycznie) | iOS builds |
| Service Account JSON (Google Play) | RevenueCat Dashboard | Sync produktów Android |
| App Store Connect API Key | RevenueCat Dashboard | Sync produktów iOS |

### Konfiguracja nowej maszyny deweloperskiej

```bash
# 1. Klonuj repo
git clone <repo-url>
cd RacefyApp

# 2. Zainstaluj zależności
npm install

# 3. Skopiuj i wypełnij .env
cp .env.example .env
# Edytuj .env — ustaw API_LOCAL_IP, tokeny Mapbox, Google Client IDs

# 4. Zaloguj się do EAS (wymagane do buildów cloud)
npx eas-cli login

# 5. (Opcjonalnie) Mapbox token do lokalnych buildów Android
echo "RNMAPBOX_MAPS_DOWNLOAD_TOKEN=sk.xxx" >> ~/.gradle/gradle.properties

# 6. Gotowe — dev server
npm run start:adb
```

### Deploy z nowej maszyny (EAS Cloud Build)

EAS cloud build nie potrzebuje żadnych lokalnych sekretów poza loginem do EAS. Sekrety są w EAS env vars.

```bash
# Zaloguj się (jednorazowo)
npx eas-cli login

# Build — sekrety pobierane automatycznie z EAS env
eas build --platform ios --profile staging
eas build --platform android --profile staging
eas build --platform ios --profile production
eas build --platform android --profile production

# Submit iOS do TestFlight
eas submit --platform ios --latest

# Wszystkie EAS env vars do sprawdzenia
eas env:list production --include-sensitive
eas env:list preview --include-sensitive
```

### Deploy backendu Laravel (osobne repo)

Sekrety potrzebne w `.env` backendu (lub w CI/CD secrets):

| Zmienna | Opis |
|---------|------|
| `GOOGLE_CLIENT_ID` | Web OAuth Client ID (do walidacji id_token z mobilki i web) |
| `GOOGLE_CLIENT_SECRET` | Web OAuth Client Secret |
| `REVENUECAT_WEBHOOK_SECRET` | Do weryfikacji webhooków RevenueCat |
| `REVENUECAT_API_KEY` | Server-side API key z RevenueCat (do odpytywania statusu subskrypcji) |

### Checklist: EAS env vars do ustawienia

Zweryfikuj że wszystkie sekrety są ustawione w obu środowiskach:

```bash
# Production
eas env:list production --include-sensitive
```

Wymagane zmienne w **production**:
- [ ] `REVENUECAT_APPLE_API_KEY`
- [ ] `REVENUECAT_GOOGLE_API_KEY`
- [ ] `GOOGLE_IOS_CLIENT_ID`
- [ ] `GOOGLE_WEB_CLIENT_ID`
- [ ] `RNMAPBOX_MAPS_DOWNLOAD_TOKEN`
- [ ] `MAPBOX_ACCESS_TOKEN`

Wymagane zmienne w **preview** (staging):
- [ ] `REVENUECAT_APPLE_API_KEY`
- [ ] `REVENUECAT_GOOGLE_API_KEY`
- [ ] `GOOGLE_IOS_CLIENT_ID`
- [ ] `GOOGLE_WEB_CLIENT_ID`
- [ ] `RNMAPBOX_MAPS_DOWNLOAD_TOKEN`
- [ ] `MAPBOX_ACCESS_TOKEN`

---

## Referencje

| Zasób | Link |
|-------|------|
| Google Cloud Console | https://console.cloud.google.com |
| Apple Developer | https://developer.apple.com |
| App Store Connect | https://appstoreconnect.apple.com |
| RevenueCat Dashboard | https://app.revenuecat.com |
| Google Play Console | https://play.google.com/console |
| Expo Dashboard | https://expo.dev/accounts/sebastiantarka/projects/RacefyApp |
| EAS Builds | https://expo.dev/accounts/sebastiantarka/projects/RacefyApp/builds |

| Plik w projekcie | Opis |
|-------------------|------|
| `src/services/revenuecat.ts` | Konfiguracja RevenueCat SDK, entitlements |
| `src/services/googleSignIn.ts` | Konfiguracja Google Sign-In |
| `src/screens/PaywallScreen.tsx` | Paywall UI, feature comparison |
| `src/hooks/useAuth.tsx` | Integracja auth z Google + RevenueCat |
| `app.config.ts` | Env vars, Firebase config, bundle ID |
| `eas.json` | Build profiles, environment mapping |
| `.env` / `.env.example` | Lokalne zmienne środowiskowe |