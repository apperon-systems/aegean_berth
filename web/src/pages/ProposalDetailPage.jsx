import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { eur, fmtRange } from '../lib/format.js';
import { Img, Progress, toast } from '../components/ui.jsx';
import { CheckIcon, ShareIcon } from '../components/icons.jsx';

export default function ProposalDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [berths, setBerths] = useState(1);
  const [bidPrice, setBidPrice] = useState('');
  const [bidMsg, setBidMsg] = useState('');

  const load = () => api(`/proposals/${id}`).then(setP).catch(() => setP({ error: true }));
  useEffect(() => { window.scrollTo(0, 0); load(); }, [id]);

  if (!p) return <div className="dash"><div className="skeleton" style={{ height: 320, borderRadius: 14 }} /></div>;
  if (p.error) return <div className="section"><div className="alert alert-err">Proposal not found.</div></div>;

  const pct = Math.round((p.berths_committed / p.berths_target) * 100);
  const isProposer = user?.id && p.proposer_id === user.id;
  const joined = p.joins.some((j) => j.name && user) || false;
  const expiry = new Date(p.expires_at);
  const daysLeft = Math.max(0, Math.ceil((expiry - Date.now()) / 86400000));

  const join = async () => {
    try { await api(`/proposals/${id}/join`, { method: 'POST', body: { berths: Number(berths) } }); toast('You’re in — berths pledged!'); load(); }
    catch (e) { toast(e.message); }
  };
  const bid = async (e) => {
    e.preventDefault();
    try { await api(`/proposals/${id}/bids`, { method: 'POST', body: { price_per_berth: Number(bidPrice), message: bidMsg } }); toast('Bid submitted'); load(); }
    catch (e2) { toast(e2.message); }
  };
  const accept = async (bidId) => {
    try { await api(`/proposals/${id}/accept`, { method: 'POST', body: { bid_id: bidId } }); toast('Bid accepted — the sailing is being scheduled!'); load(); }
    catch (e) { toast(e.message); }
  };
  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); toast('Link copied — rally your crew!'); }
    catch { toast(window.location.href); }
  };

  return (
    <div className="section" style={{ maxWidth: 1000 }}>
      <div className="split" style={{ gap: 30 }}>
        <div>
          <p className="kicker">Crowdsourced departure</p>
          <h1 style={{ fontSize: 36 }}>{p.route_name}</h1>
          <p className="muted">{p.region} · {p.difficulty}</p>
          <div className="row" style={{ margin: '10px 0 16px' }}>
            <span className="chip">{fmtRange(p.proposed_start, p.proposed_end)}</span>
            <span className="chip">{p.vessel_class.replace('_', ' ')}</span>
            {p.status === 'bidding' && <span className="badge badge-guaranteed"><CheckIcon size={11} /> Minimum reached — operators bidding</span>}
          </div>
          {p.notes && <blockquote style={{ borderLeft: '3px solid var(--accent)', margin: '0 0 18px', paddingLeft: 14, color: 'var(--muted)', fontStyle: 'italic' }}>
            “{p.notes}” — {p.proposer_name}
          </blockquote>}
          <h3>Pledged travellers</h3>
          <div className="row">
            <span className="chip">{p.proposer_name.split(' ')[0]} (proposer) · {p.berths_needed} berth(s)</span>
            {p.joins.map((j, i) => <span className="chip" key={i}>{j.name.split(' ')[0]} · {j.berths} berth(s)</span>)}
          </div>
        </div>

        <div className="card" style={{ padding: 22, alignSelf: 'start', boxShadow: 'var(--shadow-lg)' }}>
          <h3 style={{ marginBottom: 6 }}>{p.berths_committed} of {p.berths_target} berths pledged</h3>
          <Progress pct={pct} />
          <p className="muted small" style={{ margin: '8px 0 16px' }}>
            {p.berths_target - p.berths_committed > 0
              ? `${p.berths_target - p.berths_committed} more berths to trigger operator bids · expires in ${daysLeft} days`
              : 'Fully pledged — awaiting operator bid acceptance.'}
          </p>
          {user && !isProposer && (
            <div className="row" style={{ marginBottom: 14 }}>
              <select value={berths} onChange={(e) => setBerths(Number(e.target.value))} aria-label="Berths">
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} berth{n > 1 ? 's' : ''}</option>)}
              </select>
              <button className="btn btn-accent" onClick={join} disabled={!['open', 'bidding'].includes(p.status)}>Pledge berths</button>
            </div>
          )}
          <button className="btn btn-ghost btn-block" onClick={share}><ShareIcon size={15} /> Share this proposal</button>
          <p className="muted small" style={{ marginTop: 12 }}>
            Holds are refunded automatically if the proposal expires unfilled. The proposer earns a
            completion discount when the sailing fills.
          </p>
        </div>
      </div>

      {p.status === 'bidding' && (
        <div style={{ marginTop: 40 }}>
          <h2>Operator bids</h2>
          <p className="muted small">Operators compete to run this sailing — the proposer picks the winner.</p>
          {user?.role === 'operator' && (
            <form className="card" style={{ padding: 18, margin: '14px 0', background: 'var(--paper-2)' }} onSubmit={bid}>
              <div className="row" style={{ gap: 10 }}>
                <input type="number" min="50" placeholder="Price per berth (€)" required value={bidPrice} onChange={(e) => setBidPrice(e.target.value)} />
                <input placeholder="Message to travellers (optional)" value={bidMsg} onChange={(e) => setBidMsg(e.target.value)} style={{ flex: 1 }} />
                <button className="btn btn-primary">Submit bid</button>
              </div>
            </form>
          )}
          {p.bids.map((b) => (
            <div key={b.id} className="card" style={{ padding: 16, marginBottom: 10, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <Img src={b.photos?.[0]} alt={b.vessel_name} className="" style={{ width: 84, height: 60, objectFit: 'cover', borderRadius: 8 }} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <b>{b.company_name}</b> — {b.vessel_name || 'vessel TBD'} ({b.vessel_type?.replace('_', ' ')})
                {b.message && <div className="muted small">{b.message}</div>}
              </div>
              <div className="price-tag" style={{ textAlign: 'right' }}>
                <div className="p">{eur(b.price_per_berth)}</div><div className="u">per berth</div>
              </div>
              {isProposer && p.status === 'bidding' && (
                <button className="btn btn-accent btn-sm" onClick={() => accept(b.id)}>Accept bid</button>
              )}
            </div>
          ))}
          {!p.bids.length && <p className="muted">No bids yet — operators have been notified.</p>}
        </div>
      )}
    </div>
  );
}
