'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import L from 'leaflet';
import type { PhotoData } from '@/hooks/dynamoDB';

import 'leaflet/dist/leaflet.css';

// Ensure popup content can show multiple thumbnails (Leaflet default can clip)
const POPUP_STYLE_ID = 'photo-map-popup-override';
if (typeof document !== 'undefined' && !document.getElementById(POPUP_STYLE_ID)) {
  const style = document.createElement('style');
  style.id = POPUP_STYLE_ID;
  style.textContent = '.leaflet-popup-content { overflow: visible !important; max-height: none !important; }';
  document.head.appendChild(style);
}

const MARKER_PIN_STYLE_ID = 'photo-map-marker-pin-style';
if (typeof document !== 'undefined' && !document.getElementById(MARKER_PIN_STYLE_ID)) {
  const style = document.createElement('style');
  style.id = MARKER_PIN_STYLE_ID;
  style.textContent = `
    .photo-map-marker-pin { position: relative; width: 28px; height: 40px; display: flex; align-items: center; justify-content: center; }
    .photo-map-marker-pin-img { display: block; width: 28px; height: 40px; object-fit: contain; }
    .photo-map-marker-count {
      position: absolute;
      top: 8px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 16px;
      font-weight: 700;
      line-height: 1;
      color: #fff;
      pointer-events: none;
    }
    .photo-map-count-marker.leaflet-marker-icon { background: none !important; border: none !important; }
  `;
  document.head.appendChild(style);
}

// Font Awesome 6 solid location-pin via Iconify API (no white circle; clean pin)
const LOCATION_PIN_ICON_URL = 'https://api.iconify.design/fa6-solid/location-pin.svg?width=28&height=40&color=%23E03616';

/** Creates a pin icon with the photo count in the center of the pin. */
function createCountIcon(count: number): L.DivIcon {
  const displayCount = count > 99 ? '99+' : String(count);
  return L.divIcon({
    className: 'photo-map-count-marker',
    html: `<div class="photo-map-marker-pin"><img src="${LOCATION_PIN_ICON_URL}" alt="" class="photo-map-marker-pin-img" /><span class="photo-map-marker-count">${displayCount}</span></div>`,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -40],
  });
}

// Fix default marker icon in Next.js/Leaflet (kept for fallback; markers use createCountIcon)
const MARKER_ICON_URL = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const MARKER_ICON_RETINA_URL = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const MARKER_SHADOW_URL = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';
const createDefaultIcon = () =>
  L.icon({
    iconUrl: MARKER_ICON_URL,
    iconRetinaUrl: MARKER_ICON_RETINA_URL,
    shadowUrl: MARKER_SHADOW_URL,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

export function getLocationKey(photo: PhotoData): string {
  const loc = photo.metadata?.location;
  if (!loc) return '';
  const parts = [
    loc.neighborhood,
    loc.city,
    loc.state,
    loc.country || 'United States',
  ].filter(Boolean);
  return parts.join(', ');
}

// Normalize for grouping so "City, CA" and "City, California" and " city , ca " match
const stateAbbrevToFull: Record<string, string> = {
  AL: 'alabama', AK: 'alaska', AZ: 'arizona', AR: 'arkansas', CA: 'california',
  CO: 'colorado', CT: 'connecticut', DE: 'delaware', FL: 'florida', GA: 'georgia',
  HI: 'hawaii', ID: 'idaho', IL: 'illinois', IN: 'indiana', IA: 'iowa', KS: 'kansas',
  KY: 'kentucky', LA: 'louisiana', ME: 'maine', MD: 'maryland', MA: 'massachusetts',
  MI: 'michigan', MN: 'minnesota', MS: 'mississippi', MO: 'missouri', MT: 'montana',
  NE: 'nebraska', NV: 'nevada', NH: 'new hampshire', NJ: 'new jersey', NM: 'new mexico',
  NY: 'new york', NC: 'north carolina', ND: 'north dakota', OH: 'ohio', OK: 'oklahoma',
  OR: 'oregon', PA: 'pennsylvania', RI: 'rhode island', SC: 'south carolina', SD: 'south dakota',
  TN: 'tennessee', TX: 'texas', UT: 'utah', VT: 'vermont', VA: 'virginia', WA: 'washington',
  WV: 'west virginia', WI: 'wisconsin', WY: 'wyoming', DC: 'district of columbia',
};

function normalizePart(s: string): string {
  const t = s.trim().toLowerCase();
  if (t.length === 2 && stateAbbrevToFull[t.toUpperCase()]) return stateAbbrevToFull[t.toUpperCase()];
  return t;
}

/** Key used for grouping; normalized so minor differences don't split the same place. */
export function getNormalizedLocationKey(photo: PhotoData): string {
  const loc = photo.metadata?.location;
  if (!loc) return '';
  const parts = [
    loc.neighborhood,
    loc.city,
    loc.state,
    loc.country || 'united states',
  ]
    .filter(Boolean)
    .map((p) => normalizePart(String(p)));
  return parts.join(', ');
}

export function hasLocation(photo: PhotoData): boolean {
  const loc = photo.metadata?.location;
  if (!loc) return false;
  return !!(loc.country?.trim() || loc.state?.trim() || loc.city?.trim() || loc.neighborhood?.trim());
}

interface PhotoMapProps {
  photos: PhotoData[];
  onPhotoClick: (photo: PhotoData) => void;
  className?: string;
}

export default function PhotoMap({ photos, onPhotoClick, className = '' }: PhotoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const onPhotoClickRef = useRef(onPhotoClick);
  const photoByIdRef = useRef<Map<string, PhotoData>>(new Map());
  const locationToPhotosRef = useRef<Map<string, { displayLabel: string; photos: PhotoData[] }>>(new Map());

  const [geocodeCache, setGeocodeCache] = useState<Record<string, { lat: number; lng: number }>>({});
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const mounted = useRef(true);

  onPhotoClickRef.current = onPhotoClick;

  const photosWithLocation = useMemo(
    () => photos.filter(hasLocation),
    [photos]
  );

  const locationToPhotos = useMemo(() => {
    const map = new Map<string, { displayLabel: string; photos: PhotoData[] }>();
    for (const photo of photosWithLocation) {
      const normalizedKey = getNormalizedLocationKey(photo);
      const displayLabel = getLocationKey(photo);
      if (!normalizedKey) continue;
      if (!map.has(normalizedKey)) {
        map.set(normalizedKey, { displayLabel, photos: [] });
      }
      const entry = map.get(normalizedKey)!;
      entry.photos.push(photo);
      if (displayLabel.length < entry.displayLabel.length || entry.displayLabel === '') {
        entry.displayLabel = displayLabel;
      }
    }
    return map;
  }, [photosWithLocation]);

  locationToPhotosRef.current = locationToPhotos;

  const uniqueKeys = useMemo(() => Array.from(locationToPhotos.keys()), [locationToPhotos]);

  const geocodeOne = useCallback(async (address: string): Promise<{ lat: number; lng: number } | null> => {
    const params = new URLSearchParams({ address });
    const res = await fetch(`/api/geocode?${params.toString()}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.lat != null && data.lng != null) {
      return { lat: data.lat, lng: data.lng };
    }
    return null;
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (uniqueKeys.length === 0) {
      setGeocodeLoading(false);
      return;
    }

    let cancelled = false;
    setGeocodeLoading(true);

    (async () => {
      const cache: Record<string, { lat: number; lng: number }> = {};
      for (let i = 0; i < uniqueKeys.length; i++) {
        if (!mounted.current || cancelled) return;
        const key = uniqueKeys[i];
        const result = await geocodeOne(key);
        if (!mounted.current || cancelled) return;
        if (result) cache[key] = result;
        if (i < uniqueKeys.length - 1) {
          await new Promise((r) => setTimeout(r, 1100));
        }
      }
      if (mounted.current && !cancelled) {
        setGeocodeCache((prev) => ({ ...prev, ...cache }));
      }
      if (mounted.current && !cancelled) setGeocodeLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [uniqueKeys.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const markerPositions = useMemo(() => {
    const positions: [number, number][] = [];
    uniqueKeys.forEach((key) => {
      const coords = geocodeCache[key];
      if (coords) positions.push([coords.lat, coords.lng]);
    });
    return positions;
  }, [uniqueKeys, geocodeCache]);

  const mapTilerKey = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_MAPTILER_API_KEY : undefined;
  const tileUrl = mapTilerKey
    ? `https://api.maptiler.com/tiles/streets-v2/{z}/{x}/{y}?key=${mapTilerKey}`
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const attribution = mapTilerKey
    ? '© MapTiler © OpenStreetMap contributors'
    : '© OpenStreetMap contributors';

  // Create map once when we have a container; never re-init the same container
  useEffect(() => {
    const el = containerRef.current;
    if (!el || photosWithLocation.length === 0) return;

    // Leaflet sets _leaflet_id on the container; if it's already set, do not init again
    if ((el as unknown as { _leaflet_id?: number })._leaflet_id != null) return;
    if (mapRef.current) return;

    const map = L.map(el, {
      center: [39.5, -98.5],
      zoom: 3,
      scrollWheelZoom: true,
    });

    L.tileLayer(tileUrl, { attribution }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, [photosWithLocation.length, tileUrl]);

  // Update markers when we have map + geocode results
  useEffect(() => {
    const map = mapRef.current;
    if (!map || markerPositions.length === 0) return;

    // Build photoById for popup click handling (key = locationKey + index so unique across all markers)
    const byId = new Map<string, PhotoData>();
    uniqueKeys.forEach((locKey) => {
      const entry = locationToPhotosRef.current.get(locKey);
      if (!entry) return;
      entry.photos.forEach((p, i) => {
        byId.set(`${locKey}\t${i}`, p);
      });
    });
    photoByIdRef.current = byId;

    // Debug: log full location → photos grouping
    console.log('[PhotoMap] locationToPhotos summary:', {
      uniqueKeys,
      perKey: uniqueKeys.map((k) => {
        const e = locationToPhotosRef.current.get(k);
        return { key: k, count: e?.photos?.length ?? 0, photoIds: e?.photos?.map((p) => p.photo_id) ?? [] };
      }),
    });

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    uniqueKeys.forEach((key) => {
      const coords = geocodeCache[key];
      if (!coords) return;
      const entry = locationToPhotosRef.current.get(key);
      const displayLabel = entry?.displayLabel ?? key;
      const locationPhotos = entry?.photos ?? [];

      // Debug: log location grouping results
      console.log('[PhotoMap] location:', {
        key,
        displayLabel,
        photoCount: locationPhotos.length,
        photoIds: locationPhotos.map((p) => p.photo_id),
        photoLocations: locationPhotos.map((p) => p.metadata?.location),
      });

      const popupRoot = document.createElement('div');
      popupRoot.className = 'photo-map-popup';
      popupRoot.setAttribute('style', 'text-align:left;min-width:140px;overflow:visible;');

      const labelP = document.createElement('p');
      labelP.setAttribute('style', 'font-weight:600;color:#1f2937;font-size:13px;margin:0 0 8px;');
      labelP.textContent = displayLabel;
      popupRoot.appendChild(labelP);

      const grid = document.createElement('div');
      grid.setAttribute('style', 'display:grid;grid-template-columns:60px 60px 60px;grid-auto-rows:60px;gap:6px;width:192px;');

      locationPhotos.slice(0, 9).forEach((photo, index) => {
        const cell = document.createElement('div');
        cell.setAttribute('style', 'width:60px;height:60px;box-sizing:border-box;');

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'photo-map-thumb';
        btn.setAttribute('data-location-key', key);
        btn.setAttribute('data-index', String(index));
        btn.setAttribute('style', 'display:block;width:60px;height:60px;margin:0;padding:0;border-radius:4px;overflow:hidden;border:1px solid #e5e7eb;cursor:pointer;background:none;box-sizing:border-box;');

        const img = document.createElement('img');
        img.alt = '';
        img.setAttribute('style', 'display:block;width:100%;height:100%;object-fit:cover;');
        img.src = (photo.url || '').trim();

        btn.appendChild(img);
        cell.appendChild(btn);
        grid.appendChild(cell);
      });

      popupRoot.appendChild(grid);
      if (locationPhotos.length > 9) {
        const moreP = document.createElement('p');
        moreP.setAttribute('style', 'margin:4px 0 0;font-size:11px;color:#6b7280;');
        moreP.textContent = `+${locationPhotos.length - 9} more`;
        popupRoot.appendChild(moreP);
      }

      // Clone the root so each marker gets its own DOM tree (avoids Leaflet moving shared node)
      const popupContent = popupRoot.cloneNode(true) as HTMLElement;
      const gridInClone = popupContent.children[1]; // first is label <p>, second is grid <div>
      console.log('[PhotoMap] popup grid child count:', gridInClone?.childNodes?.length ?? 0, 'for key:', key);

      const marker = L.marker([coords.lat, coords.lng], { icon: createCountIcon(locationPhotos.length) })
        .bindPopup(popupContent, { minWidth: 200, maxWidth: 220 })
        .addTo(map);

      marker.on('popupopen', () => {
        const popupEl = marker.getPopup()?.getElement();
        if (!popupEl) return;
        popupEl.querySelectorAll('.photo-map-thumb').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            const el = e.currentTarget as HTMLElement;
            const locationKey = el.getAttribute('data-location-key');
            const index = el.getAttribute('data-index');
            if (locationKey != null && index != null) {
              const photo = photoByIdRef.current.get(`${locationKey}\t${index}`);
              if (photo) onPhotoClickRef.current(photo);
            }
          });
        });
      });

      markersRef.current.push(marker);
    });

    if (markerPositions.length === 1) {
      map.setView(markerPositions[0], 10);
    } else if (markerPositions.length > 1) {
      map.fitBounds(L.latLngBounds(markerPositions), { padding: [40, 40], maxZoom: 12 });
    }
  }, [uniqueKeys, geocodeCache, markerPositions, tileUrl]);

  if (photosWithLocation.length === 0) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center min-h-[300px] opacity-0 animate-[fadeIn_0.4s_ease-in_forwards] ${className}`}>
        <p className="text-gray-500 poppins-light">No photos with location data to show on the map.</p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden border border-gray-200 opacity-0 animate-[fadeIn_0.4s_ease-in_forwards] ${className}`}>
      <div ref={containerRef} className="h-[400px] w-full" />
      {geocodeLoading && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-lg pointer-events-none">
          <p className="text-gray-600 poppins-light">Loading map locations…</p>
        </div>
      )}
    </div>
  );
}

function escapeHtml(s: string): string {
  const div = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (div) {
    div.textContent = s;
    return div.innerHTML;
  }
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Escape for use inside an HTML attribute value (e.g. src="..."). */
function escapeHtmlAttr(s: string): string {
  return String(s)
    .replace(/\s+/g, ' ') // collapse newlines and other whitespace that could break attributes
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`/g, '&#96;'); // avoid breaking template literals when used in JS
}
