# Branche — co czeka na weryfikację przed mergem do `main`

**Zasada aktualizacji:** plik edytujemy **na `main`**, przy mergu — wtedy nie ma
konfliktów między branchami. Po mergu wpis znika z sekcji „W toku" i ląduje
w „Historia" z datą. Nowy branch → nowy wpis w „W toku" od razu przy odgałęzieniu,
nie po fakcie. Checkbox odhaczamy dopiero po sprawdzeniu **na urządzeniu**, nie po
zielonym `tsc`.

Rzeczy prywatne/robocze (surowe analizy, prompty do backendu) zostają w `.notes/`,
które jest w `.gitignore`. Tu trafia tylko to, co ma widzieć każdy, kto klonuje repo.

Stan na: **2026-09-05**

---

## W toku — NIE mergować, dopóki nie odhaczone

_Nic nie czeka._

---

## Na `main`, ale niezweryfikowane runtime

Nie blokuje mergów, ale blokuje **release**. Te rzeczy przeszły tsc/eslint/jest
i nigdy nie zostały obejrzane na urządzeniu.

### Sesje treningu siłowego — kalendarz, ekran sesji, przerwy, zakończenie (zmergowane 2026-09-05, tag `pre-strength-sessions` = main sprzed merge)

Backend faza 4 (`/workout-sessions`, `/workout-session-sets`, `/workout-plans/{id}/sessions`,
`/exercises/{id}/history`). Ekrany: kalendarz planu (dni z treningiem lub notatką, dziś
podświetlone, Start / Wznów / Pomiń, badge completed/skipped ze statystykami), ekran sesji
(stoper od `started_at`, lista ćwiczeń z rozwiniętym bieżącym, wiersze serii z ciężarem i
powtórzeniami/sekundami, Start → Gotowe → cofnij, timer przerwy z sygnałem i wibracją,
automatyczne przejście do kolejnej serii i ćwiczenia, „+ seria", historia ćwiczenia),
zakończenie (RPE 1–10, notatka, widoczność → aktywność) z podsumowaniem i linkiem do
aktywności, pominięcie. Żądania serii idą przez kolejkę (jedno na raz), UI optymistyczne
z cofnięciem przy błędzie. Wznawianie: baner „Sesja w toku" na liście planów, w planie
i w kalendarzu (GET /workout-sessions/current). Ekran nie gaśnie (expo-keep-awake, moduł
z paczki `expo`, bez przebudowy klienta).

- [ ] Kalendarz: dziś podświetlone, dni z notatką bez treningu widoczne, „Start" tworzy sesję i otwiera ekran sesji
- [ ] 409 `in_progress_exists` proponuje wznowienie tej sesji; `already_logged` pokazuje komunikat
- [ ] Sesja: „Start" stempluje serię, „Gotowe" zapisuje ciężar i powtórzenia, pasek postępu i objętość rosną
- [ ] Przerwa: odliczanie od `rest_started_at`, sygnał + wibracja na końcu (także przy wyłączonym ekranie — powiadomienie), następna seria zaznacza się sama
- [ ] Ostatnia seria ćwiczenia → rozwija się następne ćwiczenie; „+ seria" dodaje wiersz z ostatnim ciężarem
- [ ] Szybkie klikanie kilku „Gotowe" pod rząd: żadne żądanie nie ginie, kolejność serii zachowana
- [ ] Błąd sieci przy „Gotowe": wiersz wraca do stanu sprzed, komunikat widoczny
- [ ] Restart aplikacji w trakcie: baner „Sesja w toku", wejście odtwarza stoper i przerwę z serwera
- [ ] Zakończenie z RPE i notatką: podsumowanie (czas, serie, objętość), link otwiera aktywność `strength-training` w feedzie
- [ ] Pominięcie sesji w toku i pominięcie zaplanowanego treningu bez startu: kalendarz pokazuje „pominięte"
- [ ] Historia ćwiczenia z ekranu sesji: ostatnie sesje i najlepszy ciężar, sugerowany ciężar w wierszu serii = ostatni zalogowany
- [ ] Ekran nie gaśnie podczas sesji; po wyjściu z sesji gaśnie normalnie

### Plany siłowe — mobile M1: przeglądanie, edycja, biblioteka, import XLSX (zmergowane 2026-09-05, tag `pre-strength-workouts` = main sprzed merge)

Mobilna strona backendowej funkcji „Strength Workout Plans" (`/workout-plans`,
`/workouts`, `/workout-exercises`, `/exercises`; API gotowe lokalnie). Wejście:
Profil → „Plany siłowe". Ekrany: lista planów (aktywny pierwszy; aktywuj / duplikuj /
usuń), szczegóły planu (tydzień Pn–Nd z treningami i notatkami dni, lista treningów,
kolejność góra/dół), formularz planu, formularz treningu (nazwa, etykieta dnia, dzień
tygodnia, focus, notatki), szczegóły treningu (lista ćwiczeń „4 × 6–10 · 120 s", link
YouTube, kolejność, usuwanie), formularz ćwiczenia w treningu (wybór z biblioteki albo
nowe po nazwie, serie, typ celu, zakres, przerwa, tempo, superset, obciążenie, notatki,
własny link), biblioteka ćwiczeń (szukaj, grupa mięśniowa, moje/globalne, dodaj/edytuj/
usuń z blokadą 409), import XLSX (podgląd: podsumowanie, ostrzeżenia, nowe/istniejące
ćwiczenia, zapis). Sesje treningowe (logowanie serii) czekają na backend.

- [ ] Profil → „Plany siłowe" otwiera listę; pusta lista pokazuje CTA „Nowy plan" i „Import XLSX"
- [ ] Import arkusza z Google Sheets (PLAN TRENINGOWY — …, DZIEŃ N, UKŁAD TYGODNIA): podgląd zgadza się z arkuszem, ostrzeżenia czytelne, zapis tworzy plan i otwiera jego szczegóły
- [ ] Aktywacja planu archiwizuje poprzedni aktywny (lista odświeża się, badge „Aktywny" przeskakuje)
- [ ] Dwa treningi na ten sam dzień tygodnia: 422 pokazane przy polu, nie jako crash
- [ ] Ćwiczenie z listy: tap → edycja, long-press → góra / dół / usuń; kolejność zapisuje się (reorder)
- [ ] Link YouTube z ćwiczenia otwiera się w przeglądarce/aplikacji YT
- [ ] Biblioteka: usunięcie ćwiczenia użytego w planie daje komunikat 409 z liczbą użyć, nie generyczny błąd
- [ ] Ćwiczenie globalne: bez przycisku edycji dla zwykłego użytkownika, widoczne w wyborze
- [ ] Duplikacja planu tworzy szkic z kopią treningów
- [ ] Dark mode: karty, badge statusu, pasek tygodnia czytelne

### Interwały (Faza 2) + panel pod kaflami sportów (zmergowane 2026-09-05, tag `pre-workout-intervals` = main sprzed merge)

Faza 2 z `.notes/KONFIGURATOR_TRENINGU_PLAN.md`: w arkuszu celu kafel „Interwały" jest
aktywny — presety (8 × 400 m / 200 m, 10 × 1 min / 1 min, 4 × 5 min / 90 s) i builder
(powtórzenia, praca, odpoczynek, rozgrzewka, schłodzenie; każdy krok czasem albo dystansem;
pasek planu i szacowany czas). Karta HUD w trakcie pokazuje odcinek, pozostały
czas/dystans, „Następnie", pasek odcinka i pasek planu z pozycją; „Pomiń" kończy odcinek.
Sygnały: odliczanie 3-2-1 (beepy, tylko foreground), „za 100 m: odpoczynek", ton + głos
na każdej granicy, fanfara + „Trening ukończony" na końcu. Zmiana planu interwałów w
trakcie startuje od teraz (cel prosty dalej liczy od startu). Tło: granice odcinków w
tasku GPS; granica czasowa zabezpieczona lokalnym powiadomieniem jak cel czasowy.

Osobno: siatka kafli sportów na Idle (stats i map) dostała półprzezroczysty panel pod
spodem — kafle nie leżą już luzem na mapie.

- [ ] Arkusz: preset zaznacza się z ptaszkiem, builder rozpina preset (presetId znika po edycji), „≈ 45 min" liczy się z presetu i z buildera
- [ ] Zapis: stopka „Zapisz cel · 8 × 400 m / 200 m", wiersz GOAL na Idle pokazuje ten sam opis
- [ ] Start (symulator DEV): rozgrzewka → beepy 3-2-1 → ton + „Praca 1 z 8: 400 metrów" → „za 100 metrów: odpoczynek" → ton niski + „Odpoczynek: 200 metrów" → … → fanfara + „Trening ukończony", aktywność liczy dalej
- [ ] Karta: kolor odcinka (praca = primary, odpoczynek = bursztyn, rozgrzewka/schłodzenie = niebieski), pozostały czas pulsuje w ostatnich 3 s, pasek planu przesuwa się
- [ ] „Pomiń" kończy bieżący odcinek natychmiast, bez odliczania; na odcinku „open" to jedyna droga dalej
- [ ] Ekran zablokowany: wiersz „PRACA 3/8 · 0:47"
- [ ] Tryb mapy: linia „PRACA 3/8 · 0:47 → 200 m odpoczynek"
- [ ] Android, ekran wyłączony, odcinek czasowy 30 s: granica słyszalna (task GPS w ruchu / powiadomienie w bezruchu); iOS: zapisać opóźnienie
- [ ] Pauza w środku odcinka → wznowienie liczy od miejsca pauzy; powiadomienie nie strzela w pauzie
- [ ] Zmiana planu w trakcie: nowy plan startuje od teraz, stare odcinki nie wracają
- [ ] Split km tuż przy granicy odcinka: słychać tylko granicę
- [ ] Tło pod kaflami sportów czytelne w light i dark, na mapie satelitarnej i outdoors

### Konfigurator treningu: cel czasu/dystansu + sygnały + kafle sportów (zmergowane 2026-09-05, tag `pre-workout-configurator` = main sprzed merge)

Faza 0 + 1 z `.notes/KONFIGURATOR_TRENINGU_PLAN.md`: model `WorkoutPlan`, czysty silnik
odcinków (`services/workout/engine.ts`, testy Jest), krótkie dźwięki (earcony) przez
`expo-av`, arkusz „Szybki cel" (czas albo dystans) na ekranie aktywności, karta postępu
w trakcie nagrywania, komunikat głosowy + sygnał + wibracja na połowie i na mecie celu.
Bez autostopu po celu (decyzja). Wszystko free. Interwały to osobna faza.

Tło: cel dystansowy oceniany w zadaniu GPS w tle (ten sam mechanizm co komunikaty
co kilometr); cel czasowy w tle zabezpieczony lokalnym powiadomieniem z dźwiękiem
zaplanowanym na moment mety (przeplanowanie przy pauzie/wznowieniu).

- [ ] Idle: ikona flagi w toolbarze (stats i map) otwiera arkusz; chip z celem pod siatką sportów; „×" czyści
- [ ] Arkusz: chipy presetów, stepper, wartość własna; mile dla użytkownika imperial
- [ ] Start z celem dystansowym (symulator DEV): karta postępu liczy, „połowa" i „cel osiągnięty" — głos + sygnał + wibracja, aktywność liczy dalej
- [ ] Start z celem czasowym: to samo z ekranem włączonym
- [ ] Cel czasowy, ekran wyłączony, Android: sygnał na mecie słyszalny (task GPS lub powiadomienie); iOS: to samo — zapisać faktyczne opóźnienie
- [ ] Muzyka ze Spotify: komunikat ścisza, muzyka wraca
- [ ] Split „kilometr N" tuż przy mecie celu: nie nakładają się (split pominięty w oknie 3 s)
- [ ] Pauza przed metą → wznowienie → cel liczy od miejsca pauzy; powiadomienie nie odpala w trakcie pauzy
- [ ] Restart apki w trakcie: karta wraca, komunikat „cel osiągnięty" nie powtarza się
- [ ] Ekran zablokowany: wiersz celu widoczny nad timerem
- [ ] PausedView: wiersz „Cel: 5 km — 3,2 km (64 %)"; po zapisie/odrzuceniu cel znika z Idle
- [ ] Głos AI (Plus/Pro) włączony: komunikaty celu grają natychmiast (głos systemowy), splity dalej głosem AI

Dołożone w trakcie (mockupy „Racefy v2" + arkusz kafli sportów):

- [ ] Idle: sekcja GOAL — segment „Bez celu | Dystans | Czas" bez celu, wiersz „5,0 km · Dotknij, aby zmienić" z celem; to samo w trybie mapy
- [ ] Arkusz „Ustaw cel": kafle typu (Interwały wyszarzone „Wkrótce"), stepper + presety (Półmaraton/Maraton), sygnały z podpisami, stopka „Zapisz cel · 5,0 km"; w trakcie: „Zmień cel" + „Usuń cel / Zastosuj"
- [ ] Karta HUD w trakcie: duża wartość „zostało", pasek, „Edytuj"; bez celu — przerywany wiersz „Ustaw cel w trakcie"
- [ ] Ilustrowane kafle sportów (3 w rzędzie) na Idle i w trybie mapy, miniatury w modalu wyboru sportu; dark i light; sport bez ilustracji dostaje kafel „R"
- [ ] Kafle na małym ekranie: siatka przewija się, przycisk START nie zasłania sekcji GOAL

### Doping z transmisji: odstęp karty, czytelność zaznaczenia, kolizja na mapie (2026-08-31)

Trzy rzeczy zgłoszone ze zrzutów ekranu.

1. Karta „Doping z transmisji" miała `marginHorizontal` bez `marginTop`, podczas
   gdy wszystkie pozostałe karty na ekranie aktywności używają `styles.section`
   z obydwoma — stąd inny odstęp od karty powyżej.
2. Zaznaczona wiadomość dostawała pełne tło w `colors.primaryLight`, a teksty
   drugoplanowe (godzina, „na 2.57 km · 19:21", „Widoczne tylko dla Ciebie")
   zostawały w `textMuted` — na zielonym bloku praktycznie nieczytelne. Teraz
   zaznaczenie to tint `primary` z alfą, zaokrąglony róg i akcentowa krawędź po
   lewej; kolory tekstu nie zmieniają się, więc kontrast zostaje.
3. Na mapie dymek wybranego dopingu (`left/right/bottom: 12` w `MapboxRouteMap`)
   lądował dokładnie na wskaźniku prywatności („Start/meta ukryte przed innymi",
   `bottom/left: spacing.md` w ekranie). Wskaźnik i kontrolki mapy siedziały
   zresztą w dwóch niezależnych absolutach na tej samej wysokości i przy dłuższej
   etykiecie potrafiły najechać na siebie. Teraz oba są w jednym pasie
   (`space-between`, etykieta kurczy się i skraca do jednej linii), pas jest
   mierzony, a jego wysokość idzie do mapy jako `calloutBottomInset` — dymek
   ustawia się nad nim. Pusty „pill" prywatności (ikona bez tekstu, dla
   oglądającego z dostępem do startu/mety) przestał się renderować.

- [ ] Tap w wiadomość na karcie: dymek na mapie **nad** paskiem, nic nie zasłania „Start/meta ukryte przed innymi" ani przycisków
- [ ] To samo po rozwinięciu mapy (500 px) i po zmianie orientacji
- [ ] Zaznaczona wiadomość na karcie: godzina, dystans i „Widoczne tylko dla Ciebie" czytelne w light i dark
- [ ] Odstęp karty „Doping z transmisji" taki sam jak między pozostałymi kartami
- [ ] Długa etykieta prywatności nie nachodzi na „Rozwiń mapę" (skraca się wielokropkiem)
- [ ] Cudza aktywność z widocznym startem/metą: pilla prywatności nie ma wcale, kontrolki mają całą szerokość

### Usunięty martwy profil + widget „trenują teraz" prowadzi do transmisji (2026-08-31)

`DynamicProfileScreen` (1846 linii) nie był importowany znikąd — redesign, który
nigdy nie został podpięty, ten sam wzorzec co usunięty wcześniej
`USE_DYNAMIC_HOME`. Poszedł, a z nim `ProfileScreenWrapper` (istniał tylko po to,
żeby przepchnąć propsy przez `as any` — teraz `AppNavigator` renderuje
`ProfileScreen` wprost, a rzutowanie na złożony typ nawigacji siedzi w samym
ekranie) i `DraftsTab`, który po zwinięciu profilu do jednej listy stracił
ostatniego użytkownika. Razem 2079 linii mniej.

Osobno: widget „X osób trenuje teraz" na Home prowadził do zakładki Feed, czyli
do listy **zakończonych** aktywności. Teraz otwiera ekran transmisji na żywo.

- [ ] Zakładka Profil otwiera się i działa jak przed usunięciem wrappera (zwłaszcza nawigacja do ekranów root stacka: Ustawienia, Edytuj profil, Powiadomienia)
- [ ] Zakładka Szkice nadal działa (publikacja, edycja, usuwanie) po usunięciu `DraftsTab`
- [ ] Tap w widget „trenują teraz" na Home otwiera listę transmisji
- [ ] Sprawdzić, czy licznik w widgecie zgadza się z tym, co widać na ekranie transmisji — patrz uwaga niżej

**Uwaga:** `active_users_count` w sekcji `live_activity` liczy osoby **trenujące**,
a ekran transmisji pokazuje tylko tych, którzy faktycznie **nadają**. Jeśli te
liczby rozjeżdżają się w praktyce (widget mówi 12, lista pokazuje 2), to temat na
rozmowę z backendem, a nie do naprawy po stronie mobile.

### Profil: edycja z karty i rozdzielone statystyki (2026-08-31)

Punkty E i F z analizy. Edycja profilu była dostępna wyłącznie przez koło zębate
→ Settings → Edytuj profil, a awatar i cover nie reagowały na dotyk — trzy kroki
do zmiany zdjęcia na ekranie, który jest o tym zdjęciu. Teraz w karcie profilu
jest przycisk „Edytuj profil" obok awatara, a sam awatar też prowadzi do
`EditProfile`. Cover celowo został nieklikalny: siedzi na nim absolutnie
pozycjonowane koło zębate i zagnieżdżony touchable potrafiłby przechwycić ten tap
na Androidzie.

Wiersz statystyk mieszał dwa światy w czterech kolumnach (aktywności, „Łącznie",
obserwujący, obserwowani), przy czym „Łącznie" nie mówiło łącznie czego. Teraz
trzy nazwane metryki treningowe (Aktywności / Dystans / Czas — wszystkie już były
w `UserStats`, żadnego nowego zapytania), pod nimi linia o bieżącej formie
(`this_month`, ukrywana przy zerze), a para społecznościowa w osobnym wierszu,
nadal klikalna, z badge'em oczekujących próśb.

Przy okazji: `es.json` nie miało w `profile.stats` nawet klucza `activities`,
więc pierwsze podejście do tłumaczeń w ogóle tam nie weszło. Sprawdzone
w runtime i18next dla wszystkich trzech języków, łącznie z polskimi liczebnikami.

- [ ] Przycisk „Edytuj profil" widoczny i wyrównany do dołu awatara (light i dark, długie nazwy użytkownika)
- [ ] Tap w awatar otwiera edycję; koło zębate na coverze **nadal** otwiera ustawienia
- [ ] Trzy metryki treningowe mieszczą się w jednym wierszu na wąskim ekranie (dłuższe wartości: „1234 km", „567h 12m")
- [ ] Linia „N aktywności w tym miesiącu" pokazuje się tylko przy N > 0 i ma poprawną odmianę po polsku
- [ ] Obserwujący/Obserwowani nadal otwierają modal, badge oczekujących próśb na miejscu
- [ ] Hiszpański UI: Distancia / Tiempo / „N actividades este mes"

### Profil: przyklejone zakładki, siatka skrótów, cache zakładek (2026-08-30)

Kolejne punkty z analizy profilu. Nagłówek listy miał ~900 px (cover, karta
profilu, siedem kart nawigacyjnych, pasek zakładek), więc zakładki startowały
poniżej pierwszego ekranu, a przełączenie którejkolwiek wymagało powrotu na górę.
`FlatList` zamieniony na `SectionList`: nagłówek to profil plus skróty, a pasek
zakładek jest przyklejonym nagłówkiem sekcji (`stickySectionHeadersEnabled`).
Treść zależna od zakładki (filtr sportów, cały blok statystyk) jedzie jako
pierwszy wiersz danych, żeby przewijała się pod paskiem zamiast być z nim
przypięta — w konsekwencji pusty stan przeniósł się z `ListEmptyComponent` do
stopki, bo zakładka z wierszem extras nigdy nie jest dla listy „pusta".
Sześć skrótów (poza treningiem, który niesie postęp) to teraz siatka 2 kolumny —
nowy wariant `layout="tile"` w `ProfileSectionCard`. Zakładki mają cache: dane
starsze niż 2 minuty ładują się od nowa, świeższe są reużywane, a pull-to-refresh
i zdarzenia mutacji omijają cache. Przy zmianie zakładki, gdy scroll był poniżej
nagłówka, lista przypina się do jego końca.

Do tego zgłoszony problem ze szkicami: nowy szkic (post AI po aktywności) powstaje
po stronie serwera i klient nie ma o tym żadnego sygnału, więc trzeba było ręcznie
pociągnąć palcem. Teraz otwarta zakładka Szkice przeładowuje się przy powrocie na
ekran, a licznik w badge'u służy za wykrywacz nieaktualności: gdy total różni się
od liczby wczytanych szkiców, cache tej zakładki jest kasowany.

- [ ] Pasek zakładek faktycznie przykleja się do góry przy przewijaniu (Android **i** iOS — `stickySectionHeadersEnabled` ma różne domyślne)
- [ ] Wiersze nie prześwitują przez pasek ani przez odstęp pod nim
- [ ] Siatka skrótów: dwie kolumny, teksty się nie ucinają, kafelek „Live" nadal pokazuje licznik
- [ ] Zakładka Statystyki i Aktywności: filtry i wykresy na miejscu, przewijają się pod paskiem
- [ ] Puste stany (brak postów / szkiców / aktywności / wydarzeń) nadal się pokazują — przeniosły się do stopki listy
- [ ] Przełączanie zakładek w obie strony w ciągu 2 minut nie pokazuje spinnera i nie gubi pozycji
- [ ] Zmiana zakładki przy przewinięciu w dół ląduje na początku treści, nie w pustce (`getScrollResponder().scrollTo` — w jest niedostępne, więc to działa tylko na urządzeniu)
- [ ] Nowy szkic AI po aktywności: wejście na profil pokazuje go bez ręcznego pull-to-refresh
- [ ] Pull-to-refresh nadal działa na każdej zakładce

### Profil: jedna lista i jednostki wg preferencji (2026-08-30)

Dwie rzeczy z analizy ekranu profilu. (1) Dystans w wierszu statystyk był liczony
`total_distance / 1000` z dosłownym „km" w JSX — ekran w ogóle nie importował
`useUnits`, więc konto imperialne widziało kilometry. (2) `ProfileScreen` trzymał
**dwie** listy naraz (`DraftsTab` zamontowany i schowany „żeby nie mrugało"), obie
z tym samym `ListHeaderComponent` — nagłówek renderował się dwa razy, a wraz z nim
`ProfileNavigationSections`, więc `getCurrentPrograms()` leciało 2× przy każdym
focusie, `/live/broadcasts` 2× przy wejściu, a szkice pobierały się przy każdej
wizycie na profilu, nawet gdy nikt nie otwierał tej zakładki. Teraz jest jedna
lista obsługująca też szkice (`useDrafts` ma `autoLoad: false`, więc ładują się
dopiero po wejściu w zakładkę), a nagłówek jest przekazywany jako element —
podwójny ref-hack wokół `stableProfileHeader` zniknął. Zmierzone: stary układ
renderował nagłówek 2×, forma elementowa nie remountuje go przy re-renderze
(mounts=1 przy 3 renderach), więc awatar nie ma prawa mrugać.

- [ ] Konto imperialne: w wierszu statystyk profilu są mile, nie kilometry
- [ ] Zakładka Szkice: lista się ładuje po wejściu, publikacja przenosi do Postów, usuwanie zdejmuje badge
- [ ] Przełączanie zakładek tam i z powrotem — awatar i cover nie mrugają
- [ ] Pull-to-refresh działa na każdej zakładce, w tym na Szkicach
- [ ] Pusty stan Szkiców wygląda jak pozostałe zakładki (nie jest już centrowany w pionie — to zmiana)
- [ ] Doładowywanie kolejnych stron szkiców przy scrollu

### Rozkład wysiłku na ekranie aktywności (2026-08-28)

Nowa karta `EffortBreakdownCard` (SVG, bez biblioteki wykresów) pod statystykami,
nad wykresami wydajności: krzywa znormalizowanego wysiłku, pasma faz, linia
odniesienia 1.0, metryki pacingu. Do tego badge werdyktu na `ActivityCard`
z `analysis_summary`. Endpoint `/activities/{id}/analysis` rozgałęzia się po
statusie HTTP, więc `ApiBase` dostał `requestWithStatus()` — `request()` robił
`response.json()` bezwarunkowo i wykrzaczał się na pustym body 204.
tsc 0 · eslint 0 błędów · jest 266/266 (34 nowe testy, w tym render karty).

- [ ] Aktywność z programem/GPS ≥ 8 min i ≥ 1 km: karta się pokazuje, krzywa i pasma faz czytelne w light i dark
- [ ] Aktywność < 8 min / < 1 km / bieżnia: karty **nie ma** (204) — i nie leci pętla requestów
- [ ] Świeżo zakończona aktywność: widać stan „przeliczanie", po wyjściu i powrocie na ekran karta sama się dolicza (202 → 200)
- [ ] Cudza publiczna aktywność: identyczna karta co u właściciela; cudza prywatna: brak karty (404)
- [ ] Aktywność z pauzą: krzywa ma przerwę, nie prostą przez wykres
- [ ] Konto z jednostkami imperialnymi: oś dystansu w milach
- [ ] Po dogrywce tętna z Health Connect / Apple Health pojawia się metryka dryfu tętna (cache analizy jest invalidowany)
- [ ] Badge werdyktu na kartach w feedzie i liście aktywności — i **brak** badge'a przy `quality: low`

### Brakujące sekcje ekranu Home (2026-08-28)

`/home/config` zwracał dla konta z aktywnym programem 5 sekcji, a ekran rysował
1 — reszta ginęła bez śladu. Trzy przyczyny: (1) `SectionRenderer` nie miał
`case` dla `weekly_training_progress`, `training_goal_progress`
i `program_phase_intro` (leciały w `default:` → `logger.warn` + `null`),
(2) `friend_activity` przychodzi z API jako sama treść AI, bez tablicy
`friend_activities`, a komponent bez listy zwracał `null`, (3) `weather_insight`
trzyma dane w `meta`, a komponent czytał nieistniejące `section.weather` —
stąd brak temperatury, zawsze domyślna ikona i neutralny kolor tła.
Dorobione trzy komponenty sekcji, fallback tekstowy dla `friend_activity`,
`getSectionWeather()` czytający `meta` z fallbackiem na stare `weather`,
deterministyczna mapa `condition` → ikona (OpenWeather `main` — `Drizzle` nie
zawiera „rain") i podpięcie `section.action` do `executeCtaActionFromTab`, więc
CTA sekcji trafia w `TrainingWeekDetail`/`GoalDetail` z właściwym id.
Przy okazji usunięty martwy flag `USE_DYNAMIC_HOME` (+ `src/config/features.ts`,
którego komentarz opisywał nieistniejący `HomeScreenWrapper`).
tsc 0 · eslint 0 błędów · jest 227/227 (8 nowych, na prawdziwym payloadzie ze stage).

- [ ] Konto z aktywnym programem treningowym: na Home widać kartę „Ten tydzień" z paskiem postępu i streakiem oraz kartę celu z paskiem i statusem tempa
- [ ] Karta pogody pokazuje temperaturę i „odczuwalną", ikona zgadza się z pogodą, tło zielone/pomarańczowe tylko gdy API poda `is_good_for_outdoor`
- [ ] Tap w „Przejrzyj plan" otwiera właściwy tydzień treningowy, tap w cel — właściwy cel
- [ ] Sekcja o znajomym („X trenuje teraz") jest widoczna mimo braku listy aktywności i klika się w całości
- [ ] Program w pauzie: sprawdzić, co przychodzi jako `resume_training` — sekcji o tym typie **nadal nie ma** (jest tylko akcja CTA), więc jeśli backend ją wysyła, wciąż zniknie
- [ ] Liczby w `training_goal_progress` przy jednostkach imperialnych (konto z `units: imperial`)

### Komendy głosowe skrętów na ekranie aktywności (zmergowana 2026-08-27, `6ecddb9`)

Announcer TTS (`useNavigationAnnouncer`) i overlay z następnym skrętem istniały od
route-planningu, ale wybrana trasa-cień zawsze trafiała do nawigacji z pustą listą
skrętów (`baseTurnInstructions: []`, `useMyPlannedRoutes` gubił `turn_instructions`,
ślady GPS z `/activities/nearby` w ogóle ich nie mają). Nowy `useRouteTurnInstructions`:
skręty routera dla tras z plannera/eventu (dociąga `/routes/{id}`, gdy lista je
pominęła), a dla surowych śladów GPS wylicza je z geometrii (`utils/turnDetection`:
Douglas-Peucker + zmiany azymutu ≥45°, klastrowanie łuków w oknie 30 m — bez nazw
ulic, tylko „skręć w lewo/prawo/ostro/zawróć"). Do tego brakujące klucze i18n
(`navigation.in`, `backOnRoute`) i odmiana jednostek w mowie („za 200 metrów",
„za 1,5 kilometra"). Przy okazji (`bce0f8b`): tożsamość trasy-cienia to teraz
`routeKey` = `source:id` (`utils/routeKey.ts`) — id aktywności z `/activities/nearby`
i id tras z `/routes` pochodzą z różnych tabel, więc dedup, klucze list,
podświetlenie i cache dojścia mogły pomylić trasę z aktywnością o tym samym
numerze. 20 plików. tsc 0 · eslint 0 błędów · jest 219/219 (19 nowych testów).

- [ ] Trasa z plannera (moje trasy): wybrać na ekranie start/stop, ruszyć — 200 m przed skrętem słychać „Za 200 metrów, skręć w lewo w …" (treść z Mapbox) + wibracja; overlay pokazuje strzałkę i dystans
- [ ] Trasa „w pobliżu" (ślad GPS): to samo, ale komunikat bez nazwy ulicy; sprawdzić, czy na prostej z szumem GPS **nie** ma fałszywych skrętów i czy na zakrętach ulicznych są (progi w `utils/turnDetection.ts` DEFAULTS — jeśli za dużo/za mało, kręcić `minAngleDeg` / `simplifyToleranceM`)
- [ ] Trasa eventu (preselekcja z detalu eventu): skręty routera z `event.route.turn_instructions`
- [ ] Język: przy polskim UI TTS mówi po polsku; jeśli treść z Mapbox („Turn left onto …") jest po angielsku → to strona API (patrz `.notes/prompt-backend-turn-instructions.md`)
- [ ] Ekran zgaszony / apka w tle (Android z foreground service, iOS): komunikaty nadal się odzywają — announcer żyje w React effect, więc wymaga działającego JS w tle
- [ ] Muzyka z innej apki ścisza się na komunikat i wraca (`speakDucked`)
- [ ] Odcinek dojścia (start >30 m od trasy): skręty z `/routes/preview` + skręty trasy w poprawnej kolejności i z poprawnym dystansem (offset)
- [ ] „Poza trasą" / „Powrót na trasę" — raz na wejście/wyjście, nie przy każdym odczycie
- [ ] Panel tras: moja trasa z plannera i aktywność z okolicy o tym samym `id` pokazują się obie; wybór jednej nie podświetla drugiej (ani na mapie, ani w liście/modalu)

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

Zmergowane i bezpieczne do skasowania lokalnie: `feature/voice-turn-instructions`, `audyt`, `feature/route-planning`,
`feat/tracking-db`, `refactor`, `refactor-trenings`, `release/1.13`.

---

## Historia mergów do `main`

| Data | Branch | Co weszło |
|---|---|---|
| 2026-08-27 | `feature/voice-turn-instructions` | Głosowe „za 200 metrów, skręć w lewo” dla trasy-cienia (skręty routera z plannera/eventu, heurystyka z geometrii dla śladów GPS), odmiana jednostek w mowie, `routeKey` zamiast gołego `id` |
| 2026-08-27 | `feature/live-athlete-avatar` | Avatar zawodnika (MarkerView) zamiast kropki na mapie widza |
| 2026-08-27 | `feature/live-cheer-pins` | Pinezki dopingów na trasie zakończonej aktywności + „na X km · m:ss” w karcie; `docs/api` → `e57f4fd` |
| 2026-08-27 | `feature/live-trail-backfill` | Widz dołączający w trakcie dostaje przebytą trasę (`GET /live/{id}?include=track`, MultiLineString, luki po strefach) |
| 2026-08-26 | `feature/live-messages-archive` | Podgląd wiadomości od widzów po zakończeniu aktywności (karta na szczegółach) |
| 2026-08-26 | `responsywnosc` | Clamp skali, cap fontScale, minHeight, tab bar, klawiatura, aspectRatio/flexBasis, sprzątanie martwego kodu |
| 2026-07-09 | `feat/tracking-db` → `develop` → `main` | SQLite point log, idempotentny uploader, gap-bridging, battery UX, audio coach w tle |
| 2026-06 | `audyt` | ESLint/Prettier, testy (jest+RNTL), `useFetch`/`usePaginatedFetch`, dekompozycja `useLiveActivity` |
| 2026-04 | `feature/route-planning` | Fazy 1–5: API routes, biblioteka, planner, trasy eventów, nawigacja live (Pro) |
