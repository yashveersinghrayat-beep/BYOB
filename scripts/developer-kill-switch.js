// ONYX RESTAURANT OS — Developer Emergency Master Kill-Switch
// Unilateral software developer license enforcement engine

const WS = typeof WebSocket !== 'undefined' ? WebSocket : globalThis.WebSocket;

const SUPABASE_URL = 'https://wxsabwhabitqmzkplhyk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mcrWV1LngJD6FwDPBI1qjg_lcl8SLsa';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'resolution=merge-duplicates'
};

const args = process.argv.slice(2);
const command = args[0] ? args[0].toLowerCase() : '--status';
const reasonArg = args.slice(1).join(' ') || 'COMMERCIAL SOFTWARE LICENSE SUSPENDED: Outstanding developer payment pending. System permanently deactivated.';

async function saveSupabaseSetting(key, value) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/store_settings`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ key, value: String(value), updated_at: new Date().toISOString() })
    });
    return res.ok;
  } catch(e) {
    console.warn(`Supabase error saving ${key}:`, e.message);
    return false;
  }
}

async function broadcastKillViaWebSocket(active, reason) {
  return new Promise((resolve) => {
    try {
      const wsUrl = `${SUPABASE_URL.replace(/^http/, 'ws')}/realtime/v1/websocket?apikey=${SUPABASE_KEY}&vsn=1.0.0`;
      const ws = new WS(wsUrl);

      const timeout = setTimeout(() => {
        try { ws.close(); } catch(e) {}
        resolve(false);
      }, 5000);

      ws.on('open', () => {
        // Join channel
        ws.send(JSON.stringify({
          topic: 'realtime:onyx-pos-live',
          event: 'phx_join',
          payload: { config: { broadcast: { ack: false, self: true } } },
          ref: '1'
        }));

        setTimeout(() => {
          // Broadcast Kill Switch Event to all connected phones, tablets, browsers
          ws.send(JSON.stringify({
            topic: 'realtime:onyx-pos-live',
            event: 'broadcast',
            payload: {
              type: 'broadcast',
              event: 'DEVELOPER_KILL_SWITCH',
              payload: { active, reason, timestamp: Date.now() }
            },
            ref: '2'
          }));

          console.log('⚡ [Realtime WebSocket] DEVELOPER_KILL_SWITCH broadcasted to all connected devices (<25ms)!');
          setTimeout(() => {
            clearTimeout(timeout);
            try { ws.close(); } catch(e) {}
            resolve(true);
          }, 800);
        }, 600);
      });

      ws.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    } catch(e) {
      resolve(false);
    }
  });
}

async function main() {
  console.log('\n================================================================');
  console.log('🛑 ONYX POS — DEVELOPER EMERGENCY MASTER KILL-SWITCH');
  console.log('================================================================\n');

  if (command === '--kill') {
    console.log(`⚠️  ACTIVATING GLOBAL KILL SWITCH...`);
    console.log(`📝 Reason: "${reasonArg}"\n`);

    // 1. Supabase Cloud Sync
    console.log('☁️  Step 1: Writing lock status to Supabase Cloud Database...');
    await saveSupabaseSetting('developer_kill_switch_active', '1');
    await saveSupabaseSetting('developer_kill_switch_reason', reasonArg);
    await saveSupabaseSetting('developer_kill_switch_updated_at', new Date().toISOString());

    // 2. Local SQLite Sync
    console.log('📦 Step 2: Updating local SQLite WAL Database...');
    try {
      const DB = require('../backend/database.js');
      DB.setDeveloperKillSwitch(true, reasonArg);
      console.log('   ✅ Local SQLite database locked.');
    } catch (e) {
      console.log('   ℹ️  Local database not loaded (Cloud updated).');
    }

    // 3. Sub-25ms Real-time WebSocket Broadcast
    console.log('⚡ Step 3: Broadcasting instant kill-switch to all active phones & screens...');
    await broadcastKillViaWebSocket(true, reasonArg);

    console.log('\n🛑 ==============================================================');
    console.log('   ALL APPS & TERMINALS ARE NOW PERMANENTLY LOCKED OUT!');
    console.log('--------------------------------------------------------------');
    console.log('   • Android APKs, waiter phones & PC screens are bricked.');
    console.log('   • Back button, refresh, and manager logins are blocked.');
    console.log('   • To restore once payment is received:');
    console.log('     👉 node scripts/developer-kill-switch.js --restore');
    console.log('==============================================================\n');

  } else if (command === '--restore') {
    console.log('🟢 RESTORING SYSTEM LICENSING & RE-ENABLING ALL APPS...\n');

    // 1. Supabase Cloud Sync
    console.log('☁️  Step 1: Resetting lock in Supabase Cloud Database...');
    await saveSupabaseSetting('developer_kill_switch_active', '0');
    await saveSupabaseSetting('developer_kill_switch_reason', 'System restored by developer.');
    await saveSupabaseSetting('developer_kill_switch_updated_at', new Date().toISOString());

    // 2. Local SQLite Sync
    console.log('📦 Step 2: Unlocking local SQLite WAL Database...');
    try {
      const DB = require('../backend/database.js');
      DB.setDeveloperKillSwitch(false, 'Restored');
      console.log('   ✅ Local SQLite database unlocked.');
    } catch(e) {}

    // 3. Broadcast Restore Event
    console.log('⚡ Step 3: Broadcasting restoration signal to devices...');
    await broadcastKillViaWebSocket(false, 'System restored');

    console.log('\n🎉 ==============================================================');
    console.log('   SYSTEM LICENSING RESTORED! ALL APPS ARE OPERATIONAL.');
    console.log('==============================================================\n');

  } else {
    // Status check
    console.log('🔍 Checking current developer license status...\n');
    let cloudActive = 'Unknown';
    let cloudReason = '';
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/store_settings?select=key,value`, { headers: HEADERS });
      if (res.ok) {
        const rows = await res.json();
        const activeRow = rows.find(r => r.key === 'developer_kill_switch_active');
        const reasonRow = rows.find(r => r.key === 'developer_kill_switch_reason');
        cloudActive = activeRow && activeRow.value === '1' ? '🔴 LOCKED' : '🟢 ACTIVE / UNLOCKED';
        cloudReason = reasonRow ? reasonRow.value : '';
      }
    } catch (e) {
      cloudActive = 'Error connecting to cloud: ' + e.message;
    }

    console.log(`Cloud License Status : ${cloudActive}`);
    if (cloudReason) {
      console.log(`Lock Reason          : ${cloudReason}`);
    }
    console.log('\nAvailable Developer Commands:');
    console.log('  👉 To kill all apps permanently:');
    console.log('     node scripts/developer-kill-switch.js --kill "Payment pending"');
    console.log('  👉 To restore all apps:');
    console.log('     node scripts/developer-kill-switch.js --restore');
    console.log('  👉 To view live installed devices:');
    console.log('     node scripts/check-live-devices.js');
    console.log('================================================================\n');
  }
}

main();
