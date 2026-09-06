// ==== Integration adapters (Block C) ====
// Every external service is behind a clean adapter interface with a mock
// implementation and a clearly marked TODO for the real provider.

// ---------- Payments ----------
// TODO(Stripe Connect): marketplace split payments, deposits and security-deposit
// holds via PaymentIntents + Connect destination charges.
// TODO(Viva Wallet): Greek-market alternative (lower fees, local IBAN payouts).
// TODO(3DS/SCA): confirmPayment flows; PCI-DSS — card data never touches our systems.
const payments = {
  async charge({ amount, currency = 'EUR', idempotencyKey }) {
    // Mock: succeed instantly. Real impl: PaymentIntent create+confirm with SCA fallback.
    return {
      status: 'succeeded',
      provider: 'mock',
      provider_reference: 'pi_mock_' + (idempotencyKey || Math.random().toString(36).slice(2, 10))
    };
  },
  async refund({ providerReference, amount }) {
    // TODO: Stripe refund API / Viva Wallet cancellation.
    return { status: 'succeeded', provider: 'mock', providerReference, amount };
  },
  async hold({ amount }) {
    // Security deposit hold (released on return).
    // TODO: separate authorization + capture later via Stripe manual capture.
    return { status: 'succeeded', provider: 'mock', provider_reference: 'hold_' + Math.random().toString(36).slice(2, 10) };
  }
};

// ---------- Weather ----------
// TODO(Windy API / OpenWeather Marine / Poseidon-HCMR wave data).
const weather = {
  async forecast(lat, lng, days = 7) {
    // Deterministic pseudo-forecast so the demo is stable.
    const seed = Math.abs(Math.round(lat * 37 + lng * 53));
    const dir = ['NW','N','NE','W','SW'][seed % 5];
    return Array.from({ length: days }, (_, i) => ({
      day_offset: i,
      wind_knots: 12 + ((seed + i * 7) % 14),
      wind_dir: dir,
      temp_c: 26 + ((seed + i) % 4),
      wave_m: Math.round((0.4 + ((seed + i * 3) % 9) / 10) * 10) / 10,
      summary: ['Sunny', 'Fair', 'Light breeze', 'Fresh Meltemi'][(seed + i) % 4]
    }));
  }
};

// ---------- AIS vessel tracking ----------
// TODO(MarineTraffic AIS API): poll vessel position by MMSI during the trip.
const ais = {
  async position(mmsi, routeStops = [], now = new Date()) {
    if (!routeStops.length) return null;
    // Mock: interpolate along the route polyline based on time of day.
    const t = (now.getUTCHours() * 60 + now.getUTCMinutes()) / 1440;
    const seg = Math.min(routeStops.length - 1, Math.max(1, Math.round(t * (routeStops.length - 1)) + 0));
    const a = routeStops[seg - 1], b = routeStops[Math.min(seg, routeStops.length - 1)];
    const f = (now.getUTCMinutes() % 60) / 60;
    return {
      mmsi,
      lat: Number(a.lat) + (Number(b.lat) - Number(a.lat)) * f,
      lng: Number(a.lng) + (Number(b.lng) - Number(a.lng)) * f,
      speed_kn: 7.4,
      heading: Math.round(Math.atan2(b.lng - a.lng, b.lat - a.lat) * 180 / Math.PI),
      timestamp: now.toISOString(),
      source: 'mock'
    };
  }
};

// ---------- Greek e-invoicing ----------
// TODO(myDATA / ΑΑΔΕ): transmit every commission and operator invoice via the
// myDATA API (provider access keys, invoice classification codes).
const mydata = {
  async transmitInvoice({ invoiceId, issuerVat, amount }) {
    return { status: 'transmitted', mark: 'MOCK' + Date.now().toString().slice(-9), invoiceId, issuerVat, amount };
  }
};

// ---------- Greek cruising tax ----------
// ΤΕΠΑΗ (formerly ΤΕΠΑΙ): charged per passenger-day, scaled by vessel length.
// TODO: official ΑΑΔΕ calculation + payment tracking per departure.
const tepah = {
  compute({ vesselLengthM = 12, passengerDays = 1 }) {
    const lengthTier = vesselLengthM <= 7 ? 0.6 : vesselLengthM <= 10 ? 0.9 : vesselLengthM <= 15 ? 1.2 : 1.8; // €/passenger-day
    return Math.round(lengthTier * passengerDays * 100) / 100;
  }
};

// ---------- Transactional email / SMS ----------
// TODO(Brevo/SendGrid), TODO(Twilio + WhatsApp Business, Viber Business for Greece).
const comms = {
  async sendEmail(to, template, data) { console.log(`[email→${to}] ${template}`, JSON.stringify(data).slice(0, 140)); },
  async sendSms(to, body) { console.log(`[sms→${to}] ${body.slice(0, 60)}`); }
};

// ---------- SEPA payout batch ----------
// Generates a simplified pain.001 XML for the payout run.
function sepaXml(payouts, { ibanField = 'iban', nameField = 'company_name' } = {}) {
  const total = payouts.reduce((s, p) => s + Number(p.net), 0);
  const paymentsXml = payouts.map((p, i) => `
    <CdtTrfTxInf>
      <PmtId><EndToEndId>PAYOUT-${p.id.slice(0, 8)}-${i + 1}</EndToEndId></PmtId>
      <Amt><InstdAmt Ccy="EUR">${Number(p.net).toFixed(2)}</InstdAmt></Amt>
      <CdtrAgt><FinInstnId><BIC>GENERICGRAXXX</BIC></FinInstnId></CdtrAgt>
      <Cdtr><Nm>${p[nameField] || 'Operator'}</Nm><Id><OrgId><Othr><Id>${p.id}</Id></Othr></OrgId></Id></Cdtr>
      <CdtrAcct><Id><IBAN>${p.iban || p[ibanField] || 'GR0000000000000000000000000'}</IBAN></Id></CdtrAcct>
    </CdtTrfTxInf>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr><MsgId>AEGEAN-BERTH-${Date.now()}</MsgId><CreDtTm>${new Date().toISOString()}</CreDtTm>
      <NbOfTxs>${payouts.length}</NbOfTxs><CtrlSum>${total.toFixed(2)}</CtrlSum><InitgPty><Nm>Aegean Berth</Nm></InitgPty></GrpHdr>
    <PmtInf><PmtInfId>PI-1</PmtInfId><PmtMtd>TRF</PmtMtd><BtchBookg>false</BtchBookg>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl></PmtTpInf>
      <ReqdExctnDt>${new Date().toISOString().slice(0, 10)}</ReqdExctnDt>
      <Dbtr><Nm>AEGEAN BERTH S.A.</Nm></Dbtr>${paymentsXml}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;
}

// ---------- e-Charterparty (Greek charter compliance) ----------
// TODO(e-Ναυλοσύμφωνο / e-Charterparty workflow, companion app): export a validated
// passenger manifest in the official format (ISO-3166 nationality, ISO-8601 dates).
function charterpartyManifest(departure, guests) {
  return {
    departure: {
      vessel: departure.vessel_name,
      registration: departure.registration_number,
      embarkation: departure.embarkation_port,
      disembarkation: departure.disembarkation_port,
      start: departure.departure_date,
      end: departure.return_date
    },
    passengers: guests.map((g) => ({
      full_name: g.full_name,
      date_of_birth: g.date_of_birth,
      nationality: g.nationality,
      document_type: g.document_type,
      document_number: '[encrypted]',
      document_expiry: g.document_expiry
    })),
    generated_at: new Date().toISOString(),
    format: 'mock-e-charterparty-v1'
  };
}

export default { payments, weather, ais, mydata, tepah, comms, sepaXml, charterpartyManifest };
