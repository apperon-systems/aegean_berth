import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { eur, fmtRange, relativeDays } from '../lib/format.js';
import { toast } from '../components/ui.jsx';

const TABS = ['Overview', 'Departures', 'Bookings', 'Yield', 'Payouts', 'Enquiries'];

export default function OperatorPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState('Overview');
  const [data, setData] = useState(null);
  const [bookings, setBookings] = useState(null);
  const [payouts, setPayouts] = useState(null);
  const [enquiries, setEnquiries] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [create, setCreate] = useState({ vessel_id: '', route_id: '', departure_date: '', return_date: '', base_price_per_berth: '', booking_mode: 'by_berth', minimum_viable_bookings: 4, instant_confirmation: false, trip_vibe: [] });

  useEffect(() => {
    if (user?.role === 'operator') {
      api('/operator/dashboard').then(setData).catch((e) => toast(e.message));
      api('/operator/bookings').then(setBookings).catch(() => {});
      api('/operator/payouts').then(setPayouts).catch(() => {});
      api('/operator/enquiries').then(setEnquiries).catch(() => {});
    }
    api('/routes').then(setRoutes).catch(() => {});
  }, [user]);

  if (loading) return <div className="dash"><div className="skeleton" style={{ height: 200 }} /></div>;
  if (!user || user.role !== 'operator') return (
    <div className="section empty"><h3>Operator access only</h3><p>Log in with an operator account — try <code>ops@aegeanblue.gr</code> / <code>sailgreek1</code>.</p><Link to="/login" className="btn btn-primary">Log in</Link></div>
  );
  if (!data) return <div className="dash"><div className="skeleton" style={{ height: 240, borderRadius: 14 }} /></div>;

  const m = data.metrics;

  const doCreate = async (e) => {
    e.preventDefault();
    try {
      await api('/operator/departures', { method: 'POST', body: { ...create, base_price_per_berth: Number(create.base_price_per_berth), minimum_viable_bookings: Number(create.minimum_viable_bookings) } });
      toast('Departure published');
      setShowCreate(false);
      api('/operator/dashboard').then(setData);
    } catch (e2) { toast(e2.message); }
  };
  const bookingAction = async (bid, action) => {
    try { await api(`/operator/bookings/${bid}/action`, { method: 'POST', body: { action } }); toast(action === 'confirm' ? 'Booking confirmed' : 'Booking declined & deposit refunded'); loadAll(); }
    catch (e2) { toast(e2.message); }
  };
  const loadAll = () => {
    api('/operator/dashboard').then(setData);
    api('/operator/bookings').then(setBookings);
  };
  const applySuggestion = async (depId, pct) => {
    try { await api(`/operator/departures/${depId}/apply-suggestion`, { method: 'POST', body: { pct } }); toast(`Price reduced ${pct}%`); loadAll(); }
    catch (e2) { toast(e2.message); }
  };
  const replyEnquiry = async (threadId, body) => {
    try { await api(`/operator/enquiries/${threadId}/reply`, { method: 'POST', body: { body } }); toast('Reply sent'); api('/operator/enquiries').then(setEnquiries); }
    catch (e2) { toast(e2.message); }
  };

  return (
    <div className="dash">
      <div className="spread">
        <div>
          <p className="kicker">Operator console · {user.operator_name || user.name}</p>
          <h1 style={{ fontSize: 34 }}>Your fleet & departures</h1>
          <p className="muted small">Row-level security: you only ever see your own data — enforced at the database level.</p>
        </div>
        <button className="btn btn-accent" onClick={() => setShowCreate(!showCreate)}>New departure</button>
      </div>

      {showCreate && (
        <form className="card" style={{ padding: 22, margin: '18px 0' }} onSubmit={doCreate}>
          <div className="form-row">
            <div className="field"><label>Vessel</label>
              <select required value={create.vessel_id} onChange={(e) => setCreate({ ...create, vessel_id: e.target.value })}>
                <option value="">Choose…</option>
                {data.vessels.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.type}, {v.status})</option>)}
              </select>
            </div>
            <div className="field"><label>Route</label>
              <select required value={create.route_id} onChange={(e) => setCreate({ ...create, route_id: e.target.value })}>
                <option value="">Choose…</option>
                {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="field"><label>Departure date</label><input type="date" required value={create.departure_date} onChange={(e) => setCreate({ ...create, departure_date: e.target.value })} /></div>
            <div className="field"><label>Return date</label><input type="date" required value={create.return_date} onChange={(e) => setCreate({ ...create, return_date: e.target.value })} /></div>
            <div className="field"><label>Price per berth (€)</label><input type="number" min="50" required value={create.base_price_per_berth} onChange={(e) => setCreate({ ...create, base_price_per_berth: e.target.value })} /></div>
            <div className="field"><label>Min. viable bookings</label><input type="number" min="1" value={create.minimum_viable_bookings} onChange={(e) => setCreate({ ...create, minimum_viable_bookings: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="field"><label>Booking mode</label>
              <select value={create.booking_mode} onChange={(e) => setCreate({ ...create, booking_mode: e.target.value })}>
                {['by_berth', 'by_cabin', 'whole_boat', 'mixed'].map((b) => <option key={b} value={b}>{b.replace('_', ' ')}</option>)}
              </select>
            </div>
            <label className="f-check" style={{ alignSelf: 'end', paddingBottom: 10 }}><input type="checkbox" checked={create.instant_confirmation} onChange={(e) => setCreate({ ...create, instant_confirmation: e.target.checked })} /> Instant confirmation (ranking boost)</label>
          </div>
          <button className="btn btn-accent">Publish departure</button>
        </form>
      )}

      <div className="tabs">
        {TABS.map((tb) => <button key={tb} className={tab === tb ? 'on' : ''} onClick={() => setTab(tb)}>{tb}</button>)}
      </div>

      {tab === 'Overview' && (
        <>
          <div className="stat-grid">
            <div className="stat"><div className="n">{eur(m.revenue)}</div><div className="l">Confirmed revenue</div></div>
            <div className="stat"><div className="n">€{m.revpab_nightly || 0}</div><div className="l">RevPAB / berth-night</div></div>
            <div className="stat"><div className="n">{m.occupancy_pct}%</div><div className="l">Occupancy</div></div>
            <div className="stat"><div className="n">{m.cancellation_rate_pct}%</div><div className="l">Cancellation rate</div></div>
            <div className="stat"><div className="n">{m.pending_requests}</div><div className="l">Pending requests</div></div>
            <div className="stat"><div className="n">{m.open_departures}</div><div className="l">Open departures</div></div>
          </div>
          <p className="muted small">{m.booking_pace.note}</p>
          <h3>Next departures</h3>
          <table className="tbl">
            <thead><tr><th>Departure</th><th>Vessel</th><th>Dates</th><th>Berths</th><th>Status</th></tr></thead>
            <tbody>
              {data.departures.slice(0, 8).map((d) => (
                <tr key={d.id}>
                  <td><Link to={`/departures/${d.id}`} style={{ color: 'var(--accent)' }}>{d.route_name}</Link></td>
                  <td>{d.vessel_name}</td>
                  <td>{fmtRange(d.departure_date, d.return_date)}</td>
                  <td className="mono">{d.berths_available}/{d.berths_total}</td>
                  <td><span className={`badge ${d.status === 'guaranteed' ? 'badge-guaranteed' : d.status === 'full' ? 'badge-urgent' : 'badge-open'}`}>{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {tab === 'Departures' && (
        <table className="tbl">
          <thead><tr><th>Route</th><th>Vessel</th><th>Dates</th><th>Berths</th><th>Price</th><th>Status</th><th>Requests</th></tr></thead>
          <tbody>
            {data.departures.map((d) => (
              <tr key={d.id}>
                <td><Link to={`/departures/${d.id}`} style={{ color: 'var(--accent)' }}>{d.route_name}</Link> {d.status === 'draft' && <span className="badge badge-warn">draft</span>}</td>
                <td>{d.vessel_name}</td>
                <td>{fmtRange(d.departure_date, d.return_date)} <span className="muted small">({relativeDays(d.departure_date)})</span></td>
                <td className="mono">{d.berths_available}/{d.berths_total}</td>
                <td>{d.base_price_per_berth ? eur(d.base_price_per_berth) : eur(d.whole_boat_price)}</td>
                <td><span className={`badge ${d.status === 'guaranteed' ? 'badge-guaranteed' : d.status === 'full' ? 'badge-urgent' : 'badge-open'}`}>{d.status}</span></td>
                <td>{d.requests > 0 ? <span className="badge badge-instant">{d.requests} to answer</span> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'Bookings' && (
        <table className="tbl">
          <thead><tr><th>Traveller</th><th>Trip</th><th>Type</th><th>Berths</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {(bookings || []).map((b) => (
              <tr key={b.id}>
                <td><b>{b.traveller_name}</b><div className="muted small">{b.traveller_email}</div></td>
                <td>{b.route_name}<div className="muted small">{fmtRange(b.departure_date, b.return_date)} · {b.vessel_name}</div></td>
                <td>{b.booking_type.replace('_', ' ')}</td>
                <td className="mono">{b.berth_count}</td>
                <td>{eur(b.total_price)}<div className="muted small">deposit {b.deposit_amount ? eur(b.deposit_amount) : '—'} ({b.deposit_status || '—'})</div></td>
                <td><span className={`badge ${b.status === 'confirmed' ? 'badge-guaranteed' : b.status === 'on_request' ? 'badge-instant' : b.status === 'cancelled' ? 'badge-warn' : 'badge-line'}`}>{b.status.replace('_', ' ')}</span></td>
                <td>{b.status === 'on_request' && (
                  <span className="row">
                    <button className="btn btn-accent btn-sm" onClick={() => bookingAction(b.id, 'confirm')}>Confirm</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => bookingAction(b.id, 'decline')}>Decline</button>
                  </span>
                )}</td>
              </tr>
            ))}
            {bookings && !bookings.length && <tr><td colSpan={7} className="muted">No bookings yet.</td></tr>}
          </tbody>
        </table>
      )}

      {tab === 'Yield' && (
        <>
          <div className="stat-grid">
            <div className="stat"><div className="n">€{m.revpab_nightly || 0}</div><div className="l">RevPAB per available berth-night</div></div>
            <div className="stat"><div className="n">{m.occupancy_pct}%</div><div className="l">Occupancy curve (all scheduled)</div></div>
            <div className="stat"><div className="n">{m.cancellation_rate_pct}%</div><div className="l">Cancellation rate</div></div>
          </div>
          <h3 style={{ margin: '20px 0 8px' }}>Suggested price actions</h3>
          <p className="muted small">Auto-suggested reductions as departure approaches with unsold berths (configurable rules).</p>
          {!data.suggestions.length && <p className="muted">Nothing to adjust — your pricing looks healthy.</p>}
          {data.suggestions.map((s) => (
            <div className="doc-row" key={s.departure_id}>
              <span><b>{s.route_name}</b> · {s.vessel_name} · {s.days_until} days out · {s.unsold_pct}% unsold</span>
              <span className="row">
                <span className="chip">{s.rule.replace('_', ' ')} −{s.pct}% ({eur(s.current_price)} → {eur(s.current_price * (1 - s.pct / 100))})</span>
                <button className="btn btn-accent btn-sm" onClick={() => applySuggestion(s.departure_id, s.pct)}>Apply</button>
              </span>
            </div>
          ))}
        </>
      )}

      {tab === 'Payouts' && (
        <table className="tbl">
          <thead><tr><th>Period</th><th>Gross</th><th>Commission (12%)</th><th>Net</th><th>Status</th></tr></thead>
          <tbody>
            {(payouts || []).map((p) => (
              <tr key={p.id}>
                <td>{p.period}</td><td>{eur(p.gross)}</td><td>{eur(p.commission)}</td><td><b>{eur(p.net)}</b></td>
                <td><span className={`badge ${p.status === 'paid' ? 'badge-guaranteed' : 'badge-instant'}`}>{p.status}</span>{p.sepa_reference && <span className="muted small"> {p.sepa_reference}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'Enquiries' && (
        (enquiries || []).map((t) => (
          <div className="card" style={{ padding: 18, marginBottom: 12 }} key={t.id}>
            <div className="spread">
              <b>{t.traveller_name}</b>
              <span className="muted small">{t.route_name} · {t.departure_date}</span>
            </div>
            {t.messages.map((m) => (
              <div key={m.id} className="msg" style={{ margin: '10px 0' }}><div className="who">{m.sender_name}</div>{m.body}</div>
            ))}
            <ReplyBox onSubmit={(body) => replyEnquiry(t.id, body)} />
          </div>
        ))
      )}
    </div>
  );
}

function ReplyBox({ onSubmit }) {
  const [v, setV] = useState('');
  return (
    <form className="row" onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onSubmit(v); setV(''); } }}>
      <input placeholder="Reply…" value={v} onChange={(e) => setV(e.target.value)} style={{ flex: 1 }} />
      <button className="btn btn-primary btn-sm">Send</button>
    </form>
  );
}
