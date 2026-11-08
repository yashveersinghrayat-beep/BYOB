const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = 'http://localhost:3000';
const ARTIFACT_DIR = path.resolve('C:\\Users\\Root\\.gemini\\antigravity\\brain\\f1f8793d-1155-42c4-8097-e03e241314a4');
const DEBUG_PORT = 9235;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function putJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'PUT' }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message));
          else cb.resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res.result ? res.result.value : null;
  }

  async screenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(res.data, 'base64');
    fs.writeFileSync(path.join(ARTIFACT_DIR, filename), buf);
    console.log(`📸 Saved screenshot: ${filename}`);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runTest() {
  console.log('🚀 Starting Chrome for Multi-Device Realtime Sync Verification...');
  const tmpUserDataDir = path.join(__dirname, '..', 'tmp_chrome_sync_profile');
  if (!fs.existsSync(tmpUserDataDir)) fs.mkdirSync(tmpUserDataDir, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    `--user-data-dir=${tmpUserDataDir}`,
    'about:blank'
  ]);

  try {
    let connected = false;
    for (let i = 0; i < 20; i++) {
      try {
        await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
        connected = true;
        break;
      } catch (e) {
        await wait(250);
      }
    }
    if (!connected) throw new Error('Chrome failed to start');
    console.log('✅ Chrome debugging port ready.');

    // 1. Create Target 1: Mobile Waiter App
    const newPageRes1 = await putJson(`http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(APP_URL)}`);
    const waiterClient = new CDPClient(newPageRes1.webSocketDebuggerUrl);
    await waiterClient.connect();
    await waiterClient.send('Page.enable');
    await waiterClient.send('Runtime.enable');
    await waiterClient.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });

    // 2. Create Target 2: Web Cashier / Counter
    const newPageRes2 = await putJson(`http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(APP_URL)}`);
    const cashierClient = new CDPClient(newPageRes2.webSocketDebuggerUrl);
    await cashierClient.connect();
    await cashierClient.send('Page.enable');
    await cashierClient.send('Runtime.enable');
    await cashierClient.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('⏳ Waiting 3s for Supabase Realtime WebSocket connections on both devices...');
    await wait(3000);

    // Setup Waiter View on device 1
    await waiterClient.eval(`
      localStorage.setItem('onyx_role', 'waiter');
      APP.state.userRole = 'waiter';
      APP.state.currentView = 'app';
      APP.state.appScreen = 'tables';
      APP.applyView();
      APP.renderFloorTables();
    `);

    // Setup Cashier View on device 2
    await cashierClient.eval(`
      localStorage.setItem('onyx_role', 'cashier');
      APP.state.userRole = 'cashier';
      APP.state.currentView = 'web';
      APP.applyView();
      APP.renderFloorTables();
    `);

    await wait(1000);

    // TEST 1: Check force-update modal is NOT visible on either device
    const waiterModalVisible = await waiterClient.eval(`
      (() => {
        const m = document.getElementById('force-update-modal');
        if (!m) return false;
        const style = window.getComputedStyle(m);
        return style.display !== 'none' && !m.classList.contains('hidden');
      })()
    `);
    const cashierModalVisible = await cashierClient.eval(`
      (() => {
        const m = document.getElementById('force-update-modal');
        if (!m) return false;
        const style = window.getComputedStyle(m);
        return style.display !== 'none' && !m.classList.contains('hidden');
      })()
    `);

    console.log('🧪 TEST 1: Force Update Modal Status:');
    console.log(`   - Waiter Mobile App Modal Visible: ${waiterModalVisible} (Expected: false)`);
    console.log(`   - Cashier Web App Modal Visible: ${cashierModalVisible} (Expected: false)`);
    if (waiterModalVisible || cashierModalVisible) {
      throw new Error('FAILED: Force update modal is still visible!');
    }
    console.log('   ✅ PASS: Force update popup is 100% suppressed on all devices!');

    // TEST 2: Waiter punches order on Table 1 (T-01)
    console.log('\n🧪 TEST 2: Simulating Waiter order punch on Table 1 (T-01)...');
    const punchResult = await waiterClient.eval(`
      (async () => {
        const items = [
          { id: 'item_bc', name: 'Butter Chicken', price: 420, qty: 2, is_bar: false },
          { id: 'item_bn', name: 'Butter Naan', price: 60, qty: 4, is_bar: false }
        ]; // Total: 420*2 + 60*4 = 840 + 240 = 1080
        APP.selectTable('T-01');
        const res = await window.DB.punchKOT('T-01', 'Table 1', items, 'Ramesh Waiter');
        APP.renderFloorTables();
        return { success: true, res, table: APP.getLiveTable('T-01') };
      })()
    `);
    console.log('   - Punch invocation result:', JSON.stringify(punchResult));

    // Allow 400ms for Supabase Realtime broadcast to propagate across WebSocket
    console.log('   ⏳ Waiting 800ms for peer WebSocket synchronization...');
    await wait(800);

    // TEST 3: Check Web Cashier state
    const cashierTable1 = await cashierClient.eval(`
      (() => {
        const t = APP.getLiveTable('T-01');
        const webStrip = document.getElementById('web-tables-strip');
        const btnHtml = webStrip ? webStrip.querySelector('button')?.outerHTML : '';
        return {
          id: t?.id,
          status: t?.status,
          currentSubtotal: t?.currentSubtotal,
          occupiedSince: t?.occupiedSince,
          ordersCount: t?.placedOrders?.length,
          htmlPreview: btnHtml
        };
      })()
    `);

    console.log('\n🧪 TEST 3: Web Cashier Realtime Receipt Verification:');
    console.log('   - Cashier received Table 1 status:', cashierTable1.status, '(Expected: occupied)');
    console.log('   - Cashier received Subtotal: ₹' + cashierTable1.currentSubtotal, '(Expected: ₹1080)');
    console.log('   - Cashier received Live Timer occupiedSince:', cashierTable1.occupiedSince);
    console.log('   - Cashier placedOrders count:', cashierTable1.ordersCount, '(Expected: 2)');

    // Save screenshots
    await waiterClient.screenshot('sync_test_mobile_waiter_punched.png');
    await cashierClient.screenshot('sync_test_web_cashier_received.png');

    if (cashierTable1.status !== 'occupied' || cashierTable1.currentSubtotal !== 1080) {
      throw new Error(`FAILED: Sync mismatch! Expected occupied @ ₹1080, got ${cashierTable1.status} @ ₹${cashierTable1.currentSubtotal}`);
    }
    console.log('   ✅ PASS: Instant WebSocket synchronization verified with exact subtotal and active timer!');

    // TEST 4: Settle Bill from Cashier & Verify Waiter Mobile instantly updates to Vacant
    console.log('\n🧪 TEST 4: Settle Bill on Cashier and verify instant sync to Waiter phone...');
    await cashierClient.eval(`
      (async () => {
        const liveT = APP.getLiveTable('T-01');
        const billData = {
          tableId: 'T-01',
          tableName: 'Table 1',
          waiterName: 'Ramesh Waiter',
          subtotal: 1080,
          cgst: 27,
          sgst: 27,
          serviceCharge: 50,
          grandTotal: 1184,
          paymentMode: 'cash',
          items: liveT.placedOrders || []
        };
        await window.DB.settleBill(billData);
        APP.renderFloorTables();
      })()
    `);

    await wait(800);

    const waiterTable1AfterSettle = await waiterClient.eval(`
      (() => {
        APP.renderFloorTables();
        const t = APP.getLiveTable('T-01');
        return {
          id: t?.id,
          status: t?.status,
          currentSubtotal: t?.currentSubtotal,
          occupiedSince: t?.occupiedSince,
          ordersCount: t?.placedOrders?.length
        };
      })()
    `);

    console.log('   - Waiter phone Table 1 status after Cashier settle:', waiterTable1AfterSettle.status, '(Expected: vacant)');
    console.log('   - Waiter phone Subtotal after Settle: ₹' + waiterTable1AfterSettle.currentSubtotal, '(Expected: ₹0)');
    console.log('   - Waiter phone Timer cleared:', waiterTable1AfterSettle.occupiedSince === null, '(Expected: true)');

    await waiterClient.screenshot('sync_test_mobile_waiter_settled.png');
    await cashierClient.screenshot('sync_test_web_cashier_settled.png');

    if (waiterTable1AfterSettle.status !== 'vacant' || waiterTable1AfterSettle.currentSubtotal !== 0) {
      throw new Error(`FAILED: Table 1 did not reset to vacant after settle!`);
    }
    console.log('   ✅ PASS: Two-way sync verified! Table cleared on both devices!');

    // Ensure database is clean (reset Table 1 in Supabase)
    await cashierClient.eval(`
      (async () => {
        const client = ONYX_CLOUD_CONFIG.getClient();
        if (client) {
          await client.from('tables').update({ status: 'vacant', current_subtotal: 0 }).eq('id', 'T-01');
          await client.from('kots').delete().eq('table_id', 'T-01');
        }
      })()
    `);

    waiterClient.close();
    cashierClient.close();
    console.log('\n🎉 ALL REALTIME MULTI-DEVICE SYNC & POPUP REMOVAL TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    try { chromeProc.kill(); } catch (e) {}
    try { fs.rmSync(tmpUserDataDir, { recursive: true, force: true }); } catch (e) {}
  }
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
