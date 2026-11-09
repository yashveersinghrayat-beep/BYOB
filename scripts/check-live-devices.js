// ONYX RESTAURANT OS — Developer Live Devices Monitor
// Real-time audit of all installed devices, handhelds, and active terminals across cloud and local network

const fs = require('fs');
const path = require('path');

// Branch Registry for Multi-Location Monitoring
const BRANCH_REGISTRY = {
  gyankhand: {
    name: 'BYOB Gyan Khand 2 (Indirapuram)',
    url: 'https://wxsabwhabitqmzkplhyk.supabase.co',
    key: 'sb_publishable_mcrWV1LngJD6FwDPBI1qjg_lcl8SLsa'
  },
  aditya: {
    name: 'BYOB Aditya Mall (Indirapuram)',
    url: process.env.ADITYA_SUPABASE_URL || 'PENDING_ADITYA_SETUP',
    key: process.env.ADITYA_SUPABASE_KEY || 'PENDING_ADITYA_SETUP'
  }
};

const branchArg = (process.argv.find(a => a.startsWith('--branch=')) || '--branch=gyankhand').split('=')[1].toLowerCase();
const activeBranch = BRANCH_REGISTRY[branchArg] || BRANCH_REGISTRY.gyankhand;

const SUPABASE_URL = activeBranch.url;
const SUPABASE_KEY = activeBranch.key;

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

async function checkLiveDevices() {
  console.log('\n================================================================');
  console.log('📡 ONYX POS — REAL-TIME LIVE DEVICES & INSTALLATIONS MONITOR');
  console.log('================================================================\n');

  let cloudDevices = [];
  let isKillActive = false;
  let killReason = '';

  // 1. Fetch from Supabase Cloud
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/store_settings?select=key,value,updated_at`, { headers: HEADERS });
    if (res.ok) {
      const rows = await res.json();
      for (const row of rows) {
        if (row.key === 'developer_kill_switch_active') {
          isKillActive = String(row.value).trim() === '1';
        }
        if (row.key === 'developer_kill_switch_reason') {
          killReason = row.value;
        }
        if (row.key && row.key.startsWith('dev_device_')) {
          try {
            const parsed = JSON.parse(row.value);
            cloudDevices.push({ ...parsed, updatedAt: row.updated_at });
          } catch(e) {}
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ Cloud fetch error (checking local SQLite):', err.message);
  }

  // 2. Fetch from Local SQLite WAL (if present)
  let localDevices = [];
  try {
    const DB = require('../backend/database.js');
    localDevices = DB.getActiveDevices();
    if (!isKillActive) {
      isKillActive = DB.isDeveloperKillSwitchActive();
    }
  } catch (e) {}

  // Merge unique devices by deviceId
  const deviceMap = new Map();
  for (const d of cloudDevices) {
    deviceMap.set(d.deviceId, d);
  }
  for (const d of localDevices) {
    if (!deviceMap.has(d.device_id)) {
      deviceMap.set(d.device_id, {
        deviceId: d.device_id,
        deviceModel: d.device_model,
        platform: d.platform,
        appVersion: d.app_version,
        role: d.role,
        lastSeen: d.last_heartbeat_at,
        isLive: d.is_live === 1
      });
    }
  }

  const allDevices = Array.from(deviceMap.values());
  const now = Date.now();

  const enriched = allDevices.map(d => {
    let seenMs = 0;
    if (d.lastSeen) {
      // Handle both ISO strings and SQLite 'YYYY-MM-DD HH:MM:SS' UTC format
      const isoStr = String(d.lastSeen).includes('T') ? d.lastSeen : (String(d.lastSeen).replace(' ', 'T') + 'Z');
      seenMs = new Date(isoStr).getTime();
    }
    const diffSec = Math.max(0, Math.round((now - seenMs) / 1000));
    const isOnline = diffSec >= 0 && diffSec < 120; // Active within last 2 minutes
    return { ...d, diffSec, isOnline };
  });

  const totalInstalled = enriched.length;
  const liveCount = enriched.filter(d => d.isOnline).length;

  console.log(`🛡️  System Developer Lock Status: ${isKillActive ? '🔴 PERMANENTLY LOCKED' : '🟢 ACTIVE & LICENSED'}`);
  if (isKillActive) {
    console.log(`   Reason: ${killReason}`);
  }
  console.log(`📱 Total Unique App Installations: ${totalInstalled}`);
  console.log(`⚡ Currently LIVE & Connected Online (Last 2m): ${liveCount}\n`);
  console.log('----------------------------------------------------------------');

  if (enriched.length === 0) {
    console.log('ℹ️  No device heartbeats recorded yet. Launch an app/phone to see it register here in real-time.');
  } else {
    enriched.forEach((d, idx) => {
      const statusIcon = d.isOnline ? '🟢 LIVE' : '⚪ OFFLINE';
      const timeStr = d.isOnline ? `${d.diffSec}s ago` : `${Math.round(d.diffSec / 60)}m ago`;
      console.log(`[${idx + 1}] ${statusIcon} • ID: ${d.deviceId.padEnd(14)} • Model: ${(d.deviceModel || 'Unknown').padEnd(20)}`);
      console.log(`    Platform: ${(d.platform || 'app').padEnd(12)} • Version: ${(d.appVersion || '5.1').padEnd(6)} • Role: ${(d.role || 'waiter').padEnd(10)} • Staff: ${d.staffName || 'Staff'}`);
      console.log(`    Last Heartbeat: ${d.lastSeen || 'Never'} (${timeStr})`);
      console.log('');
    });
  }

  console.log('================================================================\n');
}

checkLiveDevices();
