# Branche — co czeka na weryfikację przed mergem do `main`

**Zasada aktualizacji:** plik edytujemy **na `main`**, przy mergu — wtedy nie ma
konfliktów między branchami. Po mergu wpis znika z sekcji „W toku" i ląduje
w „Historia" z datą. Nowy branch → nowy wpis w „W toku" od razu przy odgałęzieniu,
nie po fakcie. Checkbox odhaczamy dopiero po sprawdzeniu **na urządzeniu**, nie po
zielonym `tsc`.

Rzeczy prywatne/robocze (surowe analizy, prompty do backendu) zostają w `.notes/`,
które jest w `.gitignore`. Tu trafia tylko to, co ma widzieć każdy, kto klonuje repo.

Stan na: **2026-08-27**

---

## W toku — NIE mergować, dopóki nie odhaczone

### `feature/voice-turn-instructions` — komendy głosowe skrętów na ekranie aktywności (od 2026-08-27, `be5bca6`)

Announcer TTS (`useNavigationAnnouncer`) i overlay z następnym skrętem istniały od
route-planningu, ale wybrana trasa-cień zawsze trafiała do nawigacji z pustą listą
skrętów (`baseTurnInstructions: []`, `useMyPlannedRoutes` gubił `turn_instructions`,
ślady GPS z `/activities/nearby` w ogóle ich nie mają). Nowy `useRouteTurnInstructions`:
skręty routera dla tras z plannera/eventu (dociąga `/routes/{id}`, gdy lista je
pominęła), a dla surowych śladów GPS wylicza je z geometrii (`utils/turnDetection`:
Douglas-Peucker + zmiany azymutu ≥45°, klastrowanie łuków w oknie 30 m — bez nazw
ulic, tylko „skręć w lewo/prawo/ostro/zawróć"). Do tego brakujące klucze i18n
(`navigation.in`, `backOnRoute`) i odmiana jednostek w mowie („za 200 metrów",
„za 1,5 kilometra"). 11 plików. tsc 0 · eslint 0 błędów · jest 217/217
(17 nowych testów).

- [ ] Trasa z plannera (moje trasy): wybrać na ekranie start/stop, ruszyć — 200 m przed skrętem słychać „Za 200 metrów, skręć w lewo w …" (treść z Mapbox) + wibracja; overlay pokazuje strzałkę i dystans
- [ ] Trasa „w pobliżu" (ślad GPS): to samo, ale komunikat bez nazwy ulicy; sprawdzić, czy na prostej z szumem GPS **nie** ma fałszywych skrętów i czy na zakrętach ulicznych są (progi w `utils/turnDetection.ts` DEFAULTS — jeśli za dużo/za mało, kręcić `minAngleDeg` / `simplifyToleranceM`)
- [ ] Trasa eventu (preselekcja z detalu eventu): skręty routera z `event.route.turn_instructions`
- [ ] Język: przy polskim UI TTS mówi po polsku; jeśli treść z Mapbox („Turn left onto …") jest po angielsku → to strona API (patrz `.notes/prompt-backend-turn-instructions.md`)
- [ ] Ekran zgaszony / apka w tle (Android z foreground service, iOS): komunikaty nadal się odzywają — announcer żyje w React effect, więc wymaga działającego JS w tle
- [ ] Muzyka z innej apki ścisza się na komunikat i wraca (`speakDucked`)
- [ ] Odcinek dojścia (start >30 m od trasy): skręty z `/routes/preview` + skręty trasy w poprawnej kolejności i z poprawnym dystansem (offset)
- [ ] „Poza trasą" / „Powrót na trasę" — raz na wejście/wyjście, nie przy każdym odczycie

---

## Na `main`, ale niezweryfikowane runtime

Nie blokuje mergów, ale blokuje **release**. Te rzeczy przeszły tsc/eslint/jest
i nigdy nie zostały obejrzane na urządzeniu.

### Avatar zawodnika na mapie widza (zmergowana 2026-08-27, `a6f76f5`)

Widz widzi na mapie avatar zawodnika zamiast zielonej kropki: `MapboxLiveMap`
dostał opcjonalny prop `athlete` → `MarkerView` z `<Avatar>` w pierścieniu koloru
sygnału GPS. Ekran nagrywania nic nie przekazuje — tam kropka zostaje.
2 pliki. tsc 0 · eslint 0 błędów. **Pierwsze użycie `MarkerView` w repo** —
to warstwa natywna, jest/tsc nic o niej nie mówią.

- [ ] Android + iOS: avatar pojawia się na pozycji zawodnika i **porusza się** z nią (MarkerView aktualizuje `coordinate` bez remountu)
- [ ] Zawodnik bez avatara → inicjał, nie pusty krążek
- [ ] Pierścień sygnału (CircleLayer) nadal widoczny pod avatarem
- [ ] Wydajność przy 3 s ticku pollingu — MarkerView na Androidzie bywa cięższy od warstwy; obserwować klatki na słabszym telefonie
- [ ] Ekran nagrywania: bez zmian (kropka)

### Trasa dla widza dołączającego w trakcie (zmergowana 2026-08-27, `6c84476`)

Widz dołączający do trwającej transmisji dostaje przebytą trasę zamiast pustej
mapy: `useLiveBroadcastFeed` zasiewa `trail` z `snapshot.track`
(`GET /live/{id}?include=track`), dalej dokłada punkty na żywo jak dotąd.
8 plików, 5 nowych testów. tsc 0 · eslint 0 błędów · jest 193/193.

- [x] **API gotowe lokalnie** (2026-08-26) — `?include=track` + `LiveActivityService::visibleTrack()` w `racefy_api.io`, **jeszcze niezacommitowane**. Kontrakt zgodny z mobilką co do znaku: `MultiLineString`, `point_count`, `simplified`, `null` bez fixa, `[]` gdy wszystko ukryte
- [x] Testy API `LiveTrackBackfillTest` — 10/10, w tym rozspojenie na strefie, cap segmentu, brak `track` bez `include`
- [x] Smoke e2e na lokalnym API (port **8080**): 12 punktów → `include=track` zwraca trasę, tick bez `include` jej nie niesie; strefa prywatności na środku trasy → **2 segmenty**. Dane testowe posprzątane (strefa usunięta, aktywność porzucona)
- [x] API zacommitowane i wypchnięte na `main` (`a5636e58`, 2026-08-27); docs zsynchronizowane (`racefy-api-docs` `e57f4fd`)
- [ ] **Deploy API na dev** — do tego czasu obie funkcje na dev są bezczynne (pola opcjonalne, brak = stare zachowanie). Zmergowane na `main` **przed** weryfikacją na urządzeniu, świadomie (2026-08-27) — checklisty zostają otwarte
- [ ] Po deployu: wejść w podgląd transmisji zawodnika, który ma już przebiegnięte kilka km — trasa ma być widoczna od razu
- [ ] Zawodnik z aktywną strefą prywatności na trasie — sprawdzić, że linia jest **rozspojona**, a nie poprowadzona skrótem przez strefę
- [ ] Sprawdzić w logach/sieci, że `include=track` leci **raz**, a nie co tick pollingu
- [ ] Transport `reverb` (jeśli włączony serwerowo) — ten sam scenariusz co wyżej

### Pinezki dopingów na trasie (zmergowana 2026-08-27, `3aafad8`)

Pinezki dopingów na trasie zakończonej aktywności: karta „Doping z transmisji"
pokazuje „na 1,73 km · 8:47", wiersz z pozycją fokusuje pinezkę na mapie
(`MapboxRouteMap.cheerPins`), przełącznik „Doping" obok „km". Wymaga pól
`live_distance` / `live_duration` / `live_position` z API (`main` `a5636e58`) —
starsze wiadomości mają `null` i zostają bez pinezki, to zamierzone.
11 plików, 1 nowy test. Po obu merge'ach na `main`: tsc 0 · eslint 0 błędów · jest 200/200. `docs/api` → `e57f4fd`.

- [ ] Własna zakończona aktywność z transmisją na **lokalnym API** (`live:simulate` + `live:cheer` po migracji `add_live_position_to_comments`) → pinezki na mapie, dotknięcie wiersza przewija do mapy i podświetla pinezkę, dymek z treścią, ✕ zamyka
- [ ] Przełącznik „Doping" chowa pinezki i czyści zaznaczenie; nie pokazuje się, gdy żadna wiadomość nie ma pozycji
- [ ] Wiadomości sprzed migracji (bez `live_distance`) — wiersz bez etykiety dystansu i niedotykalny, brak błędu
- [ ] Zawodnik ze strefą prywatności: jako właściciel widzi pinezkę w strefie (API nie filtruje dla właściciela)
- [ ] Mapa w trybie fallback (obraz/SVG bez tokenu Mapbox) — pinezek brak, karta dalej działa
- [ ] Rozmiary dymka na 375pt @ fontScale 1.3 — `numberOfLines={3}` ma wystarczyć

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

### Wiadomości z transmisji po biegu (zmergowane 2026-08-26, `cb15f08`)

Karta „Doping z transmisji" na szczegółach aktywności. Zmiana wyłącznie mobilna —
API obsługiwało to od początku (`GET /live/{id}/messages` autoryzuje właściciela
niezależnie od `is_live`).

- [x] Potwierdzone na lokalnym API: właściciel dostaje 200 z wiadomościami (także prywatnymi) **po** `finish`, postronny 404
- [ ] Odpalić na urządzeniu: własna zakończona aktywność z transmisją → karta z wiadomościami, prywatne z kłódką
- [ ] Zwykła aktywność bez transmisji → **żadnego** zapytania do `/live/*` (bramka na `live_started_at`) i brak karty
- [ ] Cudza aktywność → brak karty
- [ ] Transmisja z >50 wiadomościami → licznik i lista pokazują wszystkie (paginacja po `after`)

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
| 2026-08-27 | `feature/live-athlete-avatar` | Avatar zawodnika (MarkerView) zamiast kropki na mapie widza |
| 2026-08-27 | `feature/live-cheer-pins` | Pinezki dopingów na trasie zakończonej aktywności + „na X km · m:ss” w karcie; `docs/api` → `e57f4fd` |
| 2026-08-27 | `feature/live-trail-backfill` | Widz dołączający w trakcie dostaje przebytą trasę (`GET /live/{id}?include=track`, MultiLineString, luki po strefach) |
| 2026-08-26 | `feature/live-messages-archive` | Podgląd wiadomości od widzów po zakończeniu aktywności (karta na szczegółach) |
| 2026-08-26 | `responsywnosc` | Clamp skali, cap fontScale, minHeight, tab bar, klawiatura, aspectRatio/flexBasis, sprzątanie martwego kodu |
| 2026-07-09 | `feat/tracking-db` → `develop` → `main` | SQLite point log, idempotentny uploader, gap-bridging, battery UX, audio coach w tle |
| 2026-06 | `audyt` | ESLint/Prettier, testy (jest+RNTL), `useFetch`/`usePaginatedFetch`, dekompozycja `useLiveActivity` |
| 2026-04 | `feature/route-planning` | Fazy 1–5: API routes, biblioteka, planner, trasy eventów, nawigacja live (Pro) |
