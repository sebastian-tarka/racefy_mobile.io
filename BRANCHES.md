# Branche — co czeka na weryfikację przed mergem do `main`

**Zasada aktualizacji:** plik edytujemy **na `main`**, przy mergu — wtedy nie ma
konfliktów między branchami. Po mergu wpis znika z sekcji „W toku" i ląduje
w „Historia" z datą. Nowy branch → nowy wpis w „W toku" od razu przy odgałęzieniu,
nie po fakcie. Checkbox odhaczamy dopiero po sprawdzeniu **na urządzeniu**, nie po
zielonym `tsc`.

Rzeczy prywatne/robocze (surowe analizy, prompty do backendu) zostają w `.notes/`,
które jest w `.gitignore`. Tu trafia tylko to, co ma widzieć każdy, kto klonuje repo.

Stan na: **2026-08-26**

---

## W toku — NIE mergować, dopóki nie odhaczone

### `feature/live-trail-backfill` — commit `1dec08b` (od `main`/`2a7a7e0`)

Widz dołączający do trwającej transmisji dostaje przebytą trasę zamiast pustej
mapy: `useLiveBroadcastFeed` zasiewa `trail` z `snapshot.track`
(`GET /live/{id}?include=track`), dalej dokłada punkty na żywo jak dotąd.
8 plików, 5 nowych testów. tsc 0 · eslint 0 błędów · jest 193/193.

- [x] **API gotowe lokalnie** (2026-08-26) — `?include=track` + `LiveActivityService::visibleTrack()` w `racefy_api.io`, **jeszcze niezacommitowane**. Kontrakt zgodny z mobilką co do znaku: `MultiLineString`, `point_count`, `simplified`, `null` bez fixa, `[]` gdy wszystko ukryte
- [x] Testy API `LiveTrackBackfillTest` — 10/10, w tym rozspojenie na strefie, cap segmentu, brak `track` bez `include`
- [x] Smoke e2e na lokalnym API (port **8080**): 12 punktów → `include=track` zwraca trasę, tick bez `include` jej nie niesie; strefa prywatności na środku trasy → **2 segmenty**. Dane testowe posprzątane (strefa usunięta, aktywność porzucona)
- [ ] **Zostaje: commit + deploy API na dev** — do tego czasu mobilka jest bezczynna (pole opcjonalne)
- [ ] Po deployu: wejść w podgląd transmisji zawodnika, który ma już przebiegnięte kilka km — trasa ma być widoczna od razu
- [ ] Zawodnik z aktywną strefą prywatności na trasie — sprawdzić, że linia jest **rozspojona**, a nie poprowadzona skrótem przez strefę
- [ ] Sprawdzić w logach/sieci, że `include=track` leci **raz**, a nie co tick pollingu
- [ ] Transport `reverb` (jeśli włączony serwerowo) — ten sam scenariusz co wyżej

### `feature/live-messages-archive` — commit `b0d027a` (od `main`/`4f63fd7`)

Karta „Doping z transmisji" na szczegółach aktywności: zawodnik czyta wiadomości
od widzów po zakończeniu biegu (wcześniej znikały z widoku razem z transmisją).
Zmiana **wyłącznie mobilna** — API już to obsługuje. 9 plików, 6 testów hooka.
tsc 0 · eslint 0 błędów · jest 199/199.

- [x] Potwierdzone na lokalnym API: właściciel dostaje 200 z wiadomościami (także prywatnymi) **po** `finish`, postronny 404
- [ ] Odpalić na urządzeniu: własna zakończona aktywność z transmisją → karta z wiadomościami, prywatne z kłódką
- [ ] Zwykła aktywność bez transmisji → **żadnego** zapytania do `/live/*` (bramka na `live_started_at`) i brak karty
- [ ] Cudza aktywność → brak karty
- [ ] Transmisja z >50 wiadomościami → licznik i lista pokazują wszystkie (paginacja po `after`)

---

## Na `main`, ale niezweryfikowane runtime

Nie blokuje mergów, ale blokuje **release**. Te rzeczy przeszły tsc/eslint/jest
i nigdy nie zostały obejrzane na urządzeniu.

### Responsywność (zmergowana 2026-08-26, `6ddc070`)

Clamp `ms()`, cap `fontScale` na tokenach, `minHeight`, tab bar z kontekstu,
klawiatura, `aspectRatio`/`flexBasis`, 4 usunięte martwe komponenty, `knip.json`.
Plan i uzasadnienia: `.notes/RESPONSYWNOSC_PLAN.md`. Weszła na `main` **przed**
weryfikacją na urządzeniu — checklista zostaje otwarta.

- [ ] iPhone SE2 375×667, locale **pl**, fontScale **1.3** — worst case: krótki ekran + długie stringi
- [ ] Pixel 7 412×915, fontScale **2.0** (a11y max) — obcinanie w kontenerach o stałej wysokości
- [ ] Pixel 7, fontScale 1.0 — padding pod tab barem (`useTabBarPadding`)
- [ ] **Kryterium akceptacji:** przejście Home / Feed / Events / Profile / Recording na 375pt @ fontScale 1.0 **nie pokazuje żadnej różnicy wizualnej** względem stanu sprzed `6ddc070` (czyli `b548374`). Jeśli pokazuje → clamp albo cap źle skalibrowany.
- [ ] `MediaGallery` — media w komentarzach niższe o 39–71px, wymaga akceptacji wzrokowej
- [ ] `minWidth` w siatkach na 320pt
- [ ] Hitbox FAB-a w tab barze na 320pt (`marginTop: -22`, glow 72×72 przy `width/height: 56`)
- [ ] Pixel Fold: złożony → rozłożony **bez restartu** (clamp + zamrożone `Dimensions`) — opcjonalne, wystarczy raz przed release
- [ ] Android split-screen 50/50 — opcjonalne

Priorytet: wiersze 1 i 2 (mały ekran + duża czcionka) — to realny profil użytkownika
Racefy, nie przypadek brzegowy. Zacząć od `ActivityRecordingScreen`, bo tam
użytkownik patrzy w ekran w biegu.

### Redesign eventów (zmergowany)
- [ ] Przejście wizualne: EventDetail single-scroll, EventLive, EventResults, Commentary, lista z FeaturedEventCard
- [ ] „You" highlight w komentarzu — **zablokowane po stronie backendu** (commentary nie niesie `user_id`)
- [ ] Opcjonalnie: martwe style `overview*` w `EventsScreen`

### Niezawodność trackingu GPS (5 faz, zmergowane)
Wymaga **nowego dev/release buildu** — doszły moduły natywne (expo-sqlite,
expo-crypto, expo-battery, expo-intent-launcher).
- [ ] Bench Doze/kill przez adb (Samsung, Xiaomi)
- [ ] Test polowy vs zegarek GPS (dystans + końcówka trasy)
- [ ] Audio coach w tle na realnym buildzie iOS
- [ ] Deklaracja `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` w Play Console
- [ ] Aktualizacja `API_SPEC.md` o `seq` / `client_activity_id` / `segment_break` (uwaga: `docs/api` to **submoduł**, trzeba go zainicjalizować)

### Route planning (fazy 1–5, zmergowane)
- [ ] Potwierdzić, że migracje `2026_04_04_100001_create_planned_routes_table` i `..._100002_add_route_id_to_events_table` zostały odpalone na docelowej bazie
- [ ] Faza 6 (web planner, Mapbox GL JS) — niezaczęta

---

## Blokery release'u spoza kodu

Pełna lista: `RacefyApp/docs/RELEASE_CHECKLIST.md`. Tu tylko to, co realnie stoi:

- [ ] FAZA 3 RevenueCat — nietknięta (potwierdzone: brak `REVENUECAT_APPLE_API_KEY` w EAS production)
- [ ] `eas.json` — we wszystkich profilach (też production) siedzi `GOOGLE_WEB_CLIENT_ID=663721589252-…`, a checklista jako prod podaje `681971140441-voaupb4n3mgj9dhchunviklvsb2m8gha`. Wygląda na klucz ze starego/stage projektu w produkcji — **sprawdzić przed buildem**
- [ ] Hardcoded `REVENUECAT_TEST_KEY` w `src/services/revenuecat.ts:39`
- [ ] Debug keystore do release builds Androida

---

## Branche do decyzji (martwe, nie w `main`)

Wszystkie z lutego 2026, nigdy nie zmergowane. Dokończyć albo skasować —
im dłużej wiszą, tym droższy rebase.

| Branch | Ostatni commit | |
|---|---|---|
| `extra-start-screan` | 2026-02-04 | `permission fix` |
| `new-home` | 2026-02-04 | `profiel update` |
| `refactor-feed-card` | 2026-02-03 | `changes for feed screan` |
| `fix-video-player` | 2026-02-02 | `some refactor` |

Zmergowane i bezpieczne do skasowania lokalnie: `audyt`, `feature/route-planning`,
`feat/tracking-db`, `refactor`, `refactor-trenings`, `release/1.13`.

---

## Historia mergów do `main`

| Data | Branch | Co weszło |
|---|---|---|
| 2026-08-26 | `responsywnosc` | Clamp skali, cap fontScale, minHeight, tab bar, klawiatura, aspectRatio/flexBasis, sprzątanie martwego kodu |
| 2026-07-09 | `feat/tracking-db` → `develop` → `main` | SQLite point log, idempotentny uploader, gap-bridging, battery UX, audio coach w tle |
| 2026-06 | `audyt` | ESLint/Prettier, testy (jest+RNTL), `useFetch`/`usePaginatedFetch`, dekompozycja `useLiveActivity` |
| 2026-04 | `feature/route-planning` | Fazy 1–5: API routes, biblioteka, planner, trasy eventów, nawigacja live (Pro) |
