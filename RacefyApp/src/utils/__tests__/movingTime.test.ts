import { paceSeconds, visibleMovingTime } from '../movingTime';

describe('paceSeconds', () => {
  it('reads moving time when the API measured one', () => {
    expect(paceSeconds({ duration: 1920, moving_time: 1800 })).toBe(1800);
  });

  it('falls back to duration without a moving time', () => {
    expect(paceSeconds({ duration: 1920, moving_time: null })).toBe(1920);
    expect(paceSeconds({ duration: 1920 })).toBe(1920);
    expect(paceSeconds({ duration: 1920, moving_time: 0 })).toBe(1920);
  });
});

describe('visibleMovingTime', () => {
  it('shows a minute or more of standing still', () => {
    expect(visibleMovingTime({ duration: 7200, moving_time: 7140 })).toBe(7140);
  });

  it('shows a noticeable share of a short activity', () => {
    expect(visibleMovingTime({ duration: 600, moving_time: 580 })).toBe(580);
  });

  it('hides a difference that is only noise', () => {
    expect(visibleMovingTime({ duration: 1800, moving_time: 1790 })).toBeNull();
    expect(visibleMovingTime({ duration: 7200, moving_time: 7170 })).toBeNull();
    expect(visibleMovingTime({ duration: 1800, moving_time: null })).toBeNull();
    expect(visibleMovingTime({ duration: 1800 })).toBeNull();
  });
});
