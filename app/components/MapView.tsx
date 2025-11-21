'use client';
import { useMemo, forwardRef, useImperativeHandle } from 'react';
import { PubEntry } from '../../../types';

interface PubMapViewProps {
  pubs: PubEntry[];
  tourRoute?: PubEntry[];
  dark?: boolean;
}

export interface MapViewRef {
  openTourInMaps: () => void;
}

export const MapView = forwardRef<MapViewRef, PubMapViewProps>(({ pubs, tourRoute, dark = false }, ref) => {
  const center = { latitude: 50.0849, longitude: 14.4559 };

  const geocoded = pubs.filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number');
  const pubsWithCoords = useMemo(() => {
    if (geocoded.length > 0) {
      return geocoded;
    }
    return pubs.map((p, i) => {
      const hash = p.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), i);
      const rng = (hash * 9301 + 49297) % 233280;
      const latOffset = ((rng / 233280) - 0.5) * 0.02;
      const lngOffset = (((hash * 1234) % 233280 / 233280) - 0.5) * 0.03;
      return {
        ...p,
        lat: center.latitude + latOffset,
        lng: center.longitude + lngOffset,
      };
    });
  }, [pubs, geocoded.length]);

  const openTourInMaps = () => {
    if (!tourRoute || tourRoute.length === 0) {
      const url = `https://www.google.com/maps/search/?api=1&query=${center.latitude},${center.longitude}`;
      window.open(url, '_blank');
      return;
    }

    const tourPubs = tourRoute.filter((p: PubEntry) => 
      p.lat && 
      p.lng && 
      typeof p.lat === 'number' && 
      typeof p.lng === 'number' &&
      !isNaN(p.lat) &&
      !isNaN(p.lng)
    );
    
    if (tourPubs.length === 0) {
      alert('Tour nemá žiadne hospody s GPS súradnicami');
      return;
    }

    if (tourPubs.length === 1) {
      const url = `https://www.google.com/maps/search/?api=1&query=${tourPubs[0].lat},${tourPubs[0].lng}`;
      window.open(url, '_blank');
      return;
    }

    const origin = `${tourPubs[0].lat},${tourPubs[0].lng}`;
    const destination = `${tourPubs[tourPubs.length - 1].lat},${tourPubs[tourPubs.length - 1].lng}`;
    const waypointParams = tourPubs.slice(1, -1).map((p: PubEntry) => `${p.lat},${p.lng}`).join('|');
    
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    if (waypointParams) {
      url += `&waypoints=${waypointParams}`;
    }
    
    window.open(url, '_blank');
  };

  useImperativeHandle(ref, () => ({
    openTourInMaps,
  }));

  const openAllInMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${center.latitude},${center.longitude}`;
    window.open(url, '_blank');
  };

  return (
    <div className={`pubc-map-container ${dark ? 'dark' : ''}`}>
      <div className={`pubc-map-placeholder ${dark ? 'dark' : ''}`}>
        <div className="pubc-map-placeholder-title">
          📍 Mapa hospod
        </div>
        
        {!tourRoute || tourRoute.length === 0 ? (
          <button 
            className="pubc-map-button"
            onClick={openAllInMaps}
          >
            Otvoriť v Google Maps
          </button>
        ) : (
          <div className="pubc-tour-info">
            <div className="pubc-tour-info-text">
              🗺️ Tour má {tourRoute.length} zastávok
            </div>
            <div className="pubc-tour-info-subtext">
              Tlačidlo na otvorenie tour nájdete v tour summary vyššie
            </div>
          </div>
        )}
      </div>
      
      {geocoded.length < pubs.length && (
        <div className="pubc-map-warning">
          {geocoded.length === 0 ? (
            <>
              ⚠️ Náhodné pozície (žiadne GPS).<br />
              Spusť: cd scraper; node scrape.js
            </>
          ) : (
            <>
              📍 {geocoded.length} / {pubs.length} hospod má GPS súradnice<br />
              <span style={{ fontSize: '10px', opacity: 0.8 }}>Spusti scraper pre viac</span>
            </>
          )}
        </div>
      )}
    </div>
  );
});

MapView.displayName = 'MapView';
