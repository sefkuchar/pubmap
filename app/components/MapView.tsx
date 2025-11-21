'use client';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';

// Beer mug icon (smaller, clean design)
const beerIcon = typeof window !== 'undefined' ? new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBmaWxsPSIjZmZiMzAwIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMSIgZD0iTTQgNmgxMnYxMmMwIDEuMS0uOSAyLTIgMkg2Yy0xLjEgMC0yLS45LTItMlY2em0xNCA0aDFjMSAwIDIgLjkgMiAydjJjMCAxLjEtMSAyLTIgMmgtMXYtNnpNNiA0aDh2MUg2VjR6Ii8+PC9zdmc+',
  iconSize: [20, 20],
  iconAnchor: [10, 20],
  popupAnchor: [0, -20],
}) : null;

// Approximate Žižkov boundary polygon (rough outline)
const zizkovPolygon: [number, number][] = [
  [50.0906, 14.4535],
  [50.0894, 14.4658],
  [50.0849, 14.4800],
  [50.0787, 14.4790],
  [50.0756, 14.4672],
  [50.0782, 14.4528],
  [50.0822, 14.4465],
  [50.0870, 14.4479],
];

interface PubMapEntry {
  name: string;
  url: string;
  priceKc: number | null;
  lat?: number;
  lng?: number;
}

export function MapView({ pubs, tourRoute }: { pubs: PubMapEntry[], tourRoute?: PubMapEntry[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div style={{ height: 600, background: '#e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading map...</div>;

  // Center of Žižkov (for initial view only)
  const center: [number, number] = [50.0849, 14.4559];

  // Show real coords if available, otherwise random within Žižkov for visualization
  const geocoded = pubs.filter(p => typeof p.lat === 'number' && typeof p.lng === 'number');
  const pubsWithCoords = geocoded.length > 0 ? geocoded : pubs.map((p, i) => {
    // Seeded random based on pub name for consistent positions
    const hash = p.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), i);
    const rng = (hash * 9301 + 49297) % 233280;
    const latOffset = ((rng / 233280) - 0.5) * 0.02;
    const lngOffset = (((hash * 1234) % 233280 / 233280) - 0.5) * 0.03;
    return {
      ...p,
      lat: center[0] + latOffset,
      lng: center[1] + lngOffset,
    };
  });

  return (
    <div style={{ position: 'relative', height: 600, borderRadius: 8, overflow: 'hidden', border: '1px solid #2b2f33' }}>
      <MapContainer 
        center={center} 
        zoom={15} 
        zoomControl={true}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        preferCanvas={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />
        {tourRoute && tourRoute.length > 1 && (
          <Polyline
            positions={tourRoute.map(p => [p.lat!, p.lng!])}
            pathOptions={{ color: '#ff4444', weight: 3, opacity: 0.8, dashArray: '10, 5' }}
          />
        )}
        {pubsWithCoords.map((pub, idx) => (
          <Marker key={idx} position={[pub.lat!, pub.lng!]} icon={beerIcon!}>
            <Popup>
              <div style={{ minWidth: 160 }}>
                <strong style={{ fontSize: 14, color: '#111' }}>{pub.name}</strong>
                <div style={{ marginTop: 4, color: '#222' }}>💰 {pub.priceKc ?? '—'} Kč</div>
                <a
                  href={pub.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-block', marginTop: 8, color: '#0a66c2', textDecoration: 'none', fontWeight: 500 }}
                >Detail →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {geocoded.length < pubs.length && (
        <div style={{
          position: 'absolute',
          top: 12,
          left: 12,
          background: 'rgba(0,0,0,0.85)',
          padding: '10px 14px',
          borderRadius: 6,
          color: '#ffc658',
          fontSize: 13,
          maxWidth: 260,
          lineHeight: 1.4,
          backdropFilter: 'blur(3px)',
          border: '1px solid rgba(255,182,0,0.3)'
        }}>
          {geocoded.length === 0 ? (
            <>
              ⚠️ Náhodné pozície (žiadne GPS).<br />
              Spusť: <code style={{ fontSize: 11, background: '#222', padding: '2px 4px', borderRadius: 3 }}>cd scraper; node scrape.js</code>
            </>
          ) : (
            <>
              📍 {geocoded.length} / {pubs.length} hospod má GPS súradnice<br />
              <span style={{ fontSize: 11, opacity: 0.8 }}>Spusti scraper pre viac</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
