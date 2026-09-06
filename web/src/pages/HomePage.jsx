import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';
import { eur, fmtRange } from '../lib/format.js';
import SearchBar from '../components/SearchBar.jsx';
import DepartureCard, { vesselLabel } from '../components/DepartureCard.jsx';
import { Img, SkeletonCard } from '../components/ui.jsx';
import { ArrowRight, CompassIcon } from '../components/icons.jsx';

export default function HomePage() {
  const { t } = useI18n();
  const [trending, setTrending] = useState(null);
  const [routes, setRoutes] = useState(null);

  useEffect(() => {
    api('/search?sort=best&limit=6').then((d) => setTrending(d.results)).catch(() => setTrending([]));
    api('/routes').then(setRoutes).catch(() => setRoutes([]));
  }, []);

  return (
    <div>
      <section className="hero">
        <img className="hero-img" src="https://images.unsplash.com/photo-1561501900-3701ee635792?w=1800&q=80" alt="Sailboats in a Greek island harbour at dusk" />
        <div className="hero-veil" />
        <div className="hero-inner">
          <p className="kicker" style={{ color: 'var(--gold)' }}>{t('tagline')}</p>
          <h1>{t('hero_title')}</h1>
          <p className="lead">{t('hero_sub')}</p>
          <SearchBar />
          <div className="hero-stats">
            <div><b>1 berth</b><span>book a single bed, solo-friendly</span></div>
            <div><b>6 regions</b><span>Cyclades · Ionian · Dodecanese · Sporades · Saronic · Crete</span></div>
            <div><b>100%</b><span>MHTE-licensed, insured vessels</span></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="spread" style={{ marginBottom: 24 }}>
          <div>
            <p className="kicker">{t('trending')}</p>
            <h2>Leaving soon, berths remaining</h2>
          </div>
          <Link to="/search" className="btn btn-ghost">{t('view_all')} <ArrowRight size={15} /></Link>
        </div>
        <div className="grid-cards">
          {trending == null
            ? Array.from({ length: 3 }, (_, i) => <SkeletonCard key={i} />)
            : trending.map((d) => <DepartureCard key={d.id} d={d} />)}
        </div>
      </section>

      <section className="section-tight section">
        <div className="split">
          <div>
            <p className="kicker">Why we exist</p>
            <h2>Every other site makes you pick a boat first. That’s backwards.</h2>
            <p className="lead">
              Solo travellers and couples can’t charter a whole yacht — and ferry-hopping between islands
              is no holiday. Aegean Berth is built around the <b style={{ color: 'var(--navy)' }}>departure</b>:
              a real vessel, on a real route, on real dates, with real berths left. Book one bed, a cabin,
              or the whole boat — with people like you already on board.
            </p>
            <div className="steps" style={{ marginTop: 26 }}>
              <div className="step"><h3>Search by route & date</h3><p className="muted small">“Cyclades, mid-September, 2 people” — see exactly what’s sailing.</p></div>
              <div className="step"><h3>Pick your berth</h3><p className="muted small">Solo? Cabin-share with vetted, like-minded travellers.</p></div>
              <div className="step"><h3>Book instantly</h3><p className="muted small">Instant-confirm departures, or hold your berth on request.</p></div>
            </div>
          </div>
          <Img
            src="https://images.unsplash.com/photo-1533105079780-92b9be482077?w=900&q=80"
            alt="Santorini caldera from the water"
            style={{ height: '100%' }}
          />
        </div>
      </section>

      <section className="section-tight section dark-band" style={{ borderRadius: 24, margin: '30px auto', maxWidth: 1132 }}>
        <div className="split" style={{ alignItems: 'center' }}>
          <div>
            <p className="kicker" style={{ color: 'var(--gold)' }}>Crowdsourced departures</p>
            <h2>{t('crowd_title')}</h2>
            <p className="lead">{t('crowd_sub')}</p>
            <div className="row" style={{ marginTop: 18 }}>
              <Link to="/proposals" className="btn btn-accent">{t('start_sailing')} <ArrowRight size={15} /></Link>
              <Link to="/proposals" className="btn btn-light">See live proposals</Link>
            </div>
          </div>
          <div className="card" style={{ padding: 22, background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)', color: '#fff' }}>
            <div className="spread"><b style={{ fontFamily: 'var(--font-display)', fontSize: 19 }}>Sporades Odyssey · 5 berths pledged</b><span className="badge badge-guaranteed">2 travellers to go</span></div>
            <div className="progress" style={{ margin: '14px 0' }}><div style={{ width: '60%' }} /></div>
            <p className="small" style={{ color: 'rgba(255,255,255,.72)', margin: 0 }}>
              When the minimum is reached, operators bid to run it. The proposer gets a discount. If it
              fails, every hold is refunded automatically.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="spread" style={{ marginBottom: 24 }}>
          <div>
            <p className="kicker">{t('featured_routes')}</p>
            <h2>{t('sailing_holidays')} across six Greek seas</h2>
          </div>
          <Link to="/routes" className="btn btn-ghost">All routes <ArrowRight size={15} /></Link>
        </div>
        <div className="grid-cards">
          {(routes || []).slice(0, 6).map((r) => (
            <Link to={`/routes/${r.slug}`} key={r.id} className="departure-card">
              <div className="dc-img">
                <Img src={r.hero_image} alt={r.name} />
                <span className="dc-berths mono">{r.departure_count} departures</span>
              </div>
              <div className="dc-body">
                <div className="dc-title">{r.name}</div>
                <div className="dc-meta">
                  <span><CompassIcon size={13} /> {r.region}</span>
                  <span>{r.total_nm} nm</span>
                  <span>{r.typical_nights} {t('nights')}</span>
                </div>
                <div className="dc-foot">
                  <span className="muted small">{r.difficulty}</span>
                  {r.from_price ? <span className="price-tag"><span className="p">{t('from')} {eur(r.from_price)}</span></span> : <span className="chip">No departures yet</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
