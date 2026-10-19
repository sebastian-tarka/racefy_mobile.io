import { ApiBase } from '../api/base';

jest.mock('../logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), api: jest.fn() },
}));
jest.mock('../secureStorage', () => ({
  secureStorage: {
    migrateLegacyTokens: jest.fn(),
    getToken: jest.fn(async () => null),
    setToken: jest.fn(),
    clearToken: jest.fn(),
  },
}));
jest.mock('../../i18n', () => ({ getCurrentLanguage: () => 'en' }));
jest.mock('../../config/api', () => ({ API_BASE_URL: 'https://api.test', XDEBUG_ENABLED: false }));

function respond(status: number, body: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
    headers: { get: () => null },
  };
}

describe('ApiBase.request', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    (global as any).fetch = fetchMock;
  });

  it('turns a non-JSON 503 (proxy HTML page) into an ApiError with the status', async () => {
    fetchMock.mockResolvedValue(respond(503, '<html>Service Unavailable</html>'));
    const api = new ApiBase();
    const onMaintenance = jest.fn();
    api.setOnMaintenanceMode(onMaintenance);

    await expect(api.request('/feed', { method: 'POST' })).rejects.toMatchObject({
      status: 503,
      message: 'HTTP 503',
    });
    // No maintenance payload in an HTML page, so the callback must not fire.
    expect(onMaintenance).not.toHaveBeenCalled();
  });

  it('turns a non-JSON 403 into an ApiError instead of a TypeError', async () => {
    fetchMock.mockResolvedValue(respond(403, ''));
    const api = new ApiBase();

    await expect(api.request('/pro', { method: 'POST' })).rejects.toMatchObject({ status: 403 });
  });

  it('still fires the maintenance callback for a JSON 503', async () => {
    fetchMock.mockResolvedValue(
      respond(503, JSON.stringify({ maintenance: true, message: 'Back soon' })),
    );
    const api = new ApiBase();
    const onMaintenance = jest.fn();
    api.setOnMaintenanceMode(onMaintenance);

    await expect(api.request('/feed')).rejects.toMatchObject({ status: 503 });
    expect(onMaintenance).toHaveBeenCalledWith(expect.objectContaining({ maintenance: true }));
  });

  it('does not leave an unhandled rejection behind a failed, deduplicated GET', async () => {
    fetchMock.mockResolvedValue(respond(500, JSON.stringify({ message: 'boom' })));
    const api = new ApiBase();
    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);

    await expect(api.request('/feed')).rejects.toMatchObject({ status: 500 });
    await new Promise((r) => setImmediate(r));

    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('frees the endpoint for the next GET once a request fails', async () => {
    fetchMock
      .mockResolvedValueOnce(respond(500, '{}'))
      .mockResolvedValueOnce(respond(200, JSON.stringify({ data: 1 })));
    const api = new ApiBase();

    await expect(api.request('/feed')).rejects.toBeDefined();
    await new Promise((r) => setImmediate(r));
    await expect(api.request('/feed')).resolves.toEqual({ data: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  describe('default timeout', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    /** fetch that never settles on its own, only on abort. */
    const hangingFetch = (_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
      });

    it('aborts a hung JSON request after a minute', async () => {
      fetchMock.mockImplementation(hangingFetch);
      const api = new ApiBase();

      const pending = api.request('/feed');
      const assertion = expect(pending).rejects.toThrow('Aborted');
      jest.advanceTimersByTime(60_000);
      await assertion;
    });

    it('leaves uploads (FormData) without a default timeout', async () => {
      fetchMock.mockResolvedValue(respond(200, '{}'));
      const api = new ApiBase();

      await api.request('/upload', { method: 'POST', body: new FormData() });
      expect(fetchMock.mock.calls[0][1].signal).toBeUndefined();
    });

    it("respects the caller's own signal", async () => {
      fetchMock.mockResolvedValue(respond(200, '{}'));
      const api = new ApiBase();
      const controller = new AbortController();

      await api.request('/x', { signal: controller.signal });
      expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
    });
  });
});
