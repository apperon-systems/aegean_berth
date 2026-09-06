import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import DepartureCard from '../components/DepartureCard.jsx';
import Filters from '../components/Filters.jsx';
import MapView from '../components/MapView.jsx';
import { SkeletonCard } from '../components/ui.jsx';
import { SearchIcon } from '../components/icons.jsx';
import SearchBar from '../components/SearchBar.jsx';

const SORTS = [
  ['best', 'Best match'], ['price', 'Price'], ['date', 'Departure date'],
  ['berths', 'Berths remaining'], ['rating', 'Rating']
];

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [view, setView] = useState('cards');   // cards | map | calendar
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null); setError(null);
    api(`/search?${params}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [params]);

  const setSort = (sort) => { const p = new URLSearchParams(params); p.set('sort', sort); p.delete('offset'); setParams(p); };
  const page = (n) => { const p = new URLSearchParams(params); p.set('offset', n); setParams(p); };
  const offset = Number(params.get('offset') || 0);

  // Calendar view: group departures by month
  const byMonth = {};
  (data?.results || []).forEach((d) => {
    const key = new Date(d.departure_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    (byMonth[key] ||= []).push(d);
  });

  return (
    <div>
      <div style={{ background: 'var(--navy)', padding: '10px 0 18px' }}>
        <div className="section-tight" style={{ maxWidth: 1180 }}>
          <SearchBar initial={Object.fromEntries(params)} />
        </div>
      </div>
      <div className="search-layout">
        <Filters params={params} onParams={setParams} />
        <div>
          <div className="spread" style={{ marginBottom: 16 }}>
            <div>
              {data && <><b>{data.total}</b> departures found</>}
              {!data && <span className="muted">Searching…</span>}
              <div className="muted small" style={{ marginTop: 2 }}>
                {params.get('where') && <>“{params.get('where')}” · </>}
                {params.get('month') && <>month {params.get('month')}/{params.get('month_year')} · </>}
                {params.get('people')} people · {params.get('how')?.replace('_', ' ') || 'berth'}
              </div>
            </div>
            <div className="row">
              <select value={params.get('sort') || 'best'} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
                {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <div className="view-toggle" role="tablist">
                {[['cards', 'Cards'], ['map', 'Map'], ['calendar', 'Calendar']].map(([v, l]) => (
                  <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          {error && <div className="alert alert-err">{error}</div>}

          {view === 'map' && (
            <MapView results={data?.results || []} stopsByRoute={data?.stops_by_route || {}} />
          )}

          {view === 'calendar' && (
            <div>
              {Object.entries(byMonth).map(([month, deps]) => (
                <div key={month} style={{ marginBottom: 30 }}>
                  <h3 style={{ marginBottom: 12 }}>{month}</h3>
                  <div className="grid-cards">{deps.map((d) => <DepartureCard key={d.id} d={d} />)}</div>
                </div>
              ))}
              {data && !data.results.length && <div className="empty"><SearchIcon size={30} /><h3>Nothing sailing that month</h3><p>Try different dates — or <a href="/proposals" style={{ color: 'var(--accent)' }}>start a sailing</a> yourself.</p></div>}
            </div>
          )}

          {view === 'cards' && (
            <>
              <div className="grid-cards">
                {data == null && Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)}
                {data?.results.map((d) => <DepartureCard key={d.id} d={d} />)}
              </div>
              {data && !data.results.length && (
                <div className="empty">
                  <SearchIcon size={30} />
                  <h3>No departures match — yet</h3>
                  <p>Loosen a filter, or <a href="/proposals" style={{ color: 'var(--accent)' }}>propose the departure yourself</a> and rally others.</p>
                </div>
              )}
            </>
          )}

          {data && data.total > data.results.length && (
            <div style={{ textAlign: 'center', marginTop: 30 }}>
              <button className="btn btn-primary" onClick={() => page(offset + 24)}>
                Show more ({data.total - data.results.length} left)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
