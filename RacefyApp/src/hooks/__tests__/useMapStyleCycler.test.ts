// The hook pulls in useHaptics → AsyncStorage (native) at load; mock the native
// deps so this suite — which only exercises the pure cycle helper — can import it.
import { nextMapStyle } from '../useMapStyleCycler';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
}));
jest.mock('expo-haptics', () => ({}));
jest.mock('../../services/logger', () => ({ logger: { info: jest.fn() } }));

describe('nextMapStyle', () => {
  it('cycles outdoors → streets → satellite → outdoors', () => {
    expect(nextMapStyle('outdoors')).toBe('streets');
    expect(nextMapStyle('streets')).toBe('satellite');
    expect(nextMapStyle('satellite')).toBe('outdoors');
  });
});
