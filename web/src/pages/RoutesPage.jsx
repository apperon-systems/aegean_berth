import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { eur } from '../lib/format.js';
import { Img, SkeletonCard } from '../components/ui.jsx';

export default function RoutesPage() {
  const [routes, setRoutes] = useState(null);
  useEffect(() => { api('/routes').then(setRoutes).catch(() => setRoutes([])); }, []);

  return (
    <div className="section">
      <p className="kicker">Every route, every region</p>
      <h1 style={{ fontSize: 40 }}>Sailing routes across Greece</h1>
      <p className="lead" style={{ marginBottom: 34 }}>
        Curated itineraries with real stop-by-stop plans. Pick a route, then pick the departure that fits your dates.
      </p>
      <div className="grid-cards">
        {routes == null && Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)}
        {routes?.map((r) => (
          <Link to={`/routes/${r.slug}`} key={r.id} className="departure-card">
            <div className="dc-img">
              <Img src={r.hero_image} alt={r.name} />
              <span className="dc-berths mono">{r.departure_count} departures</span>
            </div>
            <div className="dc-body">
              <div className="dc-title">{r.name}</div>
              <p className="muted small" style={{ margin: 0 }}>{r.summary}</p>
              <div className="dc-foot">
                <div className="muted small">{r.region} · {r.total_nm} nm · {r.typical_nights} nights</div>
                {r.from_price ? <span className="price-tag"><span className="p">{eur(r.from_price)}</span><div className="u">per person</div></span> : <span className="chip">Propose dates</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
