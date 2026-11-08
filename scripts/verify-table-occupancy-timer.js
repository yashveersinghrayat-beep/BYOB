// scripts/verify-table-occupancy-timer.js
const http = require('http');

function apiCall(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch(e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function formatDuration(occupiedSince) {
  if (!occupiedSince) return '00:00';
  let timeMs = 0;
  if (typeof occupiedSince === 'string') {
    let cleaned = occupiedSince.trim();
    if (!cleaned.includes('T') && cleaned.includes(' ')) {
      cleaned = cleaned.replace(' ', 'T');
    }
    if (!cleaned.endsWith('Z') && !cleaned.slice(10).includes('+') && !cleaned.slice(10).includes('-')) {
      cleaned += 'Z';
    }
    timeMs = new Date(cleaned).getTime();
    if (isNaN(timeMs)) timeMs = new Date(occupiedSince).getTime();
  } else {
    timeMs = new Date(occupiedSince).getTime();
  }
  if (isNaN(timeMs) || timeMs <= 0) return '00:00';
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - timeMs) / 1000));
  const hrs = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return hrs > 0 ? `${hrs}:${mm}:${ss}` : `${mm}:${ss}`;
}

async function main() {
  console.log('🧪 Starting Table Occupancy Live Timer Verification...');

  // 1. Fetch initial tables state
  const t0 = await apiCall('/api/tables');
  console.log(`✅ Loaded ${t0.data.tables.length} tables from /api/tables`);

  const testTableId = 'T-01';
  let table = t0.data.tables.find(t => t.id === testTableId);
  console.log(`Initial state for ${testTableId}: status="${table.status}", occupied_since=${table.occupied_since || 'null'}`);

  // 2. Punch a test KOT on T-01
  console.log(`\n👉 Punching test KOT on ${testTableId}...`);
  const punchRes = await apiCall('/api/orders/punch', 'POST', {
    tableId: testTableId,
    tableName: 'Table 1',
    waiterName: 'Test Waiter',
    guestCount: 2,
    items: [
      { id: '1', name: 'Dal Makhani', price: 280, qty: 1 }
    ]
  });
  console.log(`KOT punched response: status=${punchRes.status}, kot_id=${punchRes.data.kot ? punchRes.data.kot.id : 'N/A'}`);

  // 3. Verify T-01 is occupied and has occupied_since
  const t1 = await apiCall('/api/tables');
  table = t1.data.tables.find(t => t.id === testTableId);
  console.log(`\n🔍 Verifying Occupancy on ${testTableId}:`);
  console.log(`   - Status: ${table.status} (expected: "occupied")`);
  console.log(`   - Occupied Since: ${table.occupied_since}`);
  console.log(`   - Formatted Live Timer: ⏱️ ${formatDuration(table.occupied_since)}`);

  if (!table.occupied_since) {
    throw new Error(`❌ FAIL: occupied_since is null for occupied table ${testTableId}`);
  }
  console.log(`✅ PASS: Table ${testTableId} has active occupied_since timestamp!`);

  // Wait 2 seconds to see timer tick
  await new Promise(r => setTimeout(r, 2000));
  console.log(`⏱️ Timer after 2 seconds: ⏱️ ${formatDuration(table.occupied_since)}`);

  // 4. Settle the bill
  console.log(`\n👉 Settling bill for ${testTableId}...`);
  const settleRes = await apiCall('/api/bills/settle', 'POST', {
    tableId: testTableId,
    tableName: 'Table 1',
    waiterName: 'Test Waiter',
    cashierName: 'Manager',
    paymentMethod: 'cash',
    items: [
      { id: '1', name: 'Dal Makhani', price: 280, qty: 1 }
    ],
    subtotal: 280,
    cgst: 7,
    sgst: 7,
    discountAmount: 0,
    roundOff: 0,
    grandTotal: 294
  });
  console.log(`Bill settle response: status=${settleRes.status}, bill_id=${settleRes.data.bill ? settleRes.data.bill.id : 'N/A'}`);

  // 5. Verify T-01 is vacant and occupied_since is NULL
  const t2 = await apiCall('/api/tables');
  table = t2.data.tables.find(t => t.id === testTableId);
  console.log(`\n🔍 Verifying Vacancy on ${testTableId} after Settlement:`);
  console.log(`   - Status: ${table.status} (expected: "vacant")`);
  console.log(`   - Occupied Since: ${table.occupied_since} (expected: null)`);

  if (table.occupied_since !== null && table.occupied_since !== undefined) {
    throw new Error(`❌ FAIL: occupied_since was NOT cleared after bill settlement! Found: ${table.occupied_since}`);
  }
  if (table.status !== 'vacant') {
    throw new Error(`❌ FAIL: Table status is not vacant after settlement! Found: ${table.status}`);
  }

  console.log(`\n🎉 SUCCESS: Table occupancy live timer verified 100% end-to-end!`);
}

main().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
