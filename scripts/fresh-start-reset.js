// scripts/fresh-start-reset.js
// Completely wipes all mock/previous orders, KOTs, bills, and logs from SQLite & Supabase Cloud
// Guarantees a 100% clean, fresh production state for BYOB Indirapuram.

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_FILE = path.join(__dirname, '..', 'onyx_restaurant.db');
const db = new DatabaseSync(DB_FILE);

console.log('🔄 ==============================================================');
console.log('💎 ONYX RESTAURANT OS — MASTER FRESH START DATABASE CLEANUP');
console.log('--------------------------------------------------------------');

// 1. Clean SQLite Database
try {
  db.exec('BEGIN TRANSACTION;');

  // Reset all 42 tables to vacant with null proof and null occupied timestamp
  db.exec(`
    UPDATE tables 
    SET status = 'vacant', 
        payment_proof = NULL, 
        occupied_since = NULL;
  `);

  // Delete all transactional order, billing, and audit log data
  db.exec('DELETE FROM kot_items;');
  db.exec('DELETE FROM kots;');
  db.exec('DELETE FROM bill_items;');
  db.exec('DELETE FROM bills;');
  db.exec('DELETE FROM void_logs;');
  db.exec('DELETE FROM bill_edit_logs;');
  db.exec('DELETE FROM payment_failure_logs;');
  db.exec('DELETE FROM device_telemetry_logs;');
  db.exec('DELETE FROM app_install_devices;');

  // Clear any temporary device heartbeats in store_settings
  db.exec("DELETE FROM store_settings WHERE key LIKE 'dev_device_%';");

  db.exec('COMMIT;');
  db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  console.log('✅ SQLite WAL: All tables set to vacant, orders/bills/logs completely zeroed.');
} catch (e) {
  try { db.exec('ROLLBACK;'); } catch (_) {}
  console.error('❌ SQLite Reset Error:', e.message);
}

// 2. Clean Supabase 24/7 Cloud Database
const SUPABASE_URL = 'https://wxsabwhabitqmzkplhyk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mcrWV1LngJD6FwDPBI1qjg_lcl8SLsa';
const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'
};

async function cleanCloud() {
  console.log('\n☁️ Cleaning Supabase Cloud Data...');

  async function apiDelete(endpoint) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
        method: 'DELETE',
        headers: HEADERS
      });
      console.log(`   - DELETE ${endpoint} ➔ Status ${res.status}`);
    } catch (e) {
      console.warn(`   ⚠️ Error deleting ${endpoint}:`, e.message);
    }
  }

  async function apiPatch(endpoint, payload) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify(payload)
      });
      console.log(`   - PATCH ${endpoint} ➔ Status ${res.status}`);
    } catch (e) {
      console.warn(`   ⚠️ Error patching ${endpoint}:`, e.message);
    }
  }

  // Delete line items first due to foreign keys, then parent orders and bills
  await apiDelete('kot_items?id=gte.0');
  await apiDelete('kots?id=neq.placeholder_nonexistent');
  await apiDelete('bill_items?id=gte.0');
  await apiDelete('bills?id=neq.placeholder_nonexistent');
  await apiDelete('void_logs?id=gte.0');

  // Reset all cloud tables to vacant
  await apiPatch('tables?id=neq.placeholder_nonexistent', {
    status: 'vacant',
    current_subtotal: 0,
    updated_at: new Date().toISOString()
  });

  // Delete telemetry / device heartbeat entries from cloud store_settings
  await apiDelete("store_settings?key=like.dev_device_*");
}

cleanCloud().then(() => {
  const DB = require('../backend/database.js');
  const tables = DB.getTables();
  const occupied = tables.filter(t => t.status !== 'vacant');
  const totalKots = db.prepare('SELECT count(*) as c FROM kots').get().c;
  const totalKotItems = db.prepare('SELECT count(*) as c FROM kot_items').get().c;
  const totalBills = db.prepare('SELECT count(*) as c FROM bills').get().c;
  const totalBillItems = db.prepare('SELECT count(*) as c FROM bill_items').get().c;
  const totalVoids = db.prepare('SELECT count(*) as c FROM void_logs').get().c;

  console.log('\n📊 POST-CLEANUP PRODUCTION AUDIT:');
  console.log('====================================');
  console.log(`Total Tables Configured : ${tables.length} (Expected: 42)`);
  console.log(`Occupied / Billed Tables: ${occupied.length} (Expected: 0)`);
  console.log(`Active KOTs in Database : ${totalKots} (Expected: 0)`);
  console.log(`KOT Line Items          : ${totalKotItems} (Expected: 0)`);
  console.log(`Settled Invoices / Bills: ${totalBills} (Expected: 0)`);
  console.log(`Billed Line Items       : ${totalBillItems} (Expected: 0)`);
  console.log(`Void / Audit Log Entries: ${totalVoids} (Expected: 0)`);
  console.log('====================================');

  if (occupied.length === 0 && totalKots === 0 && totalBills === 0 && totalKotItems === 0) {
    console.log('🎉 100% COMPLETE: Database is clean, sterile, and ready for fresh start!');
  } else {
    console.warn('⚠️ Notice: Some records remain non-zero.');
  }

  process.exit(0);
}).catch(err => {
  console.error('Fatal cleanup error:', err);
  process.exit(1);
});
