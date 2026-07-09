// The hook module imports AsyncStorage (native) at load time; mock it so this
// suite — which only exercises the pure distance helper — can import the module.
import { simulatedDistanceM } from '../useDevRunSimulator';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../services/logger', () => ({ logger: { info: jest.fn(), error: jest.fn() } }));

describe('simulatedDistanceM', () => {
  it('is zero before the first step and for non-positive elapsed', () => {
    expect(simulatedDistanceM(0)).toBe(0);
    expect(simulatedDistanceM(-5)).toBe(0);
    expect(simulatedDistanceM(9_999)).toBe(0); // just under the 10s step
  });

  it('adds 350 m per completed 10 s step (stepwise, not interpolated)', () => {
    expect(simulatedDistanceM(10_000)).toBe(350);
    expect(simulatedDistanceM(19_999)).toBe(350); // still in the 2nd step window
    expect(simulatedDistanceM(20_000)).toBe(700);
    expect(simulatedDistanceM(100_000)).toBe(3_500); // 10 steps → 3.5 km
  });
});
