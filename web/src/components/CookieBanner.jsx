import { useState } from 'react';
import { useI18n } from '../lib/i18n.jsx';

export default function CookieBanner() {
  const [consent, setConsent] = useState(() => localStorage.getItem('ab_cookie_consent'));
  if (consent) return null;
  const decide = (val) => { localStorage.setItem('ab_cookie_consent', val); setConsent(val); };
  const { t } = useI18n();
  return (
    <div className="cookie" role="dialog" aria-label="Cookie consent">
      <p>{t('cookie_text')}</p>
      <div className="row">
        <button className="btn btn-ghost btn-sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }} onClick={() => decide('essential')}>{t('decline')}</button>
        <button className="btn btn-accent btn-sm" onClick={() => decide('all')}>{t('accept')}</button>
      </div>
    </div>
  );
}
