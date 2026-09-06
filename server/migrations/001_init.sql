-- AEGEAN BERTH — core schema (Blocks A, B, C)
-- Multi-tenant: operators see only their own data (RLS via app.* session GUCs).

CREATE TABLE operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  legal_name TEXT,
  vat_number TEXT,                    -- ΑΦΜ
  tax_office TEXT,                    -- ΔΟΥ
  gemi_number TEXT,
  mhte_licence TEXT,                  -- ΜΗ.Τ.Ε. tourism licence
  address TEXT,
  iban TEXT,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 12.00,
  kyc_status TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending','verified','rejected')),
  response_time_mins INT,
  acceptance_rate NUMERIC(5,2),
  logo_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('traveller','operator','skipper','agent','admin','superadmin')),
  operator_id UUID REFERENCES operators(id),
  agent_commission_rate NUMERIC(5,2),
  locale TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cancellation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  tiers JSONB NOT NULL                -- [{days_before, refund_percent}]
);

CREATE TABLE vessels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('monohull','catamaran','gulet','motor_yacht','rib')),
  builder TEXT, model TEXT,
  year INT, refit_year INT,
  length_m NUMERIC(6,2), beam_m NUMERIC(6,2), draft_m NUMERIC(6,2),
  cabins INT, berths INT, heads INT,
  engine TEXT, sail_area_sqm NUMERIC(7,1),
  flag TEXT, registration_number TEXT, home_port TEXT,
  cruising_speed_kn NUMERIC(4,1),
  fuel_capacity_l INT, water_capacity_l INT,
  watermaker BOOLEAN DEFAULT false, generator BOOLEAN DEFAULT false, air_conditioning BOOLEAN DEFAULT false,
  amenities JSONB DEFAULT '[]',
  photos JSONB DEFAULT '[]',
  tour_360_url TEXT, deck_plan_url TEXT,
  insurance_policy_number TEXT,
  insurance_expiry DATE,             -- auto-suspension of listings on expiry (Block B #9)
  professional_licence_number TEXT,
  security_deposit NUMERIC(10,2), damage_waiver_price NUMERIC(10,2),
  mmsi TEXT,                         -- AIS tracking
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','draft','retired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cabins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vessel_id UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  deck TEXT,                          -- main / lower / upper
  type TEXT NOT NULL CHECK (type IN ('double','twin','triple','bunk','crew')),
  ensuite BOOLEAN DEFAULT false,
  position TEXT,                      -- bow / stern / midship
  berth_count INT NOT NULL DEFAULT 2,
  photos JSONB DEFAULT '[]',
  price_modifier_percent NUMERIC(5,2) DEFAULT 0
);

CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('Cyclades','Dodecanese','Ionian','Saronic','Sporades','Crete','Argosaronic')),
  summary TEXT,
  total_nm INT,
  difficulty TEXT CHECK (difficulty IN ('gentle','moderate','challenging')),
  typical_nights INT,
  hero_image TEXT,
  slug TEXT UNIQUE NOT NULL,
  seasonality_notes TEXT,
  best_months JSONB DEFAULT '[]',
  faq JSONB DEFAULT '[]'
);

CREATE TABLE route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  port_name TEXT NOT NULL,
  lat NUMERIC(9,6) NOT NULL,
  lng NUMERIC(9,6) NOT NULL,
  description TEXT,
  activities JSONB DEFAULT '[]',
  overnight BOOLEAN DEFAULT true,
  swim_stop BOOLEAN DEFAULT false,
  has_ferry_access BOOLEAN DEFAULT false,   -- flexible boarding (Block B #3)
  has_airport_access BOOLEAN DEFAULT false,
  notes TEXT
);

CREATE TABLE departures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vessel_id UUID NOT NULL REFERENCES vessels(id),
  route_id UUID NOT NULL REFERENCES routes(id),
  operator_id UUID NOT NULL REFERENCES operators(id),  -- denormalised for RLS
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  embarkation_port TEXT,
  disembarkation_port TEXT,
  one_way BOOLEAN DEFAULT false,
  booking_mode TEXT NOT NULL DEFAULT 'by_berth' CHECK (booking_mode IN ('whole_boat','by_cabin','by_berth','mixed')),
  skipper_id UUID REFERENCES users(id),
  base_price_per_berth NUMERIC(10,2) NOT NULL,
  whole_boat_price NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'EUR',
  berths_total INT NOT NULL,
  berths_available INT NOT NULL,
  minimum_viable_bookings INT NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft','open','guaranteed','almost_full','full','departed','cancelled')),
  instant_confirmation BOOLEAN DEFAULT false,
  trip_vibe JSONB DEFAULT '[]',
  skill_level_required TEXT DEFAULT 'none' CHECK (skill_level_required IN ('none','basic','confident','experienced')),
  languages_spoken JSONB DEFAULT '[]',
  minimum_age INT,
  pets_allowed BOOLEAN DEFAULT false,
  smoking_policy TEXT,
  cancellation_policy_id UUID REFERENCES cancellation_policies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT berths_sane CHECK (berths_available >= 0 AND berths_available <= berths_total)
);
CREATE INDEX idx_departures_search ON departures (status, departure_date);
CREATE INDEX idx_departures_route ON departures (route_id);

-- Optimistic berth inventory: atomic decrement must respect availability.
-- Enforced by constraint berths_available >= 0 + conditional UPDATE in the booking transaction.

CREATE TABLE extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id),
  vessel_id UUID REFERENCES vessels(id),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  price_unit TEXT NOT NULL CHECK (price_unit IN ('per_person','per_booking','per_day')),
  mandatory BOOLEAN DEFAULT false,
  category TEXT CHECK (category IN ('transfer','food','equipment','fuel','cleaning','tourist_tax','insurance'))
);

CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id),
  departure_id UUID REFERENCES departures(id),
  vessel_id UUID REFERENCES vessels(id),
  rule_type TEXT NOT NULL CHECK (rule_type IN ('early_bird','last_minute','long_stay','group_discount','seasonal_uplift','single_supplement')),
  conditions JSONB DEFAULT '{}',
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('percent','fixed')),
  adjustment_value NUMERIC(8,2) NOT NULL,
  valid_from DATE, valid_to DATE,
  priority INT DEFAULT 100
);

CREATE TABLE berth_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id UUID NOT NULL REFERENCES departures(id),
  traveller_id UUID NOT NULL REFERENCES users(id),
  cabin_id UUID REFERENCES cabins(id),
  berth_count INT NOT NULL DEFAULT 1,
  booking_type TEXT NOT NULL CHECK (booking_type IN ('berth','cabin','whole_boat','partial_segment')),
  share_cabin BOOLEAN DEFAULT false,
  cabin_share_preference TEXT CHECK (cabin_share_preference IN ('same_gender','any','private')),
  share_profile JSONB,                -- { gender, age_band, languages, sleep_habits, smoking, vibes }
  join_stop_id UUID REFERENCES route_stops(id),
  leave_stop_id UUID REFERENCES route_stops(id),
  total_price NUMERIC(12,2) NOT NULL,
  deposit_paid NUMERIC(12,2) DEFAULT 0,
  balance_due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','on_request','confirmed','cancelled','completed')),
  extras JSONB DEFAULT '[]',
  special_requests TEXT,
  booked_via TEXT DEFAULT 'direct' CHECK (booked_via IN ('direct','agent','proposal')),
  agent_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bookings_departure ON berth_bookings(departure_id);
CREATE INDEX idx_bookings_traveller ON berth_bookings(traveller_id);

CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES berth_bookings(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  nationality TEXT,                  -- ISO-3166 alpha-2
  document_type TEXT, document_number_enc TEXT,   -- encrypted at rest (Block C GDPR)
  document_expiry DATE,
  dietary_requirements TEXT,
  emergency_contact TEXT,
  sailing_experience TEXT CHECK (sailing_experience IN ('none','some','experienced','licensed')),
  sailing_licence_ref TEXT,
  tshirt_size TEXT
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE NOT NULL REFERENCES berth_bookings(id),
  traveller_id UUID NOT NULL REFERENCES users(id),
  vessel_id UUID NOT NULL REFERENCES vessels(id),
  skipper_id UUID REFERENCES users(id),
  rating_overall INT CHECK (rating_overall BETWEEN 1 AND 5),
  rating_vessel INT, rating_skipper INT, rating_cleanliness INT, rating_value INT, rating_itinerary INT,
  written_review TEXT,
  photos JSONB DEFAULT '[]',
  operator_response TEXT,
  verified BOOLEAN DEFAULT true,      -- only completed bookings can review (Block B #9)
  published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE enquiry_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id UUID NOT NULL REFERENCES departures(id),
  traveller_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE enquiry_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES enquiry_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES berth_bookings(id),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  type TEXT NOT NULL CHECK (type IN ('deposit','balance','extra','refund','security_deposit_hold')),
  provider TEXT NOT NULL DEFAULT 'mock',
  provider_reference TEXT,
  idempotency_key TEXT UNIQUE,       -- idempotent payment ops (Block C)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','succeeded','failed','refunded','released')),
  invoice_ref TEXT,                  -- myDATA transmission reference (mock)
  payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending','paid','on_hold')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id),
  period TEXT NOT NULL,              -- 'YYYY-MM'
  gross NUMERIC(12,2) DEFAULT 0,
  commission NUMERIC(12,2) DEFAULT 0,
  net NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid')),
  sepa_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id UUID NOT NULL REFERENCES departures(id),
  user_id UUID NOT NULL REFERENCES users(id),
  berths_wanted INT DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (departure_id, user_id)
);

-- Crowdsourced departures ("Start a Sailing", Block B #1)
CREATE TABLE proposed_departures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposer_id UUID NOT NULL REFERENCES users(id),
  route_id UUID NOT NULL REFERENCES routes(id),
  proposed_start DATE NOT NULL,
  proposed_end DATE NOT NULL,
  vessel_class TEXT CHECK (vessel_class IN ('monohull','catamaran','gulet','motor_yacht','rib','any')),
  berths_needed INT NOT NULL DEFAULT 1,        -- proposer's own berths
  berths_committed INT NOT NULL DEFAULT 1,
  berths_target INT NOT NULL DEFAULT 6,        -- minimum viable
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','bidding','scheduled','expired','cancelled')),
  expires_at TIMESTAMPTZ,
  winning_bid UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE proposal_joins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposed_departures(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  berths INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, user_id)
);
CREATE TABLE operator_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposed_departures(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id),
  vessel_id UUID REFERENCES vessels(id),
  price_per_berth NUMERIC(10,2) NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trip companion (Block B #7)
CREATE TABLE trip_items (            -- shared packing / provisioning lists
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id UUID NOT NULL REFERENCES departures(id),
  category TEXT NOT NULL CHECK (category IN ('packing','provisioning')),
  name TEXT NOT NULL,
  added_by UUID REFERENCES users(id),
  claimed_by UUID REFERENCES users(id),
  checked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE trip_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id UUID NOT NULL REFERENCES departures(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE cabin_match_requests (  -- Block B #2
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_booking_id UUID NOT NULL REFERENCES berth_bookings(id) ON DELETE CASCADE,
  target_booking_id UUID NOT NULL REFERENCES berth_bookings(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','accepted','declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);
CREATE TABLE trip_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES berth_bookings(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('passport','sailing_licence','other')),
  file_name TEXT NOT NULL,
  size_bytes INT,
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded','purged')),  -- auto-purge 90d post-trip (Block C)
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform ops (Block C)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id),
  actor_role TEXT,
  action TEXT NOT NULL,
  entity TEXT, entity_id TEXT,
  before JSONB, after JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE feature_flags (
  key TEXT PRIMARY KEY,
  operator_id UUID REFERENCES operators(id),   -- null = global
  enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT
);
CREATE TABLE fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES berth_bookings(id),
  reason TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE dispute_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES berth_bookings(id),
  opened_by UUID REFERENCES users(id),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','rejected')),
  evidence JSONB DEFAULT '[]',
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==== Row-level security ====
-- The API connects as role "app_user" (NOT the table owner, so RLS applies).
-- Per request the API sets, inside a transaction: app.user_id, app.role, app.operator_id.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN;
  END IF;
END $$;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

-- Helper: is the current API session staff?
CREATE OR REPLACE FUNCTION is_staff() RETURNS BOOLEAN AS $$
  SELECT current_setting('app.role', true) IN ('admin','superadmin');
$$ LANGUAGE sql;

-- vessels: public read (active listings); writes restricted to owner operator.
ALTER TABLE vessels ENABLE ROW LEVEL SECURITY;
CREATE POLICY vessels_public_select ON vessels FOR SELECT
  USING (status = 'active' OR operator_id::text = NULLIF(current_setting('app.operator_id', true), '')::text OR is_staff());
CREATE POLICY vessels_owner_write ON vessels FOR ALL
  USING (operator_id::text = NULLIF(current_setting('app.operator_id', true), '')::text OR is_staff())
  WITH CHECK (operator_id::text = NULLIF(current_setting('app.operator_id', true), '')::text OR is_staff());

-- cabins: readable with their vessel; writes via vessel ownership.
ALTER TABLE cabins ENABLE ROW LEVEL SECURITY;
CREATE POLICY cabins_select ON cabins FOR SELECT USING (true);
CREATE POLICY cabins_owner_write ON cabins FOR ALL
  USING (EXISTS (SELECT 1 FROM vessels v WHERE v.id = cabins.vessel_id
         AND v.operator_id::text = NULLIF(current_setting('app.operator_id', true), '')::text) OR is_staff())
  WITH CHECK (EXISTS (SELECT 1 FROM vessels v WHERE v.id = cabins.vessel_id
         AND v.operator_id::text = NULLIF(current_setting('app.operator_id', true), '')::text) OR is_staff());

-- departures: public read of live statuses; drafts only for the owning operator; writes owner-only.
ALTER TABLE departures ENABLE ROW LEVEL SECURITY;
CREATE POLICY departures_public_select ON departures FOR SELECT
  USING (status NOT IN ('draft','cancelled') OR operator_id::text = NULLIF(current_setting('app.operator_id', true), '')::text OR is_staff());
CREATE POLICY departures_owner_write ON departures FOR ALL
  USING (operator_id::text = NULLIF(current_setting('app.operator_id', true), '')::text OR is_staff())
  WITH CHECK (operator_id::text = NULLIF(current_setting('app.operator_id', true), '')::text OR is_staff());

-- berth_bookings: traveller sees own; operator sees bookings on their departures; staff all.
ALTER TABLE berth_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY bookings_select ON berth_bookings FOR SELECT
  USING (traveller_id::text = current_setting('app.user_id', true)
      OR EXISTS (SELECT 1 FROM departures d WHERE d.id = berth_bookings.departure_id
                 AND d.operator_id::text = NULLIF(current_setting('app.operator_id', true), '')::text)
      OR is_staff());
CREATE POLICY bookings_insert ON berth_bookings FOR INSERT
  WITH CHECK (traveller_id::text = current_setting('app.user_id', true) OR is_staff());
CREATE POLICY bookings_update ON berth_bookings FOR UPDATE
  USING (traveller_id::text = current_setting('app.user_id', true)
      OR EXISTS (SELECT 1 FROM departures d WHERE d.id = berth_bookings.departure_id
                 AND d.operator_id::text = NULLIF(current_setting('app.operator_id', true), '')::text)
      OR is_staff());

-- guests: only the booking traveller, the departure's operator, or staff.
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY guests_select ON guests FOR SELECT
  USING (EXISTS (SELECT 1 FROM berth_bookings b WHERE b.id = guests.booking_id
                 AND (b.traveller_id::text = current_setting('app.user_id', true)
                   OR EXISTS (SELECT 1 FROM departures d WHERE d.id = b.departure_id
                              AND d.operator_id::text = NULLIF(current_setting('app.operator_id', true), '')::text)))
         OR is_staff());
CREATE POLICY guests_insert ON guests FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM berth_bookings b WHERE b.id = guests.booking_id
                 AND b.traveller_id::text = current_setting('app.user_id', true)));
CREATE POLICY guests_update ON guests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM berth_bookings b WHERE b.id = guests.booking_id
                 AND b.traveller_id::text = current_setting('app.user_id', true)));

-- Operator-scoped internal tables: owner operator or staff only.
ALTER TABLE extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY extras_public_select ON extras FOR SELECT USING (true);
CREATE POLICY extras_owner_write ON extras FOR ALL
  USING (operator_id::text = NULLIF(current_setting('app.operator_id', true), '')::text OR is_staff())
  WITH CHECK (operator_id::text = NULLIF(current_setting('app.operator_id', true), '')::text OR is_staff());

ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY pricing_rules_policy ON pricing_rules FOR ALL
  USING (operator_id::text = NULLIF(current_setting('app.operator_id', true), '')::text OR is_staff())
  WITH CHECK (operator_id::text = NULLIF(current_setting('app.operator_id', true), '')::text OR is_staff());

ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY payouts_select ON payouts FOR SELECT
  USING (operator_id::text = NULLIF(current_setting('app.operator_id', true), '')::text OR is_staff());
CREATE POLICY payouts_write ON payouts FOR ALL
  USING (is_staff())
  WITH CHECK (is_staff());

-- Everything else: accessible to the API for public/own data; audit log insert-only.
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_all ON audit_log FOR SELECT USING (is_staff());
CREATE POLICY audit_insert ON audit_log FOR INSERT WITH CHECK (true);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY flags_all ON feature_flags FOR SELECT USING (true);

-- ==== Berth inventory safety functions (SECURITY DEFINER) ====
-- Atomic decrement with availability check (optimistic locking: the conditional
-- UPDATE takes a row lock; the CHECK constraint berths_available >= 0 is the backstop).
CREATE OR REPLACE FUNCTION book_berths(dep UUID, n INT) RETURNS BOOLEAN
SECURITY DEFINER AS $$
DECLARE confirmed INT;
BEGIN
  UPDATE departures SET berths_available = berths_available - n
  WHERE id = dep AND berths_available >= n AND status IN ('open','guaranteed','almost_full');
  IF NOT FOUND THEN RETURN FALSE; END IF;
  SELECT COALESCE(SUM(berth_count),0) INTO confirmed
  FROM berth_bookings WHERE departure_id = dep AND status = 'confirmed';
  UPDATE departures SET status = CASE
      WHEN berths_available = 0 THEN 'full'
      WHEN confirmed >= minimum_viable_bookings THEN 'guaranteed'
      ELSE status END
  WHERE id = dep;
  RETURN TRUE;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION release_berths(dep UUID, n INT) RETURNS VOID
SECURITY DEFINER AS $$
DECLARE confirmed INT;
BEGIN
  UPDATE departures SET berths_available = LEAST(berths_total, berths_available + n)
  WHERE id = dep;
  SELECT COALESCE(SUM(berth_count),0) INTO confirmed
  FROM berth_bookings WHERE departure_id = dep AND status = 'confirmed';
  UPDATE departures SET status = CASE
      WHEN status = 'full' AND confirmed >= minimum_viable_bookings THEN 'guaranteed'
      WHEN status = 'full' THEN 'open'
      WHEN status = 'almost_full' AND confirmed >= minimum_viable_bookings THEN 'guaranteed'
      ELSE status END
  WHERE id = dep;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION recalc_departure_status(dep UUID) RETURNS VOID
SECURITY DEFINER AS $$
DECLARE confirmed INT;
BEGIN
  SELECT COALESCE(SUM(berth_count),0) INTO confirmed
  FROM berth_bookings WHERE departure_id = dep AND status = 'confirmed';
  UPDATE departures SET status = CASE
      WHEN berths_available = 0 THEN 'full'
      WHEN confirmed >= minimum_viable_bookings THEN 'guaranteed'
      ELSE status END
  WHERE id = dep AND status NOT IN ('draft','departed','cancelled');
END $$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION book_berths(UUID, INT), release_berths(UUID, INT), recalc_departure_status(UUID) TO app_user;

-- Indexes
CREATE INDEX idx_routes_slug ON routes(slug);
CREATE INDEX idx_route_stops_route ON route_stops(route_id);
CREATE INDEX idx_trip_items_departure ON trip_items(departure_id);
CREATE INDEX idx_trip_messages_departure ON trip_messages(departure_id, created_at);
