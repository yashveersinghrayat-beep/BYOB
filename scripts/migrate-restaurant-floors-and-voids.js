// Migration Script: 3 Floors (35 Tables) + Void Audit Fields (Device ID, Staff Name)
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'onyx_restaurant.db');
const db = new DatabaseSync(DB_FILE);

console.log('🔄 MIGRATING RESTAURANT DATABASE TO 3 FLOORS (35 TABLES) & ANTI-THEFT AUDIT...');

// 1. Ensure columns in tables
try {
  db.exec("ALTER TABLE tables ADD COLUMN floor TEXT DEFAULT '1st Floor';");
  console.log('✅ Added floor column to tables');
} catch (e) {
  // column already exists
}

// 2. Ensure columns in void_logs
const voidCols = [
  "ALTER TABLE void_logs ADD COLUMN floor TEXT DEFAULT '1st Floor';",
  "ALTER TABLE void_logs ADD COLUMN amount REAL DEFAULT 0;",
  "ALTER TABLE void_logs ADD COLUMN staff_name TEXT DEFAULT 'Staff';",
  "ALTER TABLE void_logs ADD COLUMN device_id TEXT DEFAULT 'UNKNOWN-DEVICE';",
  "ALTER TABLE void_logs ADD COLUMN device_info TEXT;",
  "ALTER TABLE void_logs ADD COLUMN client_ip TEXT;"
];

for (const sql of voidCols) {
  try {
    db.exec(sql);
  } catch (e) {
    // already exists
  }
}
console.log('✅ void_logs columns verified');

// 3. Define 35 Tables across 3 Floors
const tablesList = [
  // --- 1st FLOOR: 15 TABLES (T-01 to T-15) ---
  { id: 'T-01', name: 'Table 1', floor: '1st Floor', position: 'Front • Left', landmark: 'Front Entrance Window', seats: 4, sort_order: 1 },
  { id: 'T-02', name: 'Table 2', floor: '1st Floor', position: 'Front • Center', landmark: 'Near Cashier Counter', seats: 6, sort_order: 2 },
  { id: 'T-03', name: 'Table 3', floor: '1st Floor', position: 'Front • Right', landmark: 'Front Wall Sofas', seats: 4, sort_order: 3 },
  { id: 'T-04', name: 'Table 4', floor: '1st Floor', position: 'Middle • Left', landmark: 'Center Hall Left Column', seats: 4, sort_order: 4 },
  { id: 'T-05', name: 'Table 5', floor: '1st Floor', position: 'Middle • Center', landmark: 'Center Main Pathway', seats: 8, sort_order: 5 },
  { id: 'T-06', name: 'Table 6', floor: '1st Floor', position: 'Middle • Right', landmark: 'Center Hall Right Column', seats: 6, sort_order: 6 },
  { id: 'T-07', name: 'Table 7', floor: '1st Floor', position: 'Courtyard • Left', landmark: 'Near Pillar Left', seats: 4, sort_order: 7 },
  { id: 'T-08', name: 'Table 8', floor: '1st Floor', position: 'Courtyard • Center', landmark: 'Center Pathway South', seats: 4, sort_order: 8 },
  { id: 'T-09', name: 'Table 9', floor: '1st Floor', position: 'Courtyard • Right', landmark: 'Beside Wall Woodwork', seats: 4, sort_order: 9 },
  { id: 'T-10', name: 'Table 10', floor: '1st Floor', position: 'Back • Left', landmark: 'Near Restrooms & AC Vent', seats: 6, sort_order: 10 },
  { id: 'T-11', name: 'Table 11', floor: '1st Floor', position: 'Back • Center', landmark: 'Front of Bar Counter', seats: 8, sort_order: 11 },
  { id: 'T-12', name: 'Table 12', floor: '1st Floor', position: 'Back • Right', landmark: 'Adjacent to Mixer Station', seats: 4, sort_order: 12 },
  { id: 'T-13', name: 'Table 13', floor: '1st Floor', position: 'Lounge • Corner', landmark: 'Ground Floor Corner Booth', seats: 6, sort_order: 13 },
  { id: 'T-14', name: 'Table 14', floor: '1st Floor', position: 'Lounge • Center', landmark: 'Ground Floor Family Booth', seats: 6, sort_order: 14 },
  { id: 'T-15', name: 'Table 15', floor: '1st Floor', position: 'VIP • Ground', landmark: 'Ground Floor VIP Enclosure', seats: 8, sort_order: 15 },

  // --- 2nd FLOOR: 10 TABLES (T-16 to T-25) ---
  { id: 'T-16', name: 'Table 16', floor: '2nd Floor', position: '2nd Fl • Front Left', landmark: 'Balcony View Left', seats: 4, sort_order: 16 },
  { id: 'T-17', name: 'Table 17', floor: '2nd Floor', position: '2nd Fl • Front Center', landmark: 'Balcony Center Railing', seats: 6, sort_order: 17 },
  { id: 'T-18', name: 'Table 18', floor: '2nd Floor', position: '2nd Fl • Front Right', landmark: 'Balcony View Right', seats: 4, sort_order: 18 },
  { id: 'T-19', name: 'Table 19', floor: '2nd Floor', position: '2nd Fl • Hall Left', landmark: 'AC Dining Hall Left', seats: 4, sort_order: 19 },
  { id: 'T-20', name: 'Table 20', floor: '2nd Floor', position: '2nd Fl • Hall Center', landmark: 'AC Dining Hall Main', seats: 8, sort_order: 20 },
  { id: 'T-21', name: 'Table 21', floor: '2nd Floor', position: '2nd Fl • Hall Right', landmark: 'AC Dining Hall Right', seats: 6, sort_order: 21 },
  { id: 'T-22', name: 'Table 22', floor: '2nd Floor', position: '2nd Fl • Family Booth', landmark: 'Private Family Section 1', seats: 6, sort_order: 22 },
  { id: 'T-23', name: 'Table 23', floor: '2nd Floor', position: '2nd Fl • Family Booth', landmark: 'Private Family Section 2', seats: 6, sort_order: 23 },
  { id: 'T-24', name: 'Table 24', floor: '2nd Floor', position: '2nd Fl • VIP Lounge', landmark: 'Executive VIP Lounge 1', seats: 8, sort_order: 24 },
  { id: 'T-25', name: 'Table 25', floor: '2nd Floor', position: '2nd Fl • VIP Lounge', landmark: 'Executive VIP Lounge 2', seats: 10, sort_order: 25 },

  // --- ROOFTOP: 10 TABLES (T-26 to T-35) ---
  { id: 'T-26', name: 'Table 26', floor: 'Rooftop', position: 'Rooftop • Sky View 1', landmark: 'North Sky View Railing', seats: 4, sort_order: 26 },
  { id: 'T-27', name: 'Table 27', floor: 'Rooftop', position: 'Rooftop • Sky View 2', landmark: 'North Sky View Center', seats: 6, sort_order: 27 },
  { id: 'T-28', name: 'Table 28', floor: 'Rooftop', position: 'Rooftop • Sky View 3', landmark: 'North Sky View Right', seats: 4, sort_order: 28 },
  { id: 'T-29', name: 'Table 29', floor: 'Rooftop', position: 'Rooftop • Garden 1', landmark: 'Terrace Garden Left', seats: 4, sort_order: 29 },
  { id: 'T-30', name: 'Table 30', floor: 'Rooftop', position: 'Rooftop • Garden 2', landmark: 'Terrace Garden Center Pergola', seats: 8, sort_order: 30 },
  { id: 'T-31', name: 'Table 31', floor: 'Rooftop', position: 'Rooftop • Garden 3', landmark: 'Terrace Garden Right', seats: 6, sort_order: 31 },
  { id: 'T-32', name: 'Table 32', floor: 'Rooftop', position: 'Rooftop • Cabana 1', landmark: 'Luxury Open Air Cabana 1', seats: 6, sort_order: 32 },
  { id: 'T-33', name: 'Table 33', floor: 'Rooftop', position: 'Rooftop • Cabana 2', landmark: 'Luxury Open Air Cabana 2', seats: 8, sort_order: 33 },
  { id: 'T-34', name: 'Table 34', floor: 'Rooftop', position: 'Rooftop • Live Bar', landmark: 'Beside Rooftop Live Bar', seats: 4, sort_order: 34 },
  { id: 'T-35', name: 'Table 35', floor: 'Rooftop', position: 'Rooftop • Sunset Deck', landmark: 'Sunset Horizon Deck', seats: 10, sort_order: 35 }
];

const upsert = db.prepare(`
  INSERT INTO tables (id, name, floor, position, landmark, seats, sort_order, active)
  VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    floor = excluded.floor,
    position = excluded.position,
    landmark = excluded.landmark,
    seats = excluded.seats,
    sort_order = excluded.sort_order,
    active = 1
`);

for (const t of tablesList) {
  upsert.run(t.id, t.name, t.floor, t.position, t.landmark, t.seats, t.sort_order);
}

const total = db.prepare("SELECT COUNT(*) as count FROM tables WHERE active = 1").get();
console.log(`🎉 Total Active Tables in Database: ${total.count}`);

// Count per floor
const floorCounts = db.prepare("SELECT floor, COUNT(*) as count FROM tables WHERE active = 1 GROUP BY floor ORDER BY min(sort_order)").all();
console.table(floorCounts);

db.close();
