'use client';
import { useState, useMemo } from 'react';
import { PubEntry } from '../../../types';

interface PubTourProps {
  pubs: PubEntry[];
  onTourGenerated: (tour: PubEntry[]) => void;
  tourRoute?: PubEntry[];
  dark?: boolean;
}

export function PubTour({ pubs, onTourGenerated, tourRoute, dark = false }: PubTourProps) {
  const [numStops, setNumStops] = useState('3');
  const [maxPriceRating, setMaxPriceRating] = useState<number | null>(null);
  const [minRating, setMinRating] = useState<number>(0);
  const [tourType, setTourType] = useState<'cheapest' | 'nearest'>('nearest');
  const [priceSelectVisible, setPriceSelectVisible] = useState(false);
  const [ratingSelectVisible, setRatingSelectVisible] = useState(false);
  const [tourSummary, setTourSummary] = useState<{
    pubs: PubEntry[];
    totalDistance: number;
  } | null>(null);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [formCardCollapsed, setFormCardCollapsed] = useState(false);

  const geocodedPubs = pubs.filter((p) => (p.street || (p.lat && p.lng)));

  const distance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const generateTour = () => {
    if (geocodedPubs.length === 0) {
      alert('Žiadne hospody s GPS súradnicami');
      return;
    }

    const startLat = 50.0849;
    const startLng = 14.4559;

    const numStopsNum = parseInt(numStops, 10) || 3;

    const affordable = geocodedPubs.filter((p) => {
      const priceMatch = maxPriceRating === null ? true : p.priceRating <= maxPriceRating;
      const ratingMatch = (p.totalScore || 0) >= minRating;
      return priceMatch && ratingMatch;
    });

    if (affordable.length < numStopsNum) {
      const priceLabel = maxPriceRating === null ? 'all prices' : maxPriceRating === 1 ? 'Low' : maxPriceRating === 2 ? 'Low-Mid' : 'all';
      const ratingLabel = minRating === 0 ? 'any rating' : `${minRating.toFixed(1)}+ rating`;
      alert(`Only ${affordable.length} pubs with ${priceLabel} price and ${ratingLabel}`);
      return;
    }

    const allSamePrice = affordable.length > 0 && affordable.every(p => p.priceRating === affordable[0].priceRating);
    const ratings = affordable.map(p => p.totalScore || 0);
    const minRatingValue = Math.min(...ratings);
    const maxRatingValue = Math.max(...ratings);
    const ratingRange = maxRatingValue - minRatingValue;
    const allSimilarRatings = ratingRange < 0.3;
    const allSimilar = allSamePrice && allSimilarRatings;
    
    const available = [...affordable];
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }

    let tour: PubEntry[] = [];
    let currentLat = startLat;
    let currentLng = startLng;
    let totalDist = 0;

    for (let i = 0; i < numStopsNum; i++) {
      let candidates: { pub: PubEntry; score: number }[] = [];

      for (const pub of available) {
        let pubLat: number;
        let pubLng: number;
        
        if (pub.lat && pub.lng && typeof pub.lat === 'number' && typeof pub.lng === 'number' && !isNaN(pub.lat) && !isNaN(pub.lng)) {
          pubLat = pub.lat;
          pubLng = pub.lng;
        } else {
          const hash = (pub.street || pub.title || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const rng = (hash * 9301 + 49297) % 233280;
          const latOffset = ((rng / 233280) - 0.5) * 0.02;
          const lngOffset = (((hash * 1234) % 233280 / 233280) - 0.5) * 0.03;
          pubLat = startLat + latOffset;
          pubLng = startLng + lngOffset;
        }

        const dist = distance(currentLat, currentLng, pubLat, pubLng);

        let score: number;
        if (tourType === 'cheapest') {
          const price = pub.priceRating === 1 ? 35 : pub.priceRating === 2 ? 55 : 70;
          score = dist * 0.5 + price / 10;
        } else {
          score = dist;
        }

        if (allSimilar) {
          score += Math.random() * 0.5;
        } else {
          score += Math.random() * 0.1;
        }

        candidates.push({ pub, score });
      }

      candidates.sort((a, b) => a.score - b.score);
      
      let nearest: PubEntry | null = null;
      if (allSimilar && candidates.length > 1) {
        const topCount = Math.min(5, Math.max(2, candidates.length));
        const topCandidates = candidates.slice(0, topCount);
        const randomIndex = Math.floor(Math.random() * topCandidates.length);
        nearest = topCandidates[randomIndex].pub;
      } else if (candidates.length > 1) {
        const topCount = Math.min(3, candidates.length);
        const topCandidates = candidates.slice(0, topCount);
        const randomIndex = Math.floor(Math.random() * topCandidates.length);
        nearest = topCandidates[randomIndex].pub;
      } else {
        nearest = candidates[0]?.pub || null;
      }

      if (nearest) {
        let nearestLat: number;
        let nearestLng: number;
        
        if (nearest.lat && nearest.lng && typeof nearest.lat === 'number' && typeof nearest.lng === 'number' && !isNaN(nearest.lat) && !isNaN(nearest.lng)) {
          nearestLat = nearest.lat;
          nearestLng = nearest.lng;
        } else {
          const hash = (nearest.street || nearest.title || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const rng = (hash * 9301 + 49297) % 233280;
          const latOffset = ((rng / 233280) - 0.5) * 0.02;
          const lngOffset = (((hash * 1234) % 233280 / 233280) - 0.5) * 0.03;
          nearestLat = startLat + latOffset;
          nearestLng = startLng + lngOffset;
        }
        
        const distToNearest = distance(currentLat, currentLng, nearestLat, nearestLng);
        totalDist += distToNearest;
        tour.push(nearest);
        currentLat = nearestLat;
        currentLng = nearestLng;
        available.splice(available.indexOf(nearest), 1);
      } else {
        break;
      }
    }

    if (tour.length === 0) {
      alert('Nepodarilo sa vytvoriť tour - žiadne hospody s platnými GPS súradnicami');
      return;
    }

    setTourSummary({ pubs: tour, totalDistance: totalDist });
    onTourGenerated(tour);
  };

  const getPubLocation = (pub: PubEntry): { type: 'coords' | 'address', value: string } => {
    if (pub.lat && pub.lng && typeof pub.lat === 'number' && typeof pub.lng === 'number' && !isNaN(pub.lat) && !isNaN(pub.lng)) {
      return { type: 'coords', value: `${pub.lat},${pub.lng}` };
    } else if (pub.street && pub.city) {
      return { type: 'address', value: encodeURIComponent(`${pub.street}, ${pub.city}`) };
    } else if (pub.street) {
      return { type: 'address', value: encodeURIComponent(pub.street) };
    } else if (pub.title) {
      return { type: 'address', value: encodeURIComponent(pub.title) };
    }
    return { type: 'coords', value: '50.0849,14.4559' };
  };

  const openTourInGoogleMaps = (tourPubs: PubEntry[]) => {
    if (tourPubs.length === 0) {
      alert('Tour has no pubs');
      return;
    }

    if (tourPubs.length === 1) {
      const location = getPubLocation(tourPubs[0]);
      const url = `https://www.google.com/maps/search/?api=1&query=${location.value}`;
      window.open(url, '_blank');
      return;
    }

    const origin = getPubLocation(tourPubs[0]);
    const destination = getPubLocation(tourPubs[tourPubs.length - 1]);
    const waypoints = tourPubs.slice(1, -1).map(p => getPubLocation(p));
    
    let url = `https://www.google.com/maps/dir/?api=1`;
    url += `&origin=${origin.value}`;
    url += `&destination=${destination.value}`;
    
    if (waypoints.length > 0) {
      const limitedWaypoints = waypoints.slice(0, 9);
      const waypointParams = limitedWaypoints.map(w => w.value).join('|');
      url += `&waypoints=${waypointParams}`;
    }
    
    window.open(url, '_blank');
  };

  const getGoogleMapsHtml = (tourPubs: PubEntry[]): string | null => {
    if (tourPubs.length === 0) {
      return null;
    }

    const getPubCoords = (pub: PubEntry): { lat: number, lng: number } => {
      if (pub.lat && pub.lng && typeof pub.lat === 'number' && typeof pub.lng === 'number' && !isNaN(pub.lat) && !isNaN(pub.lng)) {
        return { lat: pub.lat, lng: pub.lng };
      }
      const startLat = 50.0849;
      const startLng = 14.4559;
      const hash = (pub.street || pub.title || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const rng = (hash * 9301 + 49297) % 233280;
      const latOffset = ((rng / 233280) - 0.5) * 0.02;
      const lngOffset = (((hash * 1234) % 233280 / 233280) - 0.5) * 0.03;
      return {
        lat: startLat + latOffset,
        lng: startLng + lngOffset,
      };
    };

    const waypoints = tourPubs.map((p: PubEntry) => {
      const coords = getPubCoords(p);
      return {
        lat: coords.lat,
        lng: coords.lng,
        name: p.title || p.name
      };
    });

    const centerLat = waypoints.reduce((sum, p) => sum + p.lat, 0) / waypoints.length;
    const centerLng = waypoints.reduce((sum, p) => sum + p.lng, 0) / waypoints.length;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #f5f5f5;
    }
    #map {
      width: 100%;
      height: 100%;
    }
    .loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #666;
      font-family: Arial, sans-serif;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="loading" id="loading">Načítavam mapu...</div>
  <script>
    function initMap() {
      document.getElementById('loading').style.display = 'none';
      
      const map = new google.maps.Map(document.getElementById('map'), {
        zoom: 13,
        center: { lat: ${centerLat}, lng: ${centerLng} },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: 'cooperative',
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });

      const waypoints = ${JSON.stringify(waypoints)};
      
      waypoints.forEach((point, index) => {
        new google.maps.Marker({
          position: { lat: point.lat, lng: point.lng },
          map: map,
          label: {
            text: (index + 1).toString(),
            color: 'white',
            fontWeight: 'bold',
            fontSize: '12px'
          },
          title: point.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#4285f4',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2
          }
        });
      });

      if (waypoints.length > 1) {
        const path = waypoints.map(p => new google.maps.LatLng(p.lat, p.lng));
        
        const polyline = new google.maps.Polyline({
          path: path,
          geodesic: true,
          strokeColor: '#4285f4',
          strokeOpacity: 0.8,
          strokeWeight: 5
        });
        polyline.setMap(map);
        
        const directionsService = new google.maps.DirectionsService();
        const directionsRenderer = new google.maps.DirectionsRenderer({
          map: map,
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: '#1a73e8',
            strokeWeight: 6,
            strokeOpacity: 1.0
          },
          preserveViewport: true
        });

        const waypointObjects = waypoints.slice(1, -1).map(p => ({
          location: { lat: p.lat, lng: p.lng },
          stopover: true
        }));

        directionsService.route({
          origin: { lat: waypoints[0].lat, lng: waypoints[0].lng },
          destination: { lat: waypoints[waypoints.length - 1].lat, lng: waypoints[waypoints.length - 1].lng },
          waypoints: waypointObjects.length > 0 ? waypointObjects : undefined,
          travelMode: google.maps.TravelMode.WALKING,
          optimizeWaypoints: false
        }, (result, status) => {
          if (status === 'OK') {
            polyline.setMap(null);
            directionsRenderer.setDirections(result);
          } else {
            console.log('Directions request failed, using simple polyline:', status);
          }
        });
      }
    }
    
    const script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?callback=initMap&libraries=geometry';
    script.async = true;
    script.defer = true;
    script.onerror = function() {
      document.getElementById('loading').textContent = 'Chyba pri načítaní mapy';
    };
    document.head.appendChild(script);
  </script>
</body>
</html>`;

    return html;
  };

  const mapHtml = useMemo(() => {
    if (!tourSummary) return null;
    return getGoogleMapsHtml(tourSummary.pubs);
  }, [tourSummary]);

  return (
    <div className={`pubc-tour-container ${dark ? 'dark' : ''}`}>
      {/* Glassmorphism Card */}
      <div className="pubc-glass-card">
        <button
          className="pubc-card-header"
          onClick={() => setFormCardCollapsed(!formCardCollapsed)}
        >
          <span>⚙️ Tour Settings</span>
          <span>{formCardCollapsed ? '▼' : '▲'}</span>
        </button>
        
        {!formCardCollapsed && (
          <div className="pubc-tour-form">
            <div className="pubc-tour-row">
              <div className="pubc-tour-input-group">
                <label className="pubc-tour-label">📍 Number of Stops</label>
          <input
                  className="pubc-modern-input"
            type="text"
                  value={numStops}
                  onChange={(e) => setNumStops(e.target.value)}
                  placeholder="3"
          />
        </div>
        
              <div className="pubc-tour-input-group">
                <label className="pubc-tour-label">💰 Max Price</label>
                <button
                  className="pubc-price-select-button"
                  onClick={() => setPriceSelectVisible(true)}
                >
                  <span>
                    {maxPriceRating === null ? 'All' : maxPriceRating === 1 ? 'Low' : maxPriceRating === 2 ? 'Low-Mid' : 'All'}
                  </span>
                  <span>▼</span>
                </button>
        </div>
      </div>

            <div className="pubc-tour-row">
              <div className="pubc-tour-input-group">
                <label className="pubc-tour-label">⭐ Min Rating</label>
                <button
                  className="pubc-price-select-button"
                  onClick={() => setRatingSelectVisible(true)}
                >
                  <span>
                    {minRating === 0 ? 'All' : `${minRating.toFixed(1)}+`}
                  </span>
                  <span>▼</span>
                </button>
        </div>

              <div className="pubc-tour-input-group">
                <label className="pubc-tour-label">🎯 Tour Type</label>
                <div className="pubc-tour-type-row">
                  <button
                    className={`pubc-tour-type-button ${tourType === 'nearest' ? 'active' : ''}`}
                    onClick={() => setTourType('nearest')}
                  >
                    ⚡ Nearest
                  </button>
                  <button
                    className={`pubc-tour-type-button ${tourType === 'cheapest' ? 'active' : ''}`}
                    onClick={() => setTourType('cheapest')}
                  >
                    💸 Cheapest
                  </button>
                </div>
              </div>
        </div>

            <button className="pubc-generate-button" onClick={generateTour}>
              ✨ Generate Tour ({geocodedPubs.length} pubs)
            </button>
        </div>
        )}
      </div>

      {tourSummary && (
        <div className="pubc-summary-container">
          <div className="pubc-summary-header">
            <div className="pubc-summary-title">
              📍 {tourSummary.pubs.length} stops
            </div>
            <div>
              <div className="pubc-summary-text">
                🚶 {tourSummary.totalDistance.toFixed(2)} km
              </div>
            </div>
          </div>
          
          <div className="pubc-summary-scroll">
            {tourSummary.pubs.map((pub, i) => (
              <div key={i} className="pubc-summary-item">
                <div className="pubc-summary-item-text">
                  {i + 1}. <strong>{pub.title}</strong> — {pub.priceRating === 1 ? 'Low' : pub.priceRating === 2 ? 'Mid' : 'High'}
                </div>
                {(pub.street || pub.address) && (
                  <div className="pubc-summary-item-address">
                    📍 {pub.street ? `${pub.street}, ${pub.city || ''}` : pub.address}
                  </div>
                )}
                {pub.beersRaw && (
                  <div className="pubc-summary-item-beers">
                    {pub.beersRaw.split(',').slice(0, 3).join(', ')}
                    {pub.beersRaw.split(',').length > 3 && '...'}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="pubc-tour-button-row">
            <button 
              className="pubc-open-map-button"
              onClick={() => {
                setMapModalVisible(true);
              }}
            >
              🗺️ Zobraziť mapu
            </button>
            
            <button 
              className="pubc-open-tour-button"
              onClick={() => {
                openTourInGoogleMaps(tourSummary.pubs);
              }}
            >
              📱 Google Maps
            </button>
          </div>
        </div>
      )}

      {/* Map Modal */}
      {mapModalVisible && mapHtml && (
        <div className="pubc-map-modal-overlay" onClick={() => setMapModalVisible(false)}>
          <div className="pubc-map-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="pubc-map-modal-header">
              <h2 className="pubc-map-modal-title">🗺️ Tour Map</h2>
              <button 
                className="pubc-map-modal-close"
                onClick={() => setMapModalVisible(false)}
              >
                ✕
              </button>
            </div>
            <iframe
              srcDoc={mapHtml}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: dark ? '#16191d' : '#f6f8fa'
              }}
              title="Tour Map"
            />
          </div>
        </div>
      )}

      {/* Price Select Modal */}
      {priceSelectVisible && (
        <div className="pubc-price-modal-overlay" onClick={() => setPriceSelectVisible(false)}>
          <div className="pubc-price-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className={`pubc-price-option ${maxPriceRating === null ? 'active' : ''}`}
              onClick={() => {
                setMaxPriceRating(null);
                setPriceSelectVisible(false);
              }}
            >
              All
            </button>
            <button
              className={`pubc-price-option ${maxPriceRating === 1 ? 'active' : ''}`}
              onClick={() => {
                setMaxPriceRating(1);
                setPriceSelectVisible(false);
              }}
            >
              Low
            </button>
            <button
              className={`pubc-price-option ${maxPriceRating === 2 ? 'active' : ''}`}
              onClick={() => {
                setMaxPriceRating(2);
                setPriceSelectVisible(false);
              }}
            >
              Low-Mid
            </button>
            <button
              className={`pubc-price-option ${maxPriceRating === 3 ? 'active' : ''}`}
              onClick={() => {
                setMaxPriceRating(3);
                setPriceSelectVisible(false);
              }}
            >
              All
            </button>
          </div>
        </div>
      )}

      {/* Rating Select Modal */}
      {ratingSelectVisible && (
        <div className="pubc-price-modal-overlay" onClick={() => setRatingSelectVisible(false)}>
          <div className="pubc-price-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className={`pubc-price-option ${minRating === 0 ? 'active' : ''}`}
              onClick={() => {
                setMinRating(0);
                setRatingSelectVisible(false);
              }}
            >
              All
            </button>
            <button
              className={`pubc-price-option ${minRating === 3.5 ? 'active' : ''}`}
              onClick={() => {
                setMinRating(3.5);
                setRatingSelectVisible(false);
              }}
            >
              3.5+
            </button>
            <button
              className={`pubc-price-option ${minRating === 4.0 ? 'active' : ''}`}
              onClick={() => {
                setMinRating(4.0);
                setRatingSelectVisible(false);
              }}
            >
              4.0+
            </button>
            <button
              className={`pubc-price-option ${minRating === 4.5 ? 'active' : ''}`}
              onClick={() => {
                setMinRating(4.5);
                setRatingSelectVisible(false);
              }}
            >
              4.5+
            </button>
          </div>
        </div>
      )}
    </div>
  );
}



