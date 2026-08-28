import { ActivitiesMixin } from '../api/activities';
import type { ActivityEffortAnalysis, ApiError } from '../../types/api';

/**
 * The endpoint answers with three deliberately different statuses, and the
 * whole point of the service layer is that they stay distinguishable: only
 * `pending` is worth retrying, while `unavailable` means the card must never
 * render for this activity.
 */

const analysis = { activity_id: 231 } as ActivityEffortAnalysis;

/** Minimal stand-in for ApiBase — only `requestWithStatus` is exercised. */
function makeApi(impl: () => Promise<{ status: number; data: unknown }>) {
  class FakeBase {
    requestWithStatus = jest.fn(impl);
  }
  const Api = ActivitiesMixin(FakeBase as any);
  return new Api();
}

const apiError = (status: number): ApiError => Object.assign(new Error('nope'), { status });

describe('getActivityEffortAnalysis', () => {
  it('unwraps a ready analysis on 200', async () => {
    const api = makeApi(async () => ({ status: 200, data: { data: analysis } }));

    await expect(api.getActivityEffortAnalysis(231)).resolves.toEqual({
      state: 'ready',
      analysis,
    });
    expect(api.requestWithStatus).toHaveBeenCalledWith('/activities/231/analysis');
  });

  it('reports 202 as pending, not as a failure', async () => {
    const api = makeApi(async () => ({ status: 202, data: null }));

    await expect(api.getActivityEffortAnalysis(231)).resolves.toEqual({ state: 'pending' });
  });

  it('reports 204 as unavailable — this activity will never have one', async () => {
    const api = makeApi(async () => ({ status: 204, data: null }));

    await expect(api.getActivityEffortAnalysis(231)).resolves.toEqual({ state: 'unavailable' });
  });

  it('maps 404 (no access to the activity) to unavailable', async () => {
    const api = makeApi(async () => {
      throw apiError(404);
    });

    await expect(api.getActivityEffortAnalysis(231)).resolves.toEqual({ state: 'unavailable' });
  });

  it('rethrows anything else, so a server fault is not read as "never"', async () => {
    const api = makeApi(async () => {
      throw apiError(500);
    });

    await expect(api.getActivityEffortAnalysis(231)).rejects.toMatchObject({ status: 500 });
  });

  it('does not claim readiness when a 200 arrives without a body', async () => {
    const api = makeApi(async () => ({ status: 200, data: null }));

    await expect(api.getActivityEffortAnalysis(231)).resolves.toEqual({ state: 'unavailable' });
  });
});
