'use client';
import { useState } from 'react';

interface Pub {
  name: string;
  url: string;
  priceKc: number | null;
  beersRaw: string;
  lat?: number;
  lng?: number;
  address?: string;
}

interface PubTourProps {
  pubs: Pub[];
  onTourGenerated: (tour: Pub[]) => void;
}

export function PubTour({ pubs, onTourGenerated }: PubTourProps) {
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [numStops, setNumStops] = useState(3);
  const [maxPrice, setMaxPrice] = useState(60);
  const [tourType, setTourType] = useState<'cheapest' | 'nearest' | 'variety'>('nearest');

  const geocodedPubs = pubs.filter(p => p.lat && p.lng && p.priceKc);

  const distance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const [tourSummary, setTourSummary] = useState<{ pubs: Pub[], totalDistance: number, totalPrice: number } | null>(null);

  const generateTour = async () => {
    if (!startAddress && geocodedPubs.length === 0) {
      alert('Zadaj počiatočnú adresu alebo počkaj na geokódovanie');
      return;
    }

    // Use center of Žižkov if no start address
    const startLat = 50.0849;
    const startLng = 14.4559;
    const endLat = endAddress ? startLat : startLat;
    const endLng = endAddress ? startLng : startLng;

    // Filter by price
    const affordable = geocodedPubs.filter(p => p.priceKc! <= maxPrice);
    
    if (affordable.length < numStops) {
      alert(`Len ${affordable.length} hospod v cenovom limite ${maxPrice} Kč`);
      return;
    }

    let tour: Pub[] = [];
    let currentLat = startLat;
    let currentLng = startLng;
    const available = [...affordable];
    let totalDist = 0;

    // Greedy nearest neighbor algorithm
    for (let i = 0; i < numStops; i++) {
      let nearest: Pub | null = null;
      let minDist = Infinity;

      for (const pub of available) {
        const dist = distance(currentLat, currentLng, pub.lat!, pub.lng!);
        
        if (tourType === 'cheapest') {
          const score = dist * 0.5 + (pub.priceKc! / 10); // Balance distance & price
          if (score < minDist) {
            minDist = score;
            nearest = pub;
          }
        } else if (tourType === 'variety') {
          const beerCount = pub.beersRaw.split(',').length;
          const score = dist * 0.3 - beerCount * 0.1; // Prefer variety
          if (score < minDist) {
            minDist = score;
            nearest = pub;
          }
        } else {
          if (dist < minDist) {
            minDist = dist;
            nearest = pub;
          }
        }
      }

      if (nearest) {
        const distToNearest = distance(currentLat, currentLng, nearest.lat!, nearest.lng!);
        totalDist += distToNearest;
        tour.push(nearest);
        currentLat = nearest.lat!;
        currentLng = nearest.lng!;
        available.splice(available.indexOf(nearest), 1);
      }
    }

    const totalPrice = tour.reduce((sum, p) => sum + (p.priceKc || 0), 0);
    setTourSummary({ pubs: tour, totalDistance: totalDist, totalPrice });
    onTourGenerated(tour);
  };

  return (
    <div style={{
      background: 'var(--tour-bg, #f6f8fa)',
      border: '1px solid var(--tour-border, #d0d7de)',
      borderRadius: 6,
      padding: 16,
      marginBottom: 16
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 600, color: 'var(--tour-text, #1b1f23)' }}>🍺 Pub Tour Planner</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4, color: 'var(--tour-text)' }}>
            Začiatok (voliteľné)
          </label>
          <input
            type="text"
            placeholder="napr. Husitská 45"
            value={startAddress}
            onChange={e => setStartAddress(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid var(--tour-input-border)',
              borderRadius: 4,
              fontSize: 13,
              background: 'var(--tour-input-bg)',
              color: 'var(--tour-input-text)'
            }}
          />
        </div>
        
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4, color: 'var(--tour-text)' }}>
            Koniec (voliteľné)
          </label>
          <input
            type="text"
            placeholder="napr. Seifertova 60"
            value={endAddress}
            onChange={e => setEndAddress(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid var(--tour-input-border)',
              borderRadius: 4,
              fontSize: 13,
              background: 'var(--tour-input-bg)',
              color: 'var(--tour-input-text)'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4, color: 'var(--tour-text)' }}>
            Počet zastávok
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={numStops}
            onChange={e => setNumStops(parseInt(e.target.value) || 3)}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid var(--tour-input-border)',
              borderRadius: 4,
              fontSize: 13,
              background: 'var(--tour-input-bg)',
              color: 'var(--tour-input-text)'
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4, color: 'var(--tour-text)' }}>
            Max cena (Kč)
          </label>
          <input
            type="number"
            min={20}
            max={100}
            value={maxPrice}
            onChange={e => setMaxPrice(parseInt(e.target.value) || 60)}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid var(--tour-input-border)',
              borderRadius: 4,
              fontSize: 13,
              background: 'var(--tour-input-bg)',
              color: 'var(--tour-input-text)'
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4, color: 'var(--tour-text)' }}>
            Typ tour
          </label>
          <select
            value={tourType}
            onChange={e => setTourType(e.target.value as any)}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid var(--tour-input-border)',
              borderRadius: 4,
              fontSize: 13,
              background: 'var(--tour-input-bg)',
              color: 'var(--tour-input-text)'
            }}
          >
            <option value="nearest">Najbližšie</option>
            <option value="cheapest">Najlacnejšie</option>
            <option value="variety">Najviac pív</option>
          </select>
        </div>
      </div>

      <button
        onClick={generateTour}
        style={{
          width: '100%',
          padding: '8px 16px',
          background: '#2da44e',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        Vygeneruj Tour ({geocodedPubs.length} hospod dostupných)
      </button>

      {tourSummary && (
        <div style={{
          marginTop: 16,
          padding: 12,
          background: 'var(--tour-input-bg)',
          border: '1px solid var(--tour-input-border)',
          borderRadius: 6
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginBottom: 12,
            paddingBottom: 8,
            borderBottom: '1px solid var(--tour-input-border)'
          }}>
            <div>
              <strong style={{ color: 'var(--tour-text)' }}>📍 {tourSummary.pubs.length} zastávok</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: 'var(--tour-text)' }}>
                🚶 {tourSummary.totalDistance.toFixed(2)} km
              </div>
              <div style={{ fontSize: 13, color: 'var(--tour-text)', marginTop: 2 }}>
                💰 {tourSummary.totalPrice} Kč celkom
              </div>
            </div>
          </div>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--tour-text)' }}>
            {tourSummary.pubs.map((pub, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                <strong>{pub.name}</strong> — {pub.priceKc} Kč
                {pub.beersRaw && (
                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                    {pub.beersRaw.split(',').slice(0, 3).join(', ')}
                    {pub.beersRaw.split(',').length > 3 && '...'}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
