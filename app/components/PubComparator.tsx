"use client";
import { useEffect, useMemo, useState, useRef } from 'react';
import { PubTour } from './PubTour';
import { PubEntry, SortKey } from '../../../types';
import './PubComparator.css';

export function PubComparator() {
  const [pubs, setPubs] = useState<PubEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('totalScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');
  const [priceFilter, setPriceFilter] = useState<number | null>(null);
  const [dark, setDark] = useState(false);
  const [view, setView] = useState<'table' | 'map'>('table');
  const [tourRoute, setTourRoute] = useState<PubEntry[]>([]);
  const [controlsCardCollapsed, setControlsCardCollapsed] = useState(false);
  const [selectedPub, setSelectedPub] = useState<PubEntry | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPubs, setSelectedPubs] = useState<Set<string>>(new Set());
  const [priceSelectVisible, setPriceSelectVisible] = useState(false);
  const [segmentWidth, setSegmentWidth] = useState(0);
  const segmentControlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/pubs');
        const data: PubEntry[] = await res.json();
        setPubs(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('pubDark') : null;
    if (saved === '1') setDark(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('pubDark', dark ? '1' : '0');
  }, [dark]);

  useEffect(() => {
    const updateSegmentWidth = () => {
      if (segmentControlRef.current) {
        const width = segmentControlRef.current.offsetWidth;
        if (width > 0) {
          setSegmentWidth(width / 2);
        }
      }
    };

    // Initial update
    updateSegmentWidth();
    
    // Use ResizeObserver for better tracking
    if (segmentControlRef.current && typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => {
        updateSegmentWidth();
      });
      resizeObserver.observe(segmentControlRef.current);
      
      return () => {
        resizeObserver.disconnect();
      };
    } else {
      // Fallback for browsers without ResizeObserver
      window.addEventListener('resize', updateSegmentWidth);
      return () => {
        window.removeEventListener('resize', updateSegmentWidth);
      };
    }
  }, []);

  const processed = useMemo(() => {
    const needle = search.toLowerCase();
    return pubs
      .map((p) => {
        const beers = p.categoryName
          ? [p.categoryName]
          : p.beersRaw
          ? p.beersRaw.replace(/\s+…$/, '').split(',').map((b) => b.trim()).filter(Boolean)
          : [];
        return { ...p, beers, beerCount: beers.length };
      })
      .filter(
        (p) => 
          (!needle || p.title.toLowerCase().includes(needle)) &&
          (priceFilter === null || p.priceRating === priceFilter)
      );
  }, [pubs, search, priceFilter]);

  const sorted = useMemo(() => {
    const arr = [...processed];
    arr.sort((a, b) => {
      let av: any;
      let bv: any;
      if (sortKey === 'beerCount') {
        av = a.beerCount;
        bv = b.beerCount;
      } else if (sortKey === 'priceKc') {
        av = a.priceKc ?? Infinity;
        bv = b.priceKc ?? Infinity;
      } else if (sortKey === 'totalScore') {
        av = a.totalScore ?? 0;
        bv = b.totalScore ?? 0;
      } else if (sortKey === 'reviewsCount') {
        av = a.reviewsCount ?? 0;
        bv = b.reviewsCount ?? 0;
      } else if (sortKey === 'priceRating') {
        av = a.priceRating ?? Infinity;
        bv = b.priceRating ?? Infinity;
      } else if (sortKey === 'street') {
        av = (a.street || '').toLowerCase();
        bv = (b.street || '').toLowerCase();
      } else if (sortKey === 'city') {
        av = (a.city || '').toLowerCase();
        bv = (b.city || '').toLowerCase();
      } else if (sortKey === 'categoryName') {
        av = (a.categoryName || '').toLowerCase();
        bv = (b.categoryName || '').toLowerCase();
      } else if (sortKey === 'phone') {
        av = (a.phone || '').toLowerCase();
        bv = (b.phone || '').toLowerCase();
      } else if (sortKey === 'website') {
        av = (a.website || '').toLowerCase();
        bv = (b.website || '').toLowerCase();
      } else {
        av = a.title.toLowerCase();
        bv = b.title.toLowerCase();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [processed, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setView('table');
  }

  const handleViewChange = (newView: 'table' | 'map') => {
    setView(newView);
  };

  if (loading) {
    return (
      <div className={`pubc-loading ${dark ? 'dark' : ''}`}>
        <div className="pubc-spinner"></div>
        <p>Načítám…</p>
      </div>
    );
  }

  const highlightTransform = segmentWidth > 0
    ? (view === 'table' ? 'translateX(0)' : `translateX(${segmentWidth}px)`)
    : (view === 'table' ? 'translateX(0%)' : 'translateX(100%)');

  return (
    <div className={`pubc-container ${dark ? 'dark' : ''}`}>
      {/* Fixed Navigation */}
      <div className="pubc-fixed-nav-container">
        <div className="pubc-fixed-nav">
          <div 
            ref={segmentControlRef}
            className="pubc-segmented-control"
            style={{ position: 'relative' }}
          >
            <div 
              className="pubc-segment-highlight"
              style={{
                transform: highlightTransform,
                width: segmentWidth > 0 ? `${segmentWidth}px` : '50%',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
            <button
              className={`pubc-segment ${view === 'table' ? 'active' : ''}`}
              onClick={() => handleViewChange('table')}
            >
              📋 Porovnávač
            </button>
            <button
              className={`pubc-segment ${view === 'map' ? 'active' : ''}`}
              onClick={() => handleViewChange('map')}
            >
              🗺️ Tour Generator
            </button>
          </div>
        </div>
        <button
          className="pubc-theme-toggle"
          onClick={() => setDark(!dark)}
        >
          {dark ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Background Gradient */}
      <div className={`pubc-gradient-bg ${dark ? 'dark' : ''}`} />

      {/* Views Container */}
      <div className="pubc-views-container">
        {/* Table View */}
        <div 
          className={`pubc-view-wrapper ${view === 'table' ? 'active' : ''}`}
          style={{ display: view === 'table' ? 'block' : 'none' }}
        >
          <div className="pubc-scroll-content">
            {/* Glassmorphism Card for Controls */}
            <div className="pubc-glass-card">
              <button
                className="pubc-card-header"
                onClick={() => setControlsCardCollapsed(!controlsCardCollapsed)}
              >
                <span>🔍 Filters & Sort</span>
                <span>{controlsCardCollapsed ? '▼' : '▲'}</span>
              </button>

              {!controlsCardCollapsed && (
                <>
                  <div className="pubc-controls-row">
                    <div className="pubc-input-wrapper">
                      <label className="pubc-input-label">🔍 Search</label>
                      <input
                        className="pubc-modern-input"
                        type="text"
                        placeholder="name"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <div className="pubc-input-wrapper">
                      <label className="pubc-input-label">💰 Price</label>
                      <button
                        className="pubc-price-select-button"
                        onClick={() => setPriceSelectVisible(true)}
                      >
                        <span>
                          {priceFilter === null ? 'All' : priceFilter === 1 ? 'Low' : priceFilter === 2 ? 'Mid' : 'High'}
                        </span>
                        <span>▼</span>
                      </button>
                    </div>
                  </div>

                  <div className="pubc-sort-row">
                    <label className="pubc-sort-label">Sort:</label>
                    <div className="pubc-sort-chips">
                      <button
                        className={`pubc-sort-chip ${sortKey === 'totalScore' ? 'active' : ''}`}
                        onClick={() => toggleSort('totalScore')}
                      >
                        ⭐ Rating {sortKey === 'totalScore' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                      </button>
                      <button
                        className={`pubc-sort-chip ${sortKey === 'name' ? 'active' : ''}`}
                        onClick={() => toggleSort('name')}
                      >
                        🔤 Name {sortKey === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Table Header */}
            <div className="pubc-table-header-container">
              <div className="pubc-modern-table-header">
                <div className="pubc-table-col-check">✓</div>
                <div 
                  className={`pubc-table-col-1 pubc-table-header-clickable ${sortKey === 'name' ? 'active' : ''}`}
                  onClick={() => toggleSort('name')}
                >
                  Name {sortKey === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
                </div>
                <div 
                  className={`pubc-table-col-2 pubc-table-header-clickable ${sortKey === 'totalScore' ? 'active' : ''}`}
                  onClick={() => toggleSort('totalScore')}
                >
                  Rating {sortKey === 'totalScore' ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
                </div>
                <div 
                  className={`pubc-table-col-3 pubc-table-header-clickable ${sortKey === 'reviewsCount' ? 'active' : ''}`}
                  onClick={() => toggleSort('reviewsCount')}
                >
                  Reviews {sortKey === 'reviewsCount' ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
                </div>
                <div 
                  className={`pubc-table-col-4 pubc-table-header-clickable ${sortKey === 'priceRating' ? 'active' : ''}`}
                  onClick={() => toggleSort('priceRating')}
                >
                  Price {sortKey === 'priceRating' ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
                </div>
                <div 
                  className={`pubc-table-col-5 pubc-table-header-clickable ${sortKey === 'street' ? 'active' : ''}`}
                  onClick={() => toggleSort('street')}
                >
                  Street {sortKey === 'street' ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
                </div>
                <div 
                  className={`pubc-table-col-6 pubc-table-header-clickable ${sortKey === 'city' ? 'active' : ''}`}
                  onClick={() => toggleSort('city')}
                >
                  City {sortKey === 'city' ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
                </div>
                <div 
                  className={`pubc-table-col-7 pubc-table-header-clickable ${sortKey === 'categoryName' ? 'active' : ''}`}
                  onClick={() => toggleSort('categoryName')}
                >
                  Category {sortKey === 'categoryName' ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
                </div>
                <div 
                  className={`pubc-table-col-8 pubc-table-header-clickable ${sortKey === 'phone' ? 'active' : ''}`}
                  onClick={() => toggleSort('phone')}
                >
                  Phone {sortKey === 'phone' ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
                </div>
                <div 
                  className={`pubc-table-col-9 pubc-table-header-clickable ${sortKey === 'website' ? 'active' : ''}`}
                  onClick={() => toggleSort('website')}
                >
                  Website {sortKey === 'website' ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
                </div>
              </div>
              <button
                className={`pubc-select-all-button ${selectedPubs.size === sorted.length ? 'selected' : ''}`}
                onClick={() => {
                  if (selectedPubs.size === sorted.length) {
                    setSelectedPubs(new Set());
                  } else {
                    setSelectedPubs(new Set(sorted.map(p => p.url)));
                  }
                }}
              >
                {selectedPubs.size === sorted.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Table Body */}
            <div className="pubc-table-body">
              {sorted.map((item, index) => {
                const priceLabel = item.priceRating === 1 ? 'Low' : item.priceRating === 2 ? 'Mid' : item.priceRating === 3 ? 'High' : '—';
                const isSelected = selectedPubs.has(item.url);

                return (
                  <div
                    key={item.url}
                    className={`pubc-modern-table-row ${index % 2 === 0 ? 'even' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedPub(item);
                      setModalVisible(true);
                    }}
                  >
                    <div
                      className="pubc-checkbox-container"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newSelected = new Set(selectedPubs);
                        if (isSelected) {
                          newSelected.delete(item.url);
                        } else {
                          newSelected.add(item.url);
                        }
                        setSelectedPubs(newSelected);
                      }}
                    >
                      <div className={`pubc-checkbox ${isSelected ? 'checked' : ''}`}>
                        {isSelected && '✓'}
                      </div>
                    </div>
                    <div className="pubc-table-col-1 pubc-table-link">
                      {item.title}
                    </div>
                    <div className="pubc-table-col-2">
                      {item.totalScore ? item.totalScore.toFixed(1) : '—'}
                    </div>
                    <div className="pubc-table-col-3">
                      {item.reviewsCount || 0}
                    </div>
                    <div className="pubc-table-col-4">
                      {priceLabel}
                    </div>
                    <div className="pubc-table-col-5">
                      {item.street || '—'}
                    </div>
                    <div className="pubc-table-col-6">
                      {item.city || '—'}
                    </div>
                    <div className="pubc-table-col-7">
                      {item.categoryName || '—'}
                    </div>
                    <div className="pubc-table-col-8">
                      {item.phone || '—'}
                    </div>
                    <div className="pubc-table-col-9">
                      {item.website ? (
                        <a 
                          href={item.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="pubc-table-link"
                        >
                          {item.website}
                        </a>
                      ) : '—'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pubc-note-line">
              Data z pivnidenicek.cz (scrap). Zelené = levnější 15%, červené = dražší 15%.
            </div>
          </div>
        </div>

        {/* Map/Tour Generator View */}
        <div 
          className={`pubc-view-wrapper ${view === 'map' ? 'active' : ''}`}
          style={{ display: view === 'map' ? 'block' : 'none' }}
        >
          <div className="pubc-scroll-content">
            <PubTour 
              pubs={selectedPubs.size > 0 
                ? sorted.filter(p => selectedPubs.has(p.url))
                : sorted} 
              onTourGenerated={setTourRoute} 
              tourRoute={tourRoute}
              dark={dark} 
            />
          </div>
        </div>
      </div>

      {/* Pub Detail Modal */}
      {modalVisible && selectedPub && (
        <div className="pubc-modal-overlay" onClick={() => setModalVisible(false)}>
          <div className="pubc-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="pubc-modal-header">
              <h2 className="pubc-modal-title">{selectedPub.title}</h2>
              <button
                className="pubc-modal-close"
                onClick={() => setModalVisible(false)}
              >
                ✕
              </button>
            </div>

            <div className="pubc-modal-body">
              <div className="pubc-modal-section">
                <div className="pubc-modal-section-title">⭐ Rating</div>
                <div className="pubc-modal-section-text">
                  {selectedPub.totalScore?.toFixed(1) || '—'} / 5.0
                </div>
                <div className="pubc-modal-section-subtext">
                  {selectedPub.reviewsCount || 0} reviews
                </div>
              </div>

              <div className="pubc-modal-section">
                <div className="pubc-modal-section-title">💰 Price</div>
                <div className="pubc-modal-section-text">
                  {selectedPub.priceRating === 1 ? 'Low' : selectedPub.priceRating === 2 ? 'Mid' : selectedPub.priceRating === 3 ? 'High' : '—'}
                </div>
              </div>

              <div className="pubc-modal-section">
                <div className="pubc-modal-section-title">📍 Address</div>
                <div className="pubc-modal-section-text">
                  {selectedPub.street || '—'}
                </div>
                <div className="pubc-modal-section-subtext">
                  {selectedPub.city || '—'}
                </div>
              </div>

              <div className="pubc-modal-section">
                <div className="pubc-modal-section-title">📝 Category</div>
                <div className="pubc-modal-section-text">
                  {selectedPub.categoryName || '—'}
                </div>
              </div>

              {selectedPub.phone && (
                <div className="pubc-modal-section">
                  <div className="pubc-modal-section-title">📞 Phone</div>
                  <div className="pubc-modal-section-text">
                    {selectedPub.phone}
                  </div>
                </div>
              )}

              {selectedPub.website && (
                <div className="pubc-modal-section">
                  <div className="pubc-modal-section-title">🌐 Web</div>
                  <a 
                    href={selectedPub.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pubc-modal-link"
                  >
                    {selectedPub.website}
                  </a>
                </div>
              )}

              <div className="pubc-modal-button-row">
                <a
                  href={selectedPub.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pubc-modal-button"
                  onClick={() => setModalVisible(false)}
                >
                  🗺️ Otvoriť v Mapách
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Price Select Modal */}
      {priceSelectVisible && (
        <div className="pubc-price-modal-overlay" onClick={() => setPriceSelectVisible(false)}>
          <div className="pubc-price-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className={`pubc-price-option ${priceFilter === null ? 'active' : ''}`}
              onClick={() => {
                setPriceFilter(null);
                setPriceSelectVisible(false);
              }}
            >
              All
            </button>
            <button
              className={`pubc-price-option ${priceFilter === 1 ? 'active' : ''}`}
              onClick={() => {
                setPriceFilter(1);
                setPriceSelectVisible(false);
              }}
            >
              Low
            </button>
            <button
              className={`pubc-price-option ${priceFilter === 2 ? 'active' : ''}`}
              onClick={() => {
                setPriceFilter(2);
                setPriceSelectVisible(false);
              }}
            >
              Mid
            </button>
            <button
              className={`pubc-price-option ${priceFilter === 3 ? 'active' : ''}`}
              onClick={() => {
                setPriceFilter(3);
                setPriceSelectVisible(false);
              }}
            >
              High
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
