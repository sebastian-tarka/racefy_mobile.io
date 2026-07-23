import { createLiveTransport } from '../index';
import type { RealtimeConfig } from '../../../types/api';

jest.mock('../../logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../api', () => ({
  api: {
    getLiveBroadcast: jest.fn().mockResolvedValue(null),
    getLiveMessages: jest.fn().mockResolvedValue([]),
    getToken: jest.fn().mockReturnValue('test-token'),
  },
}));

const handlers = {
  onUpdate: jest.fn(),
  onMessages: jest.fn(),
  onEnded: jest.fn(),
  onError: jest.fn(),
};

const options = { activityId: 1, handlers, withMessages: false };

const reverbConfig: RealtimeConfig = {
  driver: 'reverb',
  poll_interval_ms: 5000,
  reverb: { key: 'k', host: 'ws.example.com', port: 443, scheme: 'https' },
};

describe('createLiveTransport', () => {
  it('uses polling when the server says polling', () => {
    const transport = createLiveTransport(
      { driver: 'polling', poll_interval_ms: 5000, reverb: null },
      options,
    );
    expect(transport.name).toBe('polling');
  });

  it('uses reverb when the driver and connection details are both present', () => {
    expect(createLiveTransport(reverbConfig, options).name).toBe('reverb');
  });

  it('falls back to polling when reverb is selected without connection details', () => {
    // The driver is flipped server-side; an incomplete config must degrade
    // rather than leave the spectator with a blank screen.
    const transport = createLiveTransport(
      { driver: 'reverb', poll_interval_ms: 5000, reverb: null },
      options,
    );
    expect(transport.name).toBe('polling');
  });

  it('falls back to polling when the server sends no realtime block at all', () => {
    expect(createLiveTransport(undefined, options).name).toBe('polling');
  });
});
