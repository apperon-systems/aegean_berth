import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/i18n.jsx';

// Next 8 months, computed from today so the bar always looks current.
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const upcomingMonths = Array.from({ length: 8 }, (_, i) => {
  const d = new Date(); d.setMonth(d.getMonth() + i + 1);
  return { label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`, month: d.getMonth() + 1, year: d.getFullYear() };
});

export default function SearchBar({ initial = {} }) {
  const nav = useNavigate();
  const { t } = useI18n();
  const [where, setWhere] = useState(initial.where || '');
  const [month, setMonth] = useState(initial.month ?? 0);
  const [people, setPeople] = useState(initial.people ?? 2);
  const [how, setHow] = useState(initial.how || 'berth');

  const submit = (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (where) p.set('where', where);
    if (month > 0) { const m = upcomingMonths[month - 1]; p.set('month', m.month); p.set('month_year', m.year); }
    if (people) p.set('people', people);
    if (how) p.set('how', how);
    nav(`/search?${p}`);
  };

  return (
    <form className="searchbar" onSubmit={submit} role="search" aria-label="Search departures">
      <div className="sb-field">
        <label htmlFor="sb-where">{t('where')}</label>
        <input id="sb-where" list="regions-list" placeholder={t('where_ph')} value={where} onChange={(e) => setWhere(e.target.value)} />
        <datalist id="regions-list">
          <option value="Cyclades" /><option value="Ionian" /><option value="Dodecanese" />
          <option value="Sporades" /><option value="Saronic" /><option value="Crete" />
          <option value="Mykonos" /><option value="Naxos" /><option value="Kefalonia" /><option value="Kos" />
        </datalist>
      </div>
      <div className="sb-field">
        <label htmlFor="sb-when">{t('when')}</label>
        <select id="sb-when" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          <option value={0}>Any time</option>
          {upcomingMonths.map((m, i) => <option key={m.label} value={i + 1}>{m.label}</option>)}
        </select>
      </div>
      <div className="sb-field">
        <label htmlFor="sb-who">{t('who')}</label>
        <select id="sb-who" value={people} onChange={(e) => setPeople(Number(e.target.value))}>
          {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'person' : t('people')}</option>)}
        </select>
      </div>
      <div className="sb-field">
        <label htmlFor="sb-how">{t('how')}</label>
        <select id="sb-how" value={how} onChange={(e) => setHow(e.target.value)}>
          <option value="berth">{t('berth')}</option>
          <option value="cabin">{t('cabin')}</option>
          <option value="whole_boat">{t('whole_boat')}</option>
        </select>
      </div>
      <button className="btn btn-accent" type="submit">Search</button>
    </form>
  );
}
