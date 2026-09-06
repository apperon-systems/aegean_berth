import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { useI18n } from '../lib/i18n.jsx';
import { BoatIcon } from './icons.jsx';
import { toast } from './ui.jsx';

export default function Header() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  return (
    <header className="hdr">
      <div className="hdr-in">
        <Link to="/" className="logo" aria-label="Aegean Berth home">
          <BoatIcon size={26} style={{ color: 'var(--accent)' }} />
          AEGEAN BERTH
        </Link>
        <nav>
          <NavLink to="/search" className={({ isActive }) => isActive ? 'active' : ''}>{t('explore_routes')}</NavLink>
          <NavLink to="/routes" className={({ isActive }) => isActive ? 'active' : ''}>{t('featured_routes')}</NavLink>
          <NavLink to="/proposals" className={({ isActive }) => isActive ? 'active' : ''}>{t('start_sailing')}</NavLink>
          {user?.role === 'operator' && <NavLink to="/operator">{t('dashboard')}</NavLink>}
          {user?.role === 'agent' && <NavLink to="/agent">Agent portal</NavLink>}
          {(user?.role === 'admin' || user?.role === 'superadmin') && <NavLink to="/admin">{t('admin')}</NavLink>}
          <button className="lang-switch" onClick={() => setLang(lang === 'en' ? 'el' : 'en')} aria-label="Switch language">
            {lang === 'en' ? 'ΕΛ' : 'EN'}
          </button>
          {user ? (
            <>
              <NavLink to="/account/trips">{t('account')}</NavLink>
              <button className="btn btn-ghost btn-sm" onClick={async () => { await logout(); toast('Signed out'); }}>{t('logout')}</button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">{t('login')}</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
