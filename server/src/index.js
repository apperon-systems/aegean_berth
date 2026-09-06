import express from 'express';
import { query, appPool } from './db.js';
import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import travellerRoutes from './routes/traveller.js';
import proposalRoutes from './routes/proposals.js';
import operatorRoutes from './routes/operator.js';
import adminRoutes from './routes/admin.js';
import agentRoutes from './routes/agent.js';

const app = express();
app.use(express.json({ limit: '2mb' }));

// ---- Health & status ----
app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', db: 'up', time: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'down' });
  }
});

app.get('/api/status', async (req, res) => {
  res.json({
    service: 'aegean-berth-api',
    version: '1.0.0',
    integrations: {
      // All adapters are mocked in dev; see server/src/services/integrations.js for the TODO list.
      payments: 'mock (TODO: Stripe Connect, Viva Wallet)',
      mydata_einvoicing: 'mock (TODO: ΑΑΔΕ myDATA)',
      weather: 'mock (TODO: Windy, OpenWeather Marine, Poseidon/HCMR)',
      ais_tracking: 'mock (TODO: MarineTraffic)',
      email: 'mock (TODO: Brevo/SendGrid)',
      sepa: 'implemented (pain.001 simplified)'
    },
    compliance: {
      rls_tenancy: true, idempotency_keys: true, gdpr_doc_purge_policy: '90 days post-trip (TODO: scheduler)',
      psd2_sca: 'TODO via provider 3DS', pci_dss: 'card data never stored (tokenised)'
    }
  });
});

// ---- Rate limiting on public search (Block C) ----
const hits = new Map();
setInterval(() => hits.clear(), 60_000);
const rateLimit = (max = 60) => (req, res, next) => {
  const key = req.ip || 'anon';
  const n = (hits.get(key) || 0) + 1;
  hits.set(key, n);
  if (n > max) return res.status(429).json({ error: 'Too many searches — slow down a little' });
  next();
};

// ---- Mount API ----
app.use('/api/auth', authRoutes);
app.use('/api', publicRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api', travellerRoutes);   // own-tenant routes (requireAuth applied per router)
app.use('/api/operator', operatorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/agent', agentRoutes);
app.get('/api/search', rateLimit(60), (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

// ---- SEO: sitemap + robots ----
const SITE_HOST = 'https://3000-' + (process.env.BASE44_PUBLIC_HOST_SUFFIX || 'localhost');
app.get('/sitemap.xml', async (req, res) => {
  const [routes, departures] = await Promise.all([
    query(`SELECT slug, 'en' AS lang FROM routes`),
    query(`SELECT id FROM departures WHERE status IN ('open','guaranteed','almost_full') AND departure_date >= CURRENT_DATE`)
  ]);
  const urls = [];
  for (const lang of ['en', 'el']) {
    for (const r of routes.rows) urls.push({ loc: `${SITE_HOST}/${lang}/routes/${r.slug}` });
    for (const d of departures.rows) urls.push({ loc: `${SITE_HOST}/${lang}/departures/${d.id}` });
  }
  urls.unshift({ loc: `${SITE_HOST}/` }, { loc: `${SITE_HOST}/proposals` }, { loc: `${SITE_HOST}/routes` });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc></url>`).join('\n')}
</urlset>`;
  res.type('application/xml').send(xml);
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${SITE_HOST}/sitemap.xml\n`);
});

// ---- 404 + error handler ----
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, _next) => {
  if (err.message === 'SOLD_OUT') return res.status(409).json({ error: 'Someone just took the last berths — join the waitlist!' });
  console.error('[api]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal error' });
});

const port = process.env.PORT || 4000;
app.listen(port, '0.0.0.0', async () => {
  console.log(`[api] AEGEAN BERTH listening on :${port}`);
  await appPool.query('SELECT 1').catch((e) => console.error('[api] DB not reachable yet:', e.message));
});
