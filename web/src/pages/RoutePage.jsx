import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { fmtRange } from '../lib/format.js';
import DepartureCard from '../components/DepartureCard.jsx';
import MapView from '../components/MapView.jsx';
import { SkeletonCard, Stars } from '../components/ui.jsx';
import { setMeta } from '../lib/seo.js';

export default function RoutePage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    api(`/routes/${slug}`).then((d) => {
      setData(d);
      setMeta({ title: `${d.route.name} — AEGEAN BERTH`, description: d.route.summary });
    }).catch(() => setData({ error: true }));
  }, [slug]);

  if (!data) return <div className="dash"><div className="skeleton" style={{ height: 340, borderRadius: 14 }} /></div>;
  if (data.error) return <div className="section"><div className="alert alert-err">Route not found.</div></div>;
  const { route, stops, departures } = data;

  return (
    <div>
      <div className="hero" style={{ minHeight: 340 }}>
        <img className="hero-img" src={route.hero_image} alt={route.name} />
        <div className="hero-veil" />
        <div className="hero-inner" style={{ padding: '60px 24px 30px' }}>
          <p className="kicker" style={{ color: 'var(--gold)' }}>{route.region} · {route.total_nm} nm · {route.typical_nights} nights</p>
          <h1 style={{ fontSize: 44 }}>{route.name}</h1>
          <p className="lead">{route.summary}</p>
        </div>
      </div>
      <div style={{ maxWidth: 1180, margin: '26px auto', padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26, alignItems: 'start' }}>
        <div>
          <h3>The plan, stop by stop</h3>
          <div className="itin" style={{ marginTop: 12 }}>
            {stops.map((s) => (
              <div className="itin-stop" key={s.id}>
                <div className="itin-dot" />
                <div className="itin-body">
                  <b>{s.day_number > 0 ? `Day ${s.day_number}` : 'Boarding'} — {s.port_name}</b>
                  <div className="muted small">{s.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <MapView routeStops={stops} />
      </div>
      <div className="section-tight section" style={{ maxWidth: 1180 }}>
        <div className="spread" style={{ marginBottom: 20 }}>
          <h2>Upcoming departures</h2>
          <Link to={`/search?where=${encodeURIComponent(route.name.split(':')[0])}`} className="btn btn-ghost btn-sm">See all dates</Link>
        </div>
        <div className="grid-cards">
          {departures.map((d) => <DepartureCard key={d.id} d={d} />)}
          {!departures.length && <div className="empty"><h3>No departures scheduled</h3><p><Link to="/proposals" style={{ color: 'var(--accent)' }}>Propose one</Link> and rally other travellers.</p></div>}
        </div>
        {route.faq?.length > 0 && (
          <div style={{ maxWidth: 700, marginTop: 40 }}>
            <h3>FAQ</h3>
            {route.faq.map((f) => (
              <details key={f.q} style={{ borderBottom: '1px solid var(--line)', padding: '12px 4px' }}>
                <summary style={{ fontWeight: 600, cursor: 'pointer' }}>{f.q}</summary>
                <p className="muted" style={{ margin: '8px 0 0' }}>{f.a}</p>
              </details>
            ))}
          </div>
        )}
        <p className="muted small" style={{ marginTop: 30 }}>
          Season notes: {route.seasonality_notes} Best months: {(route.best_months || []).join(', ')}.
        </p>
      </div>
    </div>
  );
}
