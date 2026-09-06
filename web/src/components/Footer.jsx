import { Link } from 'react-router-dom';
import { BoatIcon } from './icons.jsx';

export default function Footer() {
  return (
    <footer className="ftr">
      <div className="ftr-in">
        <div>
          <div className="logo" style={{ color: '#fff', marginBottom: 14 }}>
            <BoatIcon size={24} style={{ color: 'var(--gold)' }} /> AEGEAN BERTH
          </div>
          <p style={{ maxWidth: 300 }}>
            The marketplace for sailing holidays in Greece — by cabin, by berth, or by whole boat.
            Multi-tenant, MHTE-licensed operators, protected payments.
          </p>
          <p className="small" style={{ color: 'rgba(255,255,255,.45)' }}>
            Ελλάδα · Malta office · dev preview
          </p>
        </div>
        <div>
          <h4>Explore</h4>
          <Link to="/search">Search departures</Link>
          <Link to="/routes">All routes</Link>
          <Link to="/proposals">Start a Sailing</Link>
        </div>
        <div>
          <h4>Regions</h4>
          <Link to="/search?region=Cyclades">Cyclades</Link>
          <Link to="/search?region=Ionian">Ionian</Link>
          <Link to="/search?region=Dodecanese">Dodecanese</Link>
          <Link to="/search?region=Sporades">Sporades</Link>
        </div>
        <div>
          <h4>Trust & safety</h4>
          <span>Verified operators (KYC)</span>
          <span>Insured vessels only</span>
          <span>Verified reviews</span>
          <span>GDPR · PSD2 · WCAG 2.2 AA</span>
        </div>
      </div>
      <div className="ftr-bottom">
        © {new Date().getFullYear()} Aegean Berth — demo environment. Package Travel Directive (EU 2015/2302) insolvency protection applies to bundled bookings.
      </div>
    </footer>
  );
}
