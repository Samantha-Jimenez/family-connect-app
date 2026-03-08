import { NextRequest, NextResponse } from 'next/server';

/**
 * Geocode a place name to lat/lng using Nominatim (OpenStreetMap).
 * Usage policy: https://operations.osmfoundation.org/policies/nominatim/
 * Rate limit: 1 request per second. We use this from the server to throttle.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'FamilyConnectApp/1.0 (family photo map)';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const city = searchParams.get('city');
  const state = searchParams.get('state');
  const country = searchParams.get('country');
  const neighborhood = searchParams.get('neighborhood');

  const q = address ?? [neighborhood, city, state, country].filter(Boolean).join(', ');
  if (!q.trim()) {
    return NextResponse.json(
      { error: 'Missing address or location fields' },
      { status: 400 }
    );
  }

  try {
    const params = new URLSearchParams({
      q: q.trim(),
      format: 'json',
      limit: '1',
    });
    const res = await fetch(`${NOMINATIM_BASE}?${params.toString()}`, {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: 86400 }, // cache 24h
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Geocoding service error' },
        { status: 502 }
      );
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ lat: null, lng: null });
    }

    const { lat, lon } = data[0];
    return NextResponse.json({
      lat: lat ? parseFloat(lat) : null,
      lng: lon ? parseFloat(lon) : null,
    });
  } catch (err) {
    console.error('Geocode error:', err);
    return NextResponse.json(
      { error: 'Geocoding failed' },
      { status: 500 }
    );
  }
}
