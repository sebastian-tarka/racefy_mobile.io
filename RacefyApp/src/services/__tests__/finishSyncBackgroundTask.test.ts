/**
 * The background task body, against a real in-memory SQLite outbox. Native
 * scheduling (TaskManager / BackgroundTask) and the network are faked.
 */
import * as trackingDb from '../trackingDb';
import { __resetFinishSyncForTests, configureFinishSync } from '../finishSync';

import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { finishActivityHeadless } from '../backgroundApiClient';
import { notifyActivityDelivered } from '../finishSyncNotification';
import {
  ensureFinishSyncTaskRegistered,
  FINISH_SYNC_TASK,
  KV_AUTH_USER_ID,
  runBackgroundFinishSync,
} from '../finishSyncBackgroundTask';

const mockRegistered = { value: false };
const mockStatus = { value: 2 }; // Available

jest.mock('../logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    gps: jest.fn(),
    activity: jest.fn(),
  },
}));

jest.mock('react-native', () => ({
  DeviceEventEmitter: { emit: jest.fn() },
  Platform: { OS: 'android' },
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(async () => mockRegistered.value),
}));

jest.mock('expo-background-task', () => ({
  BackgroundTaskResult: { Success: 1, Failed: 2 },
  BackgroundTaskStatus: { Restricted: 1, Available: 2 },
  getStatusAsync: jest.fn(async () => mockStatus.value),
  registerTaskAsync: jest.fn(async () => {
    mockRegistered.value = true;
  }),
  unregisterTaskAsync: jest.fn(async () => {
    mockRegistered.value = false;
  }),
}));

jest.mock('../pointsUploader', () => ({
  drainPoints: jest.fn(async () => ({ uploaded: 0, remaining: 0 })),
  toGpsPoints: (points: any[]) => points,
}));

jest.mock('../backgroundApiClient', () => ({
  startActivityHeadless: jest.fn(),
  finishActivityHeadless: jest.fn(),
  getActivityHeadless: jest.fn(),
}));

jest.mock('../finishSyncNotification', () => ({
  notifyActivityDelivered: jest.fn(async () => {}),
}));

jest.mock('../../i18n', () => ({
  __esModule: true,
  default: { t: (k: string) => k },
  loadSavedLanguage: jest.fn(async () => {}),
  getCurrentLanguage: () => 'en',
}));

jest.mock('expo-sqlite', () => {
  const Database = require('better-sqlite3');
  return {
    openDatabaseSync: () => {
      const db = new Database(':memory:');
      return {
        execSync: (sql: string) => db.exec(sql),
        runSync: (sql: string, params: any[] = []) => db.prepare(sql).run(...params),
        getFirstSync: (sql: string, params: any[] = []) => db.prepare(sql).get(...params) ?? null,
        getAllSync: (sql: string, params: any[] = []) => db.prepare(sql).all(...params),
        withTransactionSync: (fn: () => void) => db.transaction(fn)(),
      };
    },
  };
});

const A = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeffff0001';
const flush = () => new Promise((resolve) => setImmediate(resolve));

function queue(userId: number | null = 7) {
  trackingDb.startSession(A, 'running');
  trackingDb.enqueuePendingFinish({
    clientActivityId: A,
    serverActivityId: 101,
    userId,
    payload: { title: 'Evening run', ended_at: '2026-09-20T10:00:00.000Z' },
    meta: { title: 'Evening run' },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  trackingDb.__resetForTests();
  __resetFinishSyncForTests();
  mockRegistered.value = false;
  mockStatus.value = 2;
});

it('defines the task at module scope', () => {
  // defineTask ran on import, before clearAllMocks — re-require to observe it.
  jest.isolateModules(() => {
    const tm = require('expo-task-manager');
    require('../finishSyncBackgroundTask');
    expect(tm.defineTask).toHaveBeenCalledWith(FINISH_SYNC_TASK, expect.any(Function));
  });
});

it('with an empty outbox: does nothing and unregisters itself', async () => {
  mockRegistered.value = true;

  expect(await runBackgroundFinishSync()).toBe(BackgroundTask.BackgroundTaskResult.Success);

  expect(finishActivityHeadless).not.toHaveBeenCalled();
  expect(BackgroundTask.unregisterTaskAsync).toHaveBeenCalledWith(FINISH_SYNC_TASK);
});

it('headless: delivers with the React-free client, notifies, and unregisters once empty', async () => {
  queue();
  trackingDb.setKv(KV_AUTH_USER_ID, '7');
  mockRegistered.value = true;
  (finishActivityHeadless as jest.Mock).mockResolvedValue({
    data: { id: 101, status: 'completed', title: 'Evening run' },
    message: 'ok',
    points_earned: 12,
  });

  expect(await runBackgroundFinishSync()).toBe(BackgroundTask.BackgroundTaskResult.Success);
  await flush();

  expect(finishActivityHeadless).toHaveBeenCalledWith(
    101,
    expect.objectContaining({ title: 'Evening run', client_activity_id: A }),
  );
  expect(trackingDb.countPendingFinishes()).toBe(0);
  expect(notifyActivityDelivered).toHaveBeenCalledWith({ title: 'Evening run', pointsEarned: 12 });
  expect(BackgroundTask.unregisterTaskAsync).toHaveBeenCalled();
});

it('headless: refuses to send when another account is signed in', async () => {
  queue(7);
  trackingDb.setKv(KV_AUTH_USER_ID, '99');

  await runBackgroundFinishSync();

  expect(finishActivityHeadless).not.toHaveBeenCalled();
  expect(trackingDb.countPendingFinishes()).toBe(1);
});

it('stays registered while something is still waiting', async () => {
  queue();
  mockRegistered.value = true;
  (finishActivityHeadless as jest.Mock).mockRejectedValue(new TypeError('Network request failed'));

  expect(await runBackgroundFinishSync()).toBe(BackgroundTask.BackgroundTaskResult.Success);

  expect(trackingDb.getPendingFinish(A)).toMatchObject({ state: 'pending', attempts: 1 });
  expect(BackgroundTask.unregisterTaskAsync).not.toHaveBeenCalled();
});

it('does not hammer a refused activity every 15 minutes', async () => {
  queue();
  (finishActivityHeadless as jest.Mock).mockRejectedValue(
    Object.assign(new Error('The selected event is closed.'), { status: 422 }),
  );
  const { getActivityHeadless } = require('../backgroundApiClient');
  (getActivityHeadless as jest.Mock).mockResolvedValue({ id: 101, status: 'paused' });

  await runBackgroundFinishSync();
  await runBackgroundFinishSync();

  expect(finishActivityHeadless).toHaveBeenCalledTimes(1);
  expect(trackingDb.getPendingFinish(A)?.state).toBe('needs_attention');
});

it('with the app alive: uses the already-wired engine and leaves announcing to it', async () => {
  queue();
  const finish = jest.fn().mockResolvedValue({
    data: { id: 101, status: 'completed' },
    message: 'ok',
  });
  configureFinishSync({
    db: trackingDb,
    drain: jest.fn(async () => ({ uploaded: 0, remaining: 0 })) as any,
    start: jest.fn(),
    finish,
    getActivity: jest.fn(),
    currentUserId: () => 7,
    now: Date.now,
    random: Math.random,
    emit: jest.fn(),
  });

  await runBackgroundFinishSync();
  await flush();

  expect(finish).toHaveBeenCalledTimes(1);
  expect(finishActivityHeadless).not.toHaveBeenCalled();
  expect(notifyActivityDelivered).not.toHaveBeenCalled(); // the UI's listener does that
});

it('reports Failed when the run blows up, so the OS may retry sooner', async () => {
  queue();
  const spy = jest.spyOn(trackingDb, 'countPendingFinishes').mockImplementationOnce(() => {
    throw new Error('db gone');
  });

  expect(await runBackgroundFinishSync()).toBe(BackgroundTask.BackgroundTaskResult.Failed);
  spy.mockRestore();
});

describe('registration', () => {
  it('registers once, with the 15 minute floor', async () => {
    await ensureFinishSyncTaskRegistered();
    await ensureFinishSyncTaskRegistered();

    expect(BackgroundTask.registerTaskAsync).toHaveBeenCalledTimes(1);
    expect(BackgroundTask.registerTaskAsync).toHaveBeenCalledWith(FINISH_SYNC_TASK, {
      minimumInterval: 15,
    });
  });

  it('is a quiet no-op where background tasks are restricted', async () => {
    mockStatus.value = 1;
    await ensureFinishSyncTaskRegistered();
    expect(BackgroundTask.registerTaskAsync).not.toHaveBeenCalled();
  });

  it('never throws (Expo Go, simulator)', async () => {
    (TaskManager.isTaskRegisteredAsync as jest.Mock).mockRejectedValueOnce(new Error('no module'));
    await expect(ensureFinishSyncTaskRegistered()).resolves.toBeUndefined();
  });
});
