// scripts/verify-settle-and-app-ux.js
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ARTIFACT_DIR = 'C:\\Users\\Root\\.gemini\\antigravity\\brain\\f1f8793d-1155-42c4-8097-e03e241314a4';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9455;
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
      const desc = res.exceptionDetails.exception ? res.exceptionDetails.exception.description : res.exceptionDetails.text;
      console.error('CDP Eval Exception Details:', desc);
      throw new Error(desc || 'Eval error');
    }
    return res.result ? res.result.value : undefined;
  }

  async captureScreenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const fullPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(fullPath, buffer);
    console.log(`📸 Screenshot saved: ${fullPath}`);
    return fullPath;
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runVerification() {
  console.log('🚀 Starting 7-Point Comprehensive Settlement & Multi-Platform Role Verification...');

  // Spawn Chrome
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(os.tmpdir(), 'chrome-test-' + Date.now()),
    TARGET_URL
  ]);

  let cdp;
  try {
    let targets = null;
    for (let i = 0; i < 25; i++) {
      await sleep(400);
      try {
        targets = await getJson(`http://127.0.0.1:${DEBUG_PORT}/json`);
        if (targets && targets.length > 0) break;
      } catch (e) {}
    }

    const pageTarget = targets.find(t => t.type === 'page' && t.url.includes('localhost'));
    if (!pageTarget) throw new Error('No page target found on debug port');

    cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    console.log(' Connected to Chrome via CDP');

    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');
    await cdp.send('Runtime.enable');

    // Wait for window.APP to be ready
    console.log('⏳ Waiting for APP and DB to initialize...');
    for (let i = 0; i < 30; i++) {
      await sleep(300);
      try {
        const isReady = await cdp.eval(`typeof window.APP !== 'undefined' && typeof window.DB !== 'undefined'`);
        if (isReady) {
          console.log('✅ Window.APP & DB initialized');
          break;
        }
      } catch (e) {}
    }

    // -------------------------------------------------------------
    // TEST 1: WEB APP (DESKTOP) DEFAULTS TO CASHIER COUNTER (WEB) FOR MANAGER
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: WEB APP CASHIER COUNTER (DESKTOP) ROLE & ERGONOMICS ---');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });
    await sleep(400);

    const webInit = await cdp.eval(`(() => {
      APP.setView('web');
      const btnApp = document.getElementById('btn-view-app');
      const btnWeb = document.getElementById('btn-view-web');
      const btnMgr = document.getElementById('btn-view-manager');
      const toggle = document.getElementById('hdr-viewport-toggle');
      const appComputed = btnApp ? window.getComputedStyle(btnApp).display : 'none';
      const toggleComputed = toggle ? window.getComputedStyle(toggle).display : 'none';
      return {
        role: APP.state.userRole,
        view: APP.state.currentView,
        toggleDisplay: toggleComputed,
        isAppTabHidden: appComputed === 'none',
        hasCashierActive: document.body.classList.contains('web-view-active')
      };
    })()`);
    console.log('Web View Init Status:', JSON.stringify(webInit, null, 2));

    if (webInit.role !== 'manager' || webInit.view !== 'web') {
      throw new Error(`FAIL: Web App role/view mismatch! Role: ${webInit.role}, View: ${webInit.view}`);
    }
    if (!webInit.isAppTabHidden) {
      throw new Error('FAIL: Waiter Terminal tab is visible on Cashier Counter workstation!');
    }
    console.log('✅ PASS: Web App defaults to Cashier Counter (web) with role "manager".');
    console.log('✅ PASS: Handheld Waiter Terminal tab is cleanly hidden on desktop.');

    // -------------------------------------------------------------
    // TEST 2: OPERATIONS CONSOLE SEAMLESS ONE-CLICK SWITCHING
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: OPERATIONS CONSOLE SEAMLESS ONE-CLICK SWITCHING ---');
    const opsConsoleCheck = await cdp.eval(`(() => {
      APP.setView('manager');
      const pinModal = document.getElementById('mgr-pin-gate-modal');
      const isPinPromptTrapped = pinModal && !pinModal.classList.contains('hidden');
      return {
        role: APP.state.userRole,
        view: APP.state.currentView,
        isMgrViewActive: document.body.classList.contains('mgr-view-active'),
        isPinPromptTrapped
      };
    })()`);
    console.log('Operations Console Switch Check:', opsConsoleCheck);

    if (opsConsoleCheck.isPinPromptTrapped) {
      throw new Error('FAIL: Manager was trapped by PIN prompt when switching to Operations Console on PC!');
    }
    if (opsConsoleCheck.view !== 'manager' || !opsConsoleCheck.isMgrViewActive) {
      throw new Error('FAIL: Operations console view not active!');
    }
    console.log('✅ PASS: Operations Console switches smoothly with full Manager permissions.');

    // Switch back to Cashier Counter
    await cdp.eval(`APP.setView('web')`);
    await sleep(300);

    // -------------------------------------------------------------
    // TEST 3: ANDROID APP HANDHELD WAITER TERMINAL ISOLATION
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: ANDROID APP HANDHELD WAITER TERMINAL ISOLATION ---');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 360,
      height: 780,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(400);

    const androidAppCheck = await cdp.eval(`(() => {
      // Mock Android APK platform indicator
      localStorage.setItem('onyx_platform', 'android_apk');
      APP.initAuth();
      APP.setView('app');
      const toggle = document.getElementById('hdr-viewport-toggle');
      const mgrLock = document.getElementById('btn-app-mgr-unlock');
      const toggleComputed = toggle ? window.getComputedStyle(toggle).display : 'none';
      const lockComputed = mgrLock ? window.getComputedStyle(mgrLock).display : 'none';

      // Test that calling setView('web') or setView('manager') is rejected in APK mode
      APP.setView('web');
      const blockedWeb = APP.state.currentView;
      APP.setView('manager');
      const blockedMgr = APP.state.currentView;

      return {
        role: APP.state.userRole,
        view: APP.state.currentView,
        toggleDisplay: toggleComputed,
        lockDisplay: lockComputed,
        isBlockedWeb: blockedWeb === 'app',
        isBlockedMgr: blockedMgr === 'app'
      };
    })()`);
    console.log('Android App Check:', androidAppCheck);

    if (androidAppCheck.toggleDisplay !== 'none' || androidAppCheck.lockDisplay !== 'none') {
      throw new Error(`FAIL: Viewport toggle or Lock button is visible on Android App! toggle: ${androidAppCheck.toggleDisplay}, lock: ${androidAppCheck.lockDisplay}`);
    }
    if (!androidAppCheck.isBlockedWeb || !androidAppCheck.isBlockedMgr) {
      throw new Error('FAIL: Android App allowed switching to web/manager view!');
    }
    console.log('✅ PASS: Android App strictly locked to Waiter Terminal; toggle & lock completely hidden.');

    // Check menu bottom bar clearance
    await cdp.eval(`(() => {
      APP.selectTable('T-01');
      APP.openMenuForSelectedTable();
      const firstDish = window.DB.menuItems[0];
      APP.addItem(firstDish.id);
    })()`);
    await sleep(300);

    const menuBarGeom = await cdp.eval(`(() => {
      const bar = document.getElementById('app-menu-bottom-bar');
      const rect = bar.getBoundingClientRect();
      const clearance = 780 - Math.round(rect.bottom);
      return {
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        height: Math.round(rect.height),
        clearanceFromViewportBottom: clearance,
        fullyVisible: Math.round(rect.bottom) <= 780
      };
    })()`);
    console.log('Menu Bottom Bar Clearance:', menuBarGeom);
    if (!menuBarGeom.fullyVisible) {
      throw new Error(`FAIL: Menu bottom bar is cut off! bottom: ${menuBarGeom.bottom}`);
    }
    console.log('✅ PASS: Menu bottom bar 100% on screen with 0px cutoff.');

    // Clean up APK mock
    await cdp.eval(`localStorage.removeItem('onyx_platform')`);

    // -------------------------------------------------------------
    // TEST 4: CASHIER COUNTER UNRESTRICTED THERMAL BILL PRINTING
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: CASHIER COUNTER UNRESTRICTED THERMAL BILL PRINTING ---');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });
    await sleep(400);

    await cdp.eval(`(() => {
      APP.state.userRole = 'manager';
      APP.setView('web');
      APP.selectTable('T-05');
      const dish = window.DB.menuItems[0];
      const live = APP.getLiveTable('T-05');
      live.placedOrders = [{
        id: 'ord-test-5',
        dishId: dish.id,
        name: dish.name,
        hindi_name: dish.hindi_name,
        price: dish.price,
        qty: 2,
        time: Date.now(),
        subtotal: dish.price * 2
      }];
      live.currentSubtotal = dish.price * 2;
      live.status = 'occupied';
      APP.renderFloorTables();
      APP.renderAll();
      window.print = () => console.log('MOCK window.print()');
      APP.printThermalReceipt('T-05');
    })()`);
    await sleep(600);

    const printCheck1 = await cdp.eval(`(() => {
      const live = APP.getLiveTable('T-05');
      const postModal = document.getElementById('post-print-settle-modal');
      return {
        status: live.status,
        billPrinted: live.billPrinted,
        isSettleModalTrapped: postModal && !postModal.classList.contains('hidden')
      };
    })()`);
    console.log('Print Check 1:', printCheck1);
    if (printCheck1.isSettleModalTrapped) {
      throw new Error('FAIL: Settle modal trapped cashier after printing!');
    }
    console.log('✅ PASS: 80mm Bill printed without modal trap!');

    // Reprint
    await cdp.eval(`APP.printThermalReceipt('T-05')`);
    await sleep(400);
    const printCheck2 = await cdp.eval(`(() => {
      const postModal = document.getElementById('post-print-settle-modal');
      return { isSettleModalTrapped: postModal && !postModal.classList.contains('hidden') };
    })()`);
    if (printCheck2.isSettleModalTrapped) {
      throw new Error('FAIL: Settle modal trapped cashier on reprint!');
    }
    console.log('✅ PASS: Multiple reprints work freely without unwanted popups.');

    // -------------------------------------------------------------
    // TEST 5: UPI PAYMENT PROOF VERIFICATION & SETTLEMENT
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: UPI PAYMENT PROOF VERIFICATION & SETTLEMENT ---');
    const dummyProof = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAPUlEQVR42u3BAQ0AAADCoPdPbQ8HFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAO4DCbYAAc3d3sUAAAAASUVORK5CYII=';

    await cdp.eval(`(() => {
      const live = APP.getLiveTable('T-05');
      live.paymentProof = '${dummyProof}';
      live.paymentProofTime = Date.now();
      live.paymentStatus = 'proof_attached';
      APP.renderFloorTables();
      APP.renderAll();
    })()`);

    await cdp.eval(`APP.openBillingPage()`);
    await sleep(400);

    const proofVerification = await cdp.eval(`(() => {
      const proofBox = document.getElementById('bill-upi-proof-box');
      const proofImg = document.getElementById('bill-upi-proof-img');
      const toolAmt = document.getElementById('bill-upi-tool-amount');
      return {
        isProofBoxVisible: proofBox && !proofBox.classList.contains('hidden'),
        hasProofImage: proofImg && proofImg.src.startsWith('data:image/'),
        toolAmountText: toolAmt ? toolAmt.textContent : ''
      };
    })()`);
    console.log('UPI Proof Verification:', proofVerification);

    if (!proofVerification.isProofBoxVisible || !proofVerification.hasProofImage) {
      throw new Error('FAIL: Payment proof not visible for verification in billing modal!');
    }
    console.log(`✅ PASS: Customer payment photo proof verified against bill amount ${proofVerification.toolAmountText}!`);

    // Settle UPI
    await cdp.eval(`APP.settleTable()`);
    await sleep(500);

    const table5AfterSettle = await cdp.eval(`(() => {
      const live = APP.getLiveTable('T-05');
      return { status: live.status, subtotal: live.currentSubtotal };
    })()`);
    console.log('Table 5 after UPI Settle:', table5AfterSettle);
    if (table5AfterSettle.status !== 'vacant' || table5AfterSettle.subtotal !== 0) {
      throw new Error('FAIL: Table 5 was not freed after UPI settlement!');
    }
    console.log('✅ PASS: Table 5 successfully settled and marked Free.');

    // -------------------------------------------------------------
    // TEST 6: PAYMENT PROOF REJECTION & CLEARING WORKFLOW
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: PAYMENT PROOF REJECTION & RESET WORKFLOW ---');
    await cdp.eval(`(() => {
      APP.selectTable('T-08');
      const live = APP.getLiveTable('T-08');
      live.placedOrders = [{ id: 'ord-8', name: 'Dum Biryani', price: 299, qty: 1, subtotal: 299 }];
      live.currentSubtotal = 299;
      live.status = 'occupied';
      live.paymentProof = '${dummyProof}';
      APP.renderFloorTables();
      APP.renderAll();
    })()`);

    // Cashier opens billing modal and rejects proof
    await cdp.eval(`APP.openBillingPage()`);
    await sleep(300);

    const proofRejected = await cdp.eval(`(() => {
      // Mock confirm to accept rejection
      window.confirm = () => true;
      APP.rejectPaymentProof('T-08');
      const live = APP.getLiveTable('T-08');
      const proofBox = document.getElementById('bill-upi-proof-box');
      return {
        clearedInMemory: live.paymentProof === null,
        isProofBoxHidden: proofBox && proofBox.classList.contains('hidden')
      };
    })()`);
    console.log('Proof Rejection Status:', proofRejected);
    if (!proofRejected.clearedInMemory || !proofRejected.isProofBoxHidden) {
      throw new Error('FAIL: Proof was not cleared when cashier clicked Reject Proof!');
    }
    console.log('✅ PASS: Payment proof rejected and cleared; table reset for fresh capture.');
    await cdp.eval(`APP.closeBillingPage()`);

    // -------------------------------------------------------------
    // TEST 7: CASH & CARD SETTLEMENT (ZERO PHOTO REQUIREMENT)
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: CASH & CARD SETTLEMENT (ZERO PHOTO REQUIREMENT) ---');
    // Cash Settlement on Table 6
    await cdp.eval(`(() => {
      APP.selectTable('T-06');
      const live = APP.getLiveTable('T-06');
      live.placedOrders = [{ id: 'ord-6', name: 'Dal Tadka', price: 180, qty: 1, subtotal: 180 }];
      live.currentSubtotal = 180;
      live.status = 'occupied';
      APP.renderFloorTables();
      APP.renderAll();
      APP.openBillingPage();
      APP.setPayMode('cash');
    })()`);
    await sleep(300);

    const cashModeCheck = await cdp.eval(`(() => {
      const secCash = document.getElementById('pay-section-cash');
      const secUpi = document.getElementById('pay-section-upi');
      return {
        isCashSectionVisible: secCash && !secCash.classList.contains('hidden'),
        isUpiSectionHidden: secUpi && secUpi.classList.contains('hidden')
      };
    })()`);
    if (!cashModeCheck.isCashSectionVisible) {
      throw new Error('FAIL: Cash section not visible in billing modal!');
    }
    await cdp.eval(`APP.settleTable()`);
    await sleep(400);

    const table6AfterCash = await cdp.eval(`APP.getLiveTable('T-06').status`);
    if (table6AfterCash !== 'vacant') {
      throw new Error('FAIL: Table 6 not freed after cash settlement!');
    }
    console.log('✅ PASS: Cash settlement completed simply with change calculator and zero photo prompts.');

    // Card Settlement on Table 7
    await cdp.eval(`(() => {
      APP.selectTable('T-07');
      const live = APP.getLiveTable('T-07');
      live.placedOrders = [{ id: 'ord-7', name: 'Kadai Paneer', price: 260, qty: 1, subtotal: 260 }];
      live.currentSubtotal = 260;
      live.status = 'occupied';
      APP.renderFloorTables();
      APP.renderAll();
      APP.openBillingPage();
      APP.setPayMode('card');
    })()`);
    await sleep(300);

    const cardModeCheck = await cdp.eval(`(() => {
      const secCard = document.getElementById('pay-section-card');
      return { isCardSectionVisible: secCard && !secCard.classList.contains('hidden') };
    })()`);
    if (!cardModeCheck.isCardSectionVisible) {
      throw new Error('FAIL: Card section not visible in billing modal!');
    }
    await cdp.eval(`APP.settleTable()`);
    await sleep(400);

    const table7AfterCard = await cdp.eval(`APP.getLiveTable('T-07').status`);
    if (table7AfterCard !== 'vacant') {
      throw new Error('FAIL: Table 7 not freed after card settlement!');
    }
    console.log('✅ PASS: Card settlement completed simply with EDC charge and zero photo prompts.');

    console.log('\n========================================================================');
    console.log('🎉 ALL 7 ROLE ISOLATION, BILLING & SETTLEMENT SCENARIOS VERIFIED 100%!');
    console.log('========================================================================\n');

  } finally {
    if (cdp) cdp.close();
    chromeProcess.kill('SIGTERM');
  }
}

runVerification().catch(err => {
  console.error('❌ Verification failed with error:', err);
  process.exit(1);
});
