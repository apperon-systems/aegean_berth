import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { eur, fmtRange, relativeDays } from '../lib/format.js';
import MapView from '../components/MapView.jsx';
import { toast, GenderDot, Progress, Avatar } from '../components/ui.jsx';
import { WindIcon, WavesIcon, PlusIcon, CheckIcon, DocIcon, ShareIcon, SunIcon } from '../components/icons.jsx';

export default function TripHubPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [t, setT] = useState(null);
  const [err, setErr] = useState(null);
  const [chatDraft, setChatDraft] = useState('');
  const [newItem, setNewItem] = useState({ packing: '', provisioning: '' });
  const [docName, setDocName] = useState('');

  const load = () => api(`/trips/${id}`).then(setT).catch((e) => setErr(e.message));
  useEffect(() => { window.scrollTo(0, 0); load(); }, [id]);

  if (err) return <div className="section"><div className="alert alert-err">{err}</div><Link className="btn btn-primary" to="/account/trips">Back to trips</Link></div>;
  if (!t) return <div className="dash"><div className="skeleton" style={{ height: 300, borderRadius: 14 }} /></div>;

  const { booking: b } = t;
  const packing = t.items.filter((i) => i.category === 'packing');
  const provisioning = t.items.filter((i) => i.category === 'provisioning');

  const send = async (e) => {
    e.preventDefault();
    if (!chatDraft.trim()) return;
    try { await api(`/trips/${id}/messages`, { method: 'POST', body: { body: chatDraft } }); setChatDraft(''); load(); }
    catch (e2) { toast(e2.message); }
  };
  const addItem = async (category) => {
    const name = newItem[category].trim();
    if (!name) return;
    try { await api(`/trips/${id}/items`, { method: 'POST', body: { name, category } }); setNewItem({ ...newItem, [category]: '' }); load(); }
    catch (e2) { toast(e2.message); }
  };
  const toggleItem = async (item, patch) => {
    try { await api(`/trips/${id}/items/${item.id}`, { method: 'PATCH', body: patch }); load(); }
    catch (e2) { toast(e2.message); }
  };
  const uploadDoc = async (e) => {
    e.preventDefault();
    if (!docName.trim()) return;
    try { await api(`/trips/${id}/documents`, { method: 'POST', body: { doc_type: 'passport', file_name: docName, size_bytes: 180000 } }); setDocName(''); toast('Document registered (encrypted at rest; purged 90 days after the trip)'); load(); }
    catch (e2) { toast(e2.message); }
  };
  const respondMatch = async (matchId, action) => {
    try { await api(`/trips/${id}/cabin-matches/${matchId}/respond`, { method: 'POST', body: { action } }); toast(action === 'accept' ? 'Cabin share accepted!' : 'Declined'); load(); }
    catch (e2) { toast(e2.message); }
  };
  const requestMatch = async (targetBookingId) => {
    try { await api(`/trips/${id}/cabin-matches`, { method: 'POST', body: { target_booking_id: targetBookingId } }); toast('Share request sent'); load(); }
    catch (e2) { toast(e2.message); }
  };
  const splitShare = Math.round(b.total_price / Math.max(1, b.berth_count));
  const inProgress = new Date(b.departure_date) <= new Date() && new Date(b.return_date) >= new Date();

  return (
    <div className="dash">
      <div className="spread" style={{ marginBottom: 8 }}>
        <div>
          <p className="kicker">Trip companion</p>
          <h1 style={{ fontSize: 36 }}>{b.route_name}</h1>
          <p className="muted">
            {b.vessel_name} · {fmtRange(b.departure_date, b.return_date)} · Skipper {b.skipper_name || 'TBA'} · Operator {b.operator_name}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="countdown">{t.days_until > 0 ? `⛵ ${t.days_until} days to embarkation` : inProgress ? 'You’re sailing now!' : relativeDays(b.departure_date)}</div>
          <span className="badge badge-guaranteed" style={{ marginTop: 6 }}>{b.status.replace('_', ' ')}</span>
        </div>
      </div>
      {inProgress && b.mmsi && <div className="alert alert-ok">Friends & family can follow along — <a href="#" onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(window.location.href); toast('Live tracking link copied'); }} style={{ textDecoration: 'underline' }}>share the live tracking link</a>.</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 26, marginTop: 22 }}>
        <div>
          <MapView routeStops={t.stops} ais={t.ais_position} />

          <div className="card" style={{ padding: 20, marginTop: 22 }}>
            <h3 className="row" style={{ justifyContent: 'space-between' }}>Group chat <span className="muted small">everyone on this departure</span></h3>
            <div className="chat-box">
              {t.messages.map((m) => (
                <div key={m.id} className={`msg ${m.sender_id === user.id ? 'mine' : ''}`}>
                  <div className="who">{m.sender_name}{m.sender_role === 'skipper' ? ' ⚓ skipper' : ''}</div>
                  {m.body}
                </div>
              ))}
              {!t.messages.length && <p className="muted small">Say hi to your crew…</p>}
            </div>
            <form className="row" onSubmit={send} style={{ marginTop: 10 }}>
              <input style={{ flex: 1 }} placeholder="Message your crew…" value={chatDraft} onChange={(e) => setChatDraft(e.target.value)} />
              <button className="btn btn-primary btn-sm">Send</button>
            </form>
          </div>

          <div className="card" style={{ padding: 20, marginTop: 22 }}>
            <h3>Cabin-share matching</h3>
            <p className="muted small">Mutual accept/decline — profiles stay anonymised until both sides agree.</p>
            {t.incoming_matches.map((m) => (
              <div className="doc-row" key={m.id}>
                <span>An anonymised traveller ({m.id.slice(0, 4)}…) wants to share your cabin</span>
                {m.status === 'requested'
                  ? <span className="row"><button className="btn btn-accent btn-sm" onClick={() => respondMatch(m.id, 'accept')}>Accept</button><button className="btn btn-ghost btn-sm" onClick={() => respondMatch(m.id, 'decline')}>Decline</button></span>
                  : <span className="badge badge-done">{m.status}</span>}
              </div>
            ))}
            {t.my_matches.map((m) => (
              <div className="doc-row" key={m.id}><span>Your cabin-share request</span><span className="badge badge-open">{m.status}</span></div>
            ))}
            {t.cabin_share_candidates.map((c, i) => {
              const p = c.share_profile || {};
              const alreadyRequested = t.my_matches.some((m) => m.target_booking_id === c.id);
              return (
                <div className="doc-row" key={i}>
                  <span><GenderDot gender={p.gender} /> {p.age_band} · {(p.languages || []).join(', ')} · {p.sleep_habits?.replace('_', ' ')} · {p.smoking === 'no' ? 'non-smoker' : p.smoking}</span>
                  {!alreadyRequested && b.share_cabin && <button className="btn btn-ghost btn-sm" onClick={() => requestMatch(c.id)}>Request share</button>}
                  {alreadyRequested && <span className="badge badge-open">requested</span>}
                </div>
              );
            })}
            {!t.cabin_share_candidates.length && !t.incoming_matches.length && <p className="muted small">No cabin-share candidates on this departure.</p>}
          </div>

          <div className="card" style={{ padding: 20, marginTop: 22 }}>
            <h3>Compliance (Greece)</h3>
            <div className="doc-row"><span>ΤΕΠΑΗ cruising tax (estimate)</span><b>{eur(t.tepah_tax)}</b></div>
            <div className="doc-row">
              <span>e-Charterparty manifest (Ναυλοσύμφωνο)</span>
              <a href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(t.e_charterparty, null, 2))}`} download="e-charterparty-manifest.json">
                <button className="btn btn-ghost btn-sm"><DocIcon size={13} /> Export manifest</button>
              </a>
            </div>
            <p className="muted small" style={{ marginTop: 8 }}>
              TODO in production: hand-off to the official e-Charterparty workflow + myDATA invoice transmission (ΑΑΔΕ).
            </p>
          </div>
        </div>

        <div>
          <div className="card" style={{ padding: 20 }}>
            <h3><SunIcon size={16} /> Weather on the route</h3>
            <p className="muted small">7-day marine forecast (mock adapter · TODO Windy/OpenWeather/Poseidon-HCMR)</p>
            {t.weather.slice(0, 5).map((w) => (
              <div className="doc-row" key={w.day_offset}>
                <span>{w.day_offset === 0 ? 'Today' : `+${w.day_offset}d`} · {w.summary}</span>
                <span className="row small muted"><WindIcon size={13} /> {w.wind_knots} kn · <WavesIcon size={13} /> {w.wave_m} m · {w.temp_c}°</span>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 20, marginTop: 22 }}>
            <h3>Split payments</h3>
            <p className="muted small">Each guest pays their own share ({b.berth_count} berth{b.berth_count > 1 ? 's' : ''} × {eur(splitShare)}).</p>
            <div className="doc-row"><span>Your share</span><b>{eur(splitShare)}</b></div>
            <button className="btn btn-ghost btn-sm btn-block" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/departures/${b.departure_id}`); toast('Payment split link copied'); }}>
              <ShareIcon size={13} /> Copy group payment link
            </button>
            <p className="muted small" style={{ marginTop: 8 }}>TODO production: Stripe payment links per guest.</p>
          </div>

          <div className="card" style={{ padding: 20, marginTop: 22 }}>
            <h3>Packing list</h3>
            {packing.map((i) => (
              <div className="doc-row" key={i.id}>
                <label className="f-check" style={{ margin: 0 }}>
                  <input type="checkbox" checked={i.checked} onChange={() => toggleItem(i, { checked: !i.checked })} /> {i.name}
                </label>
                {i.checked && <CheckIcon size={15} style={{ color: 'var(--green)' }} />}
              </div>
            ))}
            <div className="row" style={{ marginTop: 8 }}>
              <input placeholder="Add item…" value={newItem.packing} onChange={(e) => setNewItem({ ...newItem, packing: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('packing'))} />
              <button className="btn btn-ghost btn-sm" onClick={() => addItem('packing')}><PlusIcon size={14} /></button>
            </div>
          </div>

          <div className="card" style={{ padding: 20, marginTop: 22 }}>
            <h3>Provisioning <span className="muted small" style={{ fontWeight: 400 }}>— co-edit with your group</span></h3>
            {provisioning.map((i) => (
              <div className="doc-row" key={i.id}>
                <span style={{ textDecoration: i.checked ? 'line-through' : 'none', color: 'var(--muted)' }}>{i.name}</span>
                <span className="row">
                  {i.claimed_by_name
                    ? <span className="chip">{i.claimed_by_name.split(' ')[0]}</span>
                    : <button className="btn btn-ghost btn-sm" onClick={() => toggleItem(i, { claim: 'me' })}>I’ll bring it</button>}
                  {i.claimed_by_name && <button className="btn btn-ghost btn-sm" onClick={() => toggleItem(i, { claim: 'release' })}>release</button>}
                </span>
              </div>
            ))}
            <div className="row" style={{ marginTop: 8 }}>
              <input placeholder="Add to provisioning…" value={newItem.provisioning} onChange={(e) => setNewItem({ ...newItem, provisioning: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('provisioning'))} />
              <button className="btn btn-ghost btn-sm" onClick={() => addItem('provisioning')}><PlusIcon size={14} /></button>
            </div>
          </div>

          <div className="card" style={{ padding: 20, marginTop: 22 }}>
            <h3>Guest documents</h3>
            <p className="muted small">Encrypted at rest · auto-purged 90 days after the trip (GDPR).</p>
            {t.documents.map((d) => (
              <div className="doc-row" key={d.id}><span><DocIcon size={14} /> {d.file_name}</span><span className="badge badge-done">{d.status}</span></div>
            ))}
            <form className="row" style={{ marginTop: 8 }} onSubmit={uploadDoc}>
              <input placeholder="passport-scan.pdf" value={docName} onChange={(e) => setDocName(e.target.value)} style={{ flex: 1 }} />
              <button className="btn btn-ghost btn-sm">Register</button>
            </form>
          </div>

          <div className="card" style={{ padding: 20, marginTop: 22 }}>
            <h3>Booking summary</h3>
            <div className="doc-row"><span>Booking</span><b>#{b.id.slice(0, 8)}</b></div>
            <div className="doc-row"><span>Total</span><b>{eur(b.total_price)}</b></div>
            <div className="doc-row"><span>Deposit paid</span><b>{eur(b.deposit_paid)}</b></div>
            {t.payments.filter((p) => p.type === 'refund').map((p) => (
              <div className="doc-row" key={p.id}><span>Refund</span><b>{eur(p.amount)}</b></div>
            ))}
            <div className="doc-row"><span>Guests</span><span>{t.guests.length ? t.guests.map((g) => g.full_name.split(' ')[0]).join(', ') : '—'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
