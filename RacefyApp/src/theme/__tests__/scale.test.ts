/**
 * `scale.ts` reads Dimensions/PixelRatio once at module evaluation, so every case
 * has to reset the module registry and re-require it with fresh mocks. That is
 * awkward on purpose — it mirrors the real limitation documented in `msFont()`.
 */

type Scale = typeof import('../scale');

function loadScale(width: number, fontScale: number = 1): Scale {
  let mod: Scale;
  jest.isolateModules(() => {
    jest.doMock('react-native', () => ({
      Dimensions: { get: () => ({ width, height: 800 }) },
      PixelRatio: { getFontScale: () => fontScale },
    }));
    mod = require('../scale');
  });
  return mod!;
}

describe('ms() — width scaling', () => {
  it('returns the base value on the 375pt baseline', () => {
    const { ms } = loadScale(375);
    expect(ms(14)).toBe(14);
    expect(ms(16)).toBe(16);
    expect(ms(160)).toBe(160);
  });

  it('scales up moderately on a wider phone', () => {
    const { ms } = loadScale(412); // Pixel 7
    expect(ms(14)).toBe(15);
    expect(ms(64)).toBe(67);
  });

  it('leaves the narrowest real phone untouched (floor sits below it)', () => {
    // iPhone SE 1st gen: ratio 0.853 > MIN_RATIO 0.85, so nothing is clamped.
    const { ms } = loadScale(320);
    expect(ms(14)).toBe(13);
    expect(ms(160)).toBe(148);
  });

  it('leaves the widest current phone untouched (ceiling sits above it)', () => {
    // Pro Max: ratio 1.147 < MAX_RATIO 1.15.
    const clamped = loadScale(430).ms(160);
    const unclamped = Math.round(160 + (160 * (430 / 375) - 160) * 0.5);
    expect(clamped).toBe(unclamped);
  });

  it('clamps an unfolded foldable to the ceiling', () => {
    const { ms } = loadScale(673);
    // Without the clamp this would be 20 / 224.
    expect(ms(14)).toBe(15);
    expect(ms(160)).toBe(172);
  });

  it('clamps a tablet to the same ceiling as a foldable', () => {
    expect(loadScale(1024).ms(14)).toBe(loadScale(673).ms(14));
  });

  it('clamps a pathologically narrow window to the floor', () => {
    // Android free-form / split-screen; without the floor ms(14) would be 11.
    expect(loadScale(200).ms(14)).toBe(loadScale(319).ms(14));
  });

  it('honours the factor argument', () => {
    const { ms } = loadScale(412);
    expect(ms(100, 0)).toBe(100); // no scaling
    expect(ms(100, 1)).toBe(110); // full linear scaling
  });
});

describe('msFont() — font scale cap', () => {
  it('equals ms() at the default system font size', () => {
    const { ms, msFont } = loadScale(393, 1);
    expect(msFont(14)).toBe(ms(14));
    expect(msFont(28)).toBe(ms(28));
  });

  it('leaves sizes alone while fontScale stays under the cap', () => {
    const { ms, msFont } = loadScale(375, 1.3);
    expect(msFont(14, 1.5)).toBe(ms(14));
  });

  it('holds the effective size at base * cap once fontScale exceeds it', () => {
    const fontScale = 2.0;
    const { msFont } = loadScale(375, fontScale);
    // RN renders fontSize * fontScale, so that product is what the user sees.
    // msFont rounds to a whole point, and that rounding error is then multiplied
    // by fontScale — so the effective size can only be guaranteed to within
    // fontScale/2. At fontScale 2.0 that is a single point.
    const tolerance = fontScale / 2;
    expect(Math.abs(msFont(14, 1.5) * fontScale - 14 * 1.5)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(msFont(72, 1.2) * fontScale - 72 * 1.2)).toBeLessThanOrEqual(tolerance);
  });

  it('never lets the effective size exceed the cap by more than a rounding step', () => {
    // The cap is a layout guarantee, so overshoot matters more than undershoot.
    for (const fontScale of [1.6, 2.0, 2.5, 3.1]) {
      const { msFont } = loadScale(375, fontScale);
      for (const size of [10, 12, 14, 16, 18, 20, 24, 28]) {
        const effective = msFont(size, 1.5) * fontScale;
        const EPSILON = 1e-9; // float noise, e.g. 36.800000000000004 vs 36.8
        expect(effective).toBeLessThanOrEqual(size * 1.5 + fontScale / 2 + EPSILON);
      }
    }
  });

  it('keeps the type hierarchy intact under a uniform cap', () => {
    const { fontSize } = (() => {
      let mod: typeof import('../spacing');
      jest.isolateModules(() => {
        jest.doMock('react-native', () => ({
          Dimensions: { get: () => ({ width: 375, height: 800 }) },
          PixelRatio: { getFontScale: () => 2.0 },
        }));
        mod = require('../spacing');
      });
      return mod!;
    })();

    expect(fontSize.sm).toBeLessThan(fontSize.md);
    expect(fontSize.md).toBeLessThan(fontSize.lg);
    expect(fontSize.lg).toBeLessThan(fontSize.xl);
    expect(fontSize.xl).toBeLessThan(fontSize.xxl);
    expect(fontSize.xxl).toBeLessThan(fontSize.xxxl);
    expect(fontSize.xxxl).toBeLessThan(fontSize.title);
  });

  it('caps hero display numbers harder than body text', () => {
    const { msFont, FONT_CAP } = loadScale(375, 2.0);
    const bodyGrowth = msFont(14, FONT_CAP.text) / 14;
    const heroGrowth = msFont(72, FONT_CAP.display) / 72;
    expect(heroGrowth).toBeLessThan(bodyGrowth);
  });
});
