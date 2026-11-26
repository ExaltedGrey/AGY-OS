import { describe, expect, it } from 'vitest';
import { buildMapsUrl, formatCoordinates, hasCoordinates } from '../location';

describe('location utilities', () => {
  it('validates and formats coordinates cleanly', () => {
    expect(hasCoordinates({ gps_lat: 34.052235, gps_lng: -118.243683 })).toBe(true);
    expect(hasCoordinates({ gps_lat: null, gps_lng: -118.243683 })).toBe(false);
    expect(formatCoordinates(34.052235, -118.243683)).toBe('34.052235, -118.243683');
    expect(formatCoordinates(34.052235, -118.243683, 4)).toBe('34.0522, -118.2437');
  });

  it('prefers exact GPS coordinates over street address when building Maps URLs', () => {
    const url = buildMapsUrl({
      address: '418 Cedarbrook Lane',
      apartment: 'Apt 2B',
      gps_lat: 34.052235,
      gps_lng: -118.243683,
    });
    expect(url).toBe('https://maps.google.com/?q=34.052235,-118.243683');
  });

  it('falls back to encoded street address when GPS coordinates are not set', () => {
    const url = buildMapsUrl({
      address: '418 Cedarbrook Lane',
      apartment: 'Apt 2B',
      gps_lat: null,
      gps_lng: null,
    });
    expect(url).toBe('https://maps.google.com/?q=418%20Cedarbrook%20Lane%2C%20Apt%202B');
  });

  it('returns null when neither address nor GPS is set', () => {
    expect(
      buildMapsUrl({ address: '', apartment: '', gps_lat: null, gps_lng: null })
    ).toBeNull();
  });
});
