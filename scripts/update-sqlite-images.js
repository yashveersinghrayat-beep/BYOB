const DB = require('../backend/database.js');
const db = require('../backend/database.js').db || require('better-sqlite3')('onyx_restaurant.db');

console.log('🔄 Updating SQLite menu_items with local verified dish images...');

const stmt = db.prepare("UPDATE menu_items SET image = 'images/dishes/' || id || '.jpg' WHERE id LIKE 'm_%' OR id LIKE 'v_%' OR id LIKE 'nv_%' OR id LIKE 'p_%' OR id LIKE 'mc_%' OR id LIKE 'b_%' OR id LIKE 's_%' OR id LIKE 'd_%' OR id LIKE 'x_%'");
const info = stmt.run();
console.log('✅ Updated rows in SQLite:', info.changes);

const sample = db.prepare('SELECT id, name, image FROM menu_items LIMIT 5').all();
console.log('Sample rows:', sample);

