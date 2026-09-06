-- AEGEAN BERTH seed data (idempotent: seed.js skips if users already exist)
-- Dates are seeded relative to CURRENT_DATE so the marketplace always looks alive.

-- ---------- Operators ----------
INSERT INTO operators (id, company_name, legal_name, vat_number, tax_office, gemi_number, mhte_licence, address, iban, commission_rate, kyc_status, response_time_mins, acceptance_rate, logo_url, description) VALUES
('11111111-1111-1111-1111-111111111101','Aegean Blue Charters','Aegean Blue Charters IKE','EL800123456','Α΄ Αθηνών','GEMI-987654','ΜΗΤΕ 0933Κ910Α0900000','Alimos Marina, Athens','GR1601100000000012345678901',12.00,'verified',45,94,NULL,'Family-run charter company based at Alimos Marina since 2009. Twelve vessels, all with professional skippers, MHTE-licensed.'),
('11111111-1111-1111-1111-111111111102','Cyclades Sailing Co','Cyclades Sailing Co ΕΠΕ','EL998877665','Β΄ Πειραιώς','GEMI-123321','ΜΗΤΕ 0233Κ912Α0700000','Paroikia, Paros','GR1601100000000098765432109',12.00,'verified',120,88,NULL,'Small-boat sailing specialist running cabin-share departures across the Cyclades since 2015.'),
('11111111-1111-1111-1111-111111111103','Ionian Sea Yachts','Ionian Sea Yachts Single Member PC','EL554433221','Κέρκυρα','GEMI-555888','ΜΗΤΕ 0810Κ133Κ0470000','Marina Gouvia, Corfu','GR1601100000000044556677889',12.00,'pending',180,72,NULL,'Catamaran charters in the Ionian. New to the platform — KYC in review.'),
('11111111-1111-1111-1111-111111111104','Dodecanese Yachting','Dodecanese Yachting IKE','EL112233445','Ρόδος','GEMI-777222','ΜΗΤΕ 0265Κ802Α0230000','Mandraki Marina, Rhodes','GR1601100000000077889900112',12.00,'pending',240,80,NULL,'Gulet and motor-yacht cruises from Rhodes and Kos.');

-- ---------- Users ----------
INSERT INTO users (id, email, password_hash, name, role, operator_id, agent_commission_rate, locale) VALUES
('22222222-2222-2222-2222-222222222201','traveller@demo.gr','PLACEHOLDER','Elena Papadopoulou','traveller',NULL,NULL,'en'),
('22222222-2222-2222-2222-222222222202','maria@demo.gr','PLACEHOLDER','Maria Kanellos','traveller',NULL,NULL,'el'),
('22222222-2222-2222-2222-222222222203','jon@demo.gr','PLACEHOLDER','Jon Weber','traveller',NULL,NULL,'en'),
('22222222-2222-2222-2222-222222222204','tom@demo.gr','PLACEHOLDER','Tomàs Ferreira','traveller',NULL,NULL,'en'),
('22222222-2222-2222-2222-222222222205','ops@aegeanblue.gr','PLACEHOLDER','Nikos Alexandris','operator','11111111-1111-1111-1111-111111111101',NULL,'el'),
('22222222-2222-2222-2222-222222222206','ops@cycladessailing.gr','PLACEHOLDER','Sofia Renieri','operator','11111111-1111-1111-1111-111111111102',NULL,'en'),
('22222222-2222-2222-2222-222222222207','ops@ioniansea.gr','PLACEHOLDER','Dimitris Vlachos','operator','11111111-1111-1111-1111-111111111103',NULL,'el'),
('22222222-2222-2222-2222-222222222208','skipper@demo.gr','PLACEHOLDER','Yiannis Markou','skipper',NULL,NULL,'el'),
('22222222-2222-2222-2222-222222222209','admin@aegeanberth.gr','PLACEHOLDER','Platform Admin','admin',NULL,NULL,'en'),
('22222222-2222-2222-2222-222222222210','agent@demo.gr','PLACEHOLDER','Hellenic Travel Partners','agent',NULL,8.00,'en'),
('22222222-2222-2222-2222-222222222211','eleni@demo.gr','PLACEHOLDER','Eleni Riga','skipper',NULL,NULL,'en');

-- ---------- Cancellation policies ----------
INSERT INTO cancellation_policies (id, name, description, tiers) VALUES
('88888888-8888-8888-8888-888888888801','Flexible','Full refund up to 30 days before departure, 50% up to 14 days, 25% up to 7 days.','[{"days_before":30,"refund_percent":100},{"days_before":14,"refund_percent":50},{"days_before":7,"refund_percent":25}]'),
('88888888-8888-8888-8888-888888888802','Standard','Full refund up to 60 days, 70% up to 30 days, 40% up to 14 days, 10% up to 7 days.','[{"days_before":60,"refund_percent":100},{"days_before":30,"refund_percent":70},{"days_before":14,"refund_percent":40},{"days_before":7,"refund_percent":10}]'),
('88888888-8888-8888-8888-888888888803','Strict','50% refund up to 90 days, no refund inside 60 days. Best for whole-boat charters in peak season.','[{"days_before":90,"refund_percent":50},{"days_before":60,"refund_percent":0}]');

-- ---------- Routes ----------
INSERT INTO routes (id, name, region, summary, total_nm, difficulty, typical_nights, hero_image, slug, seasonality_notes, best_months, faq) VALUES
('44444444-4444-4444-4444-444444444401','Saronic Weekend Escape','Saronic','A gentle three-night loop from Athens through Aegina, Poros and Hydra — the perfect first sail.',80,'gentle',3,'https://images.unsplash.com/photo-1506929562872-bb4215035217?w=1200&q=80','saronic-weekend-escape','Sheltered waters, light Meltemi, swimming from April.','[4,5,6,9,10]','[{"q":"Do I need sailing experience?","a":"No — every departure runs with a professional skipper. You can take the helm or just relax."},{"q":"What are the swims like?","a":"Daily swim stops in secluded coves; water is 22–26°C from May."}]'),
('44444444-4444-4444-4444-444444444402','Cyclades Classic: Athens to the Islands','Cyclades','The definitive Aegean crossing: Kea, Mykonos, Naxos and Paros, with Mykonos nightlife and Naxos tavernas.',210,'moderate',7,'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1200&q=80','cyclades-classic','Moderate Meltemi in July/August — exciting sailing, reliable wind.','[5,6,9,10]','[{"q":"How rough is the open crossing?","a":"Expect 15–25 knot Meltemi in high summer. Most guests find it exhilarating; choose June or September for gentler conditions."},{"q":"Can I join mid-route?","a":"Yes — Mykonos (airport) and Naxos (ferry) both allow flexible boarding."}]'),
('44444444-4444-4444-4444-444444444403','Ionian Dream','Ionian','Green islands, calm turquoise water and short hops: Lefkada, Meganisi, Kefalonia and Ithaca of Odysseus.',120,'gentle',7,'https://images.unsplash.com/photo-1503152391349-86c8ba53d134?w=1200&q=80','ionian-dream','No Meltemi here — light afternoon breezes and flat seas all season.','[5,6,7,8,9,10]','[{"q":"Is it good for non-swimmers?","a":"Exceptional — the Ionian is the calmest Greek sailing area, with warm shallow bays."}]'),
('44444444-4444-4444-4444-444444444404','Dodecanese Gems','Dodecanese','From Kos to the sponge-divers of Kalymnos, holy Patmos, tiny Lipsi and Symi''s painted harbour.',150,'gentle',7,'https://images.unsplash.com/photo-1561501900-3701ee635792?w=1200&q=80','dodecanese-gems','Long season — warm sea into November.','[5,6,7,8,9,10]','[{"q":"What is a gulet like?","a":"A traditional wooden motor-sailer: spacious decks, en-suite cabins, and hotel-level crew service."}]'),
('44444444-4444-4444-4444-444444444405','Sporades Odyssey','Sporades','Pine-forested islands and the marine park of Alonissos — monk seals, emptier anchorages.',160,'moderate',7,'https://images.unsplash.com/photo-1545486332-9e7acc8ccd63?w=1200&q=80','sporades-odyssey','Prevailing northerlies; the marine park limits some anchorages.','[6,7,8,9]','[{"q":"Will we see monk seals?","a":"Often, in the Alonissos marine park — sightings are common in June–September."}]'),
('44444444-4444-4444-4444-444444444406','Crete & the South Cyclades','Crete','A wilder crossing: Heraklion to Santorini''s caldera and back via sleepy Anafi.',190,'challenging',6,'https://images.unsplash.com/photo-1516483638261-f4dbaf03296f?w=1200&q=80','crete-south-cyclades','Strong Meltemi funnels here — confident crews only, or pick September.','[5,9,10]','[{"q":"Why is this route marked challenging?","a":"Open-channel crossings with 25+ knot gusts around the Santorini caldera."}]');

-- ---------- Route stops ----------
INSERT INTO route_stops (id, route_id, day_number, port_name, lat, lng, description, activities, overnight, swim_stop, has_ferry_access, has_airport_access, notes) VALUES
-- Saronic
('55555555-5555-5555-5555-555555555501','44444444-4444-4444-4444-444444444401',0,'Athens — Alimos Marina',37.8613,23.7087,'Board at 17:00, welcome dinner aboard.','["boarding","dinner"]',true,false,true,true,'Check-in from 16:00'),
('55555555-5555-5555-5555-555555555502','44444444-4444-4444-4444-444444444401',1,'Aegina',37.4118,23.4314,'Temple of Aphaia and famous pistachio groves.','["temple_visit","swim"]',true,true,true,false,''),
('55555555-5555-5555-5555-555555555503','44444444-4444-4444-4444-444444444401',2,'Poros',37.5000,23.6167,'Clocktower sunset, waterfront tavernas.','["sunset","taverna"]',true,true,true,false,''),
('55555555-5555-5555-5555-555555555504','44444444-4444-4444-4444-444444444401',3,'Hydra',37.3532,23.4668,'No cars — donkeys, stone mansions, artists'' harbour.','["hike","photography"]',true,false,true,false,''),
('55555555-5555-5555-5555-555555555505','44444444-4444-4444-4444-444444444401',4,'Spetses → Athens',37.2697,23.1533,'Swim stop at Spetsopoula, sail home by evening.','["swim","disembark"]',false,true,true,true,'Disembark by 18:00'),
-- Cyclades
('55555555-5555-5555-5555-555555555510','44444444-4444-4444-4444-444444444402',0,'Athens — Alimos Marina',37.8613,23.7087,'Board at 17:00, provision with the crew.','["boarding","dinner"]',true,false,true,true,''),
('55555555-5555-5555-5555-555555555511','44444444-4444-4444-4444-444444444402',1,'Kea (Vourkari)',37.6403,24.3235,'Quiet cycladic harbour, Φαρς taverna.','["taverna","swim"]',true,true,true,false,''),
('55555555-5555-5555-5555-555555555512','44444444-4444-4444-4444-444444444402',2,'Mykonos',37.4410,25.3666,'The windmills and Little Venice — and the famous nightlife.','["nightlife","beach","photography"]',true,false,true,true,'Flexible boarding: join here by ferry or plane'),
('55555555-5555-5555-5555-555555555513','44444444-4444-4444-4444-444444444402',3,'Naxos',37.1004,25.3785,'Portara sunset, mountain villages, the best potatoes in Greece.','["sunset","village_tour"]',true,true,true,false,'Flexible boarding: join or leave by ferry'),
('55555555-5555-5555-5555-555555555514','44444444-4444-4444-4444-444444444402',4,'Paros — Naoussa',37.1080,25.1465,'Fishing-harbour glamour and Kolymbithres granite coves.','["swim","beach_club"]',true,true,true,false,''),
('55555555-5555-5555-5555-555555555515','44444444-4444-4444-4444-444444444402',5,'Kythnos',37.3888,24.4200,'Sand twin bays, last swim.','["swim","hot_springs"]',true,true,true,false,''),
('55555555-5555-5555-5555-555555555516','44444444-4444-4444-4444-444444444402',7,'Athens — Alimos Marina',37.8613,23.7087,'Disembark by 10:00.','["disembark"]',false,false,true,true,''),
-- Ionian
('55555555-5555-5555-5555-555555555520','44444444-4444-4444-4444-444444444403',0,'Lefkada — Marina',38.8307,20.7104,'Board at 17:00.','["boarding"]',true,false,true,true,''),
('55555555-5555-5555-5555-555555555521','44444444-4444-4444-4444-444444444403',1,'Meganisi',38.6500,20.7700,'Papanikolis sea cave and Scorpios view.','["cave","swim"]',true,true,false,false,''),
('55555555-5555-5555-5555-555555555522','44444444-4444-4444-4444-444444444403',2,'Kefalonia — Argostoli',38.1776,20.4957,'Melissani lake, loggerhead turtles in the harbour.','["lake","turtles"]',true,false,true,true,'Flexible boarding: join or leave by ferry or plane'),
('55555555-5555-5555-5555-555555555523','44444444-4444-4444-4444-444444444403',3,'Ithaca — Vathi',38.3611,20.7200,'Odysseus'' homeland, red-roofed capital.','["hike","taverna"]',true,true,true,false,''),
('55555555-5555-5555-5555-555555555524','44444444-4444-4444-4444-444444444403',4,'Kalamos',38.6490,20.9447,'Pine-clad fjord anchorage.','["swim","kayak"]',true,true,false,false,''),
('55555555-5555-5555-5555-555555555525','44444444-4444-4444-4444-444444444403',7,'Lefkada — Marina',38.8307,20.7104,'Disembark by 10:00.','["disembark"]',false,false,true,true,''),
-- Dodecanese
('55555555-5555-5555-5555-555555555530','44444444-4444-4444-4444-444444444404',0,'Kos Marina',36.8916,27.2870,'Board at 17:00.','["boarding"]',true,false,true,true,''),
('55555555-5555-5555-5555-555555555531','44444444-4444-4444-4444-444444444404',1,'Kalymnos',36.9620,26.9910,'Sponge-diving heritage, climbing walls above the harbour.','["climbing","museum"]',true,false,true,false,''),
('55555555-5555-5555-5555-555555555532','44444444-4444-4444-4444-444444444404',2,'Patmos',37.3390,26.5450,'The Monastery of St John and Chora''s lanes.','["monastery","photography"]',true,false,true,false,''),
('55555555-5555-5555-5555-555555555533','44444444-4444-4444-4444-444444444404',3,'Lipsi',37.3000,26.7800,'Tiny island, big taverna energy. Try the pougydonisia.','["swim","taverna"]',true,true,true,false,''),
('55555555-5555-5555-5555-555555555534','44444444-4444-4444-4444-444444444404',4,'Symi',36.6110,27.8400,'Neoclassical painted harbour, Panormitis monastery.','["monastery","photography"]',true,false,true,false,''),
('55555555-5555-5555-5555-555555555535','44444444-4444-4444-4444-444444444404',6,'Kos Marina',36.8916,27.2870,'Final swim at Psalidi, disembark by 10:00.','["swim","disembark"]',false,true,true,true,''),
-- Sporades
('55555555-5555-5555-5555-555555555540','44444444-4444-4444-4444-444444444405',0,'Skiathos',39.1100,23.4900,'Board at 17:00 in the old harbour.','["boarding"]',true,false,true,true,''),
('55555555-5555-5555-5555-555555555541','44444444-4444-4444-4444-444444444405',1,'Skopelos',39.1200,23.7300,'Mamma Mia! country — Glossa and Agios Ioannis.','["beach","photography"]',true,true,true,false,''),
('55555555-5555-5555-5555-555555555542','44444444-4444-4444-4444-444444444405',2,'Alonissos — marine park',38.9900,23.9900,'Monk seals, museum, hike to the old village.','["wildlife","hike"]',true,true,true,false,''),
('55555555-5555-5555-5555-555555555543','44444444-4444-4444-4444-444444444405',3,'Kyra Panagia',39.3300,24.0800,'Uninhabited monastery island, crystal anchorage.','["swim","monastery"]',true,true,false,false,''),
('55555555-5555-5555-5555-555555555544','44444444-4444-4444-4444-444444444405',5,'Skyros',38.9100,24.8900,'Chalk-white town, ponies, Byzantine castle.','["castle","photography"]',true,false,true,false,''),
('55555555-5555-5555-5555-555555555545','44444444-4444-4444-4444-444444444405',7,'Skiathos',39.1100,23.4900,'Disembark by 10:00.','["disembark"]',false,false,true,true,''),
-- Crete
('55555555-5555-5555-5555-555555555550','44444444-4444-4444-4444-444444444406',0,'Heraklion',35.3410,25.1310,'Board at 17:00.','["boarding"]',true,false,true,true,''),
('55555555-5555-5555-5555-555555555551','44444444-4444-4444-4444-444444444406',2,'Santorini — Oia',36.4618,25.3760,'Caldera sunset, red beach.','["sunset","caldera","photography"]',true,false,true,true,'Flexible boarding: join by plane or ferry'),
('55555555-5555-5555-5555-555555555552','44444444-4444-4444-4444-444444444406',4,'Anafi',36.3650,25.7710,'Chora and Katalymatsa cliff houses.','["hike","swim"]',true,true,true,false,''),
('55555555-5555-5555-5555-555555555553','44444444-4444-4444-4444-444444444406',6,'Heraklion',35.3410,25.1310,'Disembark by 10:00.','["disembark"]',false,false,true,true,'');

-- ---------- Vessels ----------
INSERT INTO vessels (id, operator_id, name, type, builder, model, year, refit_year, length_m, beam_m, draft_m, cabins, berths, heads, engine, sail_area_sqm, flag, registration_number, home_port, cruising_speed_kn, fuel_capacity_l, water_capacity_l, watermaker, generator, air_conditioning, amenities, photos, tour_360_url, insurance_policy_number, insurance_expiry, professional_licence_number, security_deposit, damage_waiver_price, mmsi, status) VALUES
('33333333-3333-3333-3333-333333333301','11111111-1111-1111-1111-111111111101','Thalassa','monohull','Beneteau','Oceanis 51.1',2021,2024,15.66,4.80,2.35,5,10,5,'Volvo D2-75','130','GR','GRE-1123-20','Alimos, Athens',8.2,518,780,true,true,true,'["bimini","davit","bbq","wifi","inflatable_dinghy","paddleboards","chartplotter","stereo","cockpit_shower"]','["https://images.unsplash.com/photo-1567226475328-9d6ba9699709?w=900&q=80","https://images.unsplash.com/photo-1561501900-3701ee635792?w=900&q=80","https://images.unsplash.com/photo-1545486332-9e7acc8ccd63?w=900&q=80"]',NULL,'INS-2024-88121',CURRENT_DATE + 400,'LIC-4412',2500,180,'238112345','active'),
('33333333-3333-3333-3333-333333333302','11111111-1111-1111-1111-111111111101','Meltemi','catamaran','Lagoon','42',2022,NULL,12.80,7.70,1.25,4,8,4,'2x Volvo D2-50','118','GR','GRE-2231-22','Alimos, Athens',8.0,600,900,true,true,true,'["flybridge","jacuzzi","wifi","aircon","paddleboards","sea_scooter","cockpit_fridge","sunloungers"]','["https://images.unsplash.com/photo-1561501900-3701ee635792?w=900&q=80","https://images.unsplash.com/photo-1506929562872-bb4215035217?w=900&q=80"]',NULL,'INS-2024-77321',CURRENT_DATE + 320,'LIC-5501',3000,220,'238223456','active'),
('33333333-3333-3333-3333-333333333303','11111111-1111-1111-1111-111111111101','Zephyros','monohull','Hanse','418',2019,2023,12.40,4.30,1.70,3,6,2,'Yanmar 3YM30','72','GR','GRE-3344-19','Alimos, Athens',7.5,240,400,false,false,false,'["bimini","heating","stereo","inflatable_dinghy"]','["https://images.unsplash.com/photo-1545486332-9e7acc8ccd63?w=900&q=80"]',NULL,'INS-2024-11902',CURRENT_DATE + 210,'LIC-6620',1500,120,'238334456','active'),
('33333333-3333-3333-3333-333333333304','11111111-1111-1111-1111-111111111102','Naias','gulet','Bodrum yard','Classic 30m',2005,2021,30.00,7.20,3.10,6,12,6,'2x MAN 400',NULL,'TR/GR','GRE-9911-05','Paroikia, Paros',9.0,4000,6000,true,true,true,'["full_crew","chef","masseuse","jetski","wifi","premium_linens","hammam"]','["https://images.unsplash.com/photo-1503152391349-86c8ba53d134?w=900&q=80","https://images.unsplash.com/photo-1533105079780-92b9be482077?w=900&q=80"]',NULL,'INS-2024-33188',CURRENT_DATE + 180,'LIC-7781',5000,350,'271991234','active'),
('33333333-3333-3333-3333-333333333305','11111111-1111-1111-1111-111111111103','Afroditi','catamaran','Fountaine Pajot','Lucia 40',2020,NULL,11.73,6.72,1.20,4,8,4,'2x Volvo D2-40','102','GR','GRE-5566-20','Marina Gouvia, Corfu',7.8,400,700,true,false,true,'["bimini","wifi","paddleboards","coffee_machine"]','["https://images.unsplash.com/photo-1503152391349-86c8ba53d134?w=900&q=80"]',NULL,'INS-2023-88901',CURRENT_DATE - 15,'LIC-8832',2000,150,'238553456','suspended'),
('33333333-3333-3333-3333-333333333306','11111111-1111-1111-1111-111111111104','Poseidon''s Gift','motor_yacht','Princess','V50',2018,2023,15.60,4.40,1.40,3,6,4,'2x MAN V8',NULL,'GR','GRE-7788-18','Mandraki, Rhodes',25.0,2600,800,false,true,true,'["stabilisers","wifi","tender_40hp","grill","sonar_fishing"]','["https://images.unsplash.com/photo-1516483638261-f4dbaf03296f?w=900&q=80"]',NULL,'INS-2024-55678',CURRENT_DATE + 260,'LIC-9911',4000,300,'238773456','active'),
('33333333-3333-3333-3333-333333333307','11111111-1111-1111-1111-111111111104','Kalypso','monohull','Ocean Yachts','566',2017,2022,17.60,4.90,2.20,4,8,4,'Volvo D4-150','140','GR','GRE-4411-17','Kos Marina, Kos',9.0,800,1000,true,true,true,'["generator","aircon","watermaker","wifi","fishing_gear"]','["https://images.unsplash.com/photo-1567226475328-9d6ba9699709?w=900&q=80"]',NULL,'INS-2024-22410',CURRENT_DATE + 90,'LIC-1102',2000,160,'238883456','active');

-- ---------- Cabins ----------
INSERT INTO cabins (id, vessel_id, name, deck, type, ensuite, position, berth_count, photos, price_modifier_percent) VALUES
('66666666-6666-6666-6666-666666666601','33333333-3333-3333-3333-333333333301','Owner''s suite','port fwd','double',true,'bow',2,'[]',15),
('66666666-6666-6666-6666-666666666602','33333333-3333-3333-3333-333333333301','Aft cabin','starboard aft','double',true,'stern',2,'[]',10),
('66666666-6666-6666-6666-666666666603','33333333-3333-3333-3333-333333333301','Twin cabin','port aft','twin',true,'stern',2,'[]',0),
('66666666-6666-6666-6666-666666666604','33333333-3333-3333-3333-333333333301','Bunk cabin','starboard fwd','bunk',false,'bow',2,'[]',-10),
('66666666-6666-6666-6666-666666666611','33333333-3333-3333-3333-333333333302','Queen hull — port fwd','port hull fwd','double',true,'bow',2,'[]',15),
('66666666-6666-6666-6666-666666666612','33333333-3333-3333-3333-333333333302','Queen hull — starboard fwd','starboard hull fwd','double',true,'bow',2,'[]',15),
('66666666-6666-6666-6666-666666666613','33333333-3333-3333-3333-333333333302','Twin hull — port aft','port hull aft','twin',true,'stern',2,'[]',0),
('66666666-6666-6666-6666-666666666614','33333333-3333-3333-3333-333333333302','Twin hull — starboard aft','starboard hull aft','twin',true,'stern',2,'[]',0),
('66666666-6666-6666-6666-666666666621','33333333-3333-3333-3333-333333333303','Forward double','fwd','double',true,'bow',2,'[]',10),
('66666666-6666-6666-6666-666666666622','33333333-3333-3333-3333-333333333303','Aft double','aft','double',true,'stern',2,'[]',0),
('66666666-6666-6666-6666-666666666623','33333333-3333-3333-3333-333333333303','Saloon berths','saloon','bunk',false,'midship',2,'[]',-15),
('66666666-6666-6666-6666-666666666631','33333333-3333-3333-3333-333333333304','Master suite','upper aft','double',true,'stern',2,'[]',25),
('66666666-6666-6666-6666-666666666632','33333333-3333-3333-3333-333333333304','Suite 2','midship','double',true,'midship',2,'[]',10),
('66666666-6666-6666-6666-666666666633','33333333-3333-3333-3333-333333333304','Suite 3','midship','twin',true,'midship',2,'[]',0),
('66666666-6666-6666-6666-666666666634','33333333-3333-3333-3333-333333333304','Suite 4','fwd','triple',true,'bow',3,'[]',-5),
('66666666-6666-6666-6666-666666666641','33333333-3333-3333-3333-333333333305','Queen — port fwd','port hull fwd','double',true,'bow',2,'[]',10),
('66666666-6666-6666-6666-666666666642','33333333-3333-3333-3333-333333333305','Queen — starboard fwd','starboard hull fwd','double',true,'bow',2,'[]',10),
('66666666-6666-6666-6666-666666666643','33333333-3333-3333-3333-333333333305','Twin — port aft','port hull aft','twin',true,'stern',2,'[]',0),
('66666666-6666-6666-6666-666666666644','33333333-3333-3333-3333-333333333305','Twin — starboard aft','starboard hull aft','twin',true,'stern',2,'[]',0),
('66666666-6666-6666-6666-666666666651','33333333-3333-3333-3333-333333333306','Master stateroom','midship','double',true,'midship',2,'[]',20),
('66666666-6666-6666-6666-666666666652','33333333-3333-3333-3333-333333333306','VIP cabin','fwd','double',true,'bow',2,'[]',10),
('66666666-6666-6666-6666-666666666653','33333333-3333-3333-3333-333333333306','Twin cabin','aft','twin',true,'stern',2,'[]',0),
('66666666-6666-6666-6666-666666666661','33333333-3333-3333-3333-333333333307','Owner cabin','aft','double',true,'stern',2,'[]',10),
('66666666-6666-6666-6666-666666666662','33333333-3333-3333-3333-333333333307','Guest double','port fwd','double',true,'bow',2,'[]',0),
('66666666-6666-6666-6666-666666666663','33333333-3333-3333-3333-333333333307','Twin cabin','starboard fwd','twin',true,'bow',2,'[]',-5),
('66666666-6666-6666-6666-666666666664','33333333-3333-3333-3333-333333333307','Bunk cabin','saloon','bunk',false,'midship',2,'[]',-15);

-- ---------- Departures ----------
INSERT INTO departures (id, vessel_id, route_id, operator_id, departure_date, return_date, embarkation_port, disembarkation_port, one_way, booking_mode, skipper_id, base_price_per_berth, whole_boat_price, berths_total, berths_available, minimum_viable_bookings, status, instant_confirmation, trip_vibe, skill_level_required, languages_spoken, minimum_age, pets_allowed, smoking_policy, cancellation_policy_id) VALUES
-- past (for review demo)
('77777777-7777-7777-7777-777777777700','33333333-3333-3333-3333-333333333301','44444444-4444-4444-4444-444444444401','11111111-1111-1111-1111-111111111101',CURRENT_DATE - 12,CURRENT_DATE - 9,'Athens — Alimos','Athens — Alimos',false,'mixed','22222222-2222-2222-2222-222222222208',640,NULL,8,0,4,'departed',false,'["relaxed","couples"]','none','["el","en"]',12,false,'no_smoking','88888888-8888-8888-8888-888888888801'),
('77777777-7777-7777-7777-777777777701','33333333-3333-3333-3333-333333333301','44444444-4444-4444-4444-444444444401','11111111-1111-1111-1111-111111111101',CURRENT_DATE + 7,CURRENT_DATE + 10,'Athens — Alimos','Athens — Alimos',false,'by_cabin','22222222-2222-2222-2222-222222222208',690,NULL,8,5,4,'almost_full',true,'["relaxed","couples","wellness"]','none','["el","en","fr"]',12,false,'no_smoking','88888888-8888-8888-8888-888888888801'),
('77777777-7777-7777-7777-777777777702','33333333-3333-3333-3333-333333333302','44444444-4444-4444-4444-444444444402','11111111-1111-1111-1111-111111111101',CURRENT_DATE + 21,CURRENT_DATE + 28,'Athens — Alimos','Athens — Alimos',true,'by_cabin','22222222-2222-2222-2222-222222222208',890,NULL,8,4,6,'almost_full',true,'["relaxed","family","photography"]','none','["el","en","de"]',7,false,'smoking_deck_only','88888888-8888-8888-8888-888888888802'),
('77777777-7777-7777-7777-777777777703','33333333-3333-3333-3333-333333333301','44444444-4444-4444-4444-444444444402','11111111-1111-1111-1111-111111111101',CURRENT_DATE + 35,CURRENT_DATE + 42,'Athens — Alimos','Athens — Alimos',false,'mixed','22222222-2222-2222-2222-222222222211',760,5900,10,7,4,'open',false,'["family","active"]','basic','["el","en"]',6,false,'no_smoking','88888888-8888-8888-8888-888888888801'),
('77777777-7777-7777-7777-777777777704','33333333-3333-3333-3333-333333333303','44444444-4444-4444-4444-444444444402','11111111-1111-1111-1111-111111111101',CURRENT_DATE + 49,CURRENT_DATE + 56,'Athens — Alimos','Athens — Alimos',false,'by_berth','22222222-2222-2222-2222-222222222208',620,NULL,6,5,3,'open',false,'["party","active","learn-to-sail"]','basic','["el","en"]',18,false,'smoking_deck_only','88888888-8888-8888-8888-888888888801'),
('77777777-7777-7777-7777-777777777705','33333333-3333-3333-3333-333333333302','44444444-4444-4444-4444-444444444401','11111111-1111-1111-1111-111111111101',CURRENT_DATE + 14,CURRENT_DATE + 17,'Athens — Alimos','Athens — Alimos',false,'whole_boat','22222222-2222-2222-2222-222222222208',432,3450,8,8,1,'open',true,'["couples","relaxed"]','none','["el","en"]',0,true,'no_smoking','88888888-8888-8888-8888-888888888802'),
('77777777-7777-7777-7777-777777777706','33333333-3333-3333-3333-333333333303','44444444-4444-4444-4444-444444444405','11111111-1111-1111-1111-111111111101',CURRENT_DATE + 42,CURRENT_DATE + 49,'Skiathos','Skiathos',false,'by_berth','22222222-2222-2222-2222-222222222208',710,NULL,6,6,3,'open',false,'["active","photography","diving"]','basic','["el","en","it"]',16,false,'smoking_deck_only','88888888-8888-8888-8888-888888888801'),
('77777777-7777-7777-7777-777777777707','33333333-3333-3333-3333-333333333304','44444444-4444-4444-4444-444444444404','11111111-1111-1111-1111-111111111102',CURRENT_DATE + 28,CURRENT_DATE + 35,'Kos Marina','Kos Marina',false,'by_cabin','22222222-2222-2222-2222-222222222211',1180,NULL,12,9,6,'open',true,'["relaxed","wellness","couples"]','none','["el","en","tr"]',14,false,'no_smoking','88888888-8888-8888-8888-888888888803'),
('77777777-7777-7777-7777-777777777708','33333333-3333-3333-3333-333333333304','44444444-4444-4444-4444-444444444402','11111111-1111-1111-1111-111111111102',CURRENT_DATE + 56,CURRENT_DATE + 63,'Paroikia, Paros','Paroikia, Paros',false,'by_cabin','22222222-2222-2222-2222-222222222211',1150,NULL,12,12,6,'open',false,'["party","photography"]','none','["el","en","nl"]',18,false,'smoking_deck_only','88888888-8888-8888-8888-888888888803'),
('77777777-7777-7777-7777-777777777709','33333333-3333-3333-3333-333333333305','44444444-4444-4444-4444-444444444403','11111111-1111-1111-1111-111111111103',CURRENT_DATE + 18,CURRENT_DATE + 25,'Lefkada Marina','Lefkada Marina',false,'by_cabin','22222222-2222-2222-2222-222222222208',840,NULL,8,6,4,'open',true,'["family","relaxed"]','none','["el","en","de"]',5,true,'no_smoking','88888888-8888-8888-8888-888888888801'),
('77777777-7777-7777-7777-777777777710','33333333-3333-3333-3333-333333333305','44444444-4444-4444-4444-444444444403','11111111-1111-1111-1111-111111111103',CURRENT_DATE + 32,CURRENT_DATE + 39,'Lefkada Marina','Lefkada Marina',false,'mixed','22222222-2222-2222-2222-222222222208',880,6100,8,8,4,'open',false,'["couples","wellness"]','none','["el","en"]',16,true,'no_smoking','88888888-8888-8888-8888-888888888801'),
('77777777-7777-7777-7777-777777777711','33333333-3333-3333-3333-333333333306','44444444-4444-4444-4444-444444444404','11111111-1111-1111-1111-111111111104',CURRENT_DATE + 45,CURRENT_DATE + 52,'Mandraki, Rhodes','Kos Marina',true,'whole_boat','22222222-2222-2222-2222-222222222211',1984,11900,6,6,1,'open',false,'["couples","active"]','none','["el","en","ru"]',0,false,'no_smoking','88888888-8888-8888-8888-888888888802'),
('77777777-7777-7777-7777-777777777712','33333333-3333-3333-3333-333333333307','44444444-4444-4444-4444-444444444404','11111111-1111-1111-1111-111111111104',CURRENT_DATE + 24,CURRENT_DATE + 31,'Kos Marina','Kos Marina',false,'by_berth','22222222-2222-2222-2222-222222222208',790,NULL,8,5,4,'open',false,'["active","learn-to-sail","diving"]','basic','["el","en"]',21,true,'smoking_deck_only','88888888-8888-8888-8888-888888888801'),
('77777777-7777-7777-7777-777777777713','33333333-3333-3333-3333-333333333307','44444444-4444-4444-4444-444444444406','11111111-1111-1111-1111-111111111104',CURRENT_DATE + 70,CURRENT_DATE + 76,'Heraklion','Heraklion',false,'mixed','22222222-2222-2222-2222-222222222211',940,7200,8,8,4,'open',false,'["active","photography"]','confident','["el","en"]',16,false,'smoking_deck_only','88888888-8888-8888-8888-888888888802'),
('77777777-7777-7777-7777-777777777714','33333333-3333-3333-3333-333333333301','44444444-4444-4444-4444-444444444405','11111111-1111-1111-1111-111111111101',CURRENT_DATE + 63,CURRENT_DATE + 70,'Skiathos','Skiathos',false,'by_cabin','22222222-2222-2222-2222-222222222208',830,NULL,8,7,4,'open',true,'["family","active","wellness"]','none','["el","en","fr"]',8,true,'no_smoking','88888888-8888-8888-8888-888888888801'),
('77777777-7777-7777-7777-777777777715','33333333-3333-3333-3333-333333333303','44444444-4444-4444-4444-444444444404','11111111-1111-1111-1111-111111111101',CURRENT_DATE + 55,CURRENT_DATE + 62,'Kos Marina','Kos Marina',false,'by_berth','22222222-2222-2222-2222-222222222211',600,NULL,6,6,3,'open',false,'["learn-to-sail","active"]','none','["el","en","pl"]',15,false,'smoking_deck_only','88888888-8888-8888-8888-888888888801'),
-- full (waitlist demo)
('77777777-7777-7777-7777-777777777716','33333333-3333-3333-3333-333333333304','44444444-4444-4444-4444-444444444403','11111111-1111-1111-1111-111111111102',CURRENT_DATE + 26,CURRENT_DATE + 33,'Lefkada Marina','Lefkada Marina',false,'by_cabin','22222222-2222-2222-2222-222222222208',1120,NULL,12,0,6,'full',false,'["relaxed","couples"]','none','["el","en"]',14,false,'no_smoking','88888888-8888-8888-8888-888888888803'),
-- guaranteed demo
('77777777-7777-7777-7777-777777777717','33333333-3333-3333-3333-333333333302','44444444-4444-4444-4444-444444444401','11111111-1111-1111-1111-111111111101',CURRENT_DATE + 11,CURRENT_DATE + 14,'Athens — Alimos','Athens — Alimos',false,'mixed','22222222-2222-2222-2222-222222222208',720,3680,8,2,6,'guaranteed',true,'["family","active"]','none','["el","en"]',6,true,'no_smoking','88888888-8888-8888-8888-888888888801'),
-- draft (invisible to public, visible to owner operator — RLS demo)
('77777777-7777-7777-7777-777777777718','33333333-3333-3333-3333-333333333301','44444444-4444-4444-4444-444444444406','11111111-1111-1111-1111-111111111101',CURRENT_DATE + 84,CURRENT_DATE + 90,'Heraklion','Heraklion',false,'mixed','22222222-2222-2222-2222-222222222208',890,6800,10,10,4,'draft',false,'["photography","active"]','confident','["el","en"]',16,false,'smoking_deck_only','88888888-8888-8888-8888-888888888802'),
-- almost-full departure with 1 berth to guarantee (book 1 → flips guaranteed)
('77777777-7777-7777-7777-777777777719','33333333-3333-3333-3333-333333333307','44444444-4444-4444-4444-444444444404','11111111-1111-1111-1111-111111111104',CURRENT_DATE + 38,CURRENT_DATE + 45,'Kos Marina','Kos Marina',false,'by_berth','22222222-2222-2222-2222-222222222208',690,NULL,8,1,4,'open',false,'["relaxed","learn-to-sail"]','none','["el","en","it"]',15,false,'smoking_deck_only','88888888-8888-8888-8888-888888888801');

-- ---------- Extras ----------
INSERT INTO extras (id, operator_id, vessel_id, name, description, price, price_unit, mandatory, category) VALUES
('99999999-9999-9999-9999-999999999901','11111111-1111-1111-1111-111111111101',NULL,'Airport transfer','Private minivan Athens airport ↔ Alimos Marina.',65,'per_booking',false,'transfer'),
('99999999-9999-9999-9999-999999999902','11111111-1111-1111-1111-111111111101',NULL,'Provisioning starter pack','Breakfast items, fruit, snacks and soft drinks for the week.',210,'per_booking',false,'food'),
('99999999-9999-9999-9999-999999999903','11111111-1111-1111-1111-111111111101',NULL,'Stand-up paddleboard','2 SUPs with leashes, delivered to the boat.',80,'per_booking',false,'equipment'),
('99999999-9999-9999-9999-999999999904','11111111-1111-1111-1111-111111111101',NULL,'Greek tourist tax (ΤΕΠΑΗ + residence fee)','Mandatory per-person cruising and island stay tax.',14,'per_person',true,'tourist_tax'),
('99999999-9999-9999-9999-999999999905','11111111-1111-1111-1111-111111111102',NULL,'Private chef','Chef + provisioning for dinners, 5 evenings.',540,'per_booking',false,'food'),
('99999999-9999-9999-9999-999999999906','11111111-1111-1111-1111-111111111102',NULL,'Hostess service','Cleaning, service and drinks included.',380,'per_booking',false,'cleaning'),
('99999999-9999-9999-9999-999999999907','11111111-1111-1111-1111-111111111103',NULL,'One-way fee (Corfu airport)','Drop-off at Corfu airport instead of marina.',45,'per_booking',false,'transfer'),
('99999999-9999-9999-9999-999999999908','11111111-1111-1111-1111-111111111104',NULL,'Jet ski session','1 hour, instructor included.',150,'per_person',false,'equipment'),
('99999999-9999-9999-9999-999999999909','11111111-1111-1111-1111-111111111104',NULL,'Damage waiver','Zero-deposit sailing; waives the security deposit.',35,'per_person',false,'insurance');

-- ---------- Pricing rules ----------
INSERT INTO pricing_rules (id, operator_id, departure_id, vessel_id, rule_type, conditions, adjustment_type, adjustment_value, valid_from, valid_to, priority) VALUES
('9999aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1','11111111-1111-1111-1111-111111111101',NULL,NULL,'early_bird','{"days_before": 60}','percent',10,NULL,NULL,90),
('9999aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2','11111111-1111-1111-1111-111111111101',NULL,NULL,'last_minute','{"days_before": 14}','percent',15,NULL,NULL,80),
('9999aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3','11111111-1111-1111-1111-111111111102',NULL,NULL,'group_discount','{"min_berths": 4}','percent',8,NULL,NULL,70),
('9999aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4','11111111-1111-1111-1111-111111111103',NULL,NULL,'seasonal_uplift','{"months": [7,8]}','percent',12,NULL,NULL,60),
('9999aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5','11111111-1111-1111-1111-111111111101',NULL,NULL,'single_supplement','{"booking_type": "berth","share_cabin": false}','percent',25,NULL,NULL,50);

-- ---------- Bookings (demo traveller content) ----------
INSERT INTO berth_bookings (id, departure_id, traveller_id, cabin_id, berth_count, booking_type, share_cabin, cabin_share_preference, share_profile, total_price, deposit_paid, balance_due_date, status, extras, special_requests, created_at) VALUES
-- Elena: confirmed berth on the Meltemi Cyclades departure (drives Trip Hub)
('aaaa1111-1111-1111-1111-111111111111','77777777-7777-7777-7777-777777777702','22222222-2222-2222-2222-222222222201','66666666-6666-6666-6666-666666666613',1,'berth',true,'same_gender','{"gender":"female","age_band":"25-34","languages":["el","en"],"sleep_habits":"early_riser","smoking":"no","vibes":["photography","family"]}',890,267,CURRENT_DATE + 7,'confirmed','["99999999-9999-9999-9999-999999999904"]','Vegetarian; would love to take the helm for a bit.',now() - interval '5 days'),
-- Maria: 2 berths same departure (cabin-share candidate, chat, anonymised profile)
('aaaa1111-1111-1111-1111-111111111112','77777777-7777-7777-7777-777777777702','22222222-2222-2222-2222-222222222202','66666666-6666-6666-6666-666666666614',2,'cabin',false,NULL,'{"gender":"female","age_band":"35-44","languages":["el","en","fr"],"sleep_habits":"night_owl","smoking":"no","vibes":["relaxed","photography"]}',1780,534,CURRENT_DATE + 7,'confirmed','[]',NULL,now() - interval '4 days'),
-- Tomàs: solo berth, night owl (anonymised cabin-match candidate)
('aaaa1111-1111-1111-1111-111111111113','77777777-7777-7777-7777-777777777702','22222222-2222-2222-2222-222222222204','66666666-6666-6666-6666-666666666613',1,'berth',true,'any','{"gender":"male","age_band":"25-34","languages":["en","pt"],"sleep_habits":"night_owl","smoking":"no","vibes":["party","photography"]}',934,280,CURRENT_DATE + 7,'confirmed','[]',NULL,now() - interval '3 days'),
-- Jon: on_request whole boat elsewhere
('aaaa1111-1111-1111-1111-111111111114','77777777-7777-7777-7777-777777777705','22222222-2222-2222-2222-222222222203',NULL,8,'whole_boat',false,NULL,NULL,3450,1035,CURRENT_DATE + 3,'on_request','[]','Anniversary trip — is a cake possible?',now() - interval '1 day'),
-- Elena: past completed booking (review rights demo)
('aaaa1111-1111-1111-1111-111111111115','77777777-7777-7777-7777-777777777700','22222222-2222-2222-2222-222222222201','66666666-6666-6666-6666-666666666601',2,'cabin',false,NULL,NULL,1408,1408,NULL,'completed','[]',NULL,now() - interval '30 days');

INSERT INTO payments (id, booking_id, amount, currency, type, provider, provider_reference, idempotency_key, status, payout_status) VALUES
('aaaa2222-2222-2222-2222-222222222221','aaaa1111-1111-1111-1111-111111111111',267,'EUR','deposit','mock','pi_demo_001','idem-001','succeeded','pending'),
('aaaa2222-2222-2222-2222-222222222222','aaaa1111-1111-1111-1111-111111111112',534,'EUR','deposit','mock','pi_demo_002','idem-002','succeeded','pending'),
('aaaa2222-2222-2222-2222-222222222223','aaaa1111-1111-1111-1111-111111111113',280,'EUR','deposit','mock','pi_demo_003','idem-003','succeeded','pending'),
('aaaa2222-2222-2222-2222-222222222224','aaaa1111-1111-1111-1111-111111111115',1408,'EUR','deposit','mock','pi_demo_004','idem-004','succeeded','paid');

INSERT INTO guests (id, booking_id, full_name, date_of_birth, nationality, document_type, document_number_enc, document_expiry, dietary_requirements, emergency_contact, sailing_experience, tshirt_size) VALUES
('aaaa3333-3333-3333-3333-333333333331','aaaa1111-1111-1111-1111-111111111111','Elena Papadopoulou','1993-07-12','GR','passport','ENC:demo-placeholder-encrypted',NULL,'Vegetarian','Maria Kanellos +30 694 xxx','some','S'),
('aaaa3333-3333-3333-3333-333333333332','aaaa1111-1111-1111-1111-111111111115','Elena Papadopoulou','1993-07-12','GR',NULL,NULL,NULL,NULL,NULL,'some',NULL);

INSERT INTO trip_documents (id, booking_id, doc_type, file_name, size_bytes) VALUES
('aaaa4444-4444-4444-4444-444444444441','aaaa1111-1111-1111-1111-111111111111','passport','passport-elena-pap.pdf',184320);

-- Review from the completed trip
INSERT INTO reviews (id, booking_id, traveller_id, vessel_id, skipper_id, rating_overall, rating_vessel, rating_skipper, rating_cleanliness, rating_value, rating_itinerary, written_review, operator_response, verified, published) VALUES
('aaaa5555-5555-5555-5555-555555555551','aaaa1111-1111-1111-1111-111111111115','22222222-2222-2222-2222-222222222201','33333333-3333-3333-3333-333333333301','22222222-2222-2222-2222-222222222208',5,5,5,4,4,5,'Three perfect nights — Yiannis found us empty coves even in August. The Saronic is ideal if it''s your first time sleeping on a boat. Booking one berth as a solo was painless.','Efcharistó, Elena! You are welcome back any time.',true,true);

-- Trip hub content for the Cyclades departure (packing, provisioning, chat)
INSERT INTO trip_items (id, departure_id, category, name, added_by, claimed_by, checked) VALUES
('aaaa6666-6666-6666-6666-666666666661','77777777-7777-7777-7777-777777777702','packing','Reef-safe sunscreen',NULL,NULL,false),
('aaaa6666-6666-6666-6666-666666666662','77777777-7777-7777-7777-777777777702','packing','Deck shoes (white soles)',NULL,NULL,true),
('aaaa6666-6666-6666-6666-666666666663','77777777-7777-7777-7777-777777777702','packing','Seasickness tablets',NULL,NULL,false),
('aaaa6666-6666-6666-6666-666666666664','77777777-7777-7777-7777-777777777702','packing','Windproof jacket',NULL,NULL,false),
('aaaa6666-6666-6666-6666-666666666671','77777777-7777-7777-7777-777777777702','provisioning','Bottled water 30L','22222222-2222-2222-2222-222222222202','22222222-2222-2222-2222-222222222202',false),
('aaaa6666-6666-6666-6666-666666666672','77777777-7777-7777-7777-777777777702','provisioning','Feta & olives for the week','22222222-2222-2222-2222-222222222201','22222222-2222-2222-2222-222222222201',false),
('aaaa6666-6666-6666-6666-666666666673','77777777-7777-7777-7777-777777777702','provisioning','Coffee (Greek blend)','22222222-2222-2222-2222-222222222201',NULL,false),
('aaaa6666-6666-6666-6666-666666666674','77777777-7777-7777-7777-777777777702','provisioning','Fresh fruit from Naxos market','22222222-2222-2222-2222-222222222204','22222222-2222-2222-2222-222222222204',false),
('aaaa6666-6666-6666-6666-666666666675','77777777-7777-7777-7777-777777777702','provisioning','Ouzo (small bottle, for medicinal purposes)','22222222-2222-2222-2222-222222222202',NULL,false);

INSERT INTO trip_messages (id, departure_id, sender_id, body, created_at) VALUES
('aaaa7777-7777-7777-7777-777777777771','77777777-7777-7777-7777-777777777702','22222222-2222-2222-2222-222222222208','Kalispera all! Forecast looks perfect for our crossing — 18 knots from the NW, we''ll be in Kea by lunch. Yiannis, your skipper.',now() - interval '2 days'),
('aaaa7777-7777-7777-7777-777777777772','77777777-7777-7777-7777-777777777702','22222222-2222-2222-2222-222222222202','Great! I''m bringing my drone for Mykonos — anyone want aerial shots?',now() - interval '2 days' + interval '3 hours'),
('aaaa7777-7777-7777-7777-777777777773','77777777-7777-7777-7777-777777777702','22222222-2222-2222-2222-222222222201','Yes please! Also I put the water on the provisioning list — can someone claim the ouzo?',now() - interval '1 day');

-- Cabin match request (Elena → Tomàs, pending acceptance)
INSERT INTO cabin_match_requests (id, requester_booking_id, target_booking_id, status) VALUES
('aaaa8888-8888-8888-8888-888888888881','aaaa1111-1111-1111-1111-111111111111','aaaa1111-1111-1111-1111-111111111113','requested');

-- Waitlist: Elena on the full Ionian gulet departure
INSERT INTO waitlist_entries (id, departure_id, user_id, berths_wanted) VALUES
('aaaa9999-9999-9999-9999-999999999991','77777777-7777-7777-7777-777777777716','22222222-2222-2222-2222-222222222201',2);

-- Crowdsourced departures
INSERT INTO proposed_departures (id, proposer_id, route_id, proposed_start, proposed_end, vessel_class, berths_needed, berths_committed, berths_target, status, expires_at, notes) VALUES
('bbbb1111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222203','44444444-4444-4444-4444-444444444405',CURRENT_DATE + 40,CURRENT_DATE + 47,'monohull',1,3,5,'open',now() + interval '10 days','Me + my brother, we sail every year but never find Sporades dates in September. Who''s in?'),
('bbbb1111-1111-1111-1111-111111111112','22222222-2222-2222-2222-222222222204','44444444-4444-4444-4444-444444444406',CURRENT_DATE + 55,CURRENT_DATE + 61,'catamaran',2,4,6,'bidding',now() + interval '7 days','Crete crossing, experienced sailors preferred.');

INSERT INTO proposal_joins (id, proposal_id, user_id, berths) VALUES
('bbbb2222-2222-2222-2222-222222222221','bbbb1111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222201',1),
('bbbb2222-2222-2222-2222-222222222222','bbbb1111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222202',1),
('bbbb2222-2222-2222-2222-222222222223','bbbb1111-1111-1111-1111-111111111112','22222222-2222-2222-2222-222222222202',1),
('bbbb2222-2222-2222-2222-222222222224','bbbb1111-1111-1111-1111-111111111112','22222222-2222-2222-2222-222222222203',1);

INSERT INTO operator_bids (id, proposal_id, operator_id, vessel_id, price_per_berth, message) VALUES
('bbbb3333-3333-3333-3333-333333333331','bbbb1111-1111-1111-1111-111111111112','11111111-1111-1111-1111-111111111101','33333333-3333-3333-3333-333333333301',780,'Thalassa is available that week — confident crew welcome, we love this crossing.'),
('bbbb3333-3333-3333-3333-333333333332','bbbb1111-1111-1111-1111-111111111112','11111111-1111-1111-1111-111111111104','33333333-3333-3333-3333-333333333307',720,'Kalypso, Kos-based, can run it with a second skipper for safety.');

-- Payouts, flags, audit
INSERT INTO payouts (id, operator_id, period, gross, commission, net, status) VALUES
('cccc1111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111101', to_char(CURRENT_DATE - interval '1 month','YYYY-MM'),18420.00,2210.40,16209.60,'pending'),
('cccc1111-1111-1111-1111-111111111112','11111111-1111-1111-1111-111111111102', to_char(CURRENT_DATE - interval '1 month','YYYY-MM'),9760.00,1171.20,8588.80,'paid');

INSERT INTO feature_flags (key, operator_id, enabled, description) VALUES
('instant_confirmation_ranking_boost',NULL,true,'Instant-confirm departures rank higher in search'),
('flexible_boarding',NULL,true,'Partial-segment bookings at ferry/airport stops'),
('cabin_share_matching',NULL,true,'Solo cabin-share matching flow'),
('crowdsourced_departures',NULL,true,'Start a Sailing proposals');

INSERT INTO audit_log (actor_id, actor_role, action, entity, entity_id, after) VALUES
('22222222-2222-2222-2222-222222222209','admin','kyc.verify','operator','11111111-1111-1111-1111-111111111101','{"kyc_status":"verified"}'),
('22222222-2222-2222-2222-222222222205','operator','departure.create','departure','77777777-7777-7777-7777-777777777702','{"status":"open"}'),
('22222222-2222-2222-2222-222222222201','traveller','booking.create','booking','aaaa1111-1111-1111-1111-111111111111','{"status":"confirmed","berth_count":1}');
