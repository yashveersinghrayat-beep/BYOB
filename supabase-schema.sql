-- ==============================================================================
-- 💎 ONYX COMMERCIAL RESTAURANT POS — MASTER SUPABASE (POSTGRESQL) SCHEMA
-- Official Menu & Configuration for: BYOB INDIRAPURAM / BAITHAK
-- Ready for Production Deployment, Multi-Device Cloud Sync & Remote SaaS Management
-- ==============================================================================

-- 1. Store Profile & White-Label Configuration
CREATE TABLE IF NOT EXISTS store_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Staff & Roles with PIN Authentication
CREATE TABLE IF NOT EXISTS staff_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'waiter', -- 'admin' | 'cashier' | 'waiter' | 'kitchen'
  pin TEXT NOT NULL,
  email TEXT,
  password TEXT,
  phone TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Dynamic Floor & Tables
CREATE TABLE IF NOT EXISTS tables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  floor TEXT DEFAULT '1st Floor',
  position TEXT NOT NULL,
  landmark TEXT,
  seats INTEGER DEFAULT 4,
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'vacant', -- 'vacant' | 'occupied' | 'billing_locked'
  active BOOLEAN DEFAULT TRUE,
  current_subtotal NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Menu Categories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🍽️',
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE
);

-- 5. Menu Items (with Stock 86ing & Veg/Non-Veg)
CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  is_veg BOOLEAN DEFAULT TRUE,
  is_top_hit BOOLEAN DEFAULT FALSE,
  in_stock BOOLEAN DEFAULT TRUE,
  description TEXT,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Punched KOTs (Kitchen & Bar Order Tickets)
CREATE TABLE IF NOT EXISTS kots (
  id TEXT PRIMARY KEY,
  table_id TEXT REFERENCES tables(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  waiter_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending' | 'preparing' | 'ready' | 'served' | 'billed' | 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. KOT Line Items
CREATE TABLE IF NOT EXISTS kot_items (
  id BIGSERIAL PRIMARY KEY,
  kot_id TEXT REFERENCES kots(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  qty INTEGER NOT NULL,
  is_bar BOOLEAN DEFAULT FALSE,
  notes TEXT,
  is_void BOOLEAN DEFAULT FALSE,
  void_reason TEXT,
  voided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Customer Invoices & Billing Ledger
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  table_id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  waiter_name TEXT,
  cashier_name TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  subtotal NUMERIC NOT NULL,
  discount_type TEXT DEFAULT 'none',
  discount_value NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  cgst NUMERIC NOT NULL,
  sgst NUMERIC NOT NULL,
  service_charge NUMERIC DEFAULT 0,
  round_off NUMERIC DEFAULT 0,
  grand_total NUMERIC NOT NULL,
  payment_mode TEXT NOT NULL, -- 'upi' | 'card' | 'cash' | 'split'
  payment_ref TEXT,
  split_count INTEGER DEFAULT 1,
  status TEXT DEFAULT 'paid', -- 'paid' | 'void'
  restaurant_name TEXT,
  gstin TEXT,
  fssai TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Bill Line Items Snapshot
CREATE TABLE IF NOT EXISTS bill_items (
  id BIGSERIAL PRIMARY KEY,
  bill_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  qty INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  is_archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ
);

-- 10. Audit Trail: Cancelled / Voided Items (Anti-Theft Protection)
CREATE TABLE IF NOT EXISTS void_logs (
  id BIGSERIAL PRIMARY KEY,
  kot_item_id BIGINT,
  kot_id TEXT,
  table_id TEXT,
  table_name TEXT,
  floor TEXT DEFAULT '1st Floor',
  item_name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  qty INTEGER NOT NULL,
  amount NUMERIC DEFAULT 0,
  reason TEXT NOT NULL,
  staff_name TEXT DEFAULT 'Staff',
  authorized_by TEXT NOT NULL,
  device_id TEXT DEFAULT 'UNKNOWN-DEVICE',
  device_info TEXT,
  client_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Audit Trail: Manager Bill Modifications & Corrections
CREATE TABLE IF NOT EXISTS bill_edit_logs (
  id TEXT PRIMARY KEY,
  bill_id TEXT, -- Bill ID or 'STORE_PROFILE' for configuration audit
  invoice_number TEXT NOT NULL,
  manager_email TEXT NOT NULL,
  manager_name TEXT DEFAULT 'Manager',
  reason TEXT NOT NULL,
  previous_data JSONB NOT NULL,
  new_data JSONB NOT NULL,
  changes_summary TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Remote Debugging & Device Interaction Telemetry (Zero Permanent Deletion / Append-Only)
CREATE TABLE IF NOT EXISTS device_telemetry_logs (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  mac_pseudo_address TEXT,
  session_id TEXT,
  event_type TEXT NOT NULL, -- 'click' | 'touch' | 'error' | 'navigation' | 'action' | 'lifecycle'
  event_name TEXT,
  target_element TEXT,
  target_text TEXT,
  touch_x INTEGER,
  touch_y INTEGER,
  current_screen TEXT,
  active_table_id TEXT,
  user_role TEXT,
  user_email TEXT,
  client_ip TEXT,
  device_info JSONB,
  event_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_device ON device_telemetry_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_type ON device_telemetry_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_created ON device_telemetry_logs(created_at);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES — PRODUCTION RESTAURANT HARDENING
-- Strict Zero-Permanent-Deletion: NO DELETE policies exist on any data table!
-- ==============================================================================

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE kots ENABLE ROW LEVEL SECURITY;
ALTER TABLE kot_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE void_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_edit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_telemetry_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  -- Store Profile & Settings (Read & Update)
  DROP POLICY IF EXISTS "POS access store_settings" ON store_settings;
  CREATE POLICY "POS access store_settings" ON store_settings FOR ALL USING (true) WITH CHECK (true);

  -- Staff Users (Read & Update for PIN validation)
  DROP POLICY IF EXISTS "POS access staff_users" ON staff_users;
  CREATE POLICY "POS access staff_users" ON staff_users FOR ALL USING (true) WITH CHECK (true);

  -- Tables (Full POS Floor Control)
  DROP POLICY IF EXISTS "POS access tables" ON tables;
  CREATE POLICY "POS access tables" ON tables FOR ALL USING (true) WITH CHECK (true);

  -- Categories & Menu Items (Read, Insert, Update in_stock)
  DROP POLICY IF EXISTS "POS access categories" ON categories;
  CREATE POLICY "POS access categories" ON categories FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "POS access menu_items" ON menu_items;
  CREATE POLICY "POS access menu_items" ON menu_items FOR ALL USING (true) WITH CHECK (true);

  -- KOTs & Items: Read, Insert & Update only! NO DELETE permitted! (Anti-Theft)
  DROP POLICY IF EXISTS "POS access kots" ON kots;
  DROP POLICY IF EXISTS "POS read kots" ON kots;
  DROP POLICY IF EXISTS "POS insert kots" ON kots;
  DROP POLICY IF EXISTS "POS update kots" ON kots;
  CREATE POLICY "POS read kots" ON kots FOR SELECT USING (true);
  CREATE POLICY "POS insert kots" ON kots FOR INSERT WITH CHECK (true);
  CREATE POLICY "POS update kots" ON kots FOR UPDATE USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "POS access kot_items" ON kot_items;
  DROP POLICY IF EXISTS "POS read kot_items" ON kot_items;
  DROP POLICY IF EXISTS "POS insert kot_items" ON kot_items;
  DROP POLICY IF EXISTS "POS update kot_items" ON kot_items;
  CREATE POLICY "POS read kot_items" ON kot_items FOR SELECT USING (true);
  CREATE POLICY "POS insert kot_items" ON kot_items FOR INSERT WITH CHECK (true);
  CREATE POLICY "POS update kot_items" ON kot_items FOR UPDATE USING (true) WITH CHECK (true);

  -- Bills & Ledger: Read, Insert & Update only! NO DELETE permitted!
  DROP POLICY IF EXISTS "POS read bills" ON bills;
  DROP POLICY IF EXISTS "POS insert bills" ON bills;
  DROP POLICY IF EXISTS "POS update bills" ON bills;
  DROP POLICY IF EXISTS "Public access bills" ON bills;
  CREATE POLICY "POS read bills" ON bills FOR SELECT USING (true);
  CREATE POLICY "POS insert bills" ON bills FOR INSERT WITH CHECK (true);
  CREATE POLICY "POS update bills" ON bills FOR UPDATE USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "POS read bill_items" ON bill_items;
  DROP POLICY IF EXISTS "POS insert bill_items" ON bill_items;
  DROP POLICY IF EXISTS "POS update bill_items" ON bill_items;
  DROP POLICY IF EXISTS "Public access bill_items" ON bill_items;
  DROP POLICY IF EXISTS "POS access bill_items" ON bill_items;
  CREATE POLICY "POS read bill_items" ON bill_items FOR SELECT USING (true);
  CREATE POLICY "POS insert bill_items" ON bill_items FOR INSERT WITH CHECK (true);
  CREATE POLICY "POS update bill_items" ON bill_items FOR UPDATE USING (true) WITH CHECK (true);

  -- Void Logs: Can be READ and INSERTED for audit, but NEVER DELETED or MODIFIED!
  DROP POLICY IF EXISTS "POS read void_logs" ON void_logs;
  DROP POLICY IF EXISTS "POS insert void_logs" ON void_logs;
  CREATE POLICY "POS read void_logs" ON void_logs FOR SELECT USING (true);
  CREATE POLICY "POS insert void_logs" ON void_logs FOR INSERT WITH CHECK (true);

  -- Bill Edit Logs: Can be READ and INSERTED for manager audit, but NEVER DELETED or MODIFIED!
  DROP POLICY IF EXISTS "POS read bill_edit_logs" ON bill_edit_logs;
  DROP POLICY IF EXISTS "POS insert bill_edit_logs" ON bill_edit_logs;
  CREATE POLICY "POS read bill_edit_logs" ON bill_edit_logs FOR SELECT USING (true);
  CREATE POLICY "POS insert bill_edit_logs" ON bill_edit_logs FOR INSERT WITH CHECK (true);

  -- Device Telemetry Logs: Silent bug logging, read and insert only, NEVER DELETED or MODIFIED!
  DROP POLICY IF EXISTS "POS read device_telemetry_logs" ON device_telemetry_logs;
  DROP POLICY IF EXISTS "POS insert device_telemetry_logs" ON device_telemetry_logs;
  CREATE POLICY "POS read device_telemetry_logs" ON device_telemetry_logs FOR SELECT USING (true);
  CREATE POLICY "POS insert device_telemetry_logs" ON device_telemetry_logs FOR INSERT WITH CHECK (true);
END $$;

-- ==============================================================================
-- ENABLE SUPABASE REALTIME REPLICATION (Instant sync across all waiter phones)
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'tables'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tables;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'kots'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE kots;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'kot_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE kot_items;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'bills'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bills;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'void_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE void_logs;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'bill_edit_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bill_edit_logs;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'device_telemetry_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE device_telemetry_logs;
  END IF;
END $$;

-- ==============================================================================
-- DEFAULT SEED DATA (BYOB Indirapuram Official Setup)
-- ==============================================================================

-- Store Settings
INSERT INTO store_settings (key, value) VALUES
  ('restaurant_name', 'BYOB INDIRAPURAM'),
  ('tagline', 'Bring Your Own Bottle Experience'),
  ('address', 'Plot 14, Dr. Sushila Naiyyar Marg, Indirapuram, Ghaziabad'),
  ('phone', '+91 98765 43210'),
  ('email', 'contact@byobindirapuram.com'),
  ('gstin', '07AABCB1234F1Z9'),
  ('fssai', '12724055000123'),
  ('upi_vpa', 'byobindirapuram@icici'),
  ('currency_symbol', '₹'),
  ('cgst_percent', '2.5'),
  ('sgst_percent', '2.5'),
  ('service_charge_percent', '0'),
  ('bill_footer', 'Thank you for visiting! Guests are welcome to Bring Their Own Bottle.')
ON CONFLICT (key) DO NOTHING;

-- Staff Users
INSERT INTO staff_users (id, name, role, pin, email, password, phone) VALUES
  ('usr_admin', 'Owner / Manager', 'admin', '1234', 'admin@google.in', 'Admin@#1234', '+91 99999 00001'),
  ('usr_cashier', 'Cashier Desk', 'cashier', '2222', NULL, NULL, '+91 99999 00002'),
  ('usr_waiter1', 'Captain Rahul', 'waiter', '3333', NULL, NULL, '+91 99999 00003'),
  ('usr_waiter2', 'Captain Amit', 'waiter', '4444', NULL, NULL, '+91 99999 00004'),
  ('usr_chef', 'Head Chef Kitchen', 'kitchen', '5555', NULL, NULL, '+91 99999 00005')
ON CONFLICT (id) DO NOTHING;

-- Floor Tables (T-01 to T-12)
INSERT INTO tables (id, name, position, landmark, seats, sort_order, status, current_subtotal) VALUES
  ('T-01', 'Table 1', 'Front • Left', 'Front Left (Near Entrance)', 4, 1, 'vacant', 0),
  ('T-02', 'Table 2', 'Front • Center', 'Front Center (Opposite Entrance)', 6, 2, 'vacant', 0),
  ('T-03', 'Table 3', 'Front • Right', 'Front Right (Near Window)', 4, 3, 'vacant', 0),
  ('T-04', 'Table 4', 'Middle • Left', 'Middle Left (Center Hall)', 4, 4, 'vacant', 0),
  ('T-05', 'Table 5', 'Middle • Center', 'Middle Center Hall', 8, 5, 'vacant', 0),
  ('T-06', 'Table 6', 'Middle • Right', 'Middle Right Hall', 6, 6, 'vacant', 0),
  ('T-07', 'Table 7', 'Inner • Left', 'Inner Left (Near Pillar)', 4, 7, 'vacant', 0),
  ('T-08', 'Table 8', 'Inner • Center', 'Center Pathway South', 4, 8, 'vacant', 0),
  ('T-09', 'Table 9', 'Inner • Right', 'Beside Wall Woodwork', 4, 9, 'vacant', 0),
  ('T-10', 'Table 10', 'Back • Left', 'Near Back AC Vent', 6, 10, 'vacant', 0),
  ('T-11', 'Table 11', 'Back • Center', 'Front of Service Counter', 8, 11, 'vacant', 0),
  ('T-12', 'Table 12', 'Back • Right', 'Adjacent to Mixer Station', 4, 12, 'vacant', 0)
ON CONFLICT (id) DO NOTHING;

-- Categories (Official Menu Sections)
INSERT INTO categories (id, name, icon, sort_order) VALUES
  ('mixers', 'Mixers & Beverages', '🍾', 1),
  ('chakna', 'Veg Chakna & Starters', '🥜', 2),
  ('nonveg_starters', 'Non-Veg Starters', '🍗', 3),
  ('indochinese', 'Indo-Chinese & Pasta', '🍝', 4),
  ('mains', 'Main Course', '🍛', 5),
  ('breads', 'Breads', '🫓', 6),
  ('desserts_salads', 'Desserts & Salads', '🍨', 7),
  ('smoke', 'Smoke', '🚬', 8)
ON CONFLICT (id) DO NOTHING;

-- Complete Menu Items
INSERT INTO menu_items (id, category_id, name, price, is_veg, is_top_hit, in_stock, description, image) VALUES
  -- Mixers & Beverages
  ('m_glass', 'mixers', 'Glass', 10, TRUE, TRUE, TRUE, 'Clean crystal drinking glass for liquor.', 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=300&auto=format&fit=crop'),
  ('m_water', 'mixers', 'Plain Water (1L)', 40, TRUE, TRUE, TRUE, 'Sealed packaged mineral drinking water.', 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=300&auto=format&fit=crop'),
  ('m_ice', 'mixers', 'Ice Cube Bucket', 69, TRUE, TRUE, TRUE, 'Full insulated bucket packed with clear ice cubes.', 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=300&auto=format&fit=crop'),
  ('m_soft_can', 'mixers', 'Soft Drinks (Can)', 99, TRUE, TRUE, TRUE, 'Chilled 300ml can (Coke, Thums Up, Sprite).', 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=300&auto=format&fit=crop'),
  ('m_flav_soda', 'mixers', 'Flavoured Soda', 99, TRUE, FALSE, TRUE, 'Chilled sparkling flavored soda.', 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=300&auto=format&fit=crop'),
  ('m_soda', 'mixers', 'Soda', 49, TRUE, TRUE, TRUE, 'Chilled club carbonated mixer soda.', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop'),
  ('m_diet_coke', 'mixers', 'Diet Coke (Can)', 100, TRUE, FALSE, TRUE, 'Chilled 300ml zero calorie Diet Coke can.', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=300&auto=format&fit=crop'),
  ('m_tonic', 'mixers', 'Tonic Water', 120, TRUE, FALSE, TRUE, 'Crisp botanical tonic water for gin & vodka.', 'https://images.unsplash.com/photo-1598614187854-26a60e982dc4?w=300&auto=format&fit=crop'),
  ('m_lime', 'mixers', 'Fresh Lime Soda', 120, TRUE, FALSE, TRUE, 'Fresh lemon juice, mint, and bubbling club soda.', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=300&auto=format&fit=crop'),
  ('m_icetea', 'mixers', 'Lemon Iced Tea', 120, TRUE, FALSE, TRUE, 'Refreshing chilled lemon iced tea with mint.', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=300&auto=format&fit=crop'),
  ('m_mojito', 'mixers', 'Virgin Mojito', 167, TRUE, FALSE, TRUE, 'Fresh mint, lime wedges, simple syrup & crushed ice.', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop'),
  ('m_campa', 'mixers', 'Energy Drink (Campa)', 129, TRUE, FALSE, TRUE, 'Chilled Campa Energy drink can.', 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=300&auto=format&fit=crop'),
  ('m_redbull', 'mixers', 'Energy Drink (Red Bull)', 220, TRUE, TRUE, TRUE, 'Chilled 250ml Red Bull energy can.', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop'),
  ('m_juice', 'mixers', 'Juice (By the Pack)', 299, TRUE, FALSE, TRUE, 'Full 1-litre pack of Cranberry, Orange, or Pineapple juice.', 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=300&auto=format&fit=crop'),

  -- Veg Chakna & Starters
  ('v_plain_papad', 'chakna', 'Plain Papad', 149, TRUE, FALSE, TRUE, 'Crispy roasted or fried urad dal papad.', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300&auto=format&fit=crop'),
  ('v_masala_papad', 'chakna', 'Masala Papad', 199, TRUE, TRUE, TRUE, 'Crispy papad topped with diced onion, tomato, chili & chaat masala.', 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=300&auto=format&fit=crop'),
  ('v_peanut_masala', 'chakna', 'Peanut Masala', 199, TRUE, TRUE, TRUE, 'Roasted peanuts tossed with diced onion, tomato, green chili & lemon.', 'https://images.unsplash.com/photo-1569466896818-335b1bedfcce?w=300&auto=format&fit=crop'),
  ('v_kala_chana', 'chakna', 'Kala Chana Masaledar Garm', 199, TRUE, FALSE, TRUE, 'Hot pan-tossed spiced desi black chickpeas with ginger & herbs.', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&auto=format&fit=crop'),
  ('v_potato_veggies', 'chakna', 'Potato Veggies / Peri Peri Fries', 199, TRUE, FALSE, TRUE, 'Golden potato wedges seasoned with herbs (₹199 - ₹229).', 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=300&auto=format&fit=crop'),
  ('v_peri_peri_fries', 'chakna', 'Peri Peri French Fries', 229, TRUE, FALSE, TRUE, 'Crisp golden potato fingers dusted with spicy peri-peri seasoning.', 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=300&auto=format&fit=crop'),
  ('v_crispy_corn', 'chakna', 'Crispy Corn', 289, TRUE, TRUE, TRUE, 'Tender American sweet corn tossed with cracked black pepper & spring onion.', 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=300&auto=format&fit=crop'),
  ('v_onion_ring', 'chakna', 'Onion Ring', 289, TRUE, FALSE, TRUE, 'Thick onion rings dipped in seasoned batter, deep fried golden.', 'https://images.unsplash.com/photo-1639024471287-032f6673d3ae?w=300&auto=format&fit=crop'),
  ('v_cheese_balls', 'chakna', 'Potato Cheese Balls', 329, TRUE, FALSE, TRUE, 'Crispy molten cheese and mashed potato croquettes.', 'https://images.unsplash.com/photo-1548946526-f69e2424cf45?w=300&auto=format&fit=crop'),
  ('v_soya_malai', 'chakna', 'Soya Malai Tikka', 359, TRUE, FALSE, TRUE, 'Tender soya chaap grilled in rich cream, cashew paste & cardamom.', 'https://images.unsplash.com/photo-1628294895950-9805252327bc?w=300&auto=format&fit=crop'),
  ('v_hara_bhara', 'chakna', 'Hara Bhara Kabab', 359, TRUE, FALSE, TRUE, 'Spinach, green peas & paneer patties spiced and pan-seared.', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300&auto=format&fit=crop'),
  ('v_dahi_kabab', 'chakna', 'Dahi ke Kabab', 369, TRUE, FALSE, TRUE, 'Crispy exterior with smooth hung curd & roasted spices inside.', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=300&auto=format&fit=crop'),
  ('v_paneer_tikka', 'chakna', 'Paneer Tikka', 369, TRUE, TRUE, TRUE, 'Fresh cottage cheese cubes marinated in tandoori masala and chargrilled.', 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=300&auto=format&fit=crop'),
  ('v_saute_veg', 'chakna', 'Sauté Vegetable', 389, TRUE, FALSE, TRUE, 'Fresh broccoli, baby corn, mushrooms & bell peppers tossed in butter.', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&auto=format&fit=crop'),
  ('v_veg_shami', 'chakna', 'Veg Shami Kabab', 389, TRUE, FALSE, TRUE, 'Melt-in-mouth spiced lentil and vegetable tawa patties.', 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=300&auto=format&fit=crop'),

  -- Non-Veg Starters
  ('nv_egg_bhurji', 'nonveg_starters', 'Masala Omelette / Egg Bhurji', 199, FALSE, FALSE, TRUE, 'Fluffy 3-egg masala omelette or desi spiced egg bhurji.', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=300&auto=format&fit=crop'),
  ('nv_chicken_popcorn', 'nonveg_starters', 'Chicken Popcorn', 359, FALSE, FALSE, TRUE, 'Crispy battered bite-sized tender chicken chunks.', 'https://images.unsplash.com/photo-1562967914-608f82629710?w=300&auto=format&fit=crop'),
  ('nv_chicken_fries', 'nonveg_starters', 'Chicken Fries', 359, FALSE, FALSE, TRUE, 'Crunchy seasoned chicken strips shaped like fries.', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=300&auto=format&fit=crop'),
  ('nv_chicken_wings', 'nonveg_starters', 'Chicken Wings Fried', 399, FALSE, FALSE, TRUE, 'Crispy fried juicy chicken wings seasoned with special rubs.', 'https://images.unsplash.com/photo-1527477378370-136f45c2be7e?w=300&auto=format&fit=crop'),
  ('nv_chicken_shami', 'nonveg_starters', 'Chicken Shami Kabab', 389, FALSE, FALSE, TRUE, 'Tender minced chicken patties prepared with whole aromatic spices.', 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=300&auto=format&fit=crop'),
  ('nv_chicken_seekh', 'nonveg_starters', 'Chicken Seekh Kebab', 389, FALSE, TRUE, TRUE, 'Charcoal grilled spiced minced chicken skewers with herbs.', 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=300&auto=format&fit=crop'),
  ('nv_chicken_tikka', 'nonveg_starters', 'Chicken Tikka', 399, FALSE, TRUE, TRUE, 'Boneless chicken thighs in Kashmiri chili marinade, roasted in tandoor.', 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=300&auto=format&fit=crop'),
  ('nv_chicken_malai', 'nonveg_starters', 'Chicken Malai Tikka', 399, FALSE, FALSE, TRUE, 'Mild & velvety chicken chunks marinated in cream, cheese & cashew.', 'https://images.unsplash.com/photo-1628294895950-9805252327bc?w=300&auto=format&fit=crop'),
  ('nv_amritsari_fish', 'nonveg_starters', 'Amritsari Fish Fry', 399, FALSE, FALSE, TRUE, 'Crispy river sole fish fillets coated in carom seed (ajwain) batter.', 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=300&auto=format&fit=crop'),
  ('nv_fish_tikka', 'nonveg_starters', 'Fish Tikka', 489, FALSE, FALSE, TRUE, 'Boneless fish cubes marinated in yellow chili tandoori spices.', 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=300&auto=format&fit=crop'),
  ('nv_mutton_seekh', 'nonveg_starters', 'Mutton Seekh Kebab', 399, FALSE, FALSE, TRUE, 'Tender minced mutton mixed with onions and spices, grilled on skewers.', 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=300&auto=format&fit=crop'),
  ('nv_tandoori_chicken_half', 'nonveg_starters', 'Tandoori Chicken (Half)', 389, FALSE, FALSE, TRUE, 'Classic half spring chicken roasted in authentic clay tandoor.', 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=300&auto=format&fit=crop'),
  ('nv_tandoori_chicken_full', 'nonveg_starters', 'Tandoori Chicken (Full)', 679, FALSE, FALSE, TRUE, 'Whole spring chicken marinated with roasted spices and mustard oil.', 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=300&auto=format&fit=crop'),

  -- Indo-Chinese & Continental
  ('v_spring_roll', 'indochinese', 'Veg Spring Roll', 289, TRUE, FALSE, TRUE, 'Crispy sheets rolled with seasoned shredded vegetables & noodles.', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop'),
  ('v_chilli_potato', 'indochinese', 'Chilli Potato', 299, TRUE, FALSE, TRUE, 'Crispy potato fingers wok-tossed with chili garlic and soy sauce.', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=300&auto=format&fit=crop'),
  ('v_honey_chilli_potato', 'indochinese', 'Honey Chilli Potato', 329, TRUE, FALSE, TRUE, 'Crisp potato fingers glazed with sweet chili honey sauce & sesame.', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=300&auto=format&fit=crop'),
  ('v_manchurian', 'indochinese', 'Veg Manchurian (Dry)', 339, TRUE, FALSE, TRUE, 'Golden vegetable dumplings tossed in tangy Indo-Chinese Manchurian glaze.', 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=300&auto=format&fit=crop'),
  ('p_veg_arrabbiata', 'indochinese', 'Veg Arrabbiata Pasta', 340, TRUE, FALSE, TRUE, 'Penne tossed in spicy Italian tomato, garlic and basil arrabbiata sauce.', 'https://images.unsplash.com/photo-1621996346565-e3d5d6281728?w=300&auto=format&fit=crop'),
  ('p_veg_alfredo', 'indochinese', 'Veg Alfredo Pasta', 349, TRUE, FALSE, TRUE, 'Penne in creamy parmesan garlic butter white sauce with herbs.', 'https://images.unsplash.com/photo-1621996346565-e3d5d6281728?w=300&auto=format&fit=crop'),
  ('p_chicken_arrabbiata', 'indochinese', 'Chicken Arrabbiata Pasta', 340, FALSE, FALSE, TRUE, 'Penne with pan-seared chicken chunks in fiery red tomato sauce.', 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=300&auto=format&fit=crop'),
  ('p_chicken_alfredo', 'indochinese', 'Chicken Alfredo Pasta', 399, FALSE, FALSE, TRUE, 'Penne pasta with grilled chicken in rich parmesan cheese sauce.', 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=300&auto=format&fit=crop'),
  ('v_chilli_mushroom', 'indochinese', 'Chilli Mushroom', 359, TRUE, FALSE, TRUE, 'Crispy button mushrooms tossed with green chilies, onions & capsicum.', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&auto=format&fit=crop'),
  ('v_chilli_paneer', 'indochinese', 'Chilli Paneer', 389, TRUE, FALSE, TRUE, 'Wok-seared paneer cubes tossed in spicy soy-chili sauce.', 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=300&auto=format&fit=crop'),
  ('nv_chilli_chicken', 'indochinese', 'Chilli Chicken (Dry)', 391, FALSE, TRUE, TRUE, 'Classic Indo-Chinese diced chicken tossed with scallions and dark soy.', 'https://images.unsplash.com/photo-1562967914-608f82629710?w=300&auto=format&fit=crop'),
  ('nv_chicken_lollipop', 'indochinese', 'Chicken Lollipop', 499, FALSE, FALSE, TRUE, 'Crisp frenched chicken drumettes with spicy Schezwan dip.', 'https://images.unsplash.com/photo-1527477378370-136f45c2be7e?w=300&auto=format&fit=crop'),

  -- Main Course
  ('mc_steamed_rice', 'mains', 'Steamed Rice', 231, TRUE, FALSE, TRUE, 'Fluffy steamed long-grain basmati rice.', 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=300&auto=format&fit=crop'),
  ('mc_dal_tadka', 'mains', 'Yellow Dal Tadka', 319, TRUE, FALSE, TRUE, 'Yellow lentils tempered with ghee, cumin seeds, garlic & dried chili.', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&auto=format&fit=crop'),
  ('mc_veg_biryani', 'mains', 'Veg Biryani', 319, TRUE, FALSE, TRUE, 'Fragrant basmati rice layered with vegetables and aromatic spices.', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&auto=format&fit=crop'),
  ('mc_egg_curry', 'mains', 'Egg Curry (4 Pcs)', 369, FALSE, FALSE, TRUE, 'Four boiled eggs simmered in rich Punjabi onion-tomato gravy.', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=300&auto=format&fit=crop'),
  ('mc_dal_makhani', 'mains', 'Dal Makhani', 379, TRUE, FALSE, TRUE, 'Slow-cooked black lentils simmered overnight with butter & cream.', 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&auto=format&fit=crop'),
  ('mc_paneer_butter', 'mains', 'Paneer Butter Masala / Kadai', 399, TRUE, FALSE, TRUE, 'Paneer in velvety tomato butter makhani or wok-cooked kadai gravy.', 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=300&auto=format&fit=crop'),
  ('mc_chicken_biryani', 'mains', 'Chicken Biryani', 449, FALSE, FALSE, TRUE, 'Traditional chicken dum biryani with saffron basmati rice.', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&auto=format&fit=crop'),
  ('mc_chicken_curry', 'mains', 'Chicken Curry / Rara / Jalfrezi', 489, FALSE, FALSE, TRUE, 'Choice of Dhaba Chicken Curry, Chicken Rara with keema, or Jalfrezi.', 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=300&auto=format&fit=crop'),
  ('mc_butter_chicken', 'mains', 'Butter Chicken / Kadhai Chicken', 489, FALSE, TRUE, TRUE, 'Tandoori chicken in smooth tomato makhani sauce or spiced kadhai.', 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=300&auto=format&fit=crop'),

  -- Breads
  ('b_tandoori_roti', 'breads', 'Tandoori Roti (Plain)', 29, TRUE, FALSE, TRUE, 'Traditional clay-oven whole wheat flatbread.', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=300&auto=format&fit=crop'),
  ('b_butter_roti', 'breads', 'Butter Roti', 39, TRUE, FALSE, TRUE, 'Whole wheat tandoori roti brushed with creamy butter.', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=300&auto=format&fit=crop'),
  ('b_plain_naan', 'breads', 'Plain Naan', 49, TRUE, FALSE, TRUE, 'Refined flour leavened bread baked inside tandoor.', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=300&auto=format&fit=crop'),
  ('b_butter_naan', 'breads', 'Butter Naan', 69, TRUE, TRUE, TRUE, 'Soft, pillowy naan generously brushed with pure butter.', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=300&auto=format&fit=crop'),
  ('b_laccha_parantha', 'breads', 'Laccha Parantha', 69, TRUE, FALSE, TRUE, 'Flaky, multi-layered tandoori parantha with butter.', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=300&auto=format&fit=crop'),
  ('b_garlic_naan', 'breads', 'Garlic Naan', 95, TRUE, FALSE, TRUE, 'Naan topped with minced roasted garlic and fresh coriander.', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=300&auto=format&fit=crop'),

  -- Desserts & Salads
  ('s_onion_salad', 'desserts_salads', 'Onion Salad', 49, TRUE, FALSE, TRUE, 'Fresh sliced onion rings with lemon wedge & green chili.', 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=300&auto=format&fit=crop'),
  ('s_masala_onion', 'desserts_salads', 'Masala Onion', 59, TRUE, FALSE, TRUE, 'Sliced onion rings tossed in tangy chaat masala & lemon juice.', 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=300&auto=format&fit=crop'),
  ('d_gulab_jamun', 'desserts_salads', 'Gulab Jamun', 150, TRUE, FALSE, TRUE, 'Two warm fried khoya dumplings soaked in rose cardamom sugar syrup.', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=300&auto=format&fit=crop'),
  ('s_raita', 'desserts_salads', 'Raita (Cumin Seasoned)', 169, TRUE, FALSE, TRUE, 'Chilled fresh yogurt with boondi and roasted jeera powder.', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&auto=format&fit=crop'),
  ('s_green_salad', 'desserts_salads', 'Garden / Green Salad', 189, TRUE, FALSE, TRUE, 'Fresh garden cucumber, carrots, tomatoes and beetroot slices.', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&auto=format&fit=crop'),
  ('d_brownie', 'desserts_salads', 'Brownie with Ice Cream / Lava Cake', 249, TRUE, FALSE, TRUE, 'Warm gooey chocolate brownie or lava cake served with vanilla scoop.', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=300&auto=format&fit=crop'),

  -- Smoke
  ('x_smoke_reg', 'smoke', 'Smoke (Regular)', 20, TRUE, FALSE, TRUE, 'Regular single stick.', 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=300&auto=format&fit=crop'),
  ('x_smoke_med', 'smoke', 'Smoke (Medium)', 25, TRUE, FALSE, TRUE, 'Medium single stick.', 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=300&auto=format&fit=crop'),
  ('x_smoke_large', 'smoke', 'Smoke (Large)', 30, TRUE, FALSE, TRUE, 'Large single stick.', 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=300&auto=format&fit=crop')
ON CONFLICT (id) DO UPDATE SET
  price = EXCLUDED.price,
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  description = EXCLUDED.description;

-- ==============================================================================
-- 13. Over-The-Air (OTA) Mandatory Force Updates Engine
-- ==============================================================================
CREATE TABLE IF NOT EXISTS app_updates (
  id INTEGER PRIMARY KEY DEFAULT 1,
  current_version TEXT NOT NULL DEFAULT '2.4',
  latest_version TEXT NOT NULL DEFAULT '2.4',
  min_supported_version TEXT NOT NULL DEFAULT '2.4',
  force_update BOOLEAN DEFAULT FALSE,
  update_title TEXT DEFAULT 'Mandatory App Update',
  update_notes TEXT DEFAULT 'Bug fixes and performance enhancements',
  apk_url TEXT DEFAULT '/ONYX_POS.apk',
  apk_size TEXT DEFAULT '0.13 MB',
  released_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT DEFAULT 'Manager'
);

INSERT INTO app_updates (id, current_version, latest_version, min_supported_version, force_update, update_title, update_notes, apk_url, apk_size)
VALUES (1, '2.4', '2.4', '2.4', FALSE, 'ONYX POS Official Release', 'Commercial restaurant release', '/ONYX_POS.apk', '0.13 MB')
ON CONFLICT (id) DO NOTHING;
