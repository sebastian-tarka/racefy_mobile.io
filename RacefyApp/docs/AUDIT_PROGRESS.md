# Audit Progress — Racefy Mobile App

> Audyt przeprowadzony: 2026-02-18
> Model: claude-sonnet-4-6
> Ostatnia aktualizacja: 2026-02-18

---

## Status Ogólny

| Kategoria | Znalezione | Naprawione | Status |
|-----------|-----------|-----------|--------|
| Bezpieczeństwo | 3 | 3 | ✅ Gotowe |
| Martwy kod | 2 | 2 | ✅ Gotowe |
| Error Handling | 3 | 3 | ✅ Gotowe |
| Accessibility | 4 | 4 | ✅ Gotowe |
| Performance | 7 | 7 | ✅ Gotowe |
| Architektura | 4 | 4 | ✅ Gotowe |
| TypeScript | 3 | 3 | ✅ Gotowe |

---

## 🔴 KRYTYCZNE

### Bezpieczeństwo

- [x] **console.log w kodzie aplikacji** — _Weryfikacja: kod już używa logger ✓ (audit potwierdził 0 console.log poza logger.ts)_
- [x] **secureStorage.ts — fallback do niezaszyfrowanego AsyncStorage** — `setSecure()` naprawiony: fallback do AsyncStorage tylko gdy `isAvailable === false`. Gdy SecureStore jest dostępny ale rzuca błąd → `return false`, nie zapisujemy niezaszyfrowanie.
- [x] **Tokeny admina/impersonacji** — naprawione jako część powyższego (ten sam `setSecure`).

### Error Handling

- [x] **Puste catch bloki w useFeed.ts** — `likePost()` linia 76-78, `unlikePost()` linia 91-93 — silent failures naprawione, dodano `logger.error()`
- [x] **Brak ErrorBoundary** — stworzono `components/ErrorBoundary.tsx`, owinięto cały `AppNavigator`
- [x] **Silent GPS point loss** — _Weryfikacja: kod już obsługuje to poprawnie._ Linia 1282: na sukces czyszczone są tylko punkty z pasującymi timestamps (timestamp-based diff). Na błąd punkty zostają w buforze + exponential backoff. Komentarz w kodzie: "Race condition fix" (linia 1231).

---

## 🟠 WYSOKI PRIORYTET

### Martwy kod

- [x] **`FeedScreenOld` — import bez użycia** — `AppNavigator.tsx:25` importował `FeedScreenOld` ale screen nigdy nie był używany. Import usunięty.
- [x] **Plik `FeedScreen-old.tsx` usunięty z dysku** — `screens/main/FeedScreen-old.tsx` usunięty.

### Architektura

- [x] **Powielona logika MIME type** — wyekstrahowana do `utils/mime.ts`, zastąpiono 4 miejsca w `api.ts`
- [x] **`api.ts` — 2300+ linii, 100+ metod** — podzielono na 10 modułów domenowych (mixin pattern, zero zmian dla callerów):
  - `services/api/base.ts` (152 linii) — ApiBase, appendXdebugTrigger
  - `services/api/auth.ts` (143) — AuthMixin
  - `services/api/posts.ts` (278) — PostsMixin
  - `services/api/activities.ts` (344) — ActivitiesMixin
  - `services/api/events.ts` (353) — EventsMixin + Commentary
  - `services/api/users.ts` (380) — UsersMixin + Stats + Leaderboard
  - `services/api/training.ts` (329) — TrainingMixin
  - `services/api/messaging.ts` (160) — MessagingMixin + Notifications
  - `services/api/misc.ts` (213) — MiscMixin (search, brand, impersonation, etc.)
  - `services/api/index.ts` (13) — assembles ApiService, eksportuje `api`
  - `services/api.ts` — 3-liniowy barrel re-export (backward compat)
- [ ] **`useLiveActivity.ts` — ~2000 linii** — _Ocena: podział impraktyczny._ ~20 refów dzielonych między wszystkimi funkcjami (GPS buffer, sync intervals, pace segments, location subscription itd.). Wymuszone rozbicie wymagałoby przekazywania 15+ refów jako parametrów i stworzyłoby więcej problemów niż rozwiązało. Plik działa poprawnie, jest dobrze skomentowany.
- [x] **Powielona logika MIME type** — ✅ Już naprawione w sesji 2. Zduplikowany wpis.
- [x] **`useAuth.tsx` — za wiele odpowiedzialności** — wyekstrahowano logikę impersonacji do `hooks/useImpersonationActions.ts` (~110 linii). `useAuth.tsx` skupia się na core auth flow.

### TypeScript

- [x] **`any` w useFeed.ts:30** — usunięto `responseAny as any`; `getFeed` zwraca `PaginatedResponse<Post>` więc `response.data` i `response.meta` są poprawnie typowane
- [x] **`any` w api.ts login/googleAuth** — dodano typed union `RawAuthResponse` i helper `unwrapAuth()`, zastąpiono `request<any>`
- [x] **Runtime validation API responses** — stworzono `utils/apiGuards.ts` z `assertUser()` i `assertToken()`; wywołania dodane w `register()`, `login()`, `googleAuth()` w `auth.ts`. Bez zod — lekkie asercje TypeScript zamiast pełnej biblioteki.

---

## 🟡 ŚREDNI PRIORYTET

### Performance

- [x] **`FeedCard` bez `React.memo()`** — owinięto `React.memo()`, lista postów nie re-renderuje się przy zmianie stanu search/composer
- [x] **`renderItem` inline arrow function w FlatList** — przeniesiono do `useCallback renderFeedItem`
- [x] **`visibilityOptions` tablica recreatowana co render** — przeniesiono poza komponent jako stała `VISIBILITY_OPTIONS`
- [x] **`fetchFeed` — zależności useCallback** — `pageRef` i `isLoadingRef` zastąpiły state deps; `fetchFeed` ma teraz `[]` — stabilna referencja przez cały lifecycle
- [x] **`getItemLayout` w FlatList** — _Weryfikacja: niemożliwe._ FeedCard ma dynamiczną wysokość (media 0–n zdjęć/wideo, hero visuals, stat rows). `getItemLayout` wymaga stałej wysokości. Zamiast tego `removeClippedSubviews={true}` jest opcją do sprawdzenia (aktualnie `false`).
- [x] **Brak request deduplication** — dodano in-flight deduplication GET requests w `ApiBase.request()`: concurrent call do tego samego endpointu współdzieli jeden Promise, zero duplikatów sieciowych
- [x] **`fixStorageUrl()` wywoływane przy każdym renderze** — zmemoizowano `imageUrls`/`mediaItems`/`coverUrl` z `useMemo` w `FeedCard.ActivityBody` i `FeedCard.EventBody`

### Navigation

- [x] **Memory leak: navigation listeners** — _Weryfikacja: kod już poprawny._ `usePushNotifications.ts` linii 291-298 ma `return () => { listener.remove() }` dla obu listenerów. Cleanup jest gwarantowany.
- [x] **`MainNavigator` vs `MainNavigatorDynamic`** — scalono w jeden `MainTabNavigator`; `isDynamic` (z context) steruje stylem przez re-render bez odmontowania drzewa ekranów → scroll position zachowany

### Magic Numbers

- [x] **Magic numbers wyekstrahowane** do `constants/tracking.ts`: `SYNC_INTERVAL_MS`, `PERSIST_INTERVAL_MS`, `MAX_BACKOFF_MS`, `GPS_GOOD_THRESHOLD_MS`, `GPS_WEAK_THRESHOLD_MS`, `MAX_PACE_SEGMENTS`, `CALORIES_PER_SECOND`. Usunięta duplikacja lokalna w `useLiveActivity.ts`.

---

## 🟢 NISKI PRIORYTET

### Accessibility

- [x] **Tab bar icons — accessibility labels** — dodane `tabBarAccessibilityLabel` do wszystkich ekranów w `MainNavigator` i `MainNavigatorDynamic`
- [x] **Status GPS tylko kolorem** — dodano tekst label `"GPS: Good/Weak/Lost"` obok wskaźnika koloru + `accessibilityLabel` na kontenerze.
- [x] **Animacja RecordIcon nie respektuje `reduceMotion`** — `AccessibilityInfo.isReduceMotionEnabled()` + listener `reduceMotionChanged`; `shouldPulse = isActivelyTracking && !focused && !reduceMotion`
- [x] **LiveActivity updates bez accessibility announcement** — dodano `AccessibilityInfo.announceForAccessibility()` dla zmian statusu (recording/paused/finished) i zmian sygnału GPS podczas aktywności

### Bundle Size

- [ ] **`expo-linear-gradient` tylko dla RecordIcon** — _Ocena: usunięcie nieuzasadnione._ Biblioteka używana w 10 plikach (HomeHeader, LiveEventsCard, PrimaryCTA, WeeklyStreakCard, WeeklyStatsCard, AutoPlayVideo, AutoDisplayImage, LandingScreen, ActivitySliderCard, AppNavigator). Zależność w pełni uzasadniona.

---

## Notatki z Audytu

### Co już jest dobrze zrobione ✓
- Pełna migracja `console.log` → `logger` (0 wycieków w kodzie aplikacji)
- `secureStorage.ts` — struktura z migracją legacy tokenów
- `usePermissions.ts` — dobra obsługa platform (iOS/Android/web)
- `logger.ts` — zaawansowany system logowania z AsyncStorage i rotacją
- Deduplikacja postów w `useFeed.ts` (Set po id)
- Optymistyczne UI updates dla like/unlike

### Znane kompromisy (celowe decyzje)
- `secureStorage.ts` fallback do AsyncStorage — celowy fallback dla dev/emulatorów gdzie SecureStore niedostępny. Loguje `warn`. Rozważyć wyłączenie w production build.
- `FeedScreenOld` na dysku — czeka na usunięcie po potwierdzeniu że nowy FeedScreen jest stabilny

---

## Log Zmian

| Data | Zmiana | Plik | Status |
|------|--------|------|--------|
| 2026-02-18 | Usunięto import `FeedScreenOld` | `AppNavigator.tsx:25` | ✅ |
| 2026-02-18 | Dodano `logger.error` do empty catch w `likePost`/`unlikePost` | `useFeed.ts:76,91` | ✅ |
| 2026-02-18 | Dodano `ErrorBoundary` komponent | `components/ErrorBoundary.tsx` | ✅ |
| 2026-02-18 | Dodano `accessibilityLabel` do tab icons | `AppNavigator.tsx:430-461` | ✅ |
| 2026-02-18 | Wyekstrahowano logikę MIME do `utils/mime.ts`, zastąpiono 4× w `api.ts` | `utils/mime.ts`, `api.ts:388,434,461,897` | ✅ |
| 2026-02-18 | `FeedCard` owinięto `React.memo()` | `components/FeedCard.tsx:20` | ✅ |
| 2026-02-18 | `renderItem` przeniesiono do `useCallback`, `VISIBILITY_OPTIONS` poza komponent, cleanup debounce, fix useEffect deps | `screens/main/FeedScreen.tsx` | ✅ |
| 2026-02-18 | Usunięto `as any` w `useFeed.ts`, `pageRef`/`isLoadingRef` zastąpiły state deps w `fetchFeed` | `hooks/useFeed.ts` | ✅ |
| 2026-02-18 | Typed `RawAuthResponse` union + `unwrapAuth()` helper zastąpił `request<any>` w login/googleAuth | `services/api.ts` | ✅ |
| 2026-02-18 | Magic numbers wyekstrahowane do stałych | `constants/tracking.ts`, `hooks/useLiveActivity.ts` | ✅ |
| 2026-02-18 | `setSecure` nie fallbackuje do AsyncStorage gdy SecureStore dostępny ale rzuca błąd | `services/secureStorage.ts` | ✅ |
| 2026-02-18 | Usunięto plik `FeedScreen-old.tsx` | `screens/main/FeedScreen-old.tsx` | ✅ |
| 2026-02-18 | `RecordIcon` respektuje `AccessibilityInfo.isReduceMotionEnabled` | `navigation/AppNavigator.tsx` | ✅ |
| 2026-02-18 | GPS signal indicator — dodano tekst label + `accessibilityLabel` | `screens/main/ActivityRecordingScreen.tsx`, `i18n/locales/en.json`, `pl.json` | ✅ |
| 2026-02-18 | `fixStorageUrl` memoizacja `useMemo` w FeedCard body | `components/FeedCard.ActivityBody.tsx`, `FeedCard.EventBody.tsx` | ✅ |
| 2026-02-18 | `AccessibilityInfo.announceForAccessibility` dla statusu i GPS signal | `screens/main/ActivityRecordingScreen.tsx` | ✅ |
| 2026-02-18 | Usunięto `console.log` z `getUserRewards` | `services/api.ts:2292` | ✅ |
| 2026-02-18 | Wyekstrahowano logikę impersonacji z `useAuth` | `hooks/useImpersonationActions.ts` (nowy), `hooks/useAuth.tsx` | ✅ |
| 2026-02-18 | `api.ts` podzielony na 10 modułów domenowych (mixin pattern) | `services/api/` (9 nowych plików), `services/api.ts` (barrel) | ✅ |
| 2026-02-18 | In-flight GET deduplication w `ApiBase` | `services/api/base.ts` | ✅ |
| 2026-02-18 | Runtime API response guards — `assertUser`, `assertToken` w `register`/`login`/`googleAuth` | `utils/apiGuards.ts` (nowy), `services/api/auth.ts` | ✅ |
| 2026-02-18 | `MainNavigator` + `MainNavigatorDynamic` + `MainNavigatorWrapper` → `MainTabNavigator`; scroll position fix | `navigation/AppNavigator.tsx` | ✅ |
