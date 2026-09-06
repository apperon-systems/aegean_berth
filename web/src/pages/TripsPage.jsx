import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { eur, fmtRange, relativeDays } from '../lib/format.js';
import { Img, toast } from '../components/ui.jsx';

export default function TripsPage() {
  const { user, loading } = useAuth();
  const [trips, setTrips] = useState(null);

  useEffect(() => { if (user) api('/trips').then(setTrips).catch(() => setTrips([])); }, [user]);

  if (loading) return <div className="dash"><div className="skeleton" style={{ height: 200, borderRadius: 14 }} /></div>;
  if (!user) return (
    <div className="section empty">
      <h3>Log in to see your trips</h3>
      <Link to="/login" className="btn btn-primary">Log in</Link>
    </div>
  );

  const statusBadge = (b) => ({
    confirmed: <span className="badge badge-guaranteed">Confirmed</span>,
    on_request: <span className="badge badge-instant">Awaiting operator</span>,
    completed: <span className="badge badge-done">Completed</span>,
    cancelled: <span className="badge badge-warn">Cancelled</span>,
    pending: <span className="badge badge-line">Pending</span>
  }[b] || <span className="badge badge-line">{b}</span>);

  return (
    <div className="dash">
      <p className="kicker">Trip companion</p>
      <h1 style={{ marginBottom: 26 }}>Your sailings</h1>
      {trips == null && <div className="skeleton" style={{ height: 180, borderRadius: 14 }} />}
      {trips && !trips.length && (
        <div className="empty">
          <h3>No trips yet</h3>
          <p>Find a departure that matches your dates — or start one yourself.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link to="/search" className="btn btn-primary">Search departures</Link>
            <Link to="/proposals" className="btn btn-ghost">Start a Sailing</Link>
          </div>
        </div>
      )}
      <div className="grid-cards">
        {trips?.map((t) => (
          <Link to={`/account/trips/${t.id}`} key={t.id} className="departure-card">
            <div className="dc-img">
              <Img src={t.photos?.[0] || t.hero_image} alt={t.route_name} />
              <div className="dc-badges">{statusBadge(t.status)}</div>
              <span className="dc-berths mono">{relativeDays(t.departure_date)}</span>
            </div>
            <div className="dc-body">
              <div className="dc-title">{t.route_name}</div>
              <div className="dc-meta">
                <span>{fmtRange(t.departure_date, t.return_date)}</span>
                <span>{t.vessel_name}</span>
                <span>Skipper {t.skipper_name}</span>
              </div>
              <div className="dc-foot">
                <span className="muted small">{t.berth_count} berth(s) · {t.booking_type.replace('_', ' ')}</span>
                <span className="price-tag"><span className="p">{eur(t.total_price)}</span></span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
