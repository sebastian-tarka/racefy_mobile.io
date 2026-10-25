import i18n from 'i18next';
import { reverseGeocode, searchPlaces } from '../geocoding';

// jest hoists these above the imports
jest.mock('../../config/api', () => ({ MAPBOX_ACCESS_TOKEN: 'pk.test' }));
jest.mock('../logger', () => ({ logger: { warn: jest.fn(), debug: jest.fn() } }));

const feature = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [21.05, 52.24] },
  properties: {
    mapbox_id: 'abc',
    name: 'Park Skaryszewski',
    place_formatted: 'Warszawa, Polska',
    full_address: 'Park Skaryszewski, Warszawa, Polska',
    coordinates: { latitude: 52.24, longitude: 21.05 },
  },
};

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

const respond = (features: unknown[]) =>
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ features }) });

beforeAll(() => i18n.init({ lng: 'pl', resources: {} }));
beforeEach(() => fetchMock.mockReset());

describe('searchPlaces', () => {
  it('does not ask Mapbox for fewer than 3 letters', async () => {
    expect(await searchPlaces('pa')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('queries in the app language, near the given point, and maps the result', async () => {
    respond([feature]);
    const places = await searchPlaces(' park ', { proximity: { latitude: 52, longitude: 21 } });

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe('/search/geocode/v6/forward');
    expect(url.searchParams.get('q')).toBe('park');
    expect(url.searchParams.get('language')).toBe('pl');
    expect(url.searchParams.get('proximity')).toBe('21,52');
    expect(places).toEqual([
      {
        id: 'abc',
        name: 'Park Skaryszewski',
        context: 'Warszawa, Polska',
        label: 'Park Skaryszewski, Warszawa, Polska',
        latitude: 52.24,
        longitude: 21.05,
      },
    ]);
  });

  it('returns nothing when Mapbox answers with an error', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 });
    expect(await searchPlaces('park')).toEqual([]);
  });
});

describe('reverseGeocode', () => {
  it('names the point with the full address', async () => {
    respond([feature]);
    expect(await reverseGeocode(52.24, 21.05)).toBe('Park Skaryszewski, Warszawa, Polska');
  });

  it('gives null rather than throwing when offline', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    expect(await reverseGeocode(52.24, 21.05)).toBeNull();
  });
});
