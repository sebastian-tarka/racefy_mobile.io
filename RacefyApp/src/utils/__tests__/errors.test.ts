import { getErrorMessage, getErrorStatus, isApiError } from '../errors';

describe('errors', () => {
  const apiError = { message: 'Forbidden', status: 403, feature: 'goals' };

  it('recognises an API error body by its numeric status', () => {
    expect(isApiError(apiError)).toBe(true);
    expect(isApiError(new Error('offline'))).toBe(false);
    expect(isApiError({ status: '403' })).toBe(false);
    expect(isApiError(null)).toBe(false);
    expect(isApiError('boom')).toBe(false);
  });

  it('reads the message of errors, API bodies and thrown strings', () => {
    expect(getErrorMessage(new Error('offline'))).toBe('offline');
    expect(getErrorMessage(apiError)).toBe('Forbidden');
    expect(getErrorMessage('boom')).toBe('boom');
  });

  it('falls back when there is no usable message', () => {
    expect(getErrorMessage(undefined)).toBe('');
    expect(getErrorMessage(null, 'fallback')).toBe('fallback');
    expect(getErrorMessage({ message: '' }, 'fallback')).toBe('fallback');
    expect(getErrorMessage({ message: 42 }, 'fallback')).toBe('fallback');
    expect(getErrorMessage('', 'fallback')).toBe('fallback');
  });

  it('returns the status only for API errors', () => {
    expect(getErrorStatus(apiError)).toBe(403);
    expect(getErrorStatus(new Error('offline'))).toBeUndefined();
  });
});
