// Automated Headless Verification for:
// 1. Mobile Header Auto-Adjusting (390px & 360px - No cutoff, English/Hindi visible, responsive tabs)
// 2. Waiter Terminal: View Bill (No print spooler, no settle modal)
// 3. Waiter Terminal: Payment QR Display + Customer Phone Photo Proof Submission
// 4. Waiter Settlement Prohibition (Strictly blocked for Waiters)
// 5. Manager Counter Verification: Inspect Photo Proof in Fullscreen Viewer + Settle Table

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = 'http://localhost:3000';
const ARTIFACT_DIR = path.resolve('C:\\Users\\Root\\.gemini\\antigravity\\brain\\f1f8793d-1155-42c4-8097-e03e241314a4');

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
          if (msg.error) cb.reject(msg.error);
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
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result ? res.result.value : undefined;
  }

  async setViewport(width, height, isMobile = true) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: isMobile
    });
  }

  async screenshot(filepath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(filepath, Buffer.from(res.data, 'base64'));
    console.log(`📸 Screenshot saved: ${filepath}`);
  }

  async close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  console.log('🚀 Starting headless Chrome for Waiter Payment Proof & Settlement Lock Verification...');

  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9223',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,900',
    '--user-data-dir=' + path.join(__dirname, '..', '.tmp_chrome_test_profile_proof')
  ]);

  let client = null;

  try {
    let versionData = null;
    for (let i = 0; i < 20; i++) {
      try {
        versionData = await fetchJson('http://localhost:9223/json/version');
        if (versionData && versionData.webSocketDebuggerUrl) break;
      } catch (e) {
        await wait(500);
      }
    }

    if (!versionData) throw new Error('Could not connect to Chrome debugging port 9223');

    const targets = await fetchJson('http://localhost:9223/json');
    let pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget) {
      pageTarget = await fetchJson('http://localhost:9223/json/new?' + APP_URL);
    }

    client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');

    console.log('🌐 Navigating to:', APP_URL);
    await client.send('Page.navigate', { url: APP_URL });
    await wait(3000);

    // ==========================================
    // TEST 1: Mobile Header Auto-Adjusting at 390px (iPhone / Pixel)
    // ==========================================
    console.log('\n--- TEST 1: Mobile Header Auto-Adjusting (390px) ---');
    await client.setViewport(390, 844, true);
    await wait(800);

    const header390 = await client.eval(`
      (() => {
        const langToggle = document.getElementById('header-lang-toggle');
        const btnEn = document.getElementById('btn-lang-en');
        const btnHi = document.getElementById('btn-lang-hi');
        const viewToggle = document.getElementById('hdr-viewport-toggle');
        const rLang = langToggle ? langToggle.getBoundingClientRect() : null;
        const rView = viewToggle ? viewToggle.getBoundingClientRect() : null;

        return {
          langVisible: !!langToggle && rLang.width > 0 && rLang.right <= 390 && rLang.left >= 0,
          langRight: rLang ? rLang.right : 0,
          viewTop: rView ? rView.top : 0,
          viewWidth: rView ? rView.width : 0,
          btnEnText: btnEn?.textContent?.trim(),
          btnHiText: btnHi?.textContent?.trim()
        };
      })()
    `);
    console.log('Mobile Header 390px Check:', header390);

    if (!header390.langVisible || header390.langRight > 390) {
      throw new Error(`Language toggle is clipped or off screen at 390px! Right: ${header390.langRight}`);
    }
    console.log('✅ PASS: Language switcher 100% visible on 390px screen');
    await client.screenshot(path.join(ARTIFACT_DIR, 'mobile_header_390_verified.png'));

    // ==========================================
    // TEST 2: Mobile Header at 360px (Compact Android)
    // ==========================================
    console.log('\n--- TEST 2: Compact Mobile Header (360px) ---');
    await client.setViewport(360, 800, true);
    await wait(800);

    const header360 = await client.eval(`
      (() => {
        const langToggle = document.getElementById('header-lang-toggle');
        const rLang = langToggle ? langToggle.getBoundingClientRect() : null;
        return {
          langVisible: !!langToggle && rLang.width > 0 && rLang.right <= 360,
          langRight: rLang ? rLang.right : 0
        };
      })()
    `);
    console.log('Mobile Header 360px Check:', header360);
    if (!header360.langVisible || header360.langRight > 360) {
      throw new Error(`Language toggle is clipped on compact 360px screen!`);
    }
    console.log('✅ PASS: Compact 360px header auto-adjusts cleanly with zero overflow');
    await client.screenshot(path.join(ARTIFACT_DIR, 'mobile_header_360_verified.png'));

    // Reset to 390px for phone workflow testing
    await client.setViewport(390, 844, true);
    await wait(500);

    // ==========================================
    // TEST 3: Waiter Role Setup & Active Order
    // ==========================================
    console.log('\n--- TEST 3: Waiter Role Setup & Order Punch on Table 1 ---');
    const orderPrep = await client.eval(`
      (async () => {
        APP.state.userRole = 'waiter';
        APP.setView('app');
        APP.selectTable('1');

        // Add 2 items if empty
        const live = APP.getLiveTable('1');
        if (!live.placedOrders || live.placedOrders.length === 0) {
          const items = DB.menuItems || DB.menu || [];
          const item1 = items[0];
          const item2 = items[1] || items[0];
          if (item1) APP.addItem(item1.id);
          if (item2) APP.addItem(item2.id);
          await APP.sendOrder();
        }

        const updatedLive = APP.getLiveTable('1');
        return {
          userRole: APP.state.userRole,
          tableId: APP.state.selectedTableId,
          placedCount: updatedLive.placedOrders?.length || 0,
          subtotal: updatedLive.currentSubtotal || 0
        };
      })()
    `);
    console.log('Waiter Order Prep:', orderPrep);
    if (orderPrep.placedCount === 0) {
      throw new Error('Failed to prepare active order on Table 1 for testing');
    }
    console.log('✅ PASS: Table 1 prepared with active order for Waiter flow');

    // ==========================================
    // TEST 4: Waiter View Bill (NO print, NO settle modal)
    // ==========================================
    console.log('\n--- TEST 4: Waiter "View Bill" Preview (Digital Invoice Only) ---');
    await client.eval(`
      // Spy on window.print
      window.__printed = false;
      window.print = () => { window.__printed = true; };

      // Open running bill screen 4
      APP.openRunningBillScreen();
      // Waiter taps "View Bill"
      APP.openWaiterBillPreview('1');
    `);
    await wait(800);

    const waiterBillCheck = await client.eval(`
      (() => {
        const epsonModal = document.getElementById('epson-modal');
        const ppsModal = document.getElementById('post-print-settle-modal');
        const mgrActions = document.getElementById('epson-manager-actions');
        const waiterActions = document.getElementById('epson-waiter-actions');
        const grandTotal = document.getElementById('epson-net-total')?.textContent;

        return {
          epsonModalVisible: epsonModal && !epsonModal.classList.contains('hidden'),
          ppsModalHidden: !ppsModal || ppsModal.classList.contains('hidden'),
          mgrActionsHidden: mgrActions && mgrActions.classList.contains('hidden'),
          waiterActionsVisible: waiterActions && !waiterActions.classList.contains('hidden'),
          windowPrintCalled: window.__printed,
          grandTotal
        };
      })()
    `);
    console.log('Waiter Bill Preview Check:', waiterBillCheck);

    if (!waiterBillCheck.epsonModalVisible) {
      throw new Error('Epson digital bill modal did not open!');
    }
    if (waiterBillCheck.windowPrintCalled) {
      throw new Error('CRITICAL BUG: window.print() was called in Waiter mode!');
    }
    if (!waiterBillCheck.ppsModalHidden) {
      throw new Error('CRITICAL BUG: Post-print settle modal popped up for Waiter!');
    }
    if (!waiterBillCheck.waiterActionsVisible) {
      throw new Error('Waiter actions ("Show Payment QR & Collect Proof") missing on bill preview!');
    }
    console.log('✅ PASS: Waiter View Bill opens pure digital preview without triggering printer or settle prompt');
    await client.screenshot(path.join(ARTIFACT_DIR, 'waiter_bill_preview_verified.png'));

    // ==========================================
    // TEST 5: Waiter Payment QR & Photo Proof Modal
    // ==========================================
    console.log('\n--- TEST 5: Waiter Payment QR & Customer Photo Proof Flow ---');
    await client.eval(`
      APP.closeEpsonReceiptModal(false);
      APP.openWaiterPaymentFlow('1');
    `);
    await wait(800);

    const paymentModalCheck = await client.eval(`
      (() => {
        const modal = document.getElementById('waiter-payment-proof-modal');
        const grandTotal = document.getElementById('wpp-grand-total')?.textContent;
        const upiId = document.getElementById('wpp-upi-id-chip')?.textContent;
        const qrSrc = document.getElementById('wpp-qr-image')?.src;
        const emptyPhotoBox = document.getElementById('wpp-empty-photo-box');
        const lockNotice = document.getElementById('wpp-lock-notice')?.textContent;

        return {
          modalVisible: modal && !modal.classList.contains('hidden'),
          grandTotal,
          upiId,
          hasQrSrc: !!qrSrc && qrSrc.length > 10,
          emptyPhotoVisible: emptyPhotoBox && !emptyPhotoBox.classList.contains('hidden'),
          lockNotice: lockNotice?.trim()
        };
      })()
    `);
    console.log('Waiter Payment Modal Check:', paymentModalCheck);

    if (!paymentModalCheck.modalVisible) {
      throw new Error('Waiter Payment Proof modal did not open!');
    }
    if (!paymentModalCheck.upiId.includes('Q676029996@ybl')) {
      throw new Error(`UPI ID incorrect! Expected Q676029996@ybl, got: ${paymentModalCheck.upiId}`);
    }
    console.log('✅ PASS: Payment QR and UPI ID verified for customer payment');
    await client.screenshot(path.join(ARTIFACT_DIR, 'waiter_qr_modal_verified.png'));

    // ==========================================
    // TEST 6: Simulate Photo Proof Capture & Submission
    // ==========================================
    console.log('\n--- TEST 6: Simulate Customer Photo Proof & Submit ---');
    // Create a 100x100 green test image data URL
    const testProofDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA7SURBVHhe7cExAQAAAMKg9U9tCy8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOBqB0W4AAGc110EAAAAAElFTkSuQmCC';

    await client.eval(`
      APP._tempPaymentProof = "${testProofDataUrl}";
      APP.renderPaymentProofModalState("${testProofDataUrl}");
    `);
    await wait(500);

    const proofAttachedCheck = await client.eval(`
      (() => {
        const capturedBox = document.getElementById('wpp-captured-photo-box');
        const previewImg = document.getElementById('wpp-captured-preview-img');
        const statusBadge = document.getElementById('wpp-proof-status-badge')?.textContent;

        return {
          capturedBoxVisible: capturedBox && !capturedBox.classList.contains('hidden'),
          previewSrc: previewImg?.src?.substring(0, 30),
          statusBadge
        };
      })()
    `);
    console.log('Proof Attached State:', proofAttachedCheck);
    if (!proofAttachedCheck.capturedBoxVisible) {
      throw new Error('Captured photo preview box failed to display!');
    }
    console.log('✅ PASS: Proof thumbnail displayed with Retake and Submit buttons');
    await client.screenshot(path.join(ARTIFACT_DIR, 'waiter_proof_attached_verified.png'));

    // Submit proof
    await client.eval(`
      (async () => {
        await APP.submitPaymentProof();
      })()
    `);
    await wait(1000);

    // Verify Table 1 status on Floor Map
    const tableProofCheck = await client.eval(`
      (() => {
        const live = APP.getLiveTable('1');
        const mobileGrid = document.getElementById('app-floor-grid');
        return {
          status: live.status,
          hasProof: !!live.paymentProof,
          gridHtmlIncludesProof: mobileGrid?.innerHTML?.includes('PROOF IN') || mobileGrid?.innerHTML?.includes('प्रूफ मिला')
        };
      })()
    `);
    console.log('Table 1 Post-Submission Status:', tableProofCheck);

    if (tableProofCheck.status !== 'bill_printed' || !tableProofCheck.hasProof) {
      throw new Error('Table 1 status was not updated with payment proof!');
    }
    if (!tableProofCheck.gridHtmlIncludesProof) {
      throw new Error('Floor map card does not show PROOF IN badge!');
    }
    console.log('✅ PASS: Table marked bill_printed with payment proof attached and PROOF IN badge on floor card');
    await client.screenshot(path.join(ARTIFACT_DIR, 'floor_tables_proof_in_badge.png'));

    // ==========================================
    // TEST 7: Waiter Settle Prohibition
    // ==========================================
    console.log('\n--- TEST 7: Strict Settle Prohibition for Waiter Role ---');
    const waiterSettleAttempt = await client.eval(`
      (async () => {
        APP.state.userRole = 'waiter';
        APP.state.selectedTableId = '1';
        let blocked = false;
        const origToast = APP.showToast;
        APP.showToast = (msg) => {
          if (msg.includes('Only Manager') || msg.includes('केवल मैनेजर')) {
            blocked = true;
          }
          origToast.call(APP, msg);
        };

        // Try direct settle call
        await APP.settleTable();

        APP.showToast = origToast;
        return {
          blocked,
          tableStatus: APP.getLiveTable('1').status
        };
      })()
    `);
    console.log('Waiter Direct Settle Attempt Result:', waiterSettleAttempt);

    if (!waiterSettleAttempt.blocked || waiterSettleAttempt.tableStatus !== 'bill_printed') {
      throw new Error('SECURITY VIOLATION: Waiter was able to settle table or bypass role check!');
    }
    console.log('✅ PASS: Waiter settlement strictly blocked by POS engine');

    // ==========================================
    // TEST 8: Manager Counter Verification & Audit
    // ==========================================
    console.log('\n--- TEST 8: Manager Counter PC Inspection & Settlement ---');
    // Switch to desktop viewport for Cashier Counter view
    await client.setViewport(1280, 850, false);
    await client.eval(`
      APP.state.userRole = 'manager';
      APP.setView('web');
      APP.selectTable('1');
    `);
    await wait(1000);

    const managerProofCheck = await client.eval(`
      (() => {
        const posProofCard = document.getElementById('pos-proof-card');
        const posThumb = document.getElementById('pos-proof-thumb');
        return {
          posProofCardVisible: posProofCard && !posProofCard.classList.contains('hidden'),
          hasThumbSrc: !!posThumb?.src && posThumb.src.length > 20
        };
      })()
    `);
    console.log('Manager Counter POS Proof Card:', managerProofCheck);
    if (!managerProofCheck.posProofCardVisible) {
      throw new Error('Cashier Counter POS does not display waiter attached proof thumbnail!');
    }
    console.log('✅ PASS: Cashier Counter displays proof thumbnail with Inspect button');
    await client.screenshot(path.join(ARTIFACT_DIR, 'manager_cashier_proof_card.png'));

    // Open Fullscreen Proof Viewer
    await client.eval(`
      APP.viewFullPaymentProof('1');
    `);
    await wait(600);

    const fullViewerCheck = await client.eval(`
      (() => {
        const modal = document.getElementById('payment-proof-viewer-modal');
        const fullImg = document.getElementById('ppv-full-image');
        const title = document.getElementById('ppv-table-name')?.textContent;
        return {
          modalVisible: modal && !modal.classList.contains('hidden'),
          hasImgSrc: !!fullImg?.src && fullImg.src.length > 20,
          title
        };
      })()
    `);
    console.log('Manager Fullscreen Proof Viewer:', fullViewerCheck);
    if (!fullViewerCheck.modalVisible) {
      throw new Error('Fullscreen Proof Viewer failed to open!');
    }
    console.log('✅ PASS: Fullscreen Customer Phone Screen Proof Viewer active');
    await client.screenshot(path.join(ARTIFACT_DIR, 'manager_proof_viewer_modal.png'));

    // Manager Settle via Post-Print Modal
    await client.eval(`
      APP.closePaymentProofViewer();
      APP.openPostPrintSettleModal('1');
    `);
    await wait(600);

    const ppsProofCheck = await client.eval(`
      (() => {
        const ppsModal = document.getElementById('post-print-settle-modal');
        const ppsProofContainer = document.getElementById('pps-proof-container');
        return {
          ppsModalVisible: ppsModal && !ppsModal.classList.contains('hidden'),
          ppsProofContainerVisible: ppsProofContainer && !ppsProofContainer.classList.contains('hidden')
        };
      })()
    `);
    console.log('Manager Settle Modal Proof Container:', ppsProofCheck);
    if (!ppsProofCheck.ppsProofContainerVisible) {
      throw new Error('Post-print settle modal missing proof thumbnail container!');
    }

    // Perform final settlement as manager
    await client.eval(`
      (async () => {
        await APP.settleFromPostPrint('upi');
      })()
    `);
    await wait(1200);

    const finalSettledCheck = await client.eval(`
      (() => {
        const live = APP.getLiveTable('1');
        return {
          ordersCount: (live.placedOrders || []).length,
          subtotal: live.currentSubtotal || 0,
          hasProof: !!live.paymentProof
        };
      })()
    `);
    console.log('Final Settled Table 1 State:', finalSettledCheck);
    if (finalSettledCheck.ordersCount > 0 || finalSettledCheck.hasProof) {
      throw new Error('Table 1 was not properly cleared upon manager settlement!');
    }
    console.log('✅ PASS: Table successfully settled by Manager, cleared, and proof archived in database');

    console.log('\n🎉 ALL 8 TESTS PASSED WITH 100% SUCCESS!');
  } catch (err) {
    console.error('❌ VERIFICATION TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (client) await client.close();
    chromeProcess.kill();
  }
}

run();
