# Push Notifications Deep Linking - Fix Summary

## 📋 Wprowadzone Zmiany

### Data: 2026-01-29
### Autor: Claude Code Assistant

---

## 🐛 Naprawione Problemy

### 1. ✅ Brak pola `url` w typie `PushNotificationData`
**Lokalizacja:** `src/types/api.ts:1667-1693`

**Problem:** Backend wysyła pole `url` w każdym powiadomieniu push, ale mobilny typ `PushNotificationData` go nie zawierał.

**Rozwiązanie:**
```typescript
export interface PushNotificationData {
  type: NotificationType;
  // ✅ Dodano:
  url?: string;           // Backend-provided URL for navigation (priority source)
  timestamp?: string;     // ISO timestamp when notification was created
  actor_avatar?: string;  // Actor's avatar URL
  // ... rest of fields
}
```

---

### 2. ✅ Nieprawidłowa kolejność parsowania URL
**Lokalizacja:** `src/hooks/usePushNotifications.ts:88-190`

**Problem:** Aplikacja mobilna nie używała pola `url` jako priorytetowego źródła nawigacji. Zamiast tego parsowała każdy typ powiadomienia osobno, co mogło prowadzić do błędów.

**Rozwiązanie:** Zaimplementowano **dwupoziomową strategię nawigacji**:

```typescript
// PRIORITY 1: Use backend-provided URL if available
if (url) {
  const navigated = navigateFromUrl(url, navigation);
  if (navigated) return;
}

// PRIORITY 2: Fallback to type-based navigation
switch (type as NotificationType) {
  // ... type-specific navigation
}
```

**Funkcja `navigateFromUrl()`** obsługuje następujące wzorce URL:
- `/@username` → UserProfile screen
- `/posts/{id}` → PostDetail screen
- `/activities/{id}` → ActivityDetail screen
- `/events/{id}` → EventDetail screen
- `/messages?conversation={id}` → ConversationsList screen

---

### 3. ✅ Brak obsługi typu `boosts`
**Lokalizacja:** `src/hooks/usePushNotifications.ts:179` + `src/types/api.ts:1254`

**Problem:** Typ powiadomienia `'boosts'` był definiowany w backendzie, ale:
- Brak w union type `NotificationType`
- Brak w switch statement obsługi nawigacji

**Rozwiązanie:**
```typescript
// src/types/api.ts
export type NotificationType =
  | 'likes'
  | 'comments'
  | 'follows'
  | 'mentions'
  | 'boosts'        // ✅ Dodano
  | 'activity_reactions'
  // ...

// src/hooks/usePushNotifications.ts
case 'activity_reactions':
case 'boosts':       // ✅ Dodano
  if (data.activity_id) {
    navigation.navigate('ActivityDetail', {
      activityId: data.activity_id,
    });
  }
  break;
```

---

### 4. ✅ Nieprawidłowa nawigacja dla wiadomości (`messages`)
**Lokalizacja:** `src/hooks/usePushNotifications.ts:134-141`

**Problem:**
```typescript
// ❌ Stary kod
case 'messages':
  if (data.conversation_id) {
    navigation.navigate('ConversationsList'); // Nie otwiera konkretnej konwersacji!
  }
  break;
```

**Rozwiązanie:**
```typescript
// ✅ Nowy kod
case 'messages':
  // Navigate to conversations list - Chat screen requires participant data
  // which we don't have in the push notification payload
  navigation.navigate('ConversationsList');
  break;
```

**Wyjaśnienie:** Ekran `Chat` wymaga parametru `participant: ConversationParticipant`, którego nie mamy w payload powiadomienia push. Nawigacja do `ConversationsList` jest optymalna, ponieważ lista konwersacji automatycznie pokazuje najnowszą konwersację na górze.

---

### 5. ✅ Ulepszona logika dla `likes` i `comments`
**Lokalizacja:** `src/hooks/usePushNotifications.ts:109-123`

**Problem:** Niepełna obsługa wszystkich możliwych kombinacji pól (`likeable_type`, `commentable_type`, `post_id`, `activity_id`).

**Rozwiązanie:**
```typescript
case 'likes':
case 'comments':
case 'mentions':
  // Navigate to the liked/commented item
  if (data.likeable_type === 'post' || data.commentable_type === 'post' || data.post_id) {
    const postId = data.post_id || data.likeable_id || data.commentable_id;
    if (postId) {
      navigation.navigate('PostDetail', {
        postId: postId,
        focusComments: type === 'comments' || type === 'mentions',
      });
    }
  } else if (data.likeable_type === 'activity' || data.commentable_type === 'activity' || data.activity_id) {
    const activityId = data.activity_id || data.likeable_id || data.commentable_id;
    if (activityId) {
      navigation.navigate('ActivityDetail', {
        activityId: activityId,
      });
    }
  }
  break;
```

---

## 📊 Mapowanie Powiadomień Push → Ekrany

| Typ Powiadomienia | URL Backendu | Ekran Mobilny | Parametry |
|-------------------|--------------|---------------|-----------|
| `likes` | `/posts/{id}` lub `/activities/{id}` | `PostDetail` lub `ActivityDetail` | `postId` lub `activityId`, `focusComments: false` |
| `comments` | `/posts/{id}` lub `/activities/{id}` | `PostDetail` lub `ActivityDetail` | `postId` lub `activityId`, `focusComments: true` |
| `follows` | `/@{username}` | `UserProfile` | `username` |
| `mentions` | `/posts/{id}` | `PostDetail` | `postId`, `focusComments: true` |
| `boosts` | `/activities/{id}` | `ActivityDetail` | `activityId` |
| `activity_reactions` | `/activities/{id}` | `ActivityDetail` | `activityId` |
| `messages` | `/messages?conversation={id}` | `ConversationsList` | brak (pokazuje listę) |
| `event_reminders` | `/events/{id}` | `EventDetail` | `eventId` |
| `ai_post_ready` | `/posts/{id}` | `PostDetail` | `postId` |
| `points_awarded` | `/events/{id}` | `EventDetail` | `eventId` |
| `weekly_summary` | brak | `Profile` | brak (własny profil) |

---

## 🧪 Instrukcje Testowania

### Przygotowanie środowiska testowego

1. **Backend:** Uruchom artisan command do testowania push notifications
```bash
cd /home/sebastian/PhpstormProjects/racefy_api.io
./vendor/bin/sail artisan push:test --user=1
```

2. **Mobile:** Zbuduj aplikację z włączonymi push notifications
```bash
cd /home/sebastian/PhpstormProjects/racefy_mobile.io/RacefyApp
npm run android  # lub npm run ios
```

3. **Sprawdź token:** Po uruchomieniu aplikacji sprawdź logi, czy token został zarejestrowany:
```
LOG  [general] Device registered for push notifications
```

---

### Test Case 1: Powiadomienie o nowym polubienie posta

**Backend:** Wyślij powiadomienie typu `likes` dla posta
```bash
sail artisan push:test
# Wybierz użytkownika
# Wybierz typ: likes
# Podaj post_id
```

**Oczekiwany rezultat:**
1. ✅ Powiadomienie pojawia się w systemie Android/iOS
2. ✅ Kliknięcie w powiadomienie otwiera aplikację
3. ✅ Aplikacja nawiguje do ekranu `PostDetail` z odpowiednim `postId`
4. ✅ Post jest widoczny na ekranie

---

### Test Case 2: Powiadomienie o nowym komentarzu

**Backend:** Wyślij powiadomienie typu `comments`

**Oczekiwany rezultat:**
1. ✅ Powiadomienie pojawia się
2. ✅ Kliknięcie otwiera ekran `PostDetail` lub `ActivityDetail`
3. ✅ Sekcja komentarzy jest **automatycznie otwarta** (`focusComments: true`)

---

### Test Case 3: Powiadomienie o nowym followerze

**Backend:** Wyślij powiadomienie typu `follows`

**Payload przykładowy:**
```json
{
  "type": "follows",
  "url": "/@johndoe",
  "actor_username": "johndoe",
  "actor_name": "John Doe",
  "actor_avatar": "https://..."
}
```

**Oczekiwany rezultat:**
1. ✅ Powiadomienie pojawia się
2. ✅ Kliknięcie otwiera profil użytkownika `@johndoe` (ekran `UserProfile`)

---

### Test Case 4: Powiadomienie o nowej wiadomości

**Backend:** Wyślij powiadomienie typu `messages`

**Oczekiwany rezultat:**
1. ✅ Powiadomienie pojawia się
2. ✅ Kliknięcie otwiera ekran `ConversationsList`
3. ✅ Lista konwersacji pokazuje najnowszą konwersację na górze

---

### Test Case 5: Powiadomienie o boostowaniu aktywności

**Backend:** Wyślij powiadomienie typu `boosts`

**Oczekiwany rezultat:**
1. ✅ Powiadomienie pojawia się
2. ✅ Kliknięcie otwiera ekran `ActivityDetail` z boostowaną aktywnością

---

### Test Case 6: Powiadomienie o zbliżającym się evencie

**Backend:** Wyślij powiadomienie typu `event_reminders`

**Oczekiwany rezultat:**
1. ✅ Powiadomienie pojawia się
2. ✅ Kliknięcie otwiera ekran `EventDetail` z eventId

---

### Test Case 7: Cold Start (aplikacja zamknięta)

**Scenariusz:**
1. Zabij aplikację całkowicie (usuń z listy aplikacji)
2. Wyślij dowolne powiadomienie push z backendu
3. Kliknij w powiadomienie systemowe

**Oczekiwany rezultat:**
1. ✅ Aplikacja startuje
2. ✅ Po załadowaniu aplikacji następuje automatyczna nawigacja do odpowiedniego ekranu
3. ✅ W logach widoczne: `Cold start from notification`

---

### Test Case 8: Aplikacja w tle (background)

**Scenariusz:**
1. Aplikacja uruchomiona, ale zminimalizowana (w tle)
2. Wyślij powiadomienie push
3. Kliknij w powiadomienie

**Oczekiwany rezultat:**
1. ✅ Aplikacja wraca na pierwszy plan
2. ✅ Następuje natychmiastowa nawigacja do ekranu

---

### Test Case 9: Aplikacja aktywna (foreground)

**Scenariusz:**
1. Aplikacja otwarta i aktywna
2. Wyślij powiadomienie push
3. Kliknij w banner powiadomienia (który pojawia się na górze ekranu)

**Oczekiwany rezultat:**
1. ✅ Banner pojawia się na górze ekranu
2. ✅ Kliknięcie w banner nawiguje do odpowiedniego ekranu
3. ✅ W logach widoczne: `Notification tapped`

---

## 📝 Logi Debugowania

Podczas testowania sprawdź logi w Android/iOS:

**Android:**
```bash
npx react-native log-android | grep "notification\|navigation"
```

**iOS:**
```bash
npx react-native log-ios | grep "notification\|navigation"
```

**Oczekiwane logi przy prawidłowym działaniu:**
```
LOG  [general] Handling notification navigation {type: "likes", url: "/posts/123"}
LOG  [general] Notification tapped {data: {...}}
```

**Błędne logi (problemy):**
```
WARN [general] Navigation not ready for notification deep link
WARN [general] Notification has no type, skipping navigation
ERROR [general] Error parsing notification URL {url: ..., error: ...}
```

---

## 🔄 Integracja z Backendem

### Backend wysyła następujące pola:

```php
// NotificationType::getData()
return [
    'type' => $this->getType(),           // ✅ Wymagane
    'actor_id' => $this->actor->id,       // ✅ Wymagane
    'actor_name' => $this->actor->name,   // ✅ Wymagane
    'actor_username' => $this->actor->username, // ✅ Wymagane
    'actor_avatar' => $this->actor->avatar_url, // ✅ Nowe
    'timestamp' => now()->toIso8601String(),    // ✅ Nowe
    'url' => $this->getUrl(),             // ✅ Nowe, priorytetowe dla nawigacji
    // ... type-specific fields
];
```

### Kluczowe pola backendu:

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `type` | `NotificationType` | ✅ Tak | Typ powiadomienia |
| `url` | `string` | ✅ Tak | **Główne źródło nawigacji** - wzór URL do parsowania |
| `actor_username` | `string` | ✅ Tak | Username osoby wywołującej akcję (dla `follows`) |
| `actor_avatar` | `string` | ⚠️ Opcjonalne | Avatar URL (dla UI powiadomień) |
| `timestamp` | `string` | ⚠️ Opcjonalne | ISO 8601 timestamp |
| `activity_id` | `number` | ⚠️ W razie potrzeby | ID aktywności (fallback) |
| `post_id` | `number` | ⚠️ W razie potrzeby | ID posta (fallback) |
| `event_id` | `number` | ⚠️ W razie potrzeby | ID eventu (fallback) |
| `conversation_id` | `number` | ⚠️ W razie potrzeby | ID konwersacji (fallback) |

---

## 🚀 Wdrożenie

### Zmiany w plikach:

1. ✅ `src/types/api.ts`
   - Dodano pola `url`, `timestamp`, `actor_avatar` do `PushNotificationData`
   - Dodano typ `'boosts'` do `NotificationType`

2. ✅ `src/hooks/usePushNotifications.ts`
   - Dodano funkcję `navigateFromUrl()` do parsowania URL
   - Zmieniono kolejność nawigacji: URL → type-based fallback
   - Naprawiono nawigację dla `messages`, `boosts`, `likes`, `comments`
   - Dodano obsługę typu `boosts`

3. ✅ `docs/PUSH_NOTIFICATIONS_FIX.md`
   - Dokumentacja zmian i instrukcje testowania

---

## ✅ Checklist Weryfikacji

Przed wdrożeniem na produkcję:

- [x] Typy TypeScript są poprawne (brak błędów kompilacji)
- [x] Wszystkie typy powiadomień mają obsługę w switch statement
- [x] Dodano funkcję `navigateFromUrl()` z parsowaniem URL
- [x] URL jest używane jako **priorytetowe** źródło nawigacji
- [ ] Przeprowadzono testy manualne wszystkich typów powiadomień
- [ ] Sprawdzono cold start (aplikacja zamknięta)
- [ ] Sprawdzono background (aplikacja w tle)
- [ ] Sprawdzono foreground (aplikacja aktywna)
- [ ] Zweryfikowano logi debugowania
- [ ] Przetestowano na Android
- [ ] Przetestowano na iOS

---

## 📚 Referencje

- Backend notification types: `app/Notifications/NotificationTypes/`
- Backend push provider: `app/Notifications/Providers/PushNotificationProvider.php`
- Mobile push service: `src/services/pushNotifications.ts`
- Navigation types: `src/navigation/types.ts`

---

## 🐛 Znane Ograniczenia

1. **Wiadomości (messages):** Nie nawiguje bezpośrednio do ekranu `Chat`, ponieważ wymaga on parametru `participant: ConversationParticipant`, którego nie ma w payload powiadomienia. Nawigacja do `ConversationsList` jest akceptowalnym rozwiązaniem.

2. **Profil użytkownika:** `UserProfile` screen wymaga `username`, nie `userId`. Backend zawsze wysyła `actor_username`, więc to nie powinno być problemem.

---

**Data zakończenia:** 2026-01-29
**Status:** ✅ Gotowe do testowania
