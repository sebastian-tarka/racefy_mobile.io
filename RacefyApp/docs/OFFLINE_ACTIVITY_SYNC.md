# Offline recording: pause, stop, save and delivery

How an activity survives having no network — from the Pause button to the moment
the server finally hears about it. Written for whoever has to debug "my run didn't
upload".

## The rule

**Start, pause, resume, stop and save are local operations.** The UI never waits for the
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

## Starting (`useLiveActivity.startTracking`)

1. Mint the recording's UUID (`client_activity_id`) and open the tracking session —
   **before** asking the server. The session stores the start request (`start_payload`).
2. Ask the server (`/activities/current`, then `/activities/start`), each bounded by 5 s.
3. Answer in time → the usual server activity. No answer (offline, timeout, 5xx) → the
   recording starts **locally** under a *provisional* activity: a negative id derived from
   the UUID (`isProvisionalActivity`), so every "talk to the server about this activity"
   path can tell there is nobody to talk to yet. A refusal (4xx) stays an error.

While a provisional recording runs, every sync tick and every regained network tries
`createServerActivity()`: `POST /activities/start` with the real `started_at` and the same
UUID. The server treats that as idempotent, so a start that timed out *after* the server
created the activity does not produce a twin. On success the session is bound, the pause
ledger is re-keyed, and pauses made offline are replayed with their timestamps. If it never
succeeds, nothing is lost — saving handles it (below).

Live broadcasting and the spectator inbox are hidden for a provisional activity. A start
delivered more than 5 minutes late is not announced to followers (server-side rule).

### After an app kill with no network

`checkExistingActivity` asks the server but does not depend on it. When it cannot answer —
or answers "nothing active" for a session it has never seen — the activity is rebuilt from
the local session (`recoverFromLocalSession`): start request, last cumulative distance,
pause ledger. Only sessions that stored a start request can be rebuilt (those begun since
offline start exists).

## Saving (`useLiveActivity.performFinish`)

1. Stop GPS. Build the finish request: `ended_at` = **the moment the athlete stopped**
   (start of the pause being finished from), not the moment of pressing Save;
   `total_paused_duration` when the server's own pause sum cannot be trusted.
2. One transaction: insert into `pending_finishes`, set the session to `pending_finish`.
3. Reset the recording state — the screen is free.
4. `finishSync` runs for that entry; Save waits up to 5 s. Delivered in time → the
   classic result (points, auto-post). Otherwise → "Saved on your phone".

Without SQLite (web) the old online-only path is used.

For a recording the server has never seen, the outbox row has `server_activity_id = NULL`
and carries the start request. `finishSync` then creates the activity first (step 0), binds
the id **at once** (so a run that dies right after does not start it twice), and carries on
with the track and the finish. "Another activity is already active" (422) is *wait* when the
blocking activity is one of our own outbox entries, *needs attention* otherwise.

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

`POST /activities/start` accepts `client_activity_id` and a past `started_at`, and is
idempotent per UUID (a repeat returns the same activity, `replayed: true`, whatever its
status). `POST /activities/{id}/pause|resume` accept `at`; `finish` accepts
`total_paused_duration` and is idempotent per `client_activity_id` (`replayed: true`). See `docs/api/` →
API_ENDPOINTS, "Offline finish".
