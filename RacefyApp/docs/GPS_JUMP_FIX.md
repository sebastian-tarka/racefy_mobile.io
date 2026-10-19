# GPS Jump Bug Fix - Mobile App

**Data**: 2026-02-05
**Problem**: GPS "skoki" (jumps) o 100m-2600m w 20.5% aktywności śledzonych przez aplikację
**Root Cause**: Wszystkie punkty GPS (także odfiltrowane) były wysyłane do serwera

---

## Problem

### Objawy
- Aktywność 158: skok GPS o 1464m na 99.1% trasy (przy kliknięciu "finish")
- Punkt 524 był identyczny z punktem 53 (z 10% przebiegu) - lokalizacja cache'owana
- 15 z 73 aktywności (20.5%) miało skoki GPS > 100m

### Scenariusz
1. Użytkownik rozpoczyna aktywność
2. W trakcie biegu sprawdza telefon (aplikacja w tle)
3. GPS cache'uje lokalizację z tego momentu
4. Przy kończeniu aktywności aplikacja wraca na pierwszy plan
5. Stara, cache'owana lokalizacja jest wysyłana do serwera
6. Serwer (przed fixem) akceptuje ją → skok o 1.5km

---

## Root Cause - Kod

### Przed naprawą (`useLiveActivity.ts:630-680`)

```typescript
if (dist > effectiveMinDistance && impliedSpeed < gpsProfile.maxRealisticSpeed) {
  // ✅ Punkt OK - aktualizuj statystyki
  localStatsRef.current.distance += dist;
  updateCurrentPace();
  setState((prev) => ({ ...prev, currentStats: { ...localStatsRef.current } }));
}
else if (impliedSpeed >= gpsProfile.maxRealisticSpeed) {
  // ⚠️ Punkt odfiltrowany (za szybki) - tylko log
  logger.gps('GPS point filtered: unrealistic speed', { ... });
}

// ❌ BUG: WSZYSTKIE punkty (także odfiltrowane) dodawane do bufora
lastPosition.current = { lat: smoothedPoint.lat, lng: smoothedPoint.lng, ... };
pointsBuffer.current.push(point); // <- Tu był problem!

lastGpsTime.current = Date.now();
```

**Problem:**
- Linia `pointsBuffer.current.push(point)` była POZA blokiem walidacji
- Filtrowanie (linie 630-670) blokowało tylko aktualizację statystyk
- **Wszystkie punkty GPS (dobre i złe) były wysyłane do serwera**

### Po naprawie

```typescript
if (dist > effectiveMinDistance && impliedSpeed < gpsProfile.maxRealisticSpeed) {
  // ✅ Punkt OK - aktualizuj statystyki
  localStatsRef.current.distance += dist;
  updateCurrentPace();

  // ✅ TYLKO zwalidowane punkty do bufora
  pointsBuffer.current.push(point);

  setState((prev) => ({ ...prev, currentStats: { ...localStatsRef.current } }));
}
else if (impliedSpeed >= gpsProfile.maxRealisticSpeed) {
  // ❌ Punkt odfiltrowany - NIE wysyłaj do serwera
  logger.gps('GPS point filtered: unrealistic speed - NOT synced to server', { ... });
}

// lastPosition używany do obliczeń następnego punktu (może zostać)
lastPosition.current = { lat: smoothedPoint.lat, lng: smoothedPoint.lng, ... };
```

**Naprawa:**
- `pointsBuffer.current.push(point)` przeniesione DO ŚRODKA bloku walidacji
- Tylko punkty spełniające warunki prędkości i odległości są wysyłane
- Odfiltrowane punkty są logowane ale NIE trafiają do serwera

---

## Zmiana

**Plik**: `src/hooks/useLiveActivity.ts`
**Linie**: 630-680

**Co zostało zmienione:**
1. ✅ Przeniesiono `pointsBuffer.current.push(point)` do środka bloku `if` (linia 630)
2. ✅ Dodano komentarz "IMPORTANT: Only validated points are sent"
3. ✅ Zaktualizowano logi w `else if` blokach: "NOT synced to server"
4. ✅ Usunięto błędny `push(point)` spoza bloku walidacji

---

## Backend Fix (już wdrożony)

Dodatkowo backend (`app/Services/GpsTrackService.php`) został wyposażony w drugą warstwę ochrony:

**Metoda**: `filterUnrealisticJumps()`
- Sprawdza prędkość między kolejnymi punktami
- Odrzuca punkty przekraczające `max_realistic_speed` z profilu GPS
- Loguje odrzucone punkty do debugowania
- Ma 20% bufor na niedokładności GPS

**Testy**: 18/18 testów jednostkowych przechodzi ✅

---

## Testowanie

### Testy manualne - WYMAGANE przed wdrożeniem

1. **Test normalnego biegu:**
   - Rozpocznij aktywność
   - Biegnij normalnie (5-10 minut)
   - Zakończ aktywność
   - ✅ Sprawdź: brak skoków GPS w track_data

2. **Test background/foreground:**
   - Rozpocznij aktywność
   - Po 2 minutach: minimalizuj aplikację (background)
   - Czekaj 5 minut
   - Przywróć aplikację (foreground)
   - Kontynuuj jeszcze 2 minuty
   - Zakończ aktywność
   - ✅ Sprawdź: brak skoków GPS przy przełączaniu stanów

3. **Test sprawdzania telefonu w trakcie:**
   - Rozpocznij aktywność
   - Po 2 minutach: odblokuj telefon, sprawdź statystyki
   - Kontynuuj bieg
   - Zakończ aktywność
   - ✅ Sprawdź: brak skoków GPS

4. **Test kończenia z ekranu zablokowanego:**
   - Rozpocznij aktywność
   - Zablokuj telefon
   - Po 5 minutach: odblokuj i natychmiast kliknij "Finish"
   - ✅ Sprawdź: brak skoków GPS przy ostatnich punktach

### Monitoring po wdrożeniu

Sprawdzaj logi (backend):
```bash
# Odrzucone punkty GPS
grep "GPS jump detected" storage/logs/laravel.log

# Statystyki filtrowania
grep "GPS jump filtering completed" storage/logs/laravel.log
```

Jeśli rejection rate > 5% → zbadaj problem w aplikacji mobilnej.

---

## Co dalej?

### Mobile App (ta naprawa)
- ✅ Filtrowanie po stronie klienta (tylko validowane punkty do serwera)
- ⏳ Testy manualne przed wdrożeniem
- ⏳ Monitorowanie po wdrożeniu

### Backend (już wdrożone)
- ✅ Druga warstwa ochrony (serverside filtering)
- ✅ Testy jednostkowe (18/18 passing)
- ✅ Gotowe do wdrożenia

### Przyszłe ulepszenia (opcjonalnie)
1. Dodać `maximumAge: 0` do `getCurrentPositionAsync()` przy foreground
2. Wyczyścić cache GPS przy `onAppForeground()`
3. Nie dodawać "jednego ostatniego punktu" przy finish - używać tylko bufora
4. Dodać testy jednostkowe dla `useLiveActivity.ts`

---

## Wdrożenie

### Staging
```bash
cd ~/PhpstormProjects/racefy_mobile.io/RacefyApp
git add src/hooks/useLiveActivity.ts GPS_JUMP_FIX.md
git commit -m "fix: prevent GPS jumps by filtering points before buffer push

- Move pointsBuffer.push() inside validation block
- Only validated GPS points are sent to server
- Prevents cached/stale locations from corrupting tracks
- Fixes 20.5% of activities having GPS jumps

Ref: Activity 158 GPS jump investigation"

git push
```

### Production
- Przetestuj na staging przez 3-5 dni
- Sprawdź logi: czy rejection rate < 5%
- Zbuduj production build z EAS
- Wdroż stopniowo (staged rollout)

---

## Related Issues

- Backend fix: `GPS_JUMP_FIX_SUMMARY.md` w repo API
- Investigation scripts: `scripts/detect_gps_jumps.php`, `scripts/analyze_activities.php`
- Staging DB scan: 15/73 activities miało GPS jumps przed fixem
