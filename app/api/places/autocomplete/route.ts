import { NextRequest, NextResponse } from 'next/server';

/**
 * Place/neighborhood autocomplete using Photon (Komoot) – free, no API key.
 * Returns { options: { value, label }[] } for use with react-select.
 * See utils/NEIGHBORHOOD_APIS.md for alternative providers (Google, Mapbox, etc.).
 */

const PHOTON_BASE = 'https://photon.komoot.io/api/';
const LIMIT = 10;

interface PhotonFeature {
  properties?: {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

function buildLabel(props: PhotonFeature['properties']): string {
  if (!props) return '';
  const parts = [props.name, props.city, props.state, props.country].filter(Boolean);
  return [...new Set(parts)].join(', ');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  const city = searchParams.get('city')?.trim();
  const state = searchParams.get('state')?.trim();
  const country = searchParams.get('country')?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ options: [] });
  }

  // Optionally bias by city/state/country (append to query for Photon)
  const queryParts = [q];
  if (city) queryParts.push(city);
  if (state) queryParts.push(state);
  if (country) queryParts.push(country);
  const searchQ = queryParts.join(', ');

  try {
    const params = new URLSearchParams({
      q: searchQ,
      limit: String(LIMIT),
      lang: 'en',
    });
    const url = `${PHOTON_BASE}?${params.toString()}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json({ options: [] });
    }

    const data = await res.json();
    const features: PhotonFeature[] = data?.features ?? [];

    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];

    for (const feature of features) {
      const props = feature.properties ?? {};
      const name = props.name?.trim();
      if (!name) continue;

      const label = buildLabel(props);
      if (seen.has(label)) continue;
      seen.add(label);

      // value = neighborhood/place name only (state & country are in other fields)
      // label = full context in dropdown so user can distinguish e.g. "Brooklyn, NY" vs "Brooklyn, OH"
      options.push({ value: name, label });
    }

    return NextResponse.json({ options });
  } catch (err) {
    console.error('Places autocomplete error:', err);
    return NextResponse.json({ options: [] });
  }
}
