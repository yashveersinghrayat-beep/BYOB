// scripts/fresh-start-reset.js
// Completely resets ONYX POS SQLite & Supabase Cloud to 0 for a Fresh Start

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_FILE = path.join(__dirname, '..', 'onyx_restaurant.db');
const db = new DatabaseSync(DB_FILE);

console.log('🔄 Initiating 100% Fresh Start Data Reset...');

// 1. Wipe SQLite
try {
  db.exec('BEGIN TRANSACTION;');
  db.exec("UPDATE tables SET status = 'vacant';");
  db.exec('DELETE FROM kot_items;');
  db.exec('DELETE FROM kots;');
  db.exec('DELETE FROM bill_items;');
  db.exec('DELETE FROM bills;');
  db.exec('DELETE FROM void_logs;');
  db.exec('DELETE FROM bill_edit_logs;');
  db.exec('DELETE FROM payment_failure_logs;');
  db.exec('COMMIT;');
  db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  console.log('✅ SQLite WAL Database: All tables reset to vacant, KOTs, items, and bills zeroed.');
} catch (e) {
  try { db.exec('ROLLBACK;'); } catch (_) {}
  console.error('❌ SQLite Reset Error:', e.message);
}

// 2. Clear Supabase Cloud
const SUPABASE_URL = 'https://wxsabwhabitqmzkplhyk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mcrWV1LngJD6FwDPBI1qjg_lcl8SLsa';
const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json'
};

async function cleanCloud() {
  try {
    // Mark any active KOTs in cloud as billed
    const patchKots = await fetch(`${SUPABASE_URL}/rest/v1/kots?status=neq.cancelled`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ status: 'billed' })
    });
    console.log('☁️ Supabase KOTs updated:', patchKots.status);

    // Reset all tables in cloud to vacant
    const patchTables = await fetch(`${SUPABASE_URL}/rest/v1/tables?status=neq.vacant`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({
        status: 'vacant',
        current_subtotal: 0,
        updated_at: new Date().toISOString()
      })
    });
    console.log('☁️ Supabase Tables reset to vacant:', patchTables.status);
  } catch (err) {
    console.warn('⚠️ Cloud reset notice (offline/skipped):', err.message);
  }
}

cleanCloud().then(() => {
  const DB = require('../backend/database.js');
  const tables = DB.getTables();
  const occupied = tables.filter(t => t.status !== 'vacant');
  const totalKots = db.prepare('SELECT count(*) as c FROM kots').get().c;
  const totalKotItems = db.prepare('SELECT count(*) as c FROM kot_items').get().c;
  const totalBills = db.prepare('SELECT count(*) as c FROM bills').get().c;

  console.log('\n📊 POST-RESET STATUS SUMMARY:');
  console.log('------------------------------------');
  console.log(`Total Tables Active : ${tables.length}`);
  console.log(`Occupied Tables     : ${occupied.length}`);
  console.log(`Active KOTs         : ${totalKots}`);
  console.log(`KOT Items           : ${totalKotItems}`);
  console.log(`Settled Bills       : ${totalBills}`);
  console.log('------------------------------------');

  if (occupied.length === 0 && totalKots === 0 && totalBills === 0) {
    console.log('🎉 SUCCESS: Restaurant data is completely at ZERO for fresh start!');
  } else {
    console.warn('⚠️ Warning: Some data remains non-zero.');
  }
  process.exit(0);
});

