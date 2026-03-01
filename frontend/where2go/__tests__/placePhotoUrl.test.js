jest.mock('@env', () => ({ GOOGLE_MAPS_API_KEY: 'TEST_API_KEY' }), { virtual: true });

import { getPlacePhotoUrl } from '../src/utils/placePhotoUrl';

describe('getPlacePhotoUrl', () => {
  const REF = 'abc123photoRef';
  const BASE = 'https://maps.googleapis.com/maps/api/place/photo';

  it('returns a URL containing the correct base and photo reference', () => {
    const url = getPlacePhotoUrl(REF);
    expect(url).toContain(BASE);
    expect(url).toContain(`photo_reference=${REF}`);
  });

  it('respects maxWidth', () => {
    expect(getPlacePhotoUrl(REF, 800)).toContain('maxwidth=800');
  });

  it('returns null when photoReference is false', () => {
    expect(getPlacePhotoUrl(null)).toBeNull();
    expect(getPlacePhotoUrl('')).toBeNull();
  });
});