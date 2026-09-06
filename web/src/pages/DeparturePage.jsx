import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { eur, fmtDate, fmtRange, nightsBetween, vibeLabel } from '../lib/format.js';
import MapView from '../components/MapView.jsx';
import { Img, Stars, toast, Avatar, GenderDot } from '../components/ui.jsx';
import { ZapIcon, ShieldIcon, UsersIcon, WavesIcon, CheckIcon, FerryIcon } from '../components/icons.jsx';
import { setMeta, jsonLd, tripJsonLd } from '../lib/seo.js';

export default function DeparturePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    api(`/departures/${id}`).then((d) => {
      setData(d);
      setMeta({ title: `${d.route.name} · ${d.vessel.name} — AEGEAN BERTH`, description: d.route.summary });
      jsonLd('ab-ld', tripJsonLd({ departure: d.departure, route: d.route, vessel: d.vessel, operator: d.operator }));
    }).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="section"><div className="alert alert-err">{error}</div></div>;
  if (!data) return (
    <div className="dash">
      <div className="skeleton" style={{ height: 300, borderRadius: 14 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 30, marginTop: 30 }}>
        <div className="skeleton sk-line" style={{ height: 220 }} />
        <div className="skeleton" style={{ height: 380, borderRadius: 14 }} />
      </div>
    </div>
  );

  const { departure: d, vessel, route, stops, cabins, skipper, operator, reviews, extras, crew_manifest_anonymised: crew } = data;
  const nights = nightsBetween(d.departure_date, d.return_date);
  const bookable = ['open', 'guaranteed', 'almost_full'].includes(d.status);

  return (
    <div>
      <div className="dep-hero">
        <Img src={vessel.photos?.[0] || route.hero_image} alt={`${vessel.name} at sea`} />
      </div>
      <div className="dep-layout">
        <div>
          <div className="row" style={{ marginBottom: 10 }}>
            {d.status === 'guaranteed' && <span className="badge badge-guaranteed"><ShieldIcon size={11} /> Guaranteed</span>}
            {d.status === 'full' && <span className="badge badge-urgent">Full</span>}
            {d.instant_confirmation && <span className="badge badge-instant"><ZapIcon size={11} /> Instant confirmation</span>}
            <span className="badge badge-line">{d.booking_mode.replace(/_/g, ' ')}</span>
          </div>
          <h1>{route.name}</h1>
          <p className="lead" style={{ margin: '6px 0 14px' }}>{route.summary}</p>
          <div className="row muted" style={{ marginBottom: 22 }}>
            <span>{fmtRange(d.departure_date, d.return_date)} · {nights} nights</span>
            <span>{d.embarkation_port} → {d.disembarkation_port}{d.one_way && ' (one-way)'}</span>
            <span>{route.region} · {route.difficulty}</span>
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 26 }}>
            <h3 style={{ marginBottom: 4 }}>About the vessel</h3>
            <div className="spread">
              <div>
                <b style={{ fontFamily: 'var(--font-display)', fontSize: 19 }}>{vessel.name}</b>
                <span className="muted small" style={{ display: 'block' }}>
                  {vessel.builder} {vessel.model} · {vessel.year} · {vessel.length_m}m · {vessel.cabins || vessel.vessel_cabins} cabins
                </span>
              </div>
              <Stars rating={Number(data.departure.vessel_rating) || 0} count={data.departure.review_count} />
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              {(vessel.amenities || []).slice(0, 8).map((a) => <span className="chip" key={a}>{a.replace(/_/g, ' ')}</span>)}
            </div>
          </div>

          <h2 style={{ fontSize: 26 }}>The itinerary</h2>
          <p className="muted small" style={{ marginTop: 4 }}>
            {route.total_nm} nm across the {route.region}. Stops marked ⛴ / ✈ allow flexible boarding.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, alignItems: 'start', margin: '18px 0 26px' }}>
            <div className="itin">
              {stops.map((s) => (
                <div className="itin-stop" key={s.id}>
                  <div className="itin-dot" />
                  <div className="itin-body">
                    <b>Day {s.day_number} — {s.port_name}</b>
                    <div className="muted small">{s.description}</div>
                    <div className="row small" style={{ gap: 8, marginTop: 4 }}>
                      {s.swim_stop && <span className="chip"><WavesIcon size={12} /> swim</span>}
                      {s.has_ferry_access && <span className="chip"><FerryIcon size={12} /> ferry</span>}
                      {s.has_airport_access && <span className="chip">✈ airport</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <MapView routeStops={stops} />
          </div>

          {(cabins.length > 0 && d.booking_mode !== 'whole_boat') && (
            <>
              <h2 style={{ fontSize: 26 }}>Cabins</h2>
              <div style={{ margin: '14px 0 26px' }}>
                {cabins.filter((c) => c.type !== 'crew').map((c) => (
                  <div key={c.id} className="cabin-row" style={{ cursor: 'default' }}>
                    <div>
                      <b>{c.name}</b>
                      <span className="muted small" style={{ display: 'block' }}>
                        {c.type} · {c.berth_count} berths · {c.ensuite ? 'ensuite' : 'shared head'}
                        {c.price_modifier_percent ? ` · ${c.price_modifier_percent > 0 ? '+' : ''}${c.price_modifier_percent}%` : ''}
                      </span>
                    </div>
                    {c.price_modifier_percent > 0 && <span className="badge badge-open">premium</span>}
                  </div>
                ))}
              </div>
            </>
          )}

          {crew.length > 0 && (
            <>
              <h2 style={{ fontSize: 26 }}>Who’s already aboard</h2>
              <p className="muted small">Anonymised profiles — names and contact details are shared only after confirmation.</p>
              <div className="row" style={{ margin: '14px 0 26px', gap: 12 }}>
                {crew.map((c, i) => {
                  const p = c.share_profile || {};
                  return (
                    <div className="card" key={i} style={{ padding: '12px 16px', minWidth: 200 }}>
                      <div className="row" style={{ gap: 8 }}><GenderDot gender={p.gender} /><b>{p.age_band || '—'}</b></div>
                      <div className="muted small">{(p.languages || []).join(', ')}</div>
                      <div className="row small" style={{ gap: 5, marginTop: 4 }}>
                        {(p.vibes || []).slice(0, 3).map((v) => <span className="chip" key={v}>{vibeLabel(v)}</span>)}
                      </div>
                      <div className="muted small">{p.sleep_habits?.replace('_', ' ')} · {p.smoking === 'no' ? 'non-smoker' : p.smoking}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {reviews.length > 0 && (
            <>
              <h2 style={{ fontSize: 26 }}>Verified reviews</h2>
              <p className="muted small">Only travellers with completed bookings can review.</p>
              {reviews.map((rv) => (
                <div className="review" key={rv.created_at}>
                  <div className="row" style={{ gap: 10 }}><Avatar name={rv.traveller_name} /><b>{rv.traveller_name}</b><Stars rating={rv.rating_overall} /><span className="muted small">{fmtDate(rv.created_at)}</span></div>
                  <p style={{ margin: '8px 0' }}>{rv.written_review}</p>
                  {rv.operator_response && <p className="small" style={{ background: 'var(--paper-2)', borderRadius: 10, padding: 10 }}>{rv.operator_response}</p>}
                </div>
              ))}
            </>
          )}

          <div className="card" style={{ padding: 20, marginTop: 26 }}>
            <h3 style={{ marginBottom: 6 }}>Operated by {operator?.company_name}</h3>
            <p className="muted small" style={{ marginBottom: 6 }}>{operator?.description}</p>
            <div className="row small muted" style={{ gap: 16 }}>
              <span>⏱ responds in ~{operator?.response_time_mins} min</span>
              <span>✓ {operator?.acceptance_rate}% acceptance</span>
              <span className="badge badge-guaranteed">{operator?.kyc_status === 'verified' ? 'KYC verified' : 'KYC pending'}</span>
            </div>
          </div>
        </div>

        <BookingWidget data={data} bookable={bookable} user={user} />
      </div>
    </div>
  );
}

function BookingWidget({ data, bookable, user }) {
  const { departure: d, extras, stops } = data;
  const [step, setStep] = useState('select');
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [err, setErr] = useState(null);

  const [mode, setMode] = useState(d.booking_mode === 'whole_boat' ? 'whole_boat' : 'berth');
  const [berthCount, setBerthCount] = useState(1);
  const [cabinId, setCabinId] = useState(null);
  const [shareCabin, setShareCabin] = useState(true);
  const [sharePref, setSharePref] = useState('same_gender');
  const [extrasSel, setExtrasSel] = useState(
    (extras || []).filter((e) => e.mandatory).map((e) => e.id)
  );
  const flexibleStops = stops.filter((s) => (s.has_ferry_access || s.has_airport_access) && s.day_number > 0);
  const [joinStop, setJoinStop] = useState(null);
  const [leaveStop, setLeaveStop] = useState(null);
  const [guests, setGuests] = useState([{ full_name: '', nationality: 'GR', date_of_birth: '', dietary_requirements: '' }]);
  const [special, setSpecial] = useState('');
  const [shareProfile, setShareProfile] = useState({ gender: '', age_band: '25-34', languages: 'en', sleep_habits: 'early_riser', smoking: 'no' });

  const berthOptions = useMemo(() => Array.from({ length: Math.min(d.berths_available, 6) }, (_, i) => i + 1), [d.berths_available]);
  useEffect(() => { if (berthCount > d.berths_available) setBerthCount(Math.min(d.berths_available, berthOptions.at(-1) || 1)); }, [d.berths_available]);
  useEffect(() => {
    setGuests((g) => Array.from({ length: mode === 'whole_boat' ? 1 : berthCount }, (_, i) => g[i] || { full_name: '', nationality: 'GR', date_of_birth: '', dietary_requirements: '' }));
  }, [berthCount, mode]);

  const fetchQuote = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await api(`/departures/${d.id}/quote`, { method: 'POST', body: {
        booking_type: mode, berth_count: berthCount, share_cabin: shareCabin,
        cabin_id: cabinId, join_stop_id: joinStop, leave_stop_id: leaveStop
      } });
      setQuote(r.quote); setStep('details');
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const book = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await api('/bookings', { method: 'POST', body: {
        departure_id: d.id, booking_type: mode, berth_count: mode === 'whole_boat' ? d.berths_total : berthCount,
        cabin_id: mode === 'whole_boat' ? null : cabinId, share_cabin: mode === 'berth' && shareCabin,
        cabin_share_preference: mode === 'berth' && shareCabin ? sharePref : 'any',
        join_stop_id: joinStop, leave_stop_id: leaveStop,
        extras: extrasSel, guests: guests.filter((g) => g.full_name),
        special_requests: special, idempotency_key: `bk-${d.id}-${user?.id}-${Date.now()}`,
        share_profile: mode === 'berth' ? shareProfile : null
      } });
      setConfirmation(r); setStep('done');
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const joinWaitlist = async () => {
    try { await api(`/departures/${d.id}/waitlist`, { method: 'POST', body: { berths_wanted: berthCount } }); toast('You’re on the waitlist — we’ll email you if berths open up.'); }
    catch (e) { toast(e.message); }
  };

  const price = d.base_price_per_berth || Math.round(d.whole_boat_price / d.berths_total);
  const modes = d.booking_mode === 'whole_boat' ? ['whole_boat']
    : d.booking_mode === 'by_cabin' ? ['cabin', 'whole_boat' ]
    : d.booking_mode === 'by_berth' ? ['berth'] : ['berth', 'cabin', 'whole_boat'];

  return (
    <aside className="booking-widget" aria-label="Book this departure">
      {step === 'select' && (
        <>
          <div className="spread">
            <div>
              <span className="bw-price">{mode === 'whole_boat' ? eur(d.whole_boat_price) : eur(price)}</span>
              <span className="muted small"> {mode === 'whole_boat' ? 'whole boat' : 'per person / night included'}</span>
            </div>
          </div>
          <div className="bw-rows">
            {d.berths_available > 0
              ? <div className="bw-row"><span>Berths remaining</span><span className="v mono">{d.berths_available} / {d.berths_total}</span></div>
              : <div className="alert alert-err" style={{ margin: 0 }}>Fully booked</div>}
            {data.berths_to_guarantee > 0 && d.berths_available > 0 &&
              <div className="bw-row"><span style={{ color: 'var(--accent-dark)' }}><b>{data.berths_to_guarantee} more berths to guarantee</b></span><span className="badge badge-open">{d.minimum_viable_bookings} min.</span></div>}
            <div className="bw-row"><span>Dates</span><span className="v">{fmtRange(d.departure_date, d.return_date)}</span></div>
            <div className="bw-row"><span>Reviews</span><span className="v"><Stars rating={Number(d.vessel_rating) || 0} count={d.review_count} /></span></div>
          </div>

          {modes.length > 1 && (
            <div className="pill-toggle" style={{ marginBottom: 14 }}>
              {modes.map((m) => <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{m.replace('_', ' ')}</button>)}
            </div>
          )}

          {bookable && mode !== 'whole_boat' && (
            <>
              <div className="field"><label>People / berths</label>
                <select value={berthCount} onChange={(e) => setBerthCount(Number(e.target.value))}>
                  {berthOptions.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              {mode === 'cabin' && (
                <div className="field"><label>Cabin</label>
                  <select value={cabinId || ''} onChange={(e) => setCabinId(e.target.value || null)}>
                    <option value="">Any available cabin</option>
                    {data.cabins.filter((c) => c.type !== 'crew').map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.price_modifier_percent ? `${c.price_modifier_percent > 0 ? '+' : ''}${c.price_modifier_percent}%` : 'standard price'})</option>
                    ))}
                  </select>
                </div>
              )}
              {mode === 'berth' && (
                <>
                  <label className="f-check" style={{ margin: '4px 0 8px' }}>
                    <input type="checkbox" checked={shareCabin} onChange={(e) => setShareCabin(e.target.checked)} />
                    Opt in to cabin-share matching
                  </label>
                  {shareCabin && (
                    <div className="card" style={{ padding: 12, marginBottom: 12, border: '1px dashed var(--line)' }}>
                      <div className="form-row">
                        <div className="field"><label>Gender</label>
                          <select value={shareProfile.gender} onChange={(e) => setShareProfile({ ...shareProfile, gender: e.target.value })}>
                            <option value="">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
                          </select>
                        </div>
                        <div className="field"><label>Age band</label>
                          <select value={shareProfile.age_band} onChange={(e) => setShareProfile({ ...shareProfile, age_band: e.target.value })}>
                            {['18-24', '25-34', '35-44', '45-54', '55+'].map((a) => <option key={a}>{a}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="field"><label>Sleep habits</label>
                        <select value={shareProfile.sleep_habits} onChange={(e) => setShareProfile({ ...shareProfile, sleep_habits: e.target.value })}>
                          <option value="early_riser">Early riser</option><option value="night_owl">Night owl</option>
                        </select>
                      </div>
                    </div>
                  )}
                </>
              )}
              {flexibleStops.length > 1 && (
                <div style={{ marginBottom: 12 }}>
                  <label className="kicker" style={{ marginBottom: 6, display: 'block' }}>Flexible boarding — join or leave mid-route</label>
                  <div className="row" style={{ gap: 8 }}>
                    <select value={joinStop || ''} onChange={(e) => setJoinStop(e.target.value || null)} aria-label="Join at">
                      <option value="">Board at start</option>
                      {flexibleStops.map((s) => <option key={s.id} value={s.id}>Join at {s.port_name}</option>)}
                    </select>
                    <select value={leaveStop || ''} onChange={(e) => setLeaveStop(e.target.value || null)} aria-label="Leave at">
                      <option value="">Stay to the end</option>
                      {flexibleStops.map((s) => <option key={s.id} value={s.id}>Leave at {s.port_name}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}

          {bookable && (
            <>
              <div className="field"><label>Extras</label>
                {extras.filter((e) => !e.mandatory).map((e) => (
                  <label key={e.id} className="f-check">
                    <input type="checkbox" checked={extrasSel.includes(e.id)}
                      onChange={(ev) => setExtrasSel(ev.target.checked ? [...extrasSel, e.id] : extrasSel.filter((x) => x !== e.id))} />
                    {e.name} <span className="muted">({eur(e.price)} {e.price_unit.replace('_', ' ')})</span>
                  </label>
                ))}
              </div>
              <button className="btn btn-accent btn-block" onClick={fetchQuote} disabled={busy || d.berths_available === 0}>
                {busy ? 'Checking availability…' : d.berths_available === 0 ? 'Sold out' : 'Get my price'}
              </button>
              {d.instant_confirmation && <p className="muted small" style={{ textAlign: 'center', margin: '10px 0 0' }}><ZapIcon size={12} /> Instant confirmation — no waiting for approval</p>}
            </>
          )}
          {!bookable && d.status === 'full' && (
            <button className="btn btn-primary btn-block" onClick={joinWaitlist}>Join waitlist</button>
          )}
          {!user && <p className="muted small" style={{ textAlign: 'center', marginTop: 10 }}>You’ll need a free account to book.</p>}
          {err && <div className="alert alert-err">{err}</div>}
        </>
      )}

      {step === 'details' && quote && (
        <>
          <h3 style={{ marginBottom: 4 }}>Your price</h3>
          <div className="bw-rows">
            <div className="bw-row"><span>{mode === 'whole_boat' ? 'Whole boat' : `${berthCount} × berths`}</span><span className="v">{eur(quote.breakdown.segment_factor < 1 ? quote.total : quote.breakdown.unit_price * quote.breakdown.units)}</span></div>
            {quote.breakdown.segment_factor < 1 && <div className="bw-row"><span className="muted small">Partial segment ({Math.round(quote.breakdown.segment_factor * 100)}% of fare)</span><span /></div>}
            {quote.breakdown.adjustments.map((a) => (
              <div className="bw-row" key={a.rule}><span className="muted">{a.label} {a.amount > 0 ? '(+)' : '(−)'}</span><span className="v">{a.amount > 0 ? '+' : ''}{a.amount} €</span></div>
            ))}
            {extrasSel.filter((xid) => extras.find((x) => x.id === xid && !x.mandatory)).map((xid) => {
              const e = extras.find((x) => x.id === xid);
              return <div className="bw-row" key={xid}><span className="muted">{e.name}</span><span className="v">{eur(e.price)}</span></div>;
            })}
            <div className="bw-row" style={{ borderTop: '1px solid var(--line)', paddingTop: 8, fontWeight: 700 }}><span>Total</span><span className="v">{eur(quote.total)}</span></div>
          </div>
          <h3>Lead guest details</h3>
          <p className="muted small">Feeds the Greek e-Charterparty manifest — names as on passport.</p>
          {(mode === 'whole_boat' ? guests.slice(0, 1) : guests).map((g, i) => (
            <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
              {(mode !== 'whole_boat' && guests.length > 1) && <b className="small muted">Guest {i + 1}</b>}
              <div className="field" style={{ marginTop: 6 }}><label>Full name</label>
                <input value={g.full_name} onChange={(e) => setGuests(guests.map((x, j) => j === i ? { ...x, full_name: e.target.value } : x))} placeholder="As on passport" />
              </div>
              <div className="form-row">
                <div className="field"><label>Nationality</label>
                  <input value={g.nationality} maxLength={2} onChange={(e) => setGuests(guests.map((x, j) => j === i ? { ...x, nationality: e.target.value.toUpperCase() } : x))} placeholder="GR" />
                </div>
                <div className="field"><label>Date of birth</label>
                  <input type="date" value={g.date_of_birth} onChange={(e) => setGuests(guests.map((x, j) => j === i ? { ...x, date_of_birth: e.target.value } : x))} />
                </div>
              </div>
              <div className="field" style={{ marginBottom: 0 }}><label>Dietary requirements</label>
                <input value={g.dietary_requirements} onChange={(e) => setGuests(guests.map((x, j) => j === i ? { ...x, dietary_requirements: e.target.value } : x))} placeholder="Vegetarian, allergies…" />
              </div>
            </div>
          ))}
          <div className="field"><label>Special requests</label>
            <textarea rows={2} value={special} onChange={(e) => setSpecial(e.target.value)} placeholder="Anything the skipper should know…" />
          </div>
          {err && <div className="alert alert-err">{err}</div>}
          <div className="row">
            <button className="btn btn-ghost" onClick={() => setStep('select')}>Back</button>
            <button className="btn btn-accent" style={{ flex: 1 }} onClick={() => setStep('pay')} disabled={!guests.some((g) => g.full_name)}>Continue to payment</button>
          </div>
        </>
      )}

      {step === 'pay' && quote && user && (
        <>
          <h3>Payment</h3>
          <p className="muted small">
            Deposit today <b style={{ color: 'var(--navy)' }}>{eur(quote.deposit)}</b>, balance {eur(quote.balance_due)} due
            {' '}by {fmtDate(d.departure_date)}. 3-D Secure / SCA compliant (dev mode: mock charge).
          </p>
          <div className="card" style={{ padding: 14, marginBottom: 14 }}>
            <div className="bw-row"><span>Card</span><span className="v mono">•••• 4242 (mock)</span></div>
            <div className="bw-row"><span>Charged today</span><span className="v">{eur(quote.deposit)}</span></div>
          </div>
          {err && <div className="alert alert-err">{err}</div>}
          <div className="row">
            <button className="btn btn-ghost" onClick={() => setStep('details')}>Back</button>
            <button className="btn btn-accent" style={{ flex: 1 }} onClick={book} disabled={busy}>
              {busy ? 'Processing…' : d.instant_confirmation ? <><ZapIcon size={14} /> Pay & confirm instantly</> : 'Pay deposit & request'}
            </button>
          </div>
          <p className="muted small" style={{ marginTop: 10 }}>Cancellation policy: {data.cancellation_policy?.name || 'Standard'}. Idempotency-protected payment.</p>
        </>
      )}

      {step === 'done' && confirmation && (
        <div style={{ textAlign: 'center', padding: 8 }}>
          <div style={{ color: 'var(--green)', margin: '8px 0' }}><CheckIcon size={44} /></div>
          <h3>{confirmation.status === 'confirmed' ? 'You’re booked!' : 'Booking requested'}</h3>
          <p className="muted small">
            {confirmation.status === 'confirmed'
              ? 'Confirmed instantly — see your trip hub for the countdown, crew and chat.'
              : 'The operator typically responds within an hour. Your deposit is held securely until then.'}
          </p>
          <div className="bw-rows" style={{ textAlign: 'left' }}>
            <div className="bw-row"><span>Total</span><span className="v">{eur(confirmation.total)}</span></div>
            <div className="bw-row"><span>Deposit paid</span><span className="v">{eur(confirmation.deposit)}</span></div>
          </div>
          <Link to={`/account/trips`} className="btn btn-primary btn-block">Go to my trip</Link>
        </div>
      )}
    </aside>
  );
}
