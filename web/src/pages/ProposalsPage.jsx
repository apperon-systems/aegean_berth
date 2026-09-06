import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { eur, fmtRange } from '../lib/format.js';
import { Img, Progress, toast } from '../components/ui.jsx';

export default function ProposalsPage() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ route_id: '', start: '', end: '', vessel_class: 'any', berths_needed: 1, notes: '' });
  const [busy, setBusy] = useState(false);

  const load = () => api('/proposals').then(setProposals).catch(() => setProposals([]));
  useEffect(() => { load(); api('/routes').then(setRoutes); }, []);

  const create = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const p = await api('/proposals', { method: 'POST', body: {
        route_id: form.route_id, proposed_start: form.start, proposed_end: form.end,
        vessel_class: form.vessel_class, berths_needed: Number(form.berths_needed), notes: form.notes
      } });
      toast('Proposal is live — share it to fill the remaining berths!');
      setShowForm(false); load();
    } catch (e2) { toast(e2.message); }
    setBusy(false);
  };

  return (
    <div className="section" style={{ maxWidth: 1100 }}>
      <p className="kicker">Crowdsourced departures</p>
      <div className="spread">
        <div style={{ maxWidth: 620 }}>
          <h1>Start a Sailing</h1>
          <p className="lead">
            Can’t find your route and dates? Propose the departure. Other travellers join,
            and once the minimum is reached, matching operators bid to run it. The proposer
            gets a discount when it fills — and if it expires, every hold is refunded automatically.
          </p>
        </div>
        {user ? (
          <button className="btn btn-accent" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'Propose a departure'}</button>
        ) : <Link to="/login" className="btn btn-primary">Log in to propose</Link>}
      </div>

      {showForm && (
        <form className="card" style={{ padding: 22, margin: '22px 0 30px' }} onSubmit={create}>
          <div className="form-row">
            <div className="field"><label>Route</label>
              <select required value={form.route_id} onChange={(e) => setForm({ ...form, route_id: e.target.value })}>
                <option value="">Choose a route…</option>
                {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="field"><label>Vessel class</label>
              <select value={form.vessel_class} onChange={(e) => setForm({ ...form, vessel_class: e.target.value })}>
                {['any', 'monohull', 'catamaran', 'gulet', 'motor_yacht'].map((v) => <option key={v} value={v}>{v.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="field"><label>Start date</label>
              <input type="date" required value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            </div>
            <div className="field"><label>End date</label>
              <input type="date" required value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
            </div>
            <div className="field"><label>Your berths</label>
              <input type="number" min="1" max="8" required value={form.berths_needed} onChange={(e) => setForm({ ...form, berths_needed: e.target.value })} />
            </div>
          </div>
          <div className="field"><label>Anything else? (optional)</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. celebrating a birthday, mixed group, experienced sailors…" />
          </div>
          <button className="btn btn-accent" disabled={busy}>{busy ? 'Publishing…' : 'Publish proposal'}</button>
        </form>
      )}

      <div className="grid-cards" style={{ marginTop: 26 }}>
        {proposals == null && <div className="skeleton sk-card" />}
        {proposals?.map((p) => {
          const pct = Math.round((p.berths_committed / p.berths_target) * 100);
          return (
            <Link to={`/proposals/${p.id}`} key={p.id} className="departure-card">
              <div className="dc-img">
                <Img src={p.hero_image} alt={p.route_name} />
                <div className="dc-badges">
                  <span className="badge badge-navy">{p.status === 'bidding' ? 'Operators bidding' : 'Filling up'}</span>
                  <span className="badge badge-line">{p.vessel_class.replace('_', ' ')}</span>
                </div>
              </div>
              <div className="dc-body">
                <div className="dc-title">{p.route_name}</div>
                <div className="dc-meta">
                  <span>{fmtRange(p.proposed_start, p.proposed_end)}</span>
                  <span>{p.joins_count + 1} travellers</span>
                  <span className="muted">by {p.proposer_name?.split(' ')[0]}</span>
                </div>
                <div>
                  <Progress pct={pct} />
                  <div className="spread small muted" style={{ marginTop: 4 }}>
                    <span>{p.berths_committed}/{p.berths_target} berths pledged</span>
                    <span>{p.best_bid ? <>best bid {eur(p.best_bid)}</> : `expires ${new Date(p.expires_at).toLocaleDateString()}`}</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
        {proposals && !proposals.length && (
          <div className="empty"><h3>No live proposals</h3><p>Be the first — propose a departure and rally others.</p></div>
        )}
      </div>
    </div>
  );
}
