import { useEffect, useState } from 'react';
import { BoatIcon } from './icons.jsx';

/** Image with graceful gradient fallback (external photos may be unavailable). */
export function Img({ src, alt = '', className = '', icon = null }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <div className={`fallback-img ${className}`} role="img" aria-label={alt}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.7 }}>
        {icon || <BoatIcon size={30} />}
      </span>
    </div>;
  }
  return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} />;
}

export function Stars({ rating = 0, count = null }) {
  const full = '★★★★★'.slice(0, Math.round(rating));
  const empty = '☆☆☆☆'.slice(0, 5 - Math.round(rating));
  return (
    <span className="stars" aria-label={`${rating} out of 5`}>
      {rating ? <>{full}{empty} <b className="mono" style={{ color: 'var(--navy)' }}>{Number(rating).toFixed(1)}</b></> : <span className="muted small">No reviews yet</span>}
      {count != null && rating ? <span className="muted small"> ({count})</span> : null}
    </span>
  );
}

export function SkeletonCard() {
  return (
    <div className="card">
      <div className="skeleton" style={{ height: 170, borderRadius: 0 }} />
      <div style={{ padding: 16 }}>
        <div className="skeleton sk-line" style={{ width: '70%' }} />
        <div className="skeleton sk-line" style={{ width: '45%' }} />
        <div className="skeleton sk-line" style={{ width: '55%', marginTop: 18 }} />
      </div>
    </div>
  );
}

let toastId = 0;
export function toast(message, kind = 'info') {
  window.dispatchEvent(new CustomEvent('ab-toast', { detail: { id: ++toastId, message, kind } }));
}

export function ToastHost() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const onToast = (e) => {
      setItems((t) => [...t, e.detail]);
      setTimeout(() => setItems((t) => t.filter((x) => x.id !== e.detail.id)), 4200);
    };
    window.addEventListener('ab-toast', onToast);
    return () => window.removeEventListener('ab-toast', onToast);
  }, []);
  return <div className="toast-wrap" aria-live="polite">
    {items.map((t) => <div key={t.id} className="toast">{t.message}</div>)}
  </div>;
}

export function Avatar({ name = '?', size = 34 }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials}</span>;
}

export function Progress({ pct }) {
  return <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100"><div style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} /></div>;
}

export function GenderDot({ gender }) {
  if (gender === 'female') return <span className="tag-gender g-f" title="female">F</span>;
  if (gender === 'male') return <span className="tag-gender g-m" title="male">M</span>;
  return <span className="tag-gender" style={{ background: 'var(--muted)' }} title={gender || 'n/a'}>?</span>;
}
