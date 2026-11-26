export interface GPSResult {
  lat: number;
  lng: number;
  accuracyMeters: number;
}

export interface LocationCapable {
  address: string;
  apartment: string;
  gps_lat: number | null;
  gps_lng: number | null;
}

export function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

export function hasCoordinates(
  loc: Pick<LocationCapable, 'gps_lat' | 'gps_lng'>
): loc is { gps_lat: number; gps_lng: number } {
  return (
    typeof loc.gps_lat === 'number' &&
    Number.isFinite(loc.gps_lat) &&
    typeof loc.gps_lng === 'number' &&
    Number.isFinite(loc.gps_lng)
  );
}

export function formatCoordinates(lat: number, lng: number, decimals = 6): string {
  return `${lat.toFixed(decimals)}, ${lng.toFixed(decimals)}`;
}

export function buildMapsUrl(loc: LocationCapable): string | null {
  if (hasCoordinates(loc)) {
    return `https://maps.google.com/?q=${loc.gps_lat},${loc.gps_lng}`;
  }
  const fullAddress = [loc.address, loc.apartment].filter(Boolean).join(', ').trim();
  if (fullAddress) {
    return `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`;
  }
  return null;
}

function roundCoord(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function captureCurrentGPS(): Promise<GPSResult> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new Error('GPS location is not supported in this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: roundCoord(position.coords.latitude),
          lng: roundCoord(position.coords.longitude),
          accuracyMeters: Math.round(position.coords.accuracy || 0),
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(
            new Error(
              'Location permission denied. Allow location access in your browser or phone settings to capture GPS.'
            )
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          reject(new Error('Could not determine GPS location right now. Try stepping outside or retrying.'));
        } else if (err.code === err.TIMEOUT) {
          reject(new Error('GPS request timed out. Please try again.'));
        } else {
          reject(new Error(err.message || 'Could not capture GPS coordinates.'));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  });
}
