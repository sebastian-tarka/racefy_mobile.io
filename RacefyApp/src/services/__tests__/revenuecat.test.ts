import Purchases from 'react-native-purchases';
import {
  configureRevenueCat,
  ensureRevenueCatIdentity,
  purchasePackage,
  resolveRevenueCatKey,
  restorePurchases,
} from '../revenuecat';

jest.mock('react-native', () => ({ Platform: { OS: 'android', select: (o: any) => o.android } }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { appEnv: 'production', revenueCatGoogleApiKey: 'goog_live' } } },
}));
jest.mock('../logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    setLogLevel: jest.fn(),
    configure: jest.fn(),
    getAppUserID: jest.fn(),
    logIn: jest.fn(),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
  },
  LOG_LEVEL: { DEBUG: 'DEBUG' },
}));

const sdk = Purchases as unknown as Record<string, jest.Mock>;

describe('resolveRevenueCatKey', () => {
  const release = (platform: string, configuredKey: string, appEnv = 'production') =>
    resolveRevenueCatKey({ platform, configuredKey, appEnv, isDev: false });

  it("accepts the platform's own store key in a production release", () => {
    expect(release('ios', 'appl_abc')).toBe('appl_abc');
    expect(release('android', ' goog_abc ')).toBe('goog_abc');
  });

  it.each([
    ['our bundled test key', 'android', 'test_imuKPattskGISWCnJMolGWUNmzI'],
    ['any other test key', 'android', 'test_somethingElse'],
    ['a test key on iOS', 'ios', 'test_somethingElse'],
    ["the other platform's key", 'android', 'appl_abc'],
    ["the other platform's key", 'ios', 'goog_abc'],
    ['no key', 'android', ''],
    ['an unknown platform', 'web', 'goog_abc'],
  ])('switches purchases off in a production release with %s', (_label, platform, key) => {
    expect(release(platform, key)).toBeNull();
  });

  it('lets a staging release use the Test Store', () => {
    expect(release('android', 'test_staging', 'staging')).toBe('test_staging');
    expect(release('android', 'goog_staging', 'staging')).toBe('goog_staging');
    expect(release('android', '', 'staging')).toBeNull();
  });

  it('falls back to the bundled test key in development only', () => {
    const dev = (configuredKey: string) =>
      resolveRevenueCatKey({
        platform: 'android',
        configuredKey,
        appEnv: 'production',
        isDev: true,
      });

    expect(dev('')).toMatch(/^test_/);
    expect(dev('goog_abc')).toBe('goog_abc');
  });
});

describe('identity before money moves', () => {
  const pkg = { product: { identifier: 'plus_monthly' } };
  const customerInfo = { entitlements: { active: { 'Racefy Plus': {} } } };

  beforeAll(async () => {
    await configureRevenueCat();
  });

  beforeEach(() => {
    Object.values(sdk).forEach((fn) => fn.mockReset());
    sdk.logIn.mockResolvedValue({ customerInfo });
    sdk.purchasePackage.mockResolvedValue({ customerInfo });
    sdk.restorePurchases.mockResolvedValue(customerInfo);
  });

  it('passes when the SDK is already on the signed-in account', async () => {
    sdk.getAppUserID.mockResolvedValue('7');

    await expect(ensureRevenueCatIdentity(7)).resolves.toBe(true);
    expect(sdk.logIn).not.toHaveBeenCalled();
  });

  it('signs in once more when the SDK is still anonymous', async () => {
    sdk.getAppUserID.mockResolvedValueOnce('$RCAnonymousID:abc').mockResolvedValueOnce('7');

    await expect(ensureRevenueCatIdentity(7)).resolves.toBe(true);
    expect(sdk.logIn).toHaveBeenCalledWith('7');
  });

  it('fails when the SDK stays on another account or cannot sign in', async () => {
    sdk.getAppUserID.mockResolvedValue('99');
    await expect(ensureRevenueCatIdentity(7)).resolves.toBe(false);

    sdk.getAppUserID.mockResolvedValue('$RCAnonymousID:abc');
    sdk.logIn.mockRejectedValue(new Error('offline'));
    await expect(ensureRevenueCatIdentity(7)).resolves.toBe(false);
  });

  it('buys for the signed-in account', async () => {
    sdk.getAppUserID.mockResolvedValue('7');

    await expect(purchasePackage(pkg, 7)).resolves.toMatchObject({ success: true });
    expect(sdk.purchasePackage).toHaveBeenCalledWith(pkg);
  });

  it('does not buy or restore under the wrong account', async () => {
    sdk.getAppUserID.mockResolvedValue('99');

    await expect(purchasePackage(pkg, 7)).resolves.toEqual({ customerInfo: null, success: false });
    await expect(restorePurchases(7)).resolves.toBeNull();
    expect(sdk.purchasePackage).not.toHaveBeenCalled();
    expect(sdk.restorePurchases).not.toHaveBeenCalled();
  });
});
