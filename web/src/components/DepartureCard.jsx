import { Link } from 'react-router-dom';
import { eur, fmtRange, nightsBetween, vibeLabel } from '../lib/format.js';
import { Img, Stars } from './ui.jsx';
import { ZapIcon, ShieldIcon, UsersIcon, CalendarIcon } from './icons.jsx';
import { useI18n } from '../lib/i18n.jsx';

export default function DepartureCard({ d }) {
  const { t } = useI18n();
  const nights = nightsBetween(d.departure_date, d.return_date);
  const urgent = d.berths_available > 0 && d.berths_available <= 2;
  const perPerson = d.base_price_per_berth || (d.whole_boat_price ? Math.round(d.whole_boat_price / d.berths_total) : null);
  return (
    <Link to={`/departures/${d.id}`} className="departure-card" aria-label={`${d.route_name}, departing ${fmtRange(d.departure_date, d.return_date)}`}>
      <div className="dc-img">
        <div className="dc-badges">
          {d.status === 'guaranteed' && <span className="badge badge-guaranteed"><ShieldIcon size={11} /> {t('guaranteed')}</span>}
          {d.instant_confirmation && <span className="badge badge-instant"><ZapIcon size={11} /> {t('instant')}</span>}
          {urgent && <span className="badge badge-urgent">Only {d.berths_available} left</span>}
        </div>
        <Img src={d.vessel_photos?.[0] || d.hero_image} alt={`${d.vessel_name} sailing ${d.route_name}`} />
        <span className="dc-berths mono">{d.berths_available} / {d.berths_total} {t('berths_left')}</span>
      </div>
      <div className="dc-body">
        <div className="dc-title">{d.route_name}</div>
        <div className="dc-meta">
          <span><CalendarIcon size={13} /> {fmtRange(d.departure_date, d.return_date)}</span>
          <span>{nights} {t('nights')}</span>
          <span>{d.vessel_name} · {vesselLabel(d.vessel_type)}</span>
        </div>
        <div className="row">
          {(d.trip_vibe || []).slice(0, 3).map((v) => <span className="chip" key={v}>{vibeLabel(v)}</span>)}
        </div>
        <div className="dc-foot">
          <div>
            <Stars rating={Number(d.vessel_rating) || 0} count={d.review_count} />
            <div className="muted small" style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <UsersIcon size={13} /> Skipper {d.skipper_name || 'TBA'}
            </div>
          </div>
          <div className="price-tag" style={{ textAlign: 'right' }}>
            <span className="p">{perPerson ? eur(perPerson) : '—'}</span>
            <div className="u">{perPerson ? t('per_person') : 'whole boat'}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export const vesselLabel = (v) => ({ monohull: 'Monohull', catamaran: 'Catamaran', gulet: 'Gulet', motor_yacht: 'Motor yacht', rib: 'RIB' }[v] || v);
