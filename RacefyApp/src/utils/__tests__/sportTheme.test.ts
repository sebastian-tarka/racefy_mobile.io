import { getSportTheme, shade } from '../sportTheme';
import { sportColor } from '../sportColor';

describe('shade', () => {
  it('darkens and lightens towards black and white', () => {
    expect(shade('#808080', -0.5)).toBe('#404040');
    expect(shade('#808080', 0.5)).toBe('#c0c0c0');
    expect(shade('#10B981', 0)).toBe('#10b981');
  });
});

describe('getSportTheme', () => {
  it('takes the colour from the design palette, not its own', () => {
    const cycling = { id: 2, slug: 'cycling', name: 'Cycling' };
    expect(getSportTheme(cycling).color).toBe(sportColor(cycling));
    expect(getSportTheme(cycling).color).toBe('#F59E0B');
    expect(getSportTheme({ id: 9, slug: 'gym', name: 'Gym' }).color).toBe('#EF4444');
  });

  it('builds the gradient and accent from that colour', () => {
    const t = getSportTheme({ id: 1, slug: 'running', name: 'Running' });
    expect(t.gradient).toEqual(['#10B981', shade('#10B981', -0.2)]);
    expect(t.accent).toBe(shade('#10B981', 0.25));
  });

  it('keeps the icon per sport family', () => {
    expect(getSportTheme({ slug: 'trail-running' }).icon).toBe('walk');
    expect(getSportTheme({ slug: 'mtb', name: 'Mountain bike' }).icon).toBe('bicycle');
    expect(getSportTheme({ name: 'E-Bike' }).icon).toBe('bicycle');
    expect(getSportTheme({ slug: 'nordic-walking' }).icon).toBe('trail-sign');
    expect(getSportTheme(null).icon).toBe('fitness');
  });

  it('falls back to the name when the API sends no slug', () => {
    expect(getSportTheme({ name: 'Swimming' }).color).toBe('#06B6D4');
  });
});
