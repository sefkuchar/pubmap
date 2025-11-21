"use client";
import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import './PubComparatorClean.css';
import { PubTour } from './PubTour';

const MapView = lazy(() => import('./MapView').then(m => ({ default: m.MapView })));

interface PubEntry { name: string; url: string; beersRaw: string; priceKc: number | null; }

type SortKey = 'name' | 'priceKc' | 'beerCount';

export function PubComparator() {
  const [pubs, setPubs] = useState<PubEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('priceKc');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');
  const [search, setSearch] = useState('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [dark, setDark] = useState(false);
  const [view, setView] = useState<'table'|'map'>('table');
  const [tourRoute, setTourRoute] = useState<PubEntry[]>([]);

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

  const processed = useMemo(() => {
    const needle = search.toLowerCase();
    const max = maxPrice ? parseInt(maxPrice, 10) : Infinity;
    return pubs
      .map(p => {
        const beers = p.beersRaw
          .replace(/\s+…$/, '')
          .split(',')
          .map(b => b.trim())
          .filter(Boolean);
        return { ...p, beers, beerCount: beers.length };
      })
      .filter(p => (
        (!needle || p.name.toLowerCase().includes(needle) || p.beersRaw.toLowerCase().includes(needle)) &&
        (p.priceKc === null || p.priceKc <= max)
      ));
  }, [pubs, search, maxPrice]);

  const sorted = useMemo(() => {
    const arr = [...processed];
    arr.sort((a,b) => {
      let av: any; let bv: any;
      if (sortKey === 'beerCount') { av = a.beerCount; bv = b.beerCount; }
      else if (sortKey === 'priceKc') { av = a.priceKc ?? Infinity; bv = b.priceKc ?? Infinity; }
      else { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [processed, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('pubDark') : null;
    if (saved === '1') setDark(true);
  }, []);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('pubDark', dark ? '1':'0'); }, [dark]);

  // Price band thresholds
  // Removed price badges for cleaner look

  const wrapperClass = dark ? 'dark pubc-wrap' : 'pubc-wrap';

  return (
    <div className={wrapperClass}>
      <h1 className="pubc-title">Průvodce žižkovskými hospodami</h1>
      <div className="pubc-controls">
        <input placeholder="Hledat (název nebo pivo)" value={search} onChange={e=>setSearch(e.target.value)} />
        <input placeholder="Max cena (Kč)" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} />
        <button onClick={()=>toggleSort('priceKc')} className={sortKey==='priceKc'?'active':''}>Cena {sortKey==='priceKc'?(sortDir==='asc'?'↑':'↓'):''}</button>
        <button onClick={()=>toggleSort('beerCount')} className={sortKey==='beerCount'?'active':''}>Počet piv {sortKey==='beerCount'?(sortDir==='asc'?'↑':'↓'):''}</button>
        <button onClick={()=>toggleSort('name')} className={sortKey==='name'?'active':''}>Název {sortKey==='name'?(sortDir==='asc'?'↑':'↓'):''}</button>
        <button onClick={()=>setDark(false)} className={!dark?'active':''}>Světlé</button>
        <button onClick={()=>setDark(true)} className={dark?'active':''}>Tmavé</button>
        <button onClick={()=>setView('table')} className={view==='table'?'active':''}>Tabulka</button>
        <button onClick={()=>setView('map')} className={view==='map'?'active':''}>Mapa</button>
      </div>
      {loading? <p>Načítám…</p> : view === 'map' ? (
        <>
          <PubTour pubs={sorted} onTourGenerated={setTourRoute} />
          <Suspense fallback={<div style={{height:600,background:'#e9ecef',display:'flex',alignItems:'center',justifyContent:'center'}}>Načítám mapu...</div>}>
            <MapView pubs={sorted} tourRoute={tourRoute} />
          </Suspense>
        </>
      ) : (
        <table className="pubc-table">
          <thead>
            <tr>
              <th>Název</th><th>Cena (Kč)</th><th>Piva</th><th># Piv</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(p => (
              <tr key={p.url}>
                <td><a href={p.url} target="_blank" rel="noopener noreferrer">{p.name}</a></td>
                <td>{p.priceKc ?? '—'}</td>
                <td>{p.beers.join(', ')}</td>
                <td>{p.beerCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="note-line">Data z pivnidenicek.cz (scrap). Zelené = levnější 15%, červené = dražší 15%.</p>
    </div>
  );
}
