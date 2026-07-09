import {
  formatDistance,
  formatSpeed,
  formatElevation,
  formatTemperature,
  formatPaceFromDistanceTime,
  formatPaceFromSecPerKm,
  getDistanceUnit,
  getPaceUnit,
} from '../unitConversions';

describe('unitConversions', () => {
  describe('formatDistance', () => {
    it('formats metres as km with 2 decimals above 1km', () => {
      expect(formatDistance(5230, 'metric')).toBe('5.23 km');
    });

    it('formats sub-km metric distances in metres', () => {
      expect(formatDistance(500, 'metric')).toBe('500 m');
    });

    it('converts to miles for imperial', () => {
      expect(formatDistance(5000, 'imperial')).toBe('3.11 mi');
    });

    it('falls back to feet for very short imperial distances', () => {
      expect(formatDistance(50, 'imperial')).toBe('164 ft');
    });
  });

  describe('formatPaceFromDistanceTime', () => {
    it('computes min:sec per km', () => {
      expect(formatPaceFromDistanceTime(1000, 300, 'metric')).toBe('5:00');
    });

    it('converts pace to per-mile for imperial', () => {
      expect(formatPaceFromDistanceTime(1000, 300, 'imperial')).toBe('8:02');
    });

    it('returns placeholder for zero distance or time', () => {
      expect(formatPaceFromDistanceTime(0, 300, 'metric')).toBe('--:--');
      expect(formatPaceFromDistanceTime(1000, 0, 'metric')).toBe('--:--');
    });
  });

  describe('formatPaceFromSecPerKm', () => {
    it('formats a valid seconds-per-km value', () => {
      expect(formatPaceFromSecPerKm(300, 'metric')).toBe('5:00');
    });

    it('rejects out-of-range or null values with the placeholder', () => {
      expect(formatPaceFromSecPerKm(30, 'metric')).toBe('--:--');
      expect(formatPaceFromSecPerKm(2000, 'metric')).toBe('--:--');
      expect(formatPaceFromSecPerKm(null, 'metric')).toBe('--:--');
    });
  });

  describe('formatSpeed', () => {
    it('formats km/h for metric', () => {
      expect(formatSpeed(10, 'metric')).toBe('36.0 km/h');
    });

    it('formats mph for imperial', () => {
      expect(formatSpeed(10, 'imperial')).toBe('22.4 mph');
    });
  });

  describe('formatElevation', () => {
    it('rounds metres for metric', () => {
      expect(formatElevation(123.4, 'metric')).toBe('123 m');
    });

    it('converts to feet for imperial', () => {
      expect(formatElevation(100, 'imperial')).toBe('328 ft');
    });
  });

  describe('formatTemperature', () => {
    it('formats Celsius for metric', () => {
      expect(formatTemperature(22, 'metric')).toBe('22°C');
    });

    it('converts to Fahrenheit for imperial', () => {
      expect(formatTemperature(0, 'imperial')).toBe('32°F');
      expect(formatTemperature(100, 'imperial')).toBe('212°F');
    });
  });

  describe('unit labels', () => {
    it('returns the correct distance + pace units', () => {
      expect(getDistanceUnit('metric')).toBe('km');
      expect(getDistanceUnit('imperial')).toBe('mi');
      expect(getPaceUnit('metric')).toBe('/km');
      expect(getPaceUnit('imperial')).toBe('/mi');
    });
  });
});
