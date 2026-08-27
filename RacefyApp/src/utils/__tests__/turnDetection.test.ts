import {
  classifyManeuver,
  deriveTurnInstructions,
  headingDelta,
  simplifyIndices,
} from '../turnDetection';

const LABELS = { left: 'Turn left', right: 'Turn right', uTurn: 'U-turn' };

// Build a path of [lng, lat] points from metre offsets around Warsaw
const ORIGIN = { lat: 52.23, lng: 21.01 };
const M_PER_DEG_LAT = 110540;
const M_PER_DEG_LNG = 111320 * Math.cos((ORIGIN.lat * Math.PI) / 180);
const pt = (xM: number, yM: number): [number, number] => [
  ORIGIN.lng + xM / M_PER_DEG_LNG,
  ORIGIN.lat + yM / M_PER_DEG_LAT,
];
/** Sample a polyline of metre offsets every `step` metres */
function sample(vertices: [number, number][], step = 5): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < vertices.length - 1; i++) {
    const [x0, y0] = vertices[i];
    const [x1, y1] = vertices[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push(pt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t));
    }
  }
  const last = vertices[vertices.length - 1];
  out.push(pt(last[0], last[1]));
  return out;
}

describe('headingDelta', () => {
  it('normalizes to (-180, 180]', () => {
    expect(headingDelta(350, 10)).toBe(20);
    expect(headingDelta(10, 350)).toBe(-20);
    expect(headingDelta(0, 180)).toBe(180);
    expect(headingDelta(90, 270)).toBe(180);
  });
});

describe('classifyManeuver', () => {
  const opts = { minAngleDeg: 45, sharpAngleDeg: 110, uTurnAngleDeg: 150 };
  it('ignores small bends', () => {
    expect(classifyManeuver(30, opts)).toBeNull();
    expect(classifyManeuver(-44, opts)).toBeNull();
  });
  it('distinguishes left/right/sharp/u-turn', () => {
    expect(classifyManeuver(90, opts)).toBe('turn-right');
    expect(classifyManeuver(-90, opts)).toBe('turn-left');
    expect(classifyManeuver(120, opts)).toBe('sharp-right');
    expect(classifyManeuver(-120, opts)).toBe('sharp-left');
    expect(classifyManeuver(175, opts)).toBe('u-turn');
  });
});

describe('simplifyIndices', () => {
  it('keeps endpoints of a straight noisy line only', () => {
    const coords = sample(
      [
        [0, 0],
        [0, 300],
      ],
      5,
    ).map((c, i): [number, number] => [c[0] + (i % 2 ? 2 : -2) / M_PER_DEG_LNG, c[1]]);
    const idx = simplifyIndices(coords, 8);
    expect(idx).toEqual([0, coords.length - 1]);
  });
  it('keeps the corner vertex of an L-shape', () => {
    const coords = sample(
      [
        [0, 0],
        [0, 200],
        [200, 200],
      ],
      5,
    );
    const idx = simplifyIndices(coords, 8);
    expect(idx.length).toBe(3);
    expect(idx[1]).toBe(40); // corner is the 40th sample (200 m / 5 m)
  });
});

describe('deriveTurnInstructions', () => {
  it('returns nothing for a straight track', () => {
    expect(
      deriveTurnInstructions(
        sample([
          [0, 0],
          [0, 1000],
        ]),
        LABELS,
      ),
    ).toEqual([]);
  });

  it('returns nothing for a jittery straight track (GPS noise)', () => {
    const coords = sample(
      [
        [0, 0],
        [0, 1000],
      ],
      5,
    ).map((c, i): [number, number] => [
      c[0] + (Math.sin(i * 1.7) * 3) / M_PER_DEG_LNG,
      c[1] + (Math.cos(i * 2.3) * 3) / M_PER_DEG_LAT,
    ]);
    expect(deriveTurnInstructions(coords, LABELS)).toEqual([]);
  });

  it('detects a right turn at the correct distance (heading north → east)', () => {
    const turns = deriveTurnInstructions(
      sample([
        [0, 0],
        [0, 300],
        [300, 300],
      ]),
      LABELS,
    );
    expect(turns).toHaveLength(1);
    expect(turns[0].maneuver).toBe('turn-right');
    expect(turns[0].instruction).toBe('Turn right');
    expect(turns[0].distance_along).toBeGreaterThan(290);
    expect(turns[0].distance_along).toBeLessThan(310);
  });

  it('detects a left turn (heading north → west)', () => {
    const turns = deriveTurnInstructions(
      sample([
        [0, 0],
        [0, 300],
        [-300, 300],
      ]),
      LABELS,
    );
    expect(turns).toHaveLength(1);
    expect(turns[0].maneuver).toBe('turn-left');
  });

  it('detects a u-turn on an out-and-back', () => {
    const turns = deriveTurnInstructions(
      sample([
        [0, 0],
        [0, 400],
        [20, 400],
        [20, 0],
      ]),
      LABELS,
    );
    expect(turns).toHaveLength(1);
    expect(turns[0].maneuver).toBe('u-turn');
    expect(turns[0].instruction).toBe('U-turn');
  });

  it('merges a sweeping corner made of two 35° bends into one turn', () => {
    // 0° → 35° → 70°, bends 20 m apart: neither alone passes 45°, the sum does
    const a = 35 * (Math.PI / 180);
    const b = 70 * (Math.PI / 180);
    const p1: [number, number] = [0, 300];
    const p2: [number, number] = [p1[0] + 20 * Math.sin(a), p1[1] + 20 * Math.cos(a)];
    const p3: [number, number] = [p2[0] + 300 * Math.sin(b), p2[1] + 300 * Math.cos(b)];
    const turns = deriveTurnInstructions(sample([[0, 0], p1, p2, p3]), LABELS);
    expect(turns).toHaveLength(1);
    expect(turns[0].maneuver).toBe('turn-right');
  });

  it('ignores a short wiggle narrower than minLeg', () => {
    // 5 m sidestep on a straight road
    const coords = sample(
      [
        [0, 0],
        [0, 200],
        [5, 205],
        [5, 500],
      ],
      2,
    );
    expect(deriveTurnInstructions(coords, LABELS)).toEqual([]);
  });

  it('lists turns in track order', () => {
    const turns = deriveTurnInstructions(
      sample([
        [0, 0],
        [0, 300],
        [300, 300],
        [300, 0],
        [600, 0],
      ]),
      LABELS,
    );
    expect(turns.map((t) => t.maneuver)).toEqual(['turn-right', 'turn-right', 'turn-left']);
    for (let i = 1; i < turns.length; i++) {
      expect(turns[i].distance_along).toBeGreaterThan(turns[i - 1].distance_along);
    }
  });
});
