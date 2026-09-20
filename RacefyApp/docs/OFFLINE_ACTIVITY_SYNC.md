# Offline recording: pause, stop, save and delivery

How an activity survives having no network — from the Pause button to the moment
the server finally hears about it. Written for whoever has to debug "my run didn't
upload".

## The rule

**Pause, resume, stop and save are local operations.** The UI never waits for the
server to change state. The server is told afterwards: immediately when there is
a network, otherwise later — with the timestamps of when things actually happened.

## Pieces

| Piece | File | Job |
|---|---|---|
| Point log | `services/trackingDb.ts` (`activity_points`) | Every accepted GPS point, durable, with `seq` and `synced` |
| Points uploader | `services/pointsUploader.ts` | Idempotent batches of 200 (`client_activity_id` + `seq`) |
| Pause ledger | `services/activityLifecycleLedger.ts` | Device-side pause total + undelivered pause/resume calls with their real time (`at`); persisted in `trackingDb.kv` |
| Finish outbox | `services/trackingDb.ts` (`pending_finishes`) | One row per saved-but-undelivered activity; session parked as `pending_finish` |
| Delivery engine | `services/finishSync.ts` | Track first, then `finish`; classifies failures; no React |
| Foreground triggers | `hooks/useFinishSyncRunner.ts` | Network regained, sign-in, app start / foreground |
| Background task | `services/finishSyncBackgroundTask.ts` | Delivery while the app is closed |
| Queue UI | `screens/main/UnsyncedActivitiesScreen.tsx` | "Waiting for connection" vs "Not sent", retry, send without event, GPX export, discard |

## Saving (`useLiveActivity.performFinish`)

1. Stop GPS. Build the finish request: `ended_at` = **the moment the athlete stopped**
   (start of the pause being finished from), not the moment of pressing Save;
   `total_paused_duration` when the server's own pause sum cannot be trusted.
2. One transaction: insert into `pending_finishes`, set the session to `pending_finish`.
3. Reset the recording state — the screen is free.
4. `finishSync` runs for that entry; Save waits up to 5 s. Delivered in time → the
   classic result (points, auto-post). Otherwise → "Saved on your phone".

Without SQLite (web) the old online-only path is used.

## Failure classes (`finishSync`)

| Kind | Examples | Handling |
|---|---|---|
| transient | no answer, timeout, 5xx, 429 | exponential backoff with full jitter, per entry (15 s … 15 min) |
| auth | 401 | stop the run; next sign-in triggers a forced sync |
| verdict | other 4xx | first `GET` the activity — `completed` means the finish had landed (lost response) → success. Otherwise `needs_attention`: no automatic retries, the athlete decides |

An entry of another account (`user_id` mismatch) is skipped, never sent.

## Background task

`expo-background-task` (Android WorkManager, iOS BGTaskScheduler). Defined at module
scope and imported from `index.ts`, like the location task. Registered **only while the
outbox is non-empty**; unregisters itself once it is empty.

Limits that are the platform's, not ours:
- never more often than every 15 minutes, only with a network and enough battery;
- iOS decides when (usage patterns); **after the app is swiped away, iOS does not run it**
  until the app is opened again;
- not available on the iOS simulator or in Expo Go → registration is a quiet no-op.

So it is a convenience on top of the foreground triggers. Nothing depends on it.

In a headless launch there is no React and no `api` client: the task wires `finishSync`
with `backgroundApiClient` (token straight from SecureStore, **no** "401 → log out" side
effect) and reads the signed-in user id from `trackingDb.kv` (`auth:userId`). If the app's
UI is alive in the same JS runtime, the engine is already wired and the UI announces the
delivery — the task does not notify twice.

### Testing it

Debug build → Settings → Dev Tools → **Run background finish sync**, then background the
app. Release-like check:
airplane mode → record → save → close the app → disable airplane mode → wait (≥15 min) for
the "Activity uploaded" notification.

## Backend contract

`POST /activities/{id}/pause|resume` accept `at`; `finish` accepts `total_paused_duration`
and is idempotent per `client_activity_id` (`replayed: true`). See `docs/api/` →
API_ENDPOINTS, "Offline finish".
