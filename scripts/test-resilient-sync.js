const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = 'http://localhost:3000';
const ARTIFACT_DIR = path.resolve('C:\\Users\\Root\\.gemini\\antigravity\\brain\\f1f8793d-1155-42c4-8097-e03e241314a4');
const DEBUG_PORT = 9240;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  console.log('🚀 Starting Resilient Multi-Device Sync Verification...');
  const tmpUserDataDir = path.join(__dirname, '..', 'tmp_chrome_resilient_profile');
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

    // 1. Target 1: Mobile Waiter App
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

    // 2. Target 2: Web Cashier / Counter
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

    console.log('⏳ Waiting 3s for Supabase Cloud initialization...');
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

    // Initial check: verify both devices see the currently occupied tables from Supabase
    const waiterInitial = await waiterClient.eval(`
      (() => {
        return {
          t1: APP.getLiveTable('T-01')?.status,
          t2: APP.getLiveTable('T-02')?.status,
          pollerActive: !!window.DB?._cloudReconcileTimer
        };
      })()
    `);
    console.log('📊 Waiter phone initial state from Supabase Cloud:', waiterInitial);

    // TEST 1: Cashier punches Table 3
    console.log('\n🧪 TEST 1: Cashier punches Table 3 (T-03) on Web App...');
    await cashierClient.eval(`
      (async () => {
        APP.selectTable('T-03');
        const items = [{ id: 'item_dal', name: 'Dal Makhani', price: 280, qty: 1, is_bar: false }];
        await window.DB.punchKOT('T-03', 'Table 3', items, 'Counter Cashier');
        APP.renderFloorTables();
      })()
    `);

    // Wait 2.5s (peer broadcast + poller interval)
    console.log('⏳ Waiting 2.5s for real-time propagation to Waiter phone...');
    await wait(2500);

    const waiterTable3State = await waiterClient.eval(`
      (() => {
        const t3 = APP.getLiveTable('T-03');
        return {
          id: t3?.id,
          status: t3?.status,
          currentSubtotal: t3?.currentSubtotal,
          occupiedSince: t3?.occupiedSince
        };
      })()
    `);
    console.log('   - Waiter phone Table 3 state:', waiterTable3State);
    if (waiterTable3State.status !== 'occupied') {
      throw new Error('FAILED: Waiter phone did not show Table 3 as occupied!');
    }
    console.log('   ✅ PASS: Table 3 instantly synced to Waiter phone without app restart!');

    // TEST 2: Simulate missed broadcast (manually reset local memory of T-03 to vacant on Waiter phone)
    console.log('\n🧪 TEST 2: Testing automatic background poller reconciliation (simulating missed packet)...');
    await waiterClient.eval(`
      (() => {
        const t3 = window.DB.tables.find(t => t.id === 'T-03');
        if (t3) {
          t3.status = 'vacant';
          t3.currentSubtotal = 0;
          t3.placedOrders = [];
        }
        APP.renderFloorTables();
      })()
    `);

    const waiterSimulatedMiss = await waiterClient.eval(`APP.getLiveTable('T-03')?.status`);
    console.log('   - Simulated missed packet, Table 3 temporarily vacant locally:', waiterSimulatedMiss);

    console.log('   ⏳ Waiting 2.5s for background poller to auto-heal from Supabase...');
    await wait(2600);

    const waiterAutoHealed = await waiterClient.eval(`
      (() => {
        const t3 = APP.getLiveTable('T-03');
        return {
          status: t3?.status,
          currentSubtotal: t3?.currentSubtotal
        };
      })()
    `);
    console.log('   - Waiter phone after 2.5s auto-reconciliation:', waiterAutoHealed);
    if (waiterAutoHealed.status !== 'occupied') {
      throw new Error('FAILED: Background poller did not auto-heal Table 3!');
    }
    console.log('   ✅ PASS: Continuous 2s poller auto-healed Table 3 to occupied without user doing anything!');

    // Save screenshots
    await waiterClient.screenshot('resilient_sync_mobile_healed.png');
    await cashierClient.screenshot('resilient_sync_web_cashier.png');

    // Clean up T-03 in Supabase
    await cashierClient.eval(`
      (async () => {
        const client = ONYX_CLOUD_CONFIG.getClient();
        if (client) {
          await client.from('tables').update({ status: 'vacant', current_subtotal: 0 }).eq('id', 'T-03');
          await client.from('kots').delete().eq('table_id', 'T-03');
        }
      })()
    `);

    waiterClient.close();
    cashierClient.close();
    console.log('\n🎉 ALL RESILIENT SYNC TESTS PASSED SUCCESSFULLY!');
  } finally {
    try { chromeProc.kill(); } catch (e) {}
    try { fs.rmSync(tmpUserDataDir, { recursive: true, force: true }); } catch (e) {}
  }
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
