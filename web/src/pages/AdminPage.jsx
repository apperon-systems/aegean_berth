import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { eur, fmtDate } from '../lib/format.js';
import { toast } from '../components/ui.jsx';

const TABS = ['Overview', 'KYC', 'Payouts', 'Audit log', 'Fraud', 'Exports'];

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState('Overview');
  const [ov, setOv] = useState(null);
  const [kyc, setKyc] = useState(null);
  const [payouts, setPayouts] = useState(null);
  const [auditLog, setAuditLog] = useState(null);
  const [fraud, setFraud] = useState(null);
  const [sepa, setSepa] = useState(null);

  const load = () => {
    api('/admin/overview').then(setOv).catch(() => {});
    api('/admin/kyc').then(setKyc).catch(() => {});
    api('/admin/payouts').then(setPayouts).catch(() => {});
    api('/admin/audit').then(setAuditLog).catch(() => {});
    api('/admin/fraud').then(setFraud).catch(() => {});
  };
  useEffect(() => { if (user && ['admin', 'superadmin'].includes(user.role)) load(); }, [user]);

  if (loading) return <div className="dash"><div className="skeleton" style={{ height: 200 }} /></div>;
  if (!user || !['admin', 'superadmin'].includes(user.role)) return (
    <div className="section empty"><h3>Admin access only</h3><p>Try <code>admin@aegeanberth.gr</code> / <code>sailgreek1</code>.</p><Link to="/login" className="btn btn-primary">Log in</Link></div>
  );
  if (!ov) return <div className="dash"><div className="skeleton" style={{ height: 240, borderRadius: 14 }} /></div>;

  const kycAction = async (id, action) => {
    try { await api(`/admin/kyc/${id}`, { method: 'POST', body: { action } }); toast(action === 'verify' ? 'Operator verified' : 'Operator rejected'); load(); }
    catch (e) { toast(e.message); }
  };
  const runPayouts = async () => {
    try {
      const r = await api('/admin/payout-runs', { method: 'POST', body: {} });
      setSepa(r); toast(`Payout run approved — ${r.count} payouts marked paid`);
      load();
    } catch (e) { toast(e.message); }
  };
  const download = (entity) => { window.open(`/api/admin/export/${entity}`, '_blank'); };

  return (
    <div className="dash">
      <p className="kicker">Platform administration</p>
      <h1 style={{ fontSize: 34, marginBottom: 24 }}>Aegean Berth control room</h1>

      <div className="tabs">
        {TABS.map((tb) => <button key={tb} className={tab === tb ? 'on' : ''} onClick={() => setTab(tb)}>{tb}</button>)}
      </div>

      {tab === 'Overview' && (
        <>
          <div className="stat-grid">
            <div className="stat"><div className="n">{eur(ov.gmv)}</div><div className="l">GMV (confirmed)</div></div>
            <div className="stat"><div className="n">{eur(ov.commission_earned)}</div><div className="l">Commission earned</div></div>
            <div className="stat"><div className="n">{ov.active_departures}</div><div className="l">Active departures</div></div>
            <div className="stat"><div className="n">{ov.bookings}</div><div className="l">Bookings</div></div>
            <div className="stat"><div className="n">{ov.pending_kyc}</div><div className="l">KYC pending</div></div>
            <div className="stat"><div className="n">{ov.open_disputes}</div><div className="l">Open disputes</div></div>
          </div>
          <h3>Feature flags</h3>
          <div className="row">
            {ov.feature_flags.map((f) => (
              <span className="chip" key={f.key}>{f.key} <span className="badge badge-guaranteed" style={{ marginLeft: 6 }}>{String(f.enabled)}</span></span>
            ))}
          </div>
        </>
      )}

      {tab === 'KYC' && (
        <table className="tbl">
          <thead><tr><th>Company</th><th>VAT (ΑΦΜ)</th><th>MHTE licence</th><th>Vessels</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {(kyc || []).map((o) => (
              <tr key={o.id}>
                <td><b>{o.company_name}</b><div className="muted small">{o.legal_name}</div></td>
                <td className="mono">{o.vat_number}</td>
                <td className="mono small">{o.mhte_licence}</td>
                <td>{o.vessel_count}</td>
                <td><span className={`badge ${o.kyc_status === 'verified' ? 'badge-guaranteed' : o.kyc_status === 'pending' ? 'badge-instant' : 'badge-warn'}`}>{o.kyc_status}</span></td>
                <td>{o.kyc_status !== 'verified' && (
                  <span className="row">
                    <button className="btn btn-accent btn-sm" onClick={() => kycAction(o.id, 'verify')}>Verify</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => kycAction(o.id, 'reject')}>Reject</button>
                  </span>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'Payouts' && (
        <>
          <div className="spread" style={{ marginBottom: 14 }}>
            <p className="muted small">Approving a payout run marks pending payouts as paid and generates a SEPA batch file (pain.001).</p>
            <button className="btn btn-primary" onClick={runPayouts}>Run payout batch</button>
          </div>
          {sepa && (
            <div className="card" style={{ padding: 16, marginBottom: 14 }}>
              <b>SEPA batch {sepa.sepa_reference} — {sepa.count} payouts</b>
              <a href={`data:application/xml;charset=utf-8,${encodeURIComponent(sepa.xml)}`} download={`${sepa.sepa_reference}.xml`}>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>Download SEPA XML</button>
              </a>
            </div>
          )}
          <table className="tbl">
            <thead><tr><th>Operator</th><th>Period</th><th>Gross</th><th>Commission</th><th>Net</th><th>Status</th></tr></thead>
            <tbody>
              {(payouts || []).map((p) => (
                <tr key={p.id}>
                  <td><b>{p.company_name}</b><div className="muted small mono">{p.iban}</div></td>
                  <td>{p.period}</td><td>{eur(p.gross)}</td><td>{eur(p.commission)}</td><td><b>{eur(p.net)}</b></td>
                  <td><span className={`badge ${p.status === 'paid' ? 'badge-guaranteed' : 'badge-instant'}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {tab === 'Audit log' && (
        <table className="tbl">
          <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>After</th></tr></thead>
          <tbody>
            {(auditLog || []).map((a) => (
              <tr key={a.id}>
                <td className="muted small">{fmtDate(a.created_at, { hour: '2-digit', minute: '2-digit' })}</td>
                <td>{a.actor_name || 'system'} <span className="muted small">({a.actor_role})</span></td>
                <td><b>{a.action}</b></td>
                <td className="mono small">{a.entity_id?.slice(0, 8)}</td>
                <td className="muted small" style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>{JSON.stringify(a.after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'Fraud' && (
        <>
          {(fraud || []).length === 0 && <div className="empty"><h3>No fraud flags</h3><p>Flags appear on rapid repeat bookings and suspicious patterns.</p></div>}
          {(fraud || []).map((f) => (
            <div className="doc-row" key={f.id}>
              <span><b>{f.reason.replace(/_/g, ' ')}</b> — {f.user_name || 'unknown'} ({f.email})</span>
              <span className="muted small">{JSON.stringify(f.details)}</span>
            </div>
          ))}
        </>
      )}

      {tab === 'Exports' && (
        <div className="row">
          {['bookings', 'departures', 'users'].map((e) => (
            <button key={e} className="btn btn-ghost" onClick={() => download(e)}>⬇ {e}.csv</button>
          ))}
        </div>
      )}
    </div>
  );
}
