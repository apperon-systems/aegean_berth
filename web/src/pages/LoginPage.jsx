import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { toast } from '../components/ui.jsx';

const DEMO = [
  ['traveller@demo.gr', 'Traveller — books trips'],
  ['ops@aegeanblue.gr', 'Operator — manages fleet'],
  ['skipper@demo.gr', 'Skipper — crew'],
  ['agent@demo.gr', 'Agent — commission portal'],
  ['admin@aegeanberth.gr', 'Admin — KYC, payouts']
];

export default function LoginPage() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register({ name: form.name, email: form.email, password: form.password });
      }
      toast('Welcome aboard!');
      nav(loc.state?.from || '/account/trips');
    } catch (e2) { setErr(e2.message); }
    setBusy(false);
  };

  return (
    <div className="section" style={{ maxWidth: 460 }}>
      <h1 style={{ fontSize: 34 }}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
      <p className="lead" style={{ marginBottom: 24 }}>One account for every role — traveller, operator, skipper, agent.</p>

      <form onSubmit={submit}>
        {mode === 'register' && (
          <div className="field"><label>Full name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
        )}
        <div className="field"><label>Email</label>
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="field"><label>{mode === 'register' ? 'Password (min 8 chars)' : 'Password'}</label>
          <input type="password" required minLength={mode === 'register' ? 8 : undefined}
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        {err && <div className="alert alert-err">{err}</div>}
        <button className="btn btn-accent btn-block" disabled={busy}>
          {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p className="muted small" style={{ marginTop: 16 }}>
        {mode === 'login'
          ? <>New here? <a href="#" onClick={(e) => { e.preventDefault(); setMode('register'); }} style={{ color: 'var(--accent)' }}>Create an account</a></>
          : <>Have an account? <a href="#" onClick={(e) => { e.preventDefault(); setMode('login'); }} style={{ color: 'var(--accent)' }}>Sign in</a></>}
      </p>

      <div className="card" style={{ padding: 18, marginTop: 26, background: 'var(--paper-2)' }}>
        <b className="small">Demo accounts</b>
        <p className="muted small" style={{ margin: '6px 0 10px' }}>Password for all: <code>sailgreek1</code></p>
        {DEMO.map(([email, desc]) => (
          <button key={email} className="btn btn-ghost btn-sm"
            style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: 6 }}
            onClick={() => setForm({ ...form, email, password: 'sailgreek1' })}>
            <span>{email}</span><span className="muted small">{desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
