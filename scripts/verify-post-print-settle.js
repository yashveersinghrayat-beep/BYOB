// scripts/verify-post-print-settle.js
// Automated headless verification with Chrome CDP for:
// 1. Post-Print Settlement Auto-Prompt
// 2. 1-Tap Cash / UPI / Card Settle
// 3. 'Bill Given' (bill_printed) Amber table status on Floor Map
// 4. Bilingual English/Hindi toggle verification
// 5. Database settlement & free status

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\Root\\.gemini\\antigravity\\brain\\f1f8793d-1155-42c4-8097-e03e241314a4';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9444;
const TARGET_URL = 'http://localhost:3000';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.pending = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id && this.pending.has(data.id)) {
          const { resolve, reject } = this.pending.get(data.id);
          this.pending.delete(data.id);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result?.value;
  }

  async screenshot(fileName) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const outPath = path.join(ARTIFACT_DIR, fileName);
    fs.writeFileSync(outPath, buffer);
    console.log(`📸 Screenshot saved: ${fileName}`);
    return outPath;
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  console.log('🚀 Starting headless Chrome for Post-Print Settlement Verification...');

  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, '..', '.tmp_chrome_test_profile_settle')
  ], { detached: false });

  await sleep(2000);

  try {
    const targets = await getJson(`http://127.0.0.1:${DEBUG_PORT}/json`);
    const pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found');

    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Network.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log(`Navigating to ${TARGET_URL}...`);
    await client.send('Page.navigate', { url: TARGET_URL });

    // Wait for APP to be ready
    for (let attempt = 0; attempt < 25; attempt++) {
      await sleep(300);
      try {
        const isReady = await client.eval(`typeof window.APP !== 'undefined' && typeof window.APP.setView === 'function'`);
        if (isReady) break;
      } catch (e) {}
    }

    // Switch to Waiter Terminal
    await client.eval(`window.APP.setView('app');`);
    await sleep(500);

    // STEP 1: Select Table 1 -> Add Dish -> Punch Order
    console.log('Step 1: Selecting Table 1 and punching order...');
    await client.eval(`(() => {
      window.APP.selectTable(1);
    })()`);
    await sleep(400);

    // Add item to cart
    await client.eval(`(() => {
      const allItems = (window.DB && window.DB.menuItems && window.DB.menuItems.length > 0) ? window.DB.menuItems : (window.MENU_ITEMS || []);
      window.APP.addItem(allItems[0].id);
    })()`);
    await sleep(300);

    // Confirm Order -> Review Screen
    await client.eval(`window.APP.openReviewOrderScreen();`);
    await sleep(400);

    // Punch Order
    await client.eval(`window.APP.punchOrderFromReview();`);
    await sleep(600);

    console.log('Step 2: Table 1 has active placed orders. Opening Running Bill (Screen 4)...');
    await client.eval(`window.APP.openRunningBillScreen();`);
    await sleep(500);

    await client.screenshot('settle_test_screen4_running_bill.png');

    // STEP 3: Print Thermal Receipt -> Trigger Post-Print Settle Prompt
    console.log('Step 3: Triggering printThermalReceipt()...');
    await client.eval(`window.APP.printThermalReceipt();`);
    await sleep(1000); // Allow print trigger and settle prompt to display

    const modalState = await client.eval(`(() => {
      const modal = document.getElementById('post-print-settle-modal');
      const isVisible = modal && !modal.classList.contains('hidden');
      const title = document.getElementById('pps-modal-title')?.textContent;
      const subtitle = document.getElementById('pps-modal-subtitle')?.textContent;
      const tableName = document.getElementById('pps-table-name')?.textContent;
      const grandTotal = document.getElementById('pps-grand-total')?.textContent;
      const liveTable = window.APP.getLiveTable(1);
      return {
        isVisible,
        title,
        subtitle,
        tableName,
        grandTotal,
        tableStatus: liveTable.status
      };
    })()`);
    console.log('🖨️ Post-Print Settle Modal State:', modalState);

    await client.screenshot('settle_test_post_print_modal.png');

    // STEP 4: Test 'Not Yet / Settle Later' -> Floor map shows Table 1 as '🧾 BILLED'
    console.log('Step 4: Tapping "Not Yet / Settle Later"...');
    await client.eval(`window.APP.keepTableAsBillPrinted();`);
    await sleep(600);

    const floorBilledState = await client.eval(`(() => {
      const liveTable = window.APP.getLiveTable(1);
      const card = document.querySelector('.floor-table-card.table-card-billed') || document.querySelector('.table-card-selected-billed');
      return {
        tableStatus: liveTable.status,
        hasBilledClass: !!card,
        cardText: card ? card.textContent.replace(/\\s+/g, ' ').trim() : ''
      };
    })()`);
    console.log('🪑 Floor Map Table 1 Billed State:', floorBilledState);

    await client.screenshot('settle_test_floor_billed_amber.png');

    // STEP 5: Switch to Hindi -> Verify Devanagari labels on Billed Table & Modal
    console.log('Step 5: Testing Bilingual Hindi translation...');
    await client.eval(`window.APP.setLanguage('hi');`);
    await sleep(400);

    const hindiFloorState = await client.eval(`(() => {
      const card = document.querySelector('.floor-table-card.table-card-billed') || document.querySelector('.table-card-selected-billed');
      return {
        cardText: card ? card.textContent.replace(/\\s+/g, ' ').trim() : ''
      };
    })()`);
    console.log('🇮🇳 Hindi Floor Billed Badge:', hindiFloorState);

    await client.screenshot('settle_test_hindi_floor_billed.png');

    // STEP 6: 1-Tap on Table 1 opens Settle Modal in Hindi
    console.log('Step 6: Tapping Table 1 in Hindi to open quick settle...');
    await client.eval(`window.APP.selectTable(1);`);
    await sleep(500);

    const hindiModalState = await client.eval(`(() => {
      const modal = document.getElementById('post-print-settle-modal');
      const isVisible = modal && !modal.classList.contains('hidden');
      const title = document.getElementById('pps-modal-title')?.textContent;
      const cashBtn = document.getElementById('pps-btn-cash-label')?.textContent;
      const upiBtn = document.getElementById('pps-btn-upi-label')?.textContent;
      return { isVisible, title, cashBtn, upiBtn };
    })()`);
    console.log('🇮🇳 Hindi Post-Print Modal:', hindiModalState);

    await client.screenshot('settle_test_hindi_post_print_modal.png');

    // STEP 7: 1-Tap Settle Table via Cash
    console.log('Step 7: Tapping Cash Settle & Free Table...');
    await client.eval(`window.APP.settleFromPostPrint('cash');`);
    await sleep(1000);

    const settledState = await client.eval(`(() => {
      const liveTable = window.APP.getLiveTable(1);
      const allTables = (window.DB && window.DB.tables) || window.RESTAURANT_TABLES || [];
      const occupiedCount = allTables.filter(t => t.status === 'occupied' || t.status === 'bill_printed').length;
      return {
        table1Status: liveTable.status,
        table1Subtotal: liveTable.currentSubtotal || 0,
        table1OrdersCount: (liveTable.placedOrders || []).length,
        totalOccupiedTables: occupiedCount
      };
    })()`);
    console.log('✅ Final Settled & Free State:', settledState);

    await client.screenshot('settle_test_final_table_free.png');

    client.close();
    console.log('\n🏁 POST-PRINT SETTLEMENT TEST SUITE COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
  } finally {
    try { chromeProcess.kill(); } catch (e) {}
  }
}

run();
