const VIBES = ['relaxed', 'party', 'family', 'couples', 'active', 'diving', 'wellness', 'photography', 'learn-to-sail'];
const TYPES = ['monohull', 'catamaran', 'gulet', 'motor_yacht'];
const REGIONS = ['Cyclades', 'Dodecanese', 'Ionian', 'Saronic', 'Sporades', 'Crete', 'Argosaronic'];

/** Filters component — reads/writes URL search params (shareable, SEO-friendly). */
export default function Filters({ params, onParams }) {
  const set = (key, val) => {
    const p = new URLSearchParams(params);
    if (val == null || val === '' || val === false) p.delete(key); else p.set(key, val);
    p.delete('offset');
    onParams(p);
  };
  const get = (k, d = '') => params.get(k) ?? d;
  const check = (key) => get(key) === 'true';

  return (
    <aside className="filters" aria-label="Filters">
      <div className="f-group">
        <h4>Region</h4>
        <select value={get('region')} onChange={(e) => set('region', e.target.value)} aria-label="Region">
          <option value="">All regions</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div className="f-group">
        <h4>Vessel</h4>
        <select value={get('vessel_type')} onChange={(e) => set('vessel_type', e.target.value)} aria-label="Vessel type">
          <option value="">Any type</option>
          {TYPES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
        </select>
        <label className="f-check"><input type="checkbox" checked={check('ensuite')} onChange={(e) => set('ensuite', e.target.checked || null)} /> Ensuite cabins</label>
        <label className="f-check"><input type="checkbox" checked={check('ac')} onChange={(e) => set('ac', e.target.checked || null)} /> Air conditioning</label>
      </div>
      <div className="f-group">
        <h4>Price per person (€)</h4>
        <div className="row" style={{ gap: 8 }}>
          <input type="number" min="0" placeholder="min" value={get('min_price')} onChange={(e) => set('min_price', e.target.value)} aria-label="Minimum price" />
          <input type="number" min="0" placeholder="max" value={get('max_price')} onChange={(e) => set('max_price', e.target.value)} aria-label="Maximum price" />
        </div>
      </div>
      <div className="f-group">
        <h4>Trip vibe</h4>
        {VIBES.map((v) => (
          <label key={v} className="f-check">
            <input type="radio" name="vibe" checked={get('vibe') === v} onChange={() => set('vibe', get('vibe') === v ? null : v)} />
            {v.replace(/-/g, ' ')}
          </label>
        ))}
      </div>
      <div className="f-group">
        <h4>Language onboard</h4>
        <select value={get('language')} onChange={(e) => set('language', e.target.value)} aria-label="Language spoken">
          <option value="">Any</option>
          {['en', 'el', 'de', 'fr', 'it', 'ru', 'nl', 'pl'].map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
        </select>
      </div>
      <div className="f-group">
        <h4>Booking experience</h4>
        <label className="f-check"><input type="checkbox" checked={check('instant')} onChange={(e) => set('instant', e.target.checked || null)} /> Instant confirmation</label>
        <label className="f-check"><input type="checkbox" checked={check('guaranteed')} onChange={(e) => set('guaranteed', e.target.checked || null)} /> Guaranteed departures</label>
        <label className="f-check"><input type="checkbox" checked={check('one_way')} onChange={(e) => set('one_way', e.target.checked || null)} /> One-way possible</label>
        <label className="f-check"><input type="checkbox" checked={check('pets')} onChange={(e) => set('pets', e.target.checked || null)} /> Pets allowed</label>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={() => onParams(new URLSearchParams())}>Clear all</button>
    </aside>
  );
}
