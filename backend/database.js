// ONYX COMMERCIAL RESTAURANT ENGINE - Native SQLite Database Layer
// Uses Node.js v24 native DatabaseSync for zero-dependency, ultra-fast persistence

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

let DB_FILE = path.join(__dirname, '..', 'onyx_restaurant.db');

// Vercel Serverless environment compatibility: filesystem is read-only outside /tmp
if (process.env.VERCEL) {
  const tmpDb = path.join('/tmp', 'onyx_restaurant.db');
  try {
    if (fs.existsSync(DB_FILE)) {
      const srcStat = fs.statSync(DB_FILE);
      const dstStat = fs.existsSync(tmpDb) ? fs.statSync(tmpDb) : null;
      if (!dstStat || dstStat.mtimeMs < srcStat.mtimeMs || dstStat.size !== srcStat.size) {
        fs.copyFileSync(DB_FILE, tmpDb);
      }
    }
  } catch (e) {
    console.warn('Vercel DB copy warning:', e.message);
  }
  DB_FILE = tmpDb;
}

const db = new DatabaseSync(DB_FILE);

// Enable WAL or Memory Journal for concurrent throughput
try {
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA foreign_keys = ON;');
} catch (e) {
  try {
    db.exec('PRAGMA journal_mode = MEMORY;');
    db.exec('PRAGMA foreign_keys = ON;');
  } catch (_) {}
}

// Initialize All Production Tables
function initDatabase() {
  db.exec(`
    -- 1. Store Profile & White-Label Configuration
    CREATE TABLE IF NOT EXISTS store_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- 2. Staff & Roles with PIN Authentication
    CREATE TABLE IF NOT EXISTS staff_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL, -- 'admin' | 'cashier' | 'waiter' | 'kitchen'
      pin TEXT NOT NULL,  -- 4-digit numeric PIN
      phone TEXT,
      email TEXT,
      password TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. Dynamic Floor & Tables
    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      position TEXT NOT NULL,
      landmark TEXT,
      seats INTEGER DEFAULT 4,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'vacant', -- 'vacant' | 'occupied' | 'billing_locked'
      active INTEGER DEFAULT 1
    );

    -- 4. Menu Categories
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '🍽️',
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      is_deleted INTEGER DEFAULT 0
    );

    -- 5. Menu Items (with In-Stock / Out-of-Stock 86ing)
    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      is_veg INTEGER DEFAULT 1,
      is_top_hit INTEGER DEFAULT 0,
      in_stock INTEGER DEFAULT 1,
      is_deleted INTEGER DEFAULT 0,
      description TEXT,
      image TEXT,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    -- 6. Punched KOT Rounds (Kitchen Order Tickets)
    CREATE TABLE IF NOT EXISTS kots (
      id TEXT PRIMARY KEY,
      table_id TEXT NOT NULL,
      table_name TEXT NOT NULL,
      waiter_name TEXT NOT NULL,
      status TEXT DEFAULT 'pending', -- 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (table_id) REFERENCES tables(id)
    );

    -- 7. KOT Line Items (Zero Permanent Deletion)
    CREATE TABLE IF NOT EXISTS kot_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kot_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      qty INTEGER NOT NULL,
      is_bar INTEGER DEFAULT 0,
      notes TEXT,
      is_void INTEGER DEFAULT 0,
      void_reason TEXT,
      voided_at DATETIME,
      FOREIGN KEY (kot_id) REFERENCES kots(id)
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
      subtotal REAL NOT NULL,
      discount_type TEXT DEFAULT 'none', -- 'none' | 'percent' | 'flat'
      discount_value REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      cgst REAL NOT NULL,
      sgst REAL NOT NULL,
      service_charge REAL DEFAULT 0,
      round_off REAL DEFAULT 0,
      grand_total REAL NOT NULL,
      payment_mode TEXT NOT NULL, -- 'upi' | 'card' | 'cash' | 'split'
      payment_ref TEXT,
      split_count INTEGER DEFAULT 1,
      status TEXT DEFAULT 'paid', -- 'paid' | 'void'
      restaurant_name TEXT,
      gstin TEXT,
      fssai TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 9. Bill Line Items Snapshot (Audit trail, Zero Permanent Deletion)
    CREATE TABLE IF NOT EXISTS bill_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      qty INTEGER NOT NULL,
      amount REAL NOT NULL,
      notes TEXT,
      is_archived INTEGER DEFAULT 0,
      archived_at DATETIME,
      FOREIGN KEY (bill_id) REFERENCES bills(id)
    );

    -- 10. Audit Trail: Cancelled / Voided Items (Anti-Theft Protection)
    CREATE TABLE IF NOT EXISTS payment_failure_logs (
      id TEXT PRIMARY KEY,
      table_id TEXT NOT NULL,
      table_name TEXT NOT NULL,
      floor TEXT DEFAULT 'Ground Floor',
      amount REAL NOT NULL,
      payment_mode TEXT NOT NULL,
      reason TEXT NOT NULL,
      staff_name TEXT DEFAULT 'Staff',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS void_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kot_item_id INTEGER,
      kot_id TEXT,
      table_id TEXT,
      table_name TEXT,
      item_name TEXT NOT NULL,
      price REAL NOT NULL,
      qty INTEGER NOT NULL,
      reason TEXT NOT NULL,
      authorized_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 11. Audit Trail: Manager Bill Modifications & Corrections
    CREATE TABLE IF NOT EXISTS bill_edit_logs (
      id TEXT PRIMARY KEY,
      bill_id TEXT NOT NULL,
      invoice_number TEXT NOT NULL,
      manager_email TEXT NOT NULL,
      manager_name TEXT DEFAULT 'Manager',
      reason TEXT NOT NULL,
      previous_data TEXT NOT NULL,
      new_data TEXT NOT NULL,
      changes_summary TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 12. Remote Debugging & Device Interaction Telemetry (Zero Data Loss)
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
      device_info TEXT,
      event_payload TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_telemetry_device ON device_telemetry_logs(device_id);
    CREATE INDEX IF NOT EXISTS idx_telemetry_type ON device_telemetry_logs(event_type);
    CREATE INDEX IF NOT EXISTS idx_telemetry_created ON device_telemetry_logs(created_at);

    -- 13. Over-The-Air (OTA) Mandatory Force Updates Engine
    CREATE TABLE IF NOT EXISTS app_updates (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      current_version TEXT NOT NULL DEFAULT '2.4',
      latest_version TEXT NOT NULL DEFAULT '2.4',
      min_supported_version TEXT NOT NULL DEFAULT '2.4',
      force_update INTEGER DEFAULT 0,
      update_title TEXT DEFAULT 'Mandatory App Update',
      update_notes TEXT DEFAULT 'Bug fixes and performance enhancements',
      apk_url TEXT DEFAULT '/ONYX_POS.apk',
      apk_size TEXT DEFAULT '0.13 MB',
      released_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT DEFAULT 'Manager'
    );
  `);

  // Auto-migration for existing SQLite databases
  try { db.exec('ALTER TABLE bills ADD COLUMN round_off REAL DEFAULT 0;'); } catch (e) {}
  try { db.exec('ALTER TABLE bills ADD COLUMN service_charge REAL DEFAULT 0;'); } catch (e) {}
  try { db.exec('ALTER TABLE bills ADD COLUMN restaurant_name TEXT;'); } catch (e) {}
  try { db.exec('ALTER TABLE bills ADD COLUMN gstin TEXT;'); } catch (e) {}
  try { db.exec('ALTER TABLE bills ADD COLUMN fssai TEXT;'); } catch (e) {}
  try { db.exec('ALTER TABLE staff_users ADD COLUMN email TEXT;'); } catch (e) {}
  try { db.exec('ALTER TABLE staff_users ADD COLUMN password TEXT;'); } catch (e) {}

  // Zero Permanent Deletion Migrations
  try { db.exec('ALTER TABLE kot_items ADD COLUMN is_void INTEGER DEFAULT 0;'); } catch (e) {}
  try { db.exec('ALTER TABLE kot_items ADD COLUMN void_reason TEXT;'); } catch (e) {}
  try { db.exec('ALTER TABLE kot_items ADD COLUMN voided_at DATETIME;'); } catch (e) {}
  try { db.exec('ALTER TABLE bill_items ADD COLUMN is_archived INTEGER DEFAULT 0;'); } catch (e) {}
  try { db.exec('ALTER TABLE bill_items ADD COLUMN archived_at DATETIME;'); } catch (e) {}
  try { db.exec('ALTER TABLE bill_items ADD COLUMN notes TEXT;'); } catch (e) {}
  try { db.exec('ALTER TABLE menu_items ADD COLUMN is_deleted INTEGER DEFAULT 0;'); } catch (e) {}
  try { db.exec('ALTER TABLE categories ADD COLUMN is_deleted INTEGER DEFAULT 0;'); } catch (e) {}
  try { db.exec('ALTER TABLE device_telemetry_logs ADD COLUMN mac_pseudo_address TEXT;'); } catch (e) {}
  try {
    db.prepare("UPDATE staff_users SET email = 'admin@google.in', password = 'Admin@#1234' WHERE id = 'usr_admin' OR role = 'admin'").run();
  } catch (e) {}
  try {
    db.prepare("UPDATE categories SET name = 'Veg Starters & Bar Bites' WHERE id = 'chakna' OR name LIKE '%chakna%'").run();
  } catch (e) {}

  // Initialize Default App Update Status
  try {
    db.prepare(`
      INSERT OR IGNORE INTO app_updates (id, current_version, latest_version, min_supported_version, force_update, update_title, update_notes, apk_url, apk_size)
      VALUES (1, '2.4', '2.4', '2.4', 0, 'ONYX POS Official Release', 'Commercial restaurant release', '/ONYX_POS.apk', '0.13 MB')
    `).run();
  } catch (e) {}

  // Seed Default Store Settings if empty
  const countRow = db.prepare('SELECT COUNT(*) as count FROM store_settings').get();
  if (countRow.count === 0) {
    seedDefaultStoreData();
  }
}

function seedDefaultStoreData() {
  const insertSetting = db.prepare('INSERT INTO store_settings (key, value) VALUES (?, ?)');
  const defaultSettings = {
    restaurant_name: 'BYOB INDIRAPURAM',
    tagline: 'Bring Your Own Bottle Experience',
    address: 'Plot 14, Dr. Sushila Naiyyar Marg, Indirapuram, Ghaziabad',
    phone: '+91 98765 43210',
    email: 'contact@byobindirapuram.com',
    gstin: '07AABCB1234F1Z9',
    fssai: '12724055000123',
    upi_vpa: 'Q676029996@ybl',
    currency_symbol: '₹',
    cgst_percent: '2.5',
    sgst_percent: '2.5',
    service_charge_fixed: '0',
    service_charge: '0',
    service_charge_percent: '0',
    bill_footer: 'Thank you for visiting! Guests are welcome to Bring Their Own Bottle.'
  };

  for (const [k, v] of Object.entries(defaultSettings)) {
    insertSetting.run(k, v);
  }

  // Seed Default Staff Users with PINs
  const insertStaff = db.prepare('INSERT INTO staff_users (id, name, role, pin, phone) VALUES (?, ?, ?, ?, ?)');
  insertStaff.run('usr_admin', 'Owner / Manager', 'admin', '1234', '+91 99999 00001');
  insertStaff.run('usr_cashier', 'Cashier Desk', 'cashier', '2222', '+91 99999 00002');
  insertStaff.run('usr_waiter1', 'Captain Rahul', 'waiter', '3333', '+91 99999 00003');
  insertStaff.run('usr_waiter2', 'Captain Amit', 'waiter', '4444', '+91 99999 00004');
  insertStaff.run('usr_chef', 'Head Chef Kitchen', 'kitchen', '5555', '+91 99999 00005');

  // Seed Tables (T-01 to T-12)
  const insertTable = db.prepare('INSERT INTO tables (id, name, position, landmark, seats, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
  const defaultTables = [
    ['T-01', 'Table 1', 'Front • Left Row', 'Near Front Entrance Window', 4, 1],
    ['T-02', 'Table 2', 'Front • Center Hall', 'Opposite Billing Counter', 6, 2],
    ['T-03', 'Table 3', 'Front • Right Row', 'Beside Wall Sofas', 4, 3],
    ['T-04', 'Table 4', 'Middle • Left Row', 'Central Hall Left Column', 4, 4],
    ['T-05', 'Table 5', 'Middle • Center Hall', 'Center Main Pathway', 8, 5],
    ['T-06', 'Table 6', 'Middle • Right Row', 'Central Hall Right Column', 6, 6],
    ['T-07', 'Table 7', 'Middle • Left Row', 'Near Pillar Left', 4, 7],
    ['T-08', 'Table 8', 'Middle • Center Hall', 'Center Pathway South', 4, 8],
    ['T-09', 'Table 9', 'Middle • Right Row', 'Beside Wall Woodwork', 4, 9],
    ['T-10', 'Table 10', 'Back • Left Row', 'Near Back Restrooms / AC Vent', 6, 10],
    ['T-11', 'Table 11', 'Back • Center Hall', 'Front of Bar Counter', 8, 11],
    ['T-12', 'Table 12', 'Back • Right Row', 'Adjacent to Liquor Mixer Station', 4, 12]
  ];
  for (const t of defaultTables) {
    insertTable.run(...t);
  }

  // Seed Categories
  const insertCat = db.prepare('INSERT INTO categories (id, name, icon, sort_order) VALUES (?, ?, ?, ?)');
  const defaultCategories = [
    ['mixers', 'BYOB Mixers', '🧊', 1],
    ['chakna', 'Chakna & Munchies', '🥜', 2],
    ['starters_veg', 'Veg Starters', '🌱', 3],
    ['starters_nonveg', 'Non-Veg Starters', '🍗', 4],
    ['pastas', 'Pastas & Bowls', '🍝', 5],
    ['mains_veg', 'Veg Main Course', '🍲', 6],
    ['mains_nonveg', 'Non-Veg Main Course', '🍛', 7],
    ['breads', 'Breads & Rotis', '🫓', 8]
  ];
  for (const c of defaultCategories) {
    insertCat.run(...c);
  }

  // Seed Menu Items
  const insertItem = db.prepare('INSERT INTO menu_items (id, category_id, name, price, is_veg, is_top_hit, in_stock, description, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  
  const defaultItems = [
    // Mixers
    ['m_ice', 'mixers', 'Ice Cube Bucket', 69, 1, 1, 1, 'Insulated bucket packed with crystal clear ice cubes for liquor.', 'https://images.unsplash.com/photo-1548848221-0c2e497ed557?w=300&auto=format&fit=crop'],
    ['m_soda', 'mixers', 'Soda', 49, 1, 1, 1, 'Chilled carbonated mixer soda for your pegs.', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop'],
    ['m_soft_can', 'mixers', 'Soft Drinks (Can)', 99, 1, 1, 1, 'Choice of Coke, Sprite, Thums Up, Diet Coke.', 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=300&auto=format&fit=crop'],
    ['m_water', 'mixers', 'Mineral Water (1L)', 40, 1, 1, 1, 'Sealed packaged mineral water bottle.', 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=300&auto=format&fit=crop'],
    ['m_tonic', 'mixers', 'Schweppes Tonic Water', 129, 1, 0, 1, 'Crisp tonic water ideal for gin or vodka.', 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=300&auto=format&fit=crop'],
    ['m_redbull', 'mixers', 'Red Bull Energy Drink', 175, 1, 1, 1, 'Chilled 250ml can.', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop'],

    // Chakna
    ['v_peanut_masala', 'chakna', 'Peanut Masala', 199, 1, 1, 1, 'Crispy roasted peanuts tossed with diced onions, tomatoes, green chillies & lemon.', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&auto=format&fit=crop'],
    ['v_masala_papad', 'chakna', 'Masala Papad (2 Pcs)', 199, 1, 1, 1, 'Roasted urad dal papad topped with spicy onion-tomato salsa.', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300&auto=format&fit=crop'],
    ['v_fries', 'chakna', 'French Fries', 199, 1, 1, 1, 'Crispy golden potato fingers tossed with peri-peri rock salt.', 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=300&auto=format&fit=crop'],
    ['v_crispy_corn', 'chakna', 'Crispy Corn Salt & Pepper', 249, 1, 1, 1, 'Tender sweet corn tossed with cracked black pepper & spring onions.', 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=300&auto=format&fit=crop'],

    // Starters Veg
    ['v_paneer_tikka', 'starters_veg', 'Paneer Tikka', 349, 1, 1, 1, 'Cottage cheese cubes marinated in spiced hung yogurt, chargrilled in tandoor.', 'https://images.unsplash.com/photo-1567184109890-9a48f438a2e2?w=300&auto=format&fit=crop'],
    ['v_dahi_kabab', 'starters_veg', 'Dahi Ke Kabab', 299, 1, 1, 1, 'Hung curd patties with roasted gram flour & crushed peppercorns.', 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=300&auto=format&fit=crop'],

    // Starters Non-Veg
    ['nv_chicken_tikka', 'starters_nonveg', 'Chicken Tikka', 399, 0, 1, 1, 'Boneless chicken thighs in mustard oil & Kashmiri chilli marinade, tandoor roasted.', 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=300&auto=format&fit=crop'],
    ['nv_chicken_lollipop', 'starters_nonveg', 'Chicken Lollipop', 499, 0, 1, 1, 'Frenched chicken winglets tossed in fiery Indo-Chinese Szechuan garlic glaze.', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=300&auto=format&fit=crop'],
    ['nv_tandoori_chicken', 'starters_nonveg', 'Tandoori Chicken (Half)', 399, 0, 1, 1, 'Tender spring chicken roasted with traditional clay-oven char and chaat masala.', 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=300&auto=format&fit=crop'],

    // Pastas
    ['p_chicken_pasta', 'pastas', 'Chicken Alfredo Pasta', 389, 0, 1, 1, 'Penne tossed with pan-seared chicken, rich garlic butter cream sauce & parmesan.', 'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?w=300&auto=format&fit=crop'],

    // Mains
    ['mc_butter_chicken', 'mains_nonveg', 'Butter Chicken', 489, 0, 1, 1, 'Succulent tandoori chicken simmered in rich velvety tomato makhani gravy with butter.', 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=300&auto=format&fit=crop'],
    ['mc_dal_makhani', 'mains_veg', 'Dal Makhani', 349, 1, 1, 1, 'Slow-cooked black lentils simmered overnight with tomatoes and white butter.', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&auto=format&fit=crop'],

    // Breads
    ['b_butter_naan', 'breads', 'Butter Naan', 69, 1, 1, 1, 'Clay-oven leavened bread brushed generously with Amul butter.', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300&auto=format&fit=crop']
  ];

  for (const item of defaultItems) {
    insertItem.run(...item);
  }
}

// Auto-run initialization
initDatabase();

module.exports = {
  db,

  // --- Store Profile ---
  getSettings() {
    const rows = db.prepare('SELECT key, value FROM store_settings').all();
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);
    // Two-way key normalization for frontend compatibility
    if (settings.restaurant_name && !settings.name) settings.name = settings.restaurant_name;
    if (settings.name && !settings.restaurant_name) settings.restaurant_name = settings.name;
    if (settings.bill_footer && !settings.receipt_footer) settings.receipt_footer = settings.bill_footer;
    if (settings.receipt_footer && !settings.bill_footer) settings.bill_footer = settings.receipt_footer;
    return settings;
  },

  updateSettings(data, managerEmail = 'admin@google.in', reason = 'Store profile updated') {
    const oldSettings = this.getSettings();
    const update = db.prepare('INSERT OR REPLACE INTO store_settings (key, value) VALUES (?, ?)');
    
    // Normalize aliases so both keys are always kept in sync
    const normalized = { ...data };
    if (normalized.name) normalized.restaurant_name = normalized.name;
    if (normalized.restaurant_name) normalized.name = normalized.restaurant_name;
    if (normalized.receipt_footer) normalized.bill_footer = normalized.receipt_footer;
    if (normalized.bill_footer) normalized.receipt_footer = normalized.bill_footer;

    for (const [k, v] of Object.entries(normalized)) {
      update.run(k, String(v));
    }
    const newSettings = this.getSettings();

    // Log Store Profile Changes to bill_edit_logs
    const diffs = [];
    for (const [k, v] of Object.entries(newSettings)) {
      if (oldSettings[k] !== undefined && oldSettings[k] !== v) {
        diffs.push(`${k}: "${oldSettings[k]}" ➔ "${v}"`);
      }
    }

    if (diffs.length > 0) {
      try {
        const logId = 'BEDT-STORE-' + Date.now().toString(36);
        db.prepare(`
          INSERT INTO bill_edit_logs (
            id, bill_id, invoice_number, manager_email, manager_name, reason,
            previous_data, new_data, changes_summary
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          logId,
          'STORE_PROFILE',
          'STORE_CONFIG',
          managerEmail || 'admin@google.in',
          'Manager (Admin)',
          reason || 'Store profile & tax rate update',
          JSON.stringify(oldSettings),
          JSON.stringify(newSettings),
          diffs.join(' | ')
        );
      } catch (err) {
        console.warn('Failed to log store settings update:', err);
      }
    }

    return newSettings;
  },

  // --- Manager Master PIN & Security Question Management ---
  getManagerSecurityStatus() {
    const settings = this.getSettings();
    const isSet = settings.manager_pin_set === '1' && Boolean(settings.manager_pin);
    return {
      isPinSet: Boolean(isSet),
      securityQuestion: settings.manager_security_question || 'What was the name of your first restaurant?'
    };
  },

  setupInitialManagerPin({ newPin, securityQuestion, securityAnswer }) {
    const settings = this.getSettings();
    if (settings.manager_pin_set === '1' && settings.manager_pin) {
      throw new Error('Master PIN is already set. Please use Change PIN option.');
    }
    const cleanPin = (newPin || '').trim();
    if (!/^\d{4,6}$/.test(cleanPin)) {
      throw new Error('PIN must be 4 to 6 numeric digits.');
    }
    const cleanQ = (securityQuestion || '').trim() || 'What was the name of your first restaurant?';
    const cleanA = (securityAnswer || '').trim();
    if (!cleanA) {
      throw new Error('Security question answer is mandatory to recall/recover PIN.');
    }

    const update = db.prepare('INSERT OR REPLACE INTO store_settings (key, value) VALUES (?, ?)');
    update.run('manager_pin', cleanPin);
    update.run('manager_pin_set', '1');
    update.run('manager_security_question', cleanQ);
    update.run('manager_security_answer', cleanA.toLowerCase());

    // Sync to usr_admin in staff_users
    try {
      db.prepare("UPDATE staff_users SET pin = ? WHERE id = 'usr_admin' OR role = 'admin'").run(cleanPin);
    } catch (e) {}

    return { 
      success: true, 
      isPinSet: true,
      message: 'Master PIN and Security Question configured successfully.' 
    };
  },

  changeManagerPin({ oldPin, newPin, securityQuestion, securityAnswer }) {
    const settings = this.getSettings();
    const currentPin = settings.manager_pin || db.prepare("SELECT pin FROM staff_users WHERE id = 'usr_admin'").get()?.pin || '1234';
    
    // Verify old PIN
    if ((oldPin || '').trim() !== currentPin) {
      throw new Error('Old PIN / Password is incorrect.');
    }

    const cleanPin = (newPin || '').trim();
    if (!/^\d{4,6}$/.test(cleanPin)) {
      throw new Error('New PIN must be 4 to 6 numeric digits.');
    }

    const update = db.prepare('INSERT OR REPLACE INTO store_settings (key, value) VALUES (?, ?)');
    update.run('manager_pin', cleanPin);
    update.run('manager_pin_set', '1');

    if (securityQuestion && (securityQuestion || '').trim()) {
      update.run('manager_security_question', (securityQuestion || '').trim());
    }
    if (securityAnswer && (securityAnswer || '').trim()) {
      update.run('manager_security_answer', (securityAnswer || '').trim().toLowerCase());
    }

    // Sync to usr_admin in staff_users
    try {
      db.prepare("UPDATE staff_users SET pin = ? WHERE id = 'usr_admin' OR role = 'admin'").run(cleanPin);
    } catch (e) {}

    return { 
      success: true, 
      isPinSet: true,
      message: 'Master PIN and Security Settings updated successfully.' 
    };
  },

  verifyForgotPinAnswer(answer) {
    const settings = this.getSettings();
    const cleanA = (answer || '').trim().toLowerCase();
    const storedA = (settings.manager_security_answer || '').trim().toLowerCase();

    if (!storedA) {
      throw new Error('No security answer is configured yet. Master PIN has not been set.');
    }

    if (cleanA === storedA) {
      const pin = settings.manager_pin || db.prepare("SELECT pin FROM staff_users WHERE id = 'usr_admin'").get()?.pin || '1234';
      return { 
        success: true, 
        currentPin: pin,
        message: 'Security answer verified successfully.' 
      };
    } else {
      throw new Error('Incorrect security answer. Access denied.');
    }
  },

  resetManagerPinWithAnswer({ answer, newPin }) {
    const verified = this.verifyForgotPinAnswer(answer);
    if (!verified || !verified.success) {
      throw new Error('Security verification failed.');
    }
    const cleanPin = (newPin || '').trim();
    if (!/^\d{4,6}$/.test(cleanPin)) {
      throw new Error('New PIN must be 4 to 6 numeric digits.');
    }

    const update = db.prepare('INSERT OR REPLACE INTO store_settings (key, value) VALUES (?, ?)');
    update.run('manager_pin', cleanPin);
    update.run('manager_pin_set', '1');

    // Sync to usr_admin in staff_users
    try {
      db.prepare("UPDATE staff_users SET pin = ? WHERE id = 'usr_admin' OR role = 'admin'").run(cleanPin);
    } catch (e) {}

    return { 
      success: true, 
      newPin: cleanPin, 
      isPinSet: true,
      message: 'Master PIN has been reset successfully.' 
    };
  },

  // --- Staff & Auth ---
  authenticatePin(pin) {
    return db.prepare('SELECT id, name, role, phone FROM staff_users WHERE pin = ? AND active = 1').get(pin);
  },

  getAllStaff() {
    return db.prepare('SELECT id, name, role, pin, phone, active FROM staff_users ORDER BY role, name').all();
  },

  saveStaff(user) {
    if (user.id) {
      db.prepare('UPDATE staff_users SET name = ?, role = ?, pin = ?, phone = ?, active = ? WHERE id = ?')
        .run(user.name, user.role, user.pin, user.phone || '', user.active ? 1 : 0, user.id);
    } else {
      const newId = 'usr_' + Date.now().toString(36);
      db.prepare('INSERT INTO staff_users (id, name, role, pin, phone, active) VALUES (?, ?, ?, ?, ?, ?)')
        .run(newId, user.name, user.role, user.pin, user.phone || '', 1);
    }
    return this.getAllStaff();
  },

  // --- Dynamic Tables ---
  getTables() {
    const tables = db.prepare('SELECT * FROM tables WHERE active = 1 ORDER BY sort_order, id').all();
    // Attach live pending orders for each table (excluding voided items)
    for (const t of tables) {
      const activeKots = db.prepare("SELECT id FROM kots WHERE table_id = ? AND status != 'served' AND status != 'billed' AND status != 'cancelled'").all(t.id);
      const orders = db.prepare(`
        SELECT ki.id, ki.name, ki.price, ki.qty, ki.is_bar, ki.notes, k.id as kot_id, k.created_at, k.waiter_name
        FROM kot_items ki
        JOIN kots k ON ki.kot_id = k.id
        WHERE k.table_id = ? AND k.status != 'cancelled' AND k.status != 'served' AND k.status != 'billed'
          AND (ki.is_void = 0 OR ki.is_void IS NULL)
      `).all(t.id);
      t.activeKotCount = activeKots.length;
      t.placedOrders = orders;
      t.currentSubtotal = orders.reduce((sum, o) => sum + (o.price * o.qty), 0);

      // Self-healing: if an occupied table has no pending orders left, reset to vacant
      if (orders.length === 0 && t.status === 'occupied') {
        t.status = 'vacant';
        db.prepare("UPDATE tables SET status = 'vacant' WHERE id = ?").run(t.id);
      }
    }
    return tables;
  },

  saveTable(table) {
    if (table.id) {
      db.prepare('INSERT OR REPLACE INTO tables (id, name, position, landmark, seats, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(table.id, table.name, table.position, table.landmark || '', table.seats || 4, table.sort_order || 0, table.active !== undefined ? (table.active ? 1 : 0) : 1);
    }
    return this.getTables();
  },

  deleteTable(tableId) {
    db.prepare('UPDATE tables SET active = 0 WHERE id = ?').run(tableId);
    return this.getTables();
  },

  updateTableStatus(tableId, status) {
    db.prepare('UPDATE tables SET status = ? WHERE id = ?').run(status, tableId);
    return this.getTables();
  },

  // --- Menu Management ---
  getCategories() {
    return db.prepare('SELECT * FROM categories WHERE active = 1 AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY sort_order').all();
  },

  saveCategory(cat) {
    db.prepare('INSERT OR REPLACE INTO categories (id, name, icon, sort_order, active) VALUES (?, ?, ?, ?, ?)')
      .run(cat.id, cat.name, cat.icon || '🍽️', cat.sort_order || 0, 1);
    return this.getCategories();
  },

  getMenuItems() {
    const items = db.prepare('SELECT * FROM menu_items WHERE in_stock >= 0 AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY category_id, name').all();
    return items.map(r => {
      const isVeg = r.is_veg === 1 || r.is_veg === true || r.is_veg === '1' || r.is_veg === 'true';
      return {
        ...r,
        is_veg: isVeg ? 1 : 0,
        isVeg: isVeg
      };
    });
  },

  saveMenuItem(item) {
    const isVeg = (item.is_veg === true || item.is_veg === 1 || item.is_veg === '1' || item.is_veg === 'true' || item.isVeg === true || item.isVeg === 1 || item.isVeg === '1' || item.isVeg === 'true');
    db.prepare('INSERT OR REPLACE INTO menu_items (id, category_id, name, price, is_veg, is_top_hit, in_stock, description, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(item.id, item.category_id, item.name, item.price, isVeg ? 1 : 0, item.is_top_hit ? 1 : 0, item.in_stock ? 1 : 0, item.description || '', item.image || '');
    return this.getMenuItems();
  },

  toggleItemStock(itemId, inStock) {
    db.prepare('UPDATE menu_items SET in_stock = ? WHERE id = ?').run(inStock ? 1 : 0, itemId);
    return db.prepare('SELECT id, in_stock FROM menu_items WHERE id = ?').get(itemId);
  },

  // --- KOT Order Punching (Atomic Transaction) ---
  punchKOT({ tableId, tableName, waiterName, items }) {
    const kotId = 'KOT-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
    
    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare('INSERT INTO kots (id, table_id, table_name, waiter_name, status) VALUES (?, ?, ?, ?, ?)')
        .run(kotId, tableId, tableName, waiterName || 'Floor Staff', 'pending');

      const insertItem = db.prepare('INSERT INTO kot_items (kot_id, item_id, name, price, qty, is_bar, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const item of items) {
        insertItem.run(kotId, item.id, item.name, item.price, item.qty, item.is_bar ? 1 : 0, item.notes || '');
      }

      // Mark table as occupied
      db.prepare("UPDATE tables SET status = 'occupied' WHERE id = ?").run(tableId);

      db.exec('COMMIT;');
      return this.getKOTById(kotId);
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  },

  getKOTById(kotId) {
    const kot = db.prepare('SELECT * FROM kots WHERE id = ?').get(kotId);
    if (!kot) return null;
    kot.items = db.prepare('SELECT * FROM kot_items WHERE kot_id = ? AND (is_void = 0 OR is_void IS NULL)').all(kotId);
    return kot;
  },

  getAllActiveKOTs() {
    const kots = db.prepare("SELECT * FROM kots WHERE status != 'served' AND status != 'cancelled' ORDER BY created_at DESC").all();
    for (const k of kots) {
      k.items = db.prepare('SELECT * FROM kot_items WHERE kot_id = ? AND (is_void = 0 OR is_void IS NULL)').all(k.id);
    }
    return kots;
  },

  updateKotStatus(kotId, status) {
    db.prepare('UPDATE kots SET status = ? WHERE id = ?').run(status, kotId);
    const kot = this.getKOTById(kotId);
    if (kot && (status === 'cancelled' || status === 'served')) {
      const activeKots = db.prepare("SELECT id FROM kots WHERE table_id = ? AND status NOT IN ('served', 'cancelled', 'billed')").all(kot.table_id);
      if (activeKots.length === 0 && status === 'cancelled') {
        db.prepare("UPDATE tables SET status = 'vacant' WHERE id = ?").run(kot.table_id);
      }
    }
    return kot;
  },

  // --- Billing & Settlement ---
  settleBill(billData) {
    const billId = 'BILL-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
    const invNumber = 'INV-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Date.now().toString(36).toUpperCase().slice(-4) + Math.floor(100 + Math.random() * 900);
    const settings = this.getSettings();
    const restName = billData.restaurantName || settings.restaurant_name || 'BYOB INDIRAPURAM';
    const gstin = billData.gstin || settings.gstin || '';
    const fssai = billData.fssai || settings.fssai || '';

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(`
        INSERT INTO bills (
          id, invoice_number, table_id, table_name, waiter_name, cashier_name,
          customer_name, customer_phone, subtotal, discount_type, discount_value,
          discount_amount, cgst, sgst, service_charge, round_off, grand_total, payment_mode, payment_ref, split_count,
          restaurant_name, gstin, fssai
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        billId, invNumber, billData.tableId, billData.tableName || ('Table ' + billData.tableId), billData.waiterName || 'Staff',
        billData.cashierName || 'Cashier', billData.customerName || 'Guest', billData.customerPhone || '',
        billData.subtotal || 0, billData.discountType || 'none', billData.discountValue || 0,
        billData.discountAmount || 0, billData.cgst || 0, billData.sgst || 0, billData.serviceCharge || 0, billData.roundOff || 0, billData.grandTotal || (billData.subtotal || 0),
        billData.paymentMode || 'cash', billData.paymentRef || '', billData.splitCount || 1,
        restName, gstin, fssai
      );

      // Snapshot line items (fallback to querying unbilled kot_items if items array not provided)
      const insertBillItem = db.prepare('INSERT INTO bill_items (bill_id, item_id, name, price, qty, amount, notes, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?, 0)');
      let itemsList = Array.isArray(billData.items) && billData.items.length > 0 ? billData.items : [];
      if (itemsList.length === 0) {
        itemsList = db.prepare(`
          SELECT ki.item_id as id, ki.name, ki.price, ki.qty, ki.notes
          FROM kot_items ki
          JOIN kots k ON ki.kot_id = k.id
          WHERE k.table_id = ? AND k.status != 'cancelled' AND (ki.is_void = 0 OR ki.is_void IS NULL)
        `).all(billData.tableId);
      }
      for (const item of itemsList) {
        insertBillItem.run(billId, item.id || 'item', item.name || 'Item', item.price || 0, item.qty || 1, (item.price || 0) * (item.qty || 1), item.notes || '');
      }

      // Mark all unserved/active KOTs for this table as billed
      db.prepare("UPDATE kots SET status = 'billed' WHERE table_id = ? AND status != 'cancelled'").run(billData.tableId);

      // Reset Table to Free / Vacant
      db.prepare("UPDATE tables SET status = 'vacant' WHERE id = ?").run(billData.tableId);

      db.exec('COMMIT;');
      return this.getBillById(billId);
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  },

  getBillById(billId) {
    const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId);
    if (!bill) return null;
    bill.items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ? AND (is_archived = 0 OR is_archived IS NULL)').all(billId);
    return bill;
  },

  // --- Real Sales Analytics & Day-End Report (Crucial for Business Owner) ---
  getSalesAnalytics(dateStr = null) {
    return this.getBusinessEfficiencyReport({ period: 'daily', date: dateStr });
  },

  // --- Comprehensive Business Efficiency Intelligence Engine ---
  getBusinessEfficiencyReport({ period = 'daily', date = null, startDate = null, endDate = null } = {}) {
    const today = new Date().toISOString().slice(0, 10);
    let start = today;
    let end = today;
    let periodLabel = '';

    if (period === 'daily') {
      let targetDate = date;
      if (!targetDate) {
        // Check if today has bills; if not, fallback to latest billing date
        const hasToday = db.prepare("SELECT 1 FROM bills WHERE date(created_at) = date(?) AND status = 'paid' LIMIT 1").get(today);
        if (!hasToday) {
          const latestBill = db.prepare("SELECT date(created_at) as d FROM bills WHERE status = 'paid' ORDER BY created_at DESC LIMIT 1").get();
          targetDate = latestBill ? latestBill.d : today;
        } else {
          targetDate = today;
        }
      }
      start = targetDate;
      end = targetDate;
      periodLabel = `Daily Report (${targetDate})`;
    } else if (period === 'weekly') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      start = d.toISOString().slice(0, 10);
      end = today;
      periodLabel = `Weekly Report (Last 7 Days: ${start} to ${end})`;
    } else if (period === 'monthly') {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      start = d.toISOString().slice(0, 10);
      end = today;
      periodLabel = `Monthly Report (Last 30 Days: ${start} to ${end})`;
    } else if (period === 'quarterly') {
      const d = new Date();
      d.setDate(d.getDate() - 89);
      start = d.toISOString().slice(0, 10);
      end = today;
      periodLabel = `Quarterly Report (Last 90 Days: ${start} to ${end})`;
    } else if (period === 'half_yearly') {
      const d = new Date();
      d.setDate(d.getDate() - 179);
      start = d.toISOString().slice(0, 10);
      end = today;
      periodLabel = `Half-Yearly Report (Last 180 Days: ${start} to ${end})`;
    } else if (period === 'yearly') {
      const d = new Date();
      d.setDate(d.getDate() - 364);
      start = d.toISOString().slice(0, 10);
      end = today;
      periodLabel = `Annual / Yearly Report (Last 365 Days: ${start} to ${end})`;
    } else if (period === 'custom') {
      start = startDate || today;
      end = endDate || today;
      periodLabel = `Custom Range Report (${start} to ${end})`;
    }

    // 1. Executive Summary Totals
    const totals = db.prepare(`
      SELECT 
        COUNT(*) as total_bills,
        COALESCE(SUM(grand_total), 0) as total_revenue,
        COALESCE(SUM(subtotal), 0) as total_subtotal,
        COALESCE(SUM(cgst), 0) as total_cgst,
        COALESCE(SUM(sgst), 0) as total_sgst,
        COALESCE(SUM(cgst + sgst), 0) as total_tax,
        COALESCE(SUM(discount_amount), 0) as total_discounts,
        COALESCE(SUM(round_off), 0) as total_round_off,
        COUNT(DISTINCT date(created_at)) as active_days
      FROM bills
      WHERE date(created_at) >= date(?) AND date(created_at) <= date(?) AND status = 'paid'
    `).get(start, end) || {
      total_bills: 0, total_revenue: 0, total_subtotal: 0, total_cgst: 0, total_sgst: 0, total_tax: 0, total_discounts: 0, total_round_off: 0, active_days: 0
    };

    const totalBills = Number(totals.total_bills) || 0;
    const totalRev = Number(totals.total_revenue) || 0;
    const totalSub = Number(totals.total_subtotal) || 0;
    const totalDisc = Number(totals.total_discounts) || 0;
    const activeDays = Math.max(1, Number(totals.active_days) || 1);

    const aov = totalBills > 0 ? Number((totalRev / totalBills).toFixed(2)) : 0;
    const revPerDay = Number((totalRev / activeDays).toFixed(2));
    const discountRate = (totalSub + totalDisc) > 0 ? Number(((totalDisc / (totalSub + totalDisc)) * 100).toFixed(1)) : 0;

    // 2. Payment Modes
    const paymentRows = db.prepare(`
      SELECT payment_mode, COUNT(*) as count, COALESCE(SUM(grand_total), 0) as amount
      FROM bills
      WHERE date(created_at) >= date(?) AND date(created_at) <= date(?) AND status = 'paid'
      GROUP BY payment_mode
    `).all(start, end);

    const payment_modes = {
      cash: { amount: 0, count: 0, pct: 0 },
      upi: { amount: 0, count: 0, pct: 0 },
      card: { amount: 0, count: 0, pct: 0 }
    };
    paymentRows.forEach(p => {
      const modeKey = (p.payment_mode || 'cash').toLowerCase();
      const amt = Number(p.amount) || 0;
      const cnt = Number(p.count) || 0;
      const pct = totalRev > 0 ? Number(((amt / totalRev) * 100).toFixed(1)) : 0;
      if (payment_modes[modeKey]) {
        payment_modes[modeKey] = { amount: amt, count: cnt, pct };
      }
    });

    // 3. Timeline / Interval Trend (Day by Day)
    const timelineTrend = db.prepare(`
      SELECT 
        date(created_at) as bill_date,
        COUNT(*) as bills_count,
        COALESCE(SUM(grand_total), 0) as revenue
      FROM bills
      WHERE date(created_at) >= date(?) AND date(created_at) <= date(?) AND status = 'paid'
      GROUP BY date(created_at)
      ORDER BY bill_date ASC
    `).all(start, end);

    // 4. Dayparts & Rush Hours
    const hourRows = db.prepare(`
      SELECT 
        CAST(strftime('%H', created_at) AS INTEGER) as hr,
        COUNT(*) as count,
        COALESCE(SUM(grand_total), 0) as revenue
      FROM bills
      WHERE date(created_at) >= date(?) AND date(created_at) <= date(?) AND status = 'paid'
      GROUP BY hr
    `).all(start, end);

    const dayparts = {
      lunch: { label: 'Lunch (12 PM - 4 PM)', count: 0, revenue: 0, pct: 0 },
      snacks: { label: 'Evening Snacks (4 PM - 7 PM)', count: 0, revenue: 0, pct: 0 },
      dinner: { label: 'Dinner Peak (7 PM - 11 PM)', count: 0, revenue: 0, pct: 0 },
      late_night: { label: 'Late Night (11 PM - 4 AM)', count: 0, revenue: 0, pct: 0 },
      busiest_hour: 'N/A'
    };

    let maxHrRev = -1;
    let busiestHourStr = 'N/A';

    hourRows.forEach(h => {
      const hr = Number(h.hr);
      const rev = Number(h.revenue) || 0;
      const cnt = Number(h.count) || 0;

      if (rev > maxHrRev) {
        maxHrRev = rev;
        const nextHr = (hr + 1) % 24;
        const formatHr = (x) => {
          const ampm = x >= 12 ? 'PM' : 'AM';
          const hr12 = x % 12 || 12;
          return `${hr12} ${ampm}`;
        };
        busiestHourStr = `${formatHr(hr)} - ${formatHr(nextHr)} (₹${rev.toLocaleString('en-IN')})`;
      }

      if (hr >= 12 && hr < 16) {
        dayparts.lunch.count += cnt;
        dayparts.lunch.revenue += rev;
      } else if (hr >= 16 && hr < 19) {
        dayparts.snacks.count += cnt;
        dayparts.snacks.revenue += rev;
      } else if (hr >= 19 && hr < 23) {
        dayparts.dinner.count += cnt;
        dayparts.dinner.revenue += rev;
      } else {
        dayparts.late_night.count += cnt;
        dayparts.late_night.revenue += rev;
      }
    });

    dayparts.busiest_hour = busiestHourStr;
    ['lunch', 'snacks', 'dinner', 'late_night'].forEach(k => {
      dayparts[k].pct = totalRev > 0 ? Number(((dayparts[k].revenue / totalRev) * 100).toFixed(1)) : 0;
    });

    // 5. 3-Floor Space Utilization & Efficiency
    const floorRows = db.prepare(`
      SELECT 
        COALESCE(t.floor, '1st Floor') as floor, 
        COUNT(b.id) as bills_count, 
        COALESCE(SUM(b.grand_total), 0) as revenue 
      FROM bills b 
      LEFT JOIN tables t ON b.table_id = t.id 
      WHERE date(b.created_at) >= date(?) AND date(b.created_at) <= date(?) AND b.status = 'paid'
      GROUP BY floor
    `).all(start, end);

    const floorTableCounts = { 'Ground Floor': 18, '1st Floor': 7, '2nd Floor': 17 };
    const floorEfficiency = ['Ground Floor', '1st Floor', '2nd Floor'].map(fName => {
      const match = floorRows.find(r => r.floor && r.floor.toLowerCase().includes(fName.toLowerCase().slice(0, 3))) || { bills_count: 0, revenue: 0 };
      const rev = Number(match.revenue) || 0;
      const bCnt = Number(match.bills_count) || 0;
      const tblCount = floorTableCounts[fName] || 10;
      const pct = totalRev > 0 ? Number(((rev / totalRev) * 100).toFixed(1)) : 0;
      const revPerTable = tblCount > 0 ? Number((rev / tblCount).toFixed(2)) : 0;
      const turnRate = tblCount > 0 ? Number((bCnt / tblCount).toFixed(2)) : 0;
      return {
        floor: fName,
        tables_count: tblCount,
        bills_count: bCnt,
        revenue: rev,
        pct,
        rev_per_table: revPerTable,
        turn_rate: turnRate
      };
    });

    // 6. Top 10 Best Sellers
    const topItems = db.prepare(`
      SELECT 
        bi.name,
        c.name as category_name,
        mi.is_veg,
        SUM(bi.qty) as total_qty,
        SUM(bi.qty) as qty,
        SUM(bi.amount) as total_revenue,
        SUM(bi.amount) as total_sales,
        ROUND(AVG(bi.price), 2) as price
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      LEFT JOIN menu_items mi ON bi.item_id = mi.id
      LEFT JOIN categories c ON mi.category_id = c.id
      WHERE date(b.created_at) >= date(?) AND date(b.created_at) <= date(?) 
        AND b.status = 'paid' 
        AND (bi.is_archived = 0 OR bi.is_archived IS NULL)
      GROUP BY bi.name
      ORDER BY total_qty DESC
      LIMIT 10
    `).all(start, end);

    topItems.forEach(item => {
      item.pct_of_sales = totalRev > 0 ? Number(((item.total_revenue / totalRev) * 100).toFixed(1)) : 0;
    });

    // 7. Category Breakdown & Veg vs Non-Veg Share
    const categoryBreakdown = db.prepare(`
      SELECT 
        COALESCE(c.name, 'General Starters & Mains') as category,
        SUM(bi.qty) as total_qty,
        SUM(bi.amount) as total_revenue
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      LEFT JOIN menu_items mi ON bi.item_id = mi.id
      LEFT JOIN categories c ON mi.category_id = c.id
      WHERE date(b.created_at) >= date(?) AND date(b.created_at) <= date(?)
        AND b.status = 'paid'
        AND (bi.is_archived = 0 OR bi.is_archived IS NULL)
      GROUP BY category
      ORDER BY total_revenue DESC
    `).all(start, end);

    // Dietary Split (Veg vs Non-Veg)
    let vegRevenue = 0;
    let nonVegRevenue = 0;
    const dietaryRows = db.prepare(`
      SELECT 
        COALESCE(mi.is_veg, 1) as is_veg,
        SUM(bi.amount) as revenue
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      LEFT JOIN menu_items mi ON bi.item_id = mi.id
      WHERE date(b.created_at) >= date(?) AND date(b.created_at) <= date(?)
        AND b.status = 'paid'
        AND (bi.is_archived = 0 OR bi.is_archived IS NULL)
      GROUP BY is_veg
    `).all(start, end);

    dietaryRows.forEach(d => {
      if (d.is_veg === 1 || d.is_veg === true) vegRevenue += Number(d.revenue) || 0;
      else nonVegRevenue += Number(d.revenue) || 0;
    });

    const dietary = {
      veg: { revenue: vegRevenue, pct: totalRev > 0 ? Number(((vegRevenue / totalRev) * 100).toFixed(1)) : 50 },
      non_veg: { revenue: nonVegRevenue, pct: totalRev > 0 ? Number(((nonVegRevenue / totalRev) * 100).toFixed(1)) : 50 }
    };

    // 8. Staff Service Efficiency Leaderboard
    const staffLeaderboard = db.prepare(`
      SELECT 
        COALESCE(waiter_name, cashier_name, 'Staff') as staff_name,
        COUNT(*) as total_bills,
        SUM(grand_total) as total_revenue,
        ROUND(AVG(grand_total), 2) as avg_ticket
      FROM bills
      WHERE date(created_at) >= date(?) AND date(created_at) <= date(?) AND status = 'paid'
      GROUP BY staff_name
      ORDER BY total_revenue DESC
    `).all(start, end);

    // 9. Anti-Theft Void & Leakage Audit for Period
    const voidSummary = db.prepare(`
      SELECT 
        COUNT(*) as total_voids,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(DISTINCT staff_name) as staff_involved
      FROM void_logs
      WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
    `).get(start, end) || { total_voids: 0, total_amount: 0, staff_involved: 0 };

    const voidAmount = Number(voidSummary.total_amount) || 0;
    const lossPct = (totalRev + voidAmount) > 0 ? Number(((voidAmount / (totalRev + voidAmount)) * 100).toFixed(2)) : 0;

    const recentVoids = db.prepare(`
      SELECT id, item_name, price, qty, amount, reason, authorized_by, staff_name, created_at
      FROM void_logs
      WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
      ORDER BY created_at DESC
      LIMIT 10
    `).all(start, end);

    // 10. Period Invoices List (Up to 50 for quick inspection)
    const recentBills = db.prepare(`
      SELECT id, invoice_number, table_name, waiter_name, grand_total, payment_mode, customer_name, created_at
      FROM bills
      WHERE date(created_at) >= date(?) AND date(created_at) <= date(?) AND status = 'paid'
      ORDER BY created_at DESC
      LIMIT 50
    `).all(start, end);

    return {
      date: start,
      period,
      periodLabel,
      startDate: start,
      endDate: end,
      activeDays,
      summary: {
        total_bills: totalBills,
        total_revenue: totalRev,
        total_subtotal: totalSub,
        total_cgst: Number(totals.total_cgst) || 0,
        total_sgst: Number(totals.total_sgst) || 0,
        total_tax: Number(totals.total_tax) || 0,
        total_discounts: totalDisc,
        discount_rate_pct: discountRate,
        aov,
        revenue_per_day: revPerDay,
        total_round_off: Number(totals.total_round_off) || 0
      },
      paymentBreakdown: paymentRows,
      payment_modes,
      timeline_trend: timelineTrend,
      dayparts,
      floor_efficiency: floorEfficiency,
      topItems,
      top_items: topItems,
      category_breakdown: categoryBreakdown,
      dietary,
      staff_leaderboard: staffLeaderboard,
      void_audit: {
        total_voids: Number(voidSummary.total_voids) || 0,
        total_amount: voidAmount,
        loss_pct: lossPct,
        staff_involved: Number(voidSummary.staff_involved) || 0,
        recent_voids: recentVoids
      },
      recentBills
    };
  },

  getRecentBills(limit = 50) {
    const bills = db.prepare(`
      SELECT * FROM bills 
      ORDER BY created_at DESC 
      LIMIT ?
    `).all(limit);
    for (const b of bills) {
      b.tax = Number(((b.cgst || 0) + (b.sgst || 0)).toFixed(2));
      b.final_total = b.grand_total;
      b.finalTotal = b.grand_total;
      b.billed_by = b.cashier_name || b.waiter_name || 'Staff';
      b.timestamp = b.created_at;
      b.items = db.prepare(`
        SELECT * FROM bill_items 
        WHERE bill_id = ? AND (is_archived = 0 OR is_archived IS NULL)
      `).all(b.id);
    }
    return bills;
  },

  transferTable(sourceTableId, targetTableId) {
    db.exec('BEGIN TRANSACTION;');
    try {
      const targetTable = db.prepare("SELECT * FROM tables WHERE id = ?").get(targetTableId);
      if (!targetTable) throw new Error("Target table not found");

      db.prepare("UPDATE kots SET table_id = ?, table_name = ? WHERE table_id = ? AND status NOT IN ('served', 'billed', 'cancelled')")
        .run(targetTableId, targetTable.name, sourceTableId);

      db.prepare("UPDATE tables SET status = 'occupied' WHERE id = ?").run(targetTableId);
      db.prepare("UPDATE tables SET status = 'vacant' WHERE id = ?").run(sourceTableId);

      db.exec('COMMIT;');
      return this.getTables();
    } catch (e) {
      db.exec('ROLLBACK;');
      throw e;
    }
  },

  forceClearTable(tableId) {
    db.exec('BEGIN TRANSACTION;');
    try {
      const match = db.prepare(`
        SELECT id FROM tables 
        WHERE id = ? 
           OR id = ('T-' || ?) 
           OR id = ('T-0' || ?) 
           OR id = ('T-' || printf('%02d', CAST(? AS INTEGER)))
           OR name = ?
           OR name = ('Table ' || ?)
        LIMIT 1
      `).get(tableId, tableId, tableId, tableId, tableId, tableId);

      const targetId = match ? match.id : tableId;
      db.prepare("UPDATE kots SET status = 'billed' WHERE (table_id = ? OR table_id = ?) AND status != 'cancelled'").run(targetId, tableId);
      db.prepare("UPDATE tables SET status = 'vacant' WHERE id = ? OR id = ?").run(targetId, tableId);
      db.exec('COMMIT;');
      return this.getTables();
    } catch (e) {
      db.exec('ROLLBACK;');
      throw e;
    }
  },

  deleteMenuItem(itemId) {
    db.prepare("UPDATE menu_items SET is_deleted = 1 WHERE id = ?").run(itemId);
    return this.getMenuItems();
  },

  updateMenuItemPrice(itemId, newPrice) {
    db.prepare("UPDATE menu_items SET price = ? WHERE id = ?").run(Number(newPrice), itemId);
    return this.getMenuItems();
  },

  deleteStaff(staffId) {
    db.prepare("UPDATE staff_users SET active = 0 WHERE id = ?").run(staffId);
    return this.getAllStaff();
  },

  // --- Void / Cancel Individual Punched Item (Zero Permanent Deletion) ---
  voidKotItem({ kotItemId, reason, managerPin, staffName, deviceId, deviceInfo, clientIp }) {
    // 1. Mandatory Validation: Staff / Waiter Name
    const cleanStaff = (staffName || '').trim();
    const dummyNames = ['captain waiter', 'waiter', 'captain', 'server', 'staff', 'admin', 'test'];
    if (!cleanStaff || dummyNames.includes(cleanStaff.toLowerCase())) {
      throw new Error('Staff / Waiter Name is mandatory. Item removal rejected.');
    }

    // 2. Mandatory Validation: Reason
    const cleanReason = (reason || '').trim();
    if (!cleanReason) {
      throw new Error('Cancellation reason is mandatory.');
    }

    // 3. Mandatory Validation: Manager PIN
    const pin = (managerPin || '').trim();
    if (!pin) {
      throw new Error('Manager authorization PIN is mandatory to cancel/remove items. Default PIN: 1234');
    }

    let isManager = false;
    const settings = this.getSettings();
    if (settings.manager_pin_set === '1' && settings.manager_pin) {
      if (pin === settings.manager_pin) {
        isManager = true;
      }
    } else {
      if (pin === '1234' || (settings.manager_pin && pin === settings.manager_pin)) {
        isManager = true;
      }
    }
    let managerStaff = db.prepare("SELECT name, role FROM staff_users WHERE pin = ? AND active = 1").get(pin);
    if (managerStaff && (managerStaff.role === 'admin' || managerStaff.role === 'cashier' || managerStaff.role === 'manager')) {
      isManager = true;
    }

    if (!isManager) {
      throw new Error('Invalid Manager PIN. Item cancellation authorization rejected.');
    }

    const authBy = managerStaff ? `${managerStaff.name} (${managerStaff.role})` : `Manager (PIN: ${pin.slice(0, 2)}**)`;

    db.exec('BEGIN TRANSACTION;');
    try {
      // Find the target item and its parent KOT
      const item = db.prepare('SELECT * FROM kot_items WHERE id = ?').get(kotItemId);
      if (!item) {
        throw new Error('Item not found');
      }

      const kot = db.prepare('SELECT * FROM kots WHERE id = ?').get(item.kot_id);
      if (!kot) {
        throw new Error('Parent KOT not found');
      }

      // Lookup table for floor information
      const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(kot.table_id);
      const floorName = (table && table.floor) ? table.floor : '1st Floor';
      const itemAmount = (item.price * item.qty) || 0;
      const cleanStaff = staffName || (managerStaff ? managerStaff.name : 'Floor Waiter');
      const cleanDevice = deviceId || 'DEVICE-PHONE';

      // 1. Audit Log record to prevent theft / shrinkage with Device ID and Staff Name
      db.prepare(`
        INSERT INTO void_logs (
          kot_item_id, kot_id, table_id, table_name, floor,
          item_name, price, qty, amount, reason,
          staff_name, authorized_by, device_id, device_info, client_ip
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        item.id, kot.id, kot.table_id, kot.table_name || '', floorName,
        item.name, item.price, item.qty, itemAmount, reason || 'Customer request',
        cleanStaff, authBy, cleanDevice, deviceInfo || '', clientIp || ''
      );

      // Soft-void item (Zero permanent deletion rule: NEVER DELETE FROM kot_items)
      db.prepare(`
        UPDATE kot_items 
        SET is_void = 1, void_reason = ?, voided_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(reason || 'Customer request', kotItemId);

      // Check if KOT still has active un-voided items
      const remaining = db.prepare('SELECT COUNT(*) as count FROM kot_items WHERE kot_id = ? AND (is_void = 0 OR is_void IS NULL)').get(item.kot_id);
      if (remaining.count === 0) {
        db.prepare("UPDATE kots SET status = 'cancelled' WHERE id = ?").run(item.kot_id);
      }

      // Recalculate table status
      const activeKots = db.prepare("SELECT id FROM kots WHERE table_id = ? AND status != 'served' AND status != 'billed' AND status != 'cancelled'").all(kot.table_id);
      if (activeKots.length === 0) {
        db.prepare("UPDATE tables SET status = 'vacant' WHERE id = ?").run(kot.table_id);
      }

      db.exec('COMMIT;');
      return { 
        success: true, 
        voidedItem: item, 
        tableId: kot.table_id, 
        tableName: kot.table_name,
        floor: floorName,
        reason: reason || 'Customer request', 
        staffName: cleanStaff,
        deviceId: cleanDevice,
        authorizedBy: authBy,
        amount: itemAmount
      };
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  },

  getVoidLogs(limit = 100) {
    return db.prepare(`
      SELECT vl.*, 
        COALESCE(vl.amount, (vl.price * vl.qty)) as total_amount,
        COALESCE(vl.staff_name, 'Floor Waiter') as staff_name,
        COALESCE(vl.staff_name, 'Floor Waiter') as waiter_name,
        vl.created_at as timestamp,
        COALESCE(vl.device_id, 'DEVICE-PHONE') as device_id,
        COALESCE(vl.floor, '1st Floor') as floor
      FROM void_logs vl 
      ORDER BY vl.created_at DESC 
      LIMIT ?
    `).all(limit);
  },

  getVoidSummaryToday() {
    try {
      const row = db.prepare(`
        SELECT 
          COUNT(*) as total_voids,
          COALESCE(SUM(COALESCE(amount, price * qty)), 0) as total_amount
        FROM void_logs
        WHERE date(created_at) = date('now', 'localtime')
      `).get();
      return row || { total_voids: 0, total_amount: 0 };
    } catch (e) {
      return { total_voids: 0, total_amount: 0 };
    }
  },

  // --- Manager Bill Modification & Audit Trail ---
  updateBill(editData) {
    const {
      billId,
      managerEmail,
      managerPassword,
      reason,
      restaurantName,
      gstin,
      fssai,
      customerName,
      customerPhone,
      paymentMode,
      subtotal,
      discountType,
      discountValue,
      discountAmount,
      cgst,
      sgst,
      serviceCharge,
      roundOff,
      grandTotal,
      items
    } = editData;

    if (!billId) throw new Error('Missing billId for bill modification');
    if (!reason || !reason.trim()) throw new Error('Mandatory reason required for bill modification');

    // 1. Authorize Manager
    const isAuthorized = (
      (editData.authorizedRole === 'manager' && managerEmail === 'admin@google.in') ||
      (editData.authorizedRole === 'admin') ||
      (managerEmail === 'admin@google.in' && managerPassword === 'Admin@#1234')
    );
    if (!isAuthorized) {
      throw new Error('Unauthorized: Manager credentials required to edit bill');
    }

    const oldBill = this.getBillById(billId);
    if (!oldBill) throw new Error('Bill not found: ' + billId);

    // 2. Compute Changes Summary Diff
    const diffs = [];
    if (restaurantName !== undefined && restaurantName !== oldBill.restaurant_name) {
      diffs.push(`Restaurant: "${oldBill.restaurant_name || 'Default'}" ➔ "${restaurantName}"`);
    }
    if (gstin !== undefined && gstin !== oldBill.gstin) {
      diffs.push(`GSTIN: "${oldBill.gstin || '-'}" ➔ "${gstin}"`);
    }
    if (fssai !== undefined && fssai !== oldBill.fssai) {
      diffs.push(`FSSAI: "${oldBill.fssai || '-'}" ➔ "${fssai}"`);
    }
    if (customerName !== undefined && customerName !== oldBill.customer_name) {
      diffs.push(`Guest: "${oldBill.customer_name || 'Guest'}" ➔ "${customerName}"`);
    }
    if (customerPhone !== undefined && customerPhone !== oldBill.customer_phone) {
      diffs.push(`Phone: "${oldBill.customer_phone || '-'}" ➔ "${customerPhone}"`);
    }
    if (paymentMode && paymentMode !== oldBill.payment_mode) {
      diffs.push(`Pay Mode: ${oldBill.payment_mode.toUpperCase()} ➔ ${paymentMode.toUpperCase()}`);
    }
    if (subtotal !== undefined && Number(subtotal) !== Number(oldBill.subtotal)) {
      diffs.push(`Subtotal: ₹${oldBill.subtotal} ➔ ₹${subtotal}`);
    }
    if (discountAmount !== undefined && Number(discountAmount) !== Number(oldBill.discount_amount)) {
      diffs.push(`Discount: ₹${oldBill.discount_amount} ➔ ₹${discountAmount}`);
    }
    if (cgst !== undefined && (Number(cgst) !== Number(oldBill.cgst) || Number(sgst) !== Number(oldBill.sgst))) {
      diffs.push(`Tax (CGST+SGST): ₹${(oldBill.cgst + oldBill.sgst).toFixed(2)} ➔ ₹${(Number(cgst) + Number(sgst)).toFixed(2)}`);
    }
    if (serviceCharge !== undefined && Number(serviceCharge) !== Number(oldBill.service_charge || 0)) {
      diffs.push(`Service Charge: ₹${oldBill.service_charge || 0} ➔ ₹${serviceCharge}`);
    }
    if (grandTotal !== undefined && Number(grandTotal) !== Number(oldBill.grand_total)) {
      diffs.push(`Grand Total: ₹${oldBill.grand_total} ➔ ₹${grandTotal}`);
    }
    if (items && Array.isArray(items)) {
      diffs.push(`Items modified (${items.length} items)`);
    }

    const changesSummary = diffs.length > 0 ? diffs.join(' | ') : 'Values re-verified by manager';

    db.exec('BEGIN TRANSACTION;');
    try {
      // 3. Update bills table
      db.prepare(`
        UPDATE bills SET
          restaurant_name = COALESCE(?, restaurant_name),
          gstin = COALESCE(?, gstin),
          fssai = COALESCE(?, fssai),
          customer_name = COALESCE(?, customer_name),
          customer_phone = COALESCE(?, customer_phone),
          payment_mode = COALESCE(?, payment_mode),
          subtotal = COALESCE(?, subtotal),
          discount_type = COALESCE(?, discount_type),
          discount_value = COALESCE(?, discount_value),
          discount_amount = COALESCE(?, discount_amount),
          cgst = COALESCE(?, cgst),
          sgst = COALESCE(?, sgst),
          service_charge = COALESCE(?, service_charge),
          round_off = COALESCE(?, round_off),
          grand_total = COALESCE(?, grand_total)
        WHERE id = ?
      `).run(
        restaurantName !== undefined ? restaurantName : null,
        gstin !== undefined ? gstin : null,
        fssai !== undefined ? fssai : null,
        customerName !== undefined ? customerName : null,
        customerPhone !== undefined ? customerPhone : null,
        paymentMode || null,
        subtotal !== undefined ? Number(subtotal) : null,
        discountType || null,
        discountValue !== undefined ? Number(discountValue) : null,
        discountAmount !== undefined ? Number(discountAmount) : null,
        cgst !== undefined ? Number(cgst) : null,
        sgst !== undefined ? Number(sgst) : null,
        serviceCharge !== undefined ? Number(serviceCharge) : null,
        roundOff !== undefined ? Number(roundOff) : null,
        grandTotal !== undefined ? Number(grandTotal) : null,
        billId
      );

      // 4. Update bill_items if passed (Zero Permanent Deletion: soft-archive previous items)
      if (items && Array.isArray(items) && items.length > 0) {
        db.prepare('UPDATE bill_items SET is_archived = 1, archived_at = CURRENT_TIMESTAMP WHERE bill_id = ? AND (is_archived = 0 OR is_archived IS NULL)').run(billId);
        const insertItem = db.prepare('INSERT INTO bill_items (bill_id, item_id, name, price, qty, amount, notes, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?, 0)');
        for (const it of items) {
          insertItem.run(billId, it.id || it.item_id || 'item', it.name, Number(it.price), Number(it.qty), Number(it.price) * Number(it.qty), it.notes || '');
        }
      }

      // 5. Insert audit log record
      const logId = 'BEDT-' + Date.now().toString(36) + '-' + Math.floor(100 + Math.random() * 900);
      const newBill = this.getBillById(billId);

      db.prepare(`
        INSERT INTO bill_edit_logs (
          id, bill_id, invoice_number, manager_email, manager_name, reason,
          previous_data, new_data, changes_summary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        logId,
        billId,
        oldBill.invoice_number,
        managerEmail || 'admin@google.in',
        'Manager (Admin)',
        reason.trim(),
        JSON.stringify(oldBill),
        JSON.stringify(newBill),
        changesSummary
      );

      db.exec('COMMIT;');
      return {
        success: true,
        updatedBill: newBill,
        changesSummary,
        logId
      };
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  },

  getBillEditLogs(billId = null, limit = 50) {
    if (billId) {
      return db.prepare('SELECT * FROM bill_edit_logs WHERE bill_id = ? ORDER BY created_at DESC LIMIT ?').all(billId, limit);
    }
    return db.prepare('SELECT * FROM bill_edit_logs ORDER BY created_at DESC LIMIT ?').all(limit);
  },

  // --- Secret Telemetry & Remote Debugging Audit Logger ---
  logTelemetryBatch(events, clientIp = null) {
    if (!Array.isArray(events) || events.length === 0) return { inserted: 0 };
    
    const insertStmt = db.prepare(`
      INSERT INTO device_telemetry_logs (
        id, device_id, mac_pseudo_address, session_id, event_type, event_name,
        target_element, target_text, touch_x, touch_y,
        current_screen, active_table_id, user_role, user_email,
        client_ip, device_info, event_payload, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN TRANSACTION;');
    let count = 0;
    try {
      for (const ev of events) {
        const id = ev.id || ('TEL-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7));
        const createdAt = ev.created_at || new Date().toISOString();
        const deviceInfo = typeof ev.device_info === 'object' ? JSON.stringify(ev.device_info) : (ev.device_info || null);
        const eventPayload = typeof ev.event_payload === 'object' ? JSON.stringify(ev.event_payload) : (ev.event_payload || null);

        insertStmt.run(
          id,
          ev.device_id || 'unknown-device',
          ev.mac_pseudo_address || (ev.device_info && ev.device_info.mac_pseudo_address) || null,
          ev.session_id || null,
          ev.event_type || 'interaction',
          ev.event_name || null,
          ev.target_element ? String(ev.target_element).substring(0, 255) : null,
          ev.target_text ? String(ev.target_text).substring(0, 100) : null,
          ev.touch_x !== undefined && ev.touch_x !== null ? Math.round(Number(ev.touch_x)) : null,
          ev.touch_y !== undefined && ev.touch_y !== null ? Math.round(Number(ev.touch_y)) : null,
          ev.current_screen || null,
          ev.active_table_id || null,
          ev.user_role || null,
          ev.user_email || null,
          clientIp || ev.client_ip || null,
          deviceInfo,
          eventPayload,
          createdAt
        );
        count++;
      }
      db.exec('COMMIT;');
      return { inserted: count };
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  },

  getTelemetryLogs(filters = {}, limit = 100) {
    let query = 'SELECT * FROM device_telemetry_logs WHERE 1=1';
    const params = [];

    if (filters.deviceId) {
      query += ' AND device_id = ?';
      params.push(filters.deviceId);
    }
    if (filters.eventType) {
      query += ' AND event_type = ?';
      params.push(filters.eventType);
    }
    if (filters.tableId) {
      query += ' AND active_table_id = ?';
      params.push(filters.tableId);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(Math.min(limit, 500));

    return db.prepare(query).all(...params);
  },

  // --- OTA App Updates & Force Update Engine ---
  getAppUpdateInfo() {
    try {
      const row = db.prepare('SELECT * FROM app_updates WHERE id = 1').get();
      if (row) return row;
    } catch (e) {}
    return {
      id: 1,
      current_version: '2.4',
      latest_version: '2.4',
      min_supported_version: '2.4',
      force_update: 0,
      update_title: 'ONYX POS Official Release',
      update_notes: 'Commercial restaurant release',
      apk_url: '/ONYX_POS.apk',
      apk_size: '0.13 MB',
      released_at: new Date().toISOString(),
      updated_by: 'Manager'
    };
  },

  setAppUpdate({ latestVersion, minSupportedVersion, forceUpdate, updateTitle, updateNotes, apkUrl, apkSize, updatedBy }) {
    const current = this.getAppUpdateInfo();
    const updated = {
      latest_version: latestVersion || current.latest_version,
      min_supported_version: minSupportedVersion || current.min_supported_version,
      force_update: (forceUpdate === true || forceUpdate === 1 || forceUpdate === '1') ? 1 : 0,
      update_title: updateTitle || current.update_title,
      update_notes: updateNotes || current.update_notes,
      apk_url: apkUrl || current.apk_url,
      apk_size: apkSize || current.apk_size,
      updated_by: updatedBy || 'Manager'
    };

    db.prepare(`
      INSERT INTO app_updates (id, current_version, latest_version, min_supported_version, force_update, update_title, update_notes, apk_url, apk_size, updated_by, released_at)
      VALUES (1, '2.4', ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        latest_version = excluded.latest_version,
        min_supported_version = excluded.min_supported_version,
        force_update = excluded.force_update,
        update_title = excluded.update_title,
        update_notes = excluded.update_notes,
        apk_url = excluded.apk_url,
        apk_size = excluded.apk_size,
        updated_by = excluded.updated_by,
        released_at = CURRENT_TIMESTAMP
    `).run(
      updated.latest_version,
      updated.min_supported_version,
      updated.force_update,
      updated.update_title,
      updated.update_notes,
      updated.apk_url,
      updated.apk_size,
      updated.updated_by
    );

    return this.getAppUpdateInfo();
  },

  logPaymentFailure(log) {
    const id = 'FAIL-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    this.db.prepare(`
      INSERT INTO payment_failure_logs (id, table_id, table_name, floor, amount, payment_mode, reason, staff_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      id,
      log.table_id || 'T-00',
      log.table_name || 'Table',
      log.floor || 'Ground Floor',
      Number(log.amount) || 0,
      log.payment_mode || 'card',
      log.reason || 'Card Declined',
      log.staff_name || log.waiter_name || 'Staff'
    );
    return { id, success: true, ...log };
  },

  getPaymentFailures(limit = 50) {
    return this.db.prepare(`
      SELECT * FROM payment_failure_logs 
      ORDER BY datetime(created_at) DESC 
      LIMIT ?
    `).all(limit);
  }
};
