import { DeviceEventEmitter } from 'react-native';
import { api } from '../api';
import * as trackingDb from '../trackingDb';
import { KV_AUTH_USER_ID } from '../finishSyncBackgroundTask';
import { createStrengthOutbox, type OutboxEvent } from './sessionOutbox';

export const STRENGTH_OUTBOX_EVENT = 'strength:outbox';

/**
 * The app's one strength outbox: queue and snapshot in the tracking database's
 * key-value table (survives a kill, synchronous to write), requests through the
 * regular API client, events on DeviceEventEmitter. The owner check reads the
 * signed-in user id the finish-sync runner keeps in the same table.
 */
export const strengthOutbox = createStrengthOutbox({
  store: {
    get: trackingDb.getKv,
    set: trackingDb.setKv,
    delete: trackingDb.deleteKv,
  },
  transport: {
    updateSet: (setId, body) => api.updateWorkoutSessionSet(setId, body),
    deleteSet: (setId) => api.deleteWorkoutSessionSet(setId),
    complete: (sessionId, input) => api.completeWorkoutSession(sessionId, input),
    getSession: (sessionId) => api.getWorkoutSession(sessionId),
  },
  currentUserId: () => {
    const raw = trackingDb.getKv(KV_AUTH_USER_ID);
    return raw ? Number(raw) : null;
  },
  emit: (event: OutboxEvent) => DeviceEventEmitter.emit(STRENGTH_OUTBOX_EVENT, event),
});
