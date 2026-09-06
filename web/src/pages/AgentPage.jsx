import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { eur, fmtDate } from '../lib/format.js';

export default function AgentPage() {
  const { user, loading } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => { if (user?.role === 'agent') api('/agent/overview').then(setData).catch(() => {}); }, [user]);

  if (loading) return <div className="dash"><div className="skeleton" style={{ height: 200 }} /></div>;
  if (!user || user.role !== 'agent') return (
    <div className="section empty"><h3>Agent access only</h3><p>Try <code>agent@demo.gr</code> / <code>sailgreek1</code>.</p><Link to="/login" className="btn btn-primary">Log in</Link></div>
  );
  if (!data) return <div className="dash"><div className="skeleton" style={{ height: 240, borderRadius: 14 }} /></div>;

  return (
    <div className="dash">
      <p className="kicker">Agent portal</p>
      <h1 style={{ fontSize: 34 }}>{user.name}</h1>
      <p className="muted small">
        Negotiated commission: <b>{data.commission_rate}%</b> · TODO: white-labelled storefront + branded PDF quotes.
      </p>

      <div className="stat-grid" style={{ marginTop: 24 }}>
        <div className="stat"><div className="n">{data.clients.length}</div><div className="l">Clients</div></div>
        <div className="stat"><div className="n">{data.bookings.length}</div><div className="l">Bookings</div></div>
        <div className="stat"><div className="n">{eur(data.commission_statement.reduce((s, r) => s + Number(r.commission), 0))}</div><div className="l">Commission earned</div></div>
      </div>

      <h3>Monthly commission statement</h3>
      <table className="tbl" style={{ marginTop: 10 }}>
        <thead><tr><th>Period</th><th>Bookings</th><th>Gross</th><th>Commission</th></tr></thead>
        <tbody>
          {data.commission_statement.map((s) => (
            <tr key={s.period}><td>{s.period}</td><td>{s.bookings}</td><td>{eur(s.gross)}</td><td><b>{eur(s.commission)}</b></td></tr>
          ))}
          {!data.commission_statement.length && <tr><td colSpan={4} className="muted">No client bookings yet — TODO: branded quote builder to win your first.</td></tr>}
        </tbody>
      </table>

      <h3 style={{ marginTop: 26 }}>Client bookings</h3>
      <table className="tbl" style={{ marginTop: 10 }}>
        <thead><tr><th>Client</th><th>Trip</th><th>Departure</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
          {data.bookings.map((b) => (
            <tr key={b.id}>
              <td><b>{b.client_name}</b><div className="muted small">{b.client_email}</div></td>
              <td>{b.route_name}</td><td>{fmtDate(b.departure_date)}</td><td>{eur(b.total_price)}</td>
              <td><span className="badge badge-open">{b.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
