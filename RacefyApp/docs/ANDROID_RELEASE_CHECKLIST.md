# Android Release Checklist — Racefy na Google Play

> Wersja: 1.9.3 | Package: com.racefy.app | Domena: racefy.io | Data: 2026-03-26

---

## Faza 0: Weryfikacja nazwy i znaku towarowego

- [ ] **Sprawdź znaki towarowe EU** → https://www.tmdn.org/tmview/ → szukaj "Racefy"
- [ ] **Sprawdź znaki towarowe PL** → https://ewyszukiwarka.pue.uprp.gov.pl/ → szukaj "Racefy"
- [ ] **Znana kolizja**: istniała aplikacja "Racefy" od RACEFY RACING SOLUTIONS (Brazylia)
  - Package: `com.quimicamobile.racefy` (inny niż nasz)
  - Status: porzucona od 2018, prawdopodobnie usunięta z Google Play
  - Inna branża (motorsport news vs fitness) — niskie ryzyko
- [ ] **Rozważ rejestrację znaku towarowego**:
  - UPRP (Polska): ~490 PLN za 1 klasę
  - EUIPO (cała UE): ~850 EUR za 1 klasę
- [ ] **Zachowaj dowody wcześniejszego użycia** domeny racefy.io (data rejestracji, Wayback Machine)

---

## Faza 1: Poprawki w kodzie

- [x] **Fix produkcyjnego API URL** — `app.config.ts:11`
  - ~~Uszkodzony fallback~~ → Poprawiono na `'https://racefy.io/api'`

- [x] **Fix domen racefy.app → racefy.io** w kodzie i dokumentacji
  - Deep links, intent filters, API fallback URLs

- [x] **Zredukować logi na produkcji** — `eas.json` → `build.production.env`
  - `LOG_LEVEL`: `"warn"`, `LOG_CONSOLE_OUTPUT`: `"false"`

- [ ] **Uzupełnić GOOGLE_WEB_CLIENT_ID w production** — `eas.json`
  - Obecnie pusty placeholder — uzupełnij wartością z:
  - Firebase Console → `racefy-prod` → Authentication → Sign-in method → Google → **Web client ID**

- [ ] **Zweryfikować typy** po zmianach:
  ```bash
  cd RacefyApp && npx tsc --noEmit
  ```

---

## Faza 2: Założenie konta Google Play Developer

### Typ konta: Organizacja (JDG)

- [ ] **Załóż firmowe konto Google** (np. dev@racefy.io lub kontakt@racefy.io)
  - Nie używaj prywatnego konta Google!
- [ ] Wejdź na https://play.google.com/console/signup
- [ ] Zaloguj się firmowym kontem Google
- [ ] Wybierz typ konta: **Organizacja**
- [ ] Zapłać jednorazową opłatę **$25 USD**
- [ ] Wypełnij dane organizacji:
  - Nazwa: nazwa JDG (lub "Racefy")
  - Adres: adres JDG z CEIDG
  - Email kontaktowy (publiczny, widoczny w sklepie)
  - Numer telefonu
  - Strona www: https://racefy.io
- [ ] **Weryfikacja organizacji**:
  - Numer DUNS — sprawdź: https://www.dnb.com/duns-number/lookup.html
  - Jeśli nie masz: zamów bezpłatnie (do 30 dni) lub płatnie (~2-3 dni)
  - Alternatywnie: Google może zaakceptować wydruk z CEIDG
  - ⏱ Weryfikacja trwa **2-7 dni roboczych**

---

## Faza 2.5: Subskrypcje — ścieżka iOS-first

> Masz konto Apple Developer — testuj płatności na iOS, bo nie wymaga weryfikacji jak Google Play.

### RevenueCat — konfiguracja podstawowa (TERAZ)

- [ ] RevenueCat dashboard → utwórz projekt "Racefy"
- [ ] Utwórz **Entitlements**: `plus` i `pro`
- [ ] Skopiuj **Public API Key** (Apple) → `.env`:
  ```
  REVENUECAT_APPLE_API_KEY=appl_XXXXX
  ```

### App Store Connect — produkty (TERAZ)

- [ ] App Store Connect → My Apps → Racefy (lub utwórz nową)
- [ ] App Store Connect → Subscriptions → utwórz Subscription Group
- [ ] Dodaj produkty:
  - `racefy_plus_monthly`, `racefy_plus_yearly`
  - `racefy_pro_monthly`, `racefy_pro_yearly`
- [ ] Ustaw ceny i ewentualny okres próbny

### RevenueCat ↔ App Store Connect

- [ ] RevenueCat → Apps → Add Apple App
- [ ] Podaj App Store Connect Shared Secret
- [ ] Products → dodaj product IDs z App Store
- [ ] Offerings → Current → dodaj pakiety
- [ ] Przypisz produkty do entitlements

### Test na iOS (sandbox)

- [ ] Zbuduj iOS: `eas build --platform ios --profile staging`
- [ ] Lub TestFlight: `eas build --platform ios --profile production --auto-submit`
- [ ] App Store Connect → Users → Sandbox Testers → dodaj tester
- [ ] Na iPhone: Settings → App Store → Sandbox Account → zaloguj sandbox tester
- [ ] Przetestuj pełny flow: locked feature → paywall → zakup (sandbox) → odblokowanie

### Później — Android

- [ ] Po zatwierdzeniu konta Google Play → dodaj produkty → podłącz RevenueCat
- [ ] RevenueCat → Apps → Add Google Play App (wymaga Service Account JSON)
- [ ] Google Play Console → Monetize → Subscriptions → utwórz produkty
- [ ] Test na Android sandbox (License Testing)

---

## Faza 3: Przygotowanie wpisu w Google Play Console

### Obowiązkowe przed publikacją

- [ ] **Utwórz aplikację** w Play Console:
  - Nazwa: "Racefy"
  - Domyślny język: polski lub angielski
  - Typ: Aplikacja (nie gra)
  - Darmowa (z in-app purchases)

- [ ] **Privacy Policy URL** — link do polityki prywatności
  - Musi być publicznie dostępny URL (np. `https://racefy.io/privacy`)
  - Musi opisywać zbierane dane: lokalizacja, zdrowie, konto, aktywność

- [ ] **Content Rating** — kwestionariusz IARC
  - Play Console → Policy → App content → Content rating
  - Odpowiedz na pytania o treści w aplikacji
  - Otrzymasz rating automatycznie (np. PEGI, ESRB)

- [ ] **Target Audience & Content**
  - Ustaw na **18+** (najprostsze, omija wymogi COPPA dla dzieci)
  - Lub jeśli chcesz szerszy target: wypełnij dodatkowe wymagania

- [ ] **Data Safety** — formularz o danych
  - Play Console → Policy → App content → Data safety
  - Dane do zadeklarowania:

  | Typ danych | Zbierane | Udostępniane | Cel |
  |---|---|---|---|
  | Lokalizacja (precyzyjna) | Tak | Nie | Funkcjonalność (tracking GPS) |
  | Dane zdrowotne (tętno) | Tak | Nie | Funkcjonalność (Health Connect) |
  | Email / nazwa użytkownika | Tak | Nie | Zarządzanie kontem |
  | Zdjęcia / wideo | Tak | Tak (feed) | Funkcjonalność społecznościowa |
  | Aktywność w aplikacji | Tak | Nie | Analityka |
  | Identyfikatory urządzenia | Tak | Nie | Analityka (Firebase) |
  | Zakupy | Tak | Nie | In-app purchases (RevenueCat) |

- [ ] **App Signing** — włączyć Google Play App Signing
  - Play Console → Setup → App signing
  - Zalecane: pozwól Google zarządzać kluczem podpisywania
  - EAS automatycznie wygeneruje upload key

### Store Listing (grafiki i opisy)

- [ ] **Ikona** — 512x512 PNG, 32-bit, bez alfa
- [ ] **Feature Graphic** — 1024x500 PNG/JPG
- [ ] **Screenshoty telefonu** — min. 2, max 8
  - Format: 16:9 lub 9:16, min. 320px, max 3840px
  - Zalecane: 1080x1920 (portrait)
- [ ] **Screenshoty tabletu** — opcjonalne ale zalecane (7" i 10")
- [ ] **Krótki opis** — max 80 znaków
  - np. "Sledz aktywnosci sportowe, dolacz do spolecznosci biegaczy"
- [ ] **Pełny opis** — max 4000 znaków
- [ ] **Kategoria**: Health & Fitness
- [ ] **Tagi**: fitness, running, cycling, activity tracker, GPS

---

## Faza 4: Konfiguracja EAS Credentials

- [ ] **Sprawdź/wygeneruj upload keystore**:
  ```bash
  cd RacefyApp && eas credentials --platform android
  ```
  - EAS wygeneruje keystore automatycznie przy pierwszym buildzie
  - Wybierz "Generate new keystore" jeśli nie masz

- [ ] **Backup keystore** (WAŻNE — utrata = nowa aplikacja w sklepie):
  ```bash
  eas credentials --platform android
  # → Download Keystore
  ```
  - Zapisz w bezpiecznym miejscu (nie w repo!)

- [ ] **Upload certificate do Google Play** (jeśli Google Play App Signing jest włączone):
  - EAS pokaże SHA-1 fingerprint upload key
  - Play Console → Setup → App signing → Upload key certificate

---

## Faza 5: Pierwszy build produkcyjny

- [ ] **Upewnij się że versionCode jest prawidłowy** (`app.config.ts`)
  - Obecny: `versionCode: 15`
  - Każdy upload do Google Play wymaga wyższego versionCode
  - Przy kolejnych release'ach: inkrementuj o 1

- [ ] **Zbuduj AAB**:
  ```bash
  cd RacefyApp

  # Przez deploy script:
  npm run deploy
  # → wybierz opcję 2 (Production AAB)

  # Lub bezpośrednio:
  eas build --platform android --profile production
  ```

- [ ] **Poczekaj na build** — śledź na:
  - https://expo.dev/accounts/sebastiantarka/projects/RacefyApp/builds

- [ ] **Pobierz AAB** po zakończeniu buildu

---

## Faza 6: Upload i testowanie

### Internal Testing (zalecane na start)

- [ ] Play Console → Testing → Internal testing → Create new release
- [ ] Upload AAB
- [ ] Dodaj testerów (adresy email Google)
- [ ] Opublikuj release na Internal Testing
- [ ] Testerzy instalują z Google Play (link z konsoli)

### Testy do przeprowadzenia

- [ ] Logowanie email/hasło
- [ ] Google Sign-In
- [ ] Rejestracja nowego konta
- [ ] Śledzenie aktywności GPS (start, pauza, zakończ)
- [ ] Mapa (Mapbox renderuje się poprawnie)
- [ ] Feed — dodawanie postów ze zdjęciami
- [ ] Push notyfikacje (FCM)
- [ ] Health Connect — odczyt tętna
- [ ] Deep links (https://racefy.io/...)
- [ ] Profil użytkownika — edycja, avatar
- [ ] Subskrypcje — zakup, odblokowanie funkcji (sandbox)

### Promocja do produkcji

- [ ] Po pomyślnych testach: Play Console → Production → Create release
- [ ] Upload tego samego AAB (lub promuj z Internal Testing)
- [ ] Wyślij do review
- [ ] ⏱ Review Google: **1-7 dni** dla nowych aplikacji (później 1-3 dni)

---

## Faza 7: Po publikacji

- [ ] **Monitoring** — sprawdź Android Vitals w Play Console (crashe, ANR)
- [ ] **Odpowiadaj na recenzje** — Play Console → Ratings and reviews
- [ ] **RevenueCat webhook** — podłącz do produkcyjnego API:
  - RevenueCat → Integrations → Webhooks → URL: `https://racefy.io/api/webhooks/revenuecat`
- [ ] **Ustaw automatyczny submit** (opcjonalnie):
  ```bash
  # Konfiguracja w eas.json → submit.production:
  # "android": { "track": "internal" }
  ```

---

## Przydatne komendy

```bash
# Sprawdź EAS env vars
eas env:list production --include-sensitive
eas env:list preview --include-sensitive

# Historia buildów
eas build:list --platform android --limit 5

# Credentials
eas credentials --platform android

# Deploy script (interaktywny)
cd RacefyApp && npm run deploy
```

---

## Notatki

- **Domena**: racefy.io (jedyna posiadana). API: `https://racefy.io/api`. Staging: `https://app.dev.racefy.io/api`
- **Konto Apple Developer**: już założone — użyj do testu subskrypcji iOS-first
- **Konto Google Play**: organizacja (JDG w Polsce), wymaga numeru DUNS lub dokumentów CEIDG
- **Płatności (RevenueCat)**: konto założone, do skonfigurowania
- **iOS (TestFlight)**: deploy.sh obsługuje opcje 4-6
- **Klucze API do zabezpieczenia w EAS secrets**:
  - `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` — już ustawiony
  - `GOOGLE_WEB_CLIENT_ID` — placeholder dodany, uzupełnij wartość z Firebase
  - `REVENUECAT_APPLE_API_KEY` — do ustawienia
  - `REVENUECAT_GOOGLE_API_KEY` — do ustawienia po konfiguracji Google Play
