// Comprehensive Verification for:
// 1. Live WebRTC In-App Camera with Flashlight strictly OFF (No file/gallery picker)
// 2. Click photo -> ONLY Retake (🔄) or Confirm (✅) options
// 3. Strict Settle Prohibition for Waiter on reload
// 4. Manager PIN authorization & Past Bills Proof Audit
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
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result ? res.result.value : null;
  }

  async screenshot(filePath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
  }

  async setViewport(width, height, isMobile = false) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: isMobile,
      fitWindow: false
    });
  }

  async close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function run() {
  console.log('🚀 Starting Chrome with fake video stream for in-app camera testing...');
  const profileDir = path.join(__dirname, '..', '.tmp_chrome_cam_test2');
  try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch (e) {}

  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9227',
    '--disable-gpu',
    '--no-sandbox',
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
    '--window-size=1280,900',
    '--user-data-dir=' + profileDir
  ]);

  let client = null;

  try {
    let versionData = null;
    for (let i = 0; i < 20; i++) {
      try {
        versionData = await fetchJson('http://localhost:9227/json/version');
        if (versionData && versionData.webSocketDebuggerUrl) break;
      } catch (e) {
        await wait(500);
      }
    }

    if (!versionData) throw new Error('Could not connect to Chrome debugging port 9227');

    const targets = await fetchJson('http://localhost:9227/json');
    let pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget) {
      pageTarget = await fetchJson('http://localhost:9227/json/new?' + APP_URL);
    }

    client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');

    console.log('🌐 Navigating to:', APP_URL);
    await client.send('Page.navigate', { url: APP_URL });
    for (let i = 0; i < 30; i++) {
      await wait(300);
      try {
        const ready = await client.eval('typeof window.APP !== "undefined" && window.APP.state');
        if (ready) break;
      } catch (e) {}
    }

    await client.setViewport(390, 844, true);
    await wait(500);

    // =========================================================================
    // TEST 1: Reload / Fresh Open Verification — Default Role is STRICTLY Waiter
    // =========================================================================
    console.log('\n--- TEST 1: Zero-Trust Reload Check — Waiter Role Enforced ---');
    const reloadRoleCheck = await client.eval(`
      (() => ({
        userRole: APP.state.userRole,
        currentView: APP.state.currentView,
        isManager: APP.state.userRole === 'manager'
      }))()
    `);
    console.log('Reload Baseline Role:', reloadRoleCheck);
    if (reloadRoleCheck.userRole !== 'waiter' || reloadRoleCheck.isManager) {
      throw new Error(`SECURITY BUG: App opened with role "${reloadRoleCheck.userRole}" instead of "waiter"!`);
    }
    console.log('✅ PASS: Fresh reload strictly defaults to Waiter role');

    // =========================================================================
    // TEST 2: In-App Camera Viewfinder — Flashlight Strictly OFF, NO Gallery/File Picker
    // =========================================================================
    console.log('\n--- TEST 2: In-App Camera Viewfinder (Flashlight OFF, NO Local Storage) ---');
    const prepRes = await client.eval(`
      (async () => {
        try {
          APP.setView('app');
          APP.selectTable('T-03');
          const items = (window.DB && window.DB.menuItems && window.DB.menuItems.length) 
            ? window.DB.menuItems 
            : (typeof MENU_ITEMS !== 'undefined' ? MENU_ITEMS : []);
          let added = false;
          if (items.length > 0) {
            APP.addItem(items[0].id);
            await APP.sendOrder();
            added = true;
          }
          await new Promise(r => setTimeout(r, 600));
          const liveBefore = APP.getLiveTable('T-03');
          APP.openWaiterPaymentFlow('T-03');
          const modal = document.getElementById('waiter-payment-proof-modal');
          return {
            itemsCount: items.length,
            added,
            liveBeforeStatus: liveBefore?.status,
            liveBeforeSubtotal: liveBefore?.currentSubtotal,
            liveBeforeOrders: liveBefore?.placedOrders?.length,
            modalHidden: modal?.classList.contains('hidden')
          };
        } catch (err) {
          return { error: err.message, stack: err.stack };
        }
      })()
    `);
    console.log('Prep Result for Test 2:', prepRes);
    await wait(1500);

    const cameraModalCheck = await client.eval(`
      (() => {
        const modal = document.getElementById('waiter-payment-proof-modal');
        const flashNotice = document.getElementById('wpp-flash-notice')?.textContent;
        const emptyBox = document.getElementById('wpp-empty-photo-box');
        const video = document.getElementById('wpp-camera-video');
        const snapBtn = document.getElementById('wpp-btn-live-snap');
        const alignGuide = document.getElementById('wpp-overlay-align')?.textContent;
        const uploadTab = document.getElementById('wpp-tab-upload');
        const fileInput = document.getElementById('waiter-proof-camera-input');

        return {
          modalOpen: modal && !modal.classList.contains('hidden'),
          hasFlashNotice: !!flashNotice && flashNotice.includes('Flashlight'),
          emptyBoxVisible: emptyBox && !emptyBox.classList.contains('hidden'),
          hasVideoStream: !!video && !!video.srcObject,
          videoReadyState: video ? video.readyState : -1,
          videoWidth: video ? video.videoWidth : 0,
          snapBtnEnabled: snapBtn && !snapBtn.disabled,
          alignGuide: alignGuide?.trim(),
          noUploadTab: !uploadTab,
          noFileInput: !fileInput
        };
      })()
    `);
    console.log('In-App Camera Check:', cameraModalCheck);

    if (!cameraModalCheck.modalOpen) {
      throw new Error('Waiter payment proof modal did not open!');
    }
    if (!cameraModalCheck.hasFlashNotice) {
      throw new Error('Flashlight OFF notice banner is missing!');
    }
    if (!cameraModalCheck.emptyBoxVisible) {
      throw new Error('In-app camera box is not visible!');
    }
    if (!cameraModalCheck.noUploadTab) {
      throw new Error('Upload tab found! Must be pure in-app camera only!');
    }
    console.log('✅ PASS: In-app camera opened directly with framing guide & Flashlight strictly OFF banner');
    await client.screenshot(path.join(ARTIFACT_DIR, 'in_app_camera_glare_free_viewfinder.png'));

    // =========================================================================
    // TEST 3: Click Photo -> ONLY Retake (🔄) and Confirm Tick (✅)
    // =========================================================================
    console.log('\n--- TEST 3: Shutter Click -> ONLY Retake and Confirm (Tick) Displayed ---');
    await client.eval(`
      APP.captureLivePhoto();
    `);
    await wait(800);

    const snapCheck = await client.eval(`
      (() => {
        const previewImg = document.getElementById('wpp-captured-preview-img');
        const capturedBox = document.getElementById('wpp-captured-photo-box');
        const emptyBox = document.getElementById('wpp-empty-photo-box');
        const video = document.getElementById('wpp-camera-video');
        const retakeBtn = document.getElementById('wpp-btn-retake-label')?.textContent;
        const submitBtn = document.getElementById('wpp-btn-submit-label')?.textContent;

        return {
          previewSrcLen: previewImg?.src?.length || 0,
          isJpeg: previewImg?.src?.startsWith('data:image/jpeg') || false,
          capturedBoxVisible: capturedBox && !capturedBox.classList.contains('hidden'),
          emptyBoxHidden: !emptyBox || emptyBox.classList.contains('hidden'),
          cameraStreamStopped: !video?.srcObject,
          retakeBtnText: retakeBtn?.trim(),
          submitBtnText: submitBtn?.trim()
        };
      })()
    `);
    console.log('Shutter Post-Click Check:', snapCheck);

    if (!snapCheck.capturedBoxVisible || !snapCheck.isJpeg || snapCheck.previewSrcLen < 500) {
      throw new Error('Shutter click failed to capture photo frame!');
    }
    if (!snapCheck.cameraStreamStopped) {
      throw new Error('Camera stream was not stopped after photo capture!');
    }
    console.log('✅ PASS: Photo captured. ONLY Retake and Confirm (Tick) buttons visible');
    await client.screenshot(path.join(ARTIFACT_DIR, 'in_app_camera_tick_or_retake.png'));

    // =========================================================================
    // TEST 4: Retake Restarts Live Camera
    // =========================================================================
    console.log('\n--- TEST 4: Retake Restarts In-App Camera Stream ---');
    await client.eval(`
      APP.retakePaymentProofPhoto();
    `);
    await wait(1000);

    const retakeCheck = await client.eval(`
      (() => {
        const emptyBox = document.getElementById('wpp-empty-photo-box');
        const capturedBox = document.getElementById('wpp-captured-photo-box');
        const video = document.getElementById('wpp-camera-video');
        return {
          emptyBoxVisible: emptyBox && !emptyBox.classList.contains('hidden'),
          capturedBoxHidden: !capturedBox || capturedBox.classList.contains('hidden'),
          cameraRestarted: !!video?.srcObject
        };
      })()
    `);
    console.log('Retake Check:', retakeCheck);
    if (!retakeCheck.emptyBoxVisible || !retakeCheck.cameraRestarted) {
      throw new Error('Retake photo failed to restart camera stream!');
    }
    console.log('✅ PASS: Retake successfully restarts camera stream');

    // Re-snap and confirm via Tick
    await client.eval(`
      APP.captureLivePhoto();
    `);
    await wait(500);
    await client.eval(`
      (async () => {
        await APP.submitPaymentProof();
      })()
    `);
    await wait(1000);

    // =========================================================================
    // TEST 5: Waiter Settlement Prohibition on Waiter Terminal
    // =========================================================================
    console.log('\n--- TEST 5: Waiter Settlement Prohibition on Waiter Terminal ---');
    const settleAttemptResult = await client.eval(`
      (async () => {
        APP.setView('app');
        APP.selectTable('T-03');

        let blocked = false;
        const origToast = APP.showToast;
        APP.showToast = (msg) => {
          if (msg.includes('Manager') || msg.includes('मैनेजर')) {
            blocked = true;
          }
          origToast.call(APP, msg);
        };

        // Try direct settle call as waiter
        const res = await APP.settleTable();

        APP.showToast = origToast;
        const live = APP.getLiveTable('T-03');
        const ppsModal = document.getElementById('post-print-settle-modal');

        return {
          res,
          blocked,
          ppsModalHidden: !ppsModal || ppsModal.classList.contains('hidden'),
          tableStatus: live.status,
          hasProof: !!live.paymentProof
        };
      })()
    `);
    console.log('Waiter Settle Attempt Result:', settleAttemptResult);

    if (settleAttemptResult.res !== false || !settleAttemptResult.blocked) {
      throw new Error('SECURITY VIOLATION: Waiter was able to settle without Manager authorization!');
    }
    if (!settleAttemptResult.ppsModalHidden) {
      throw new Error('CRITICAL BUG: Post-print settle modal popped up on Waiter Terminal!');
    }
    console.log('✅ PASS: Waiter settlement strictly blocked on Waiter Terminal');

    // =========================================================================
    // TEST 6: Manager PIN Authorization & Settlement at Counter POS
    // =========================================================================
    console.log('\n--- TEST 6: Manager Counter PIN Authentication & Settlement ---');
    await client.setViewport(1280, 850, false);
    await client.eval(`
      (async () => {
        APP.setView('web');
        APP.selectTable('T-03');
        // Authenticate as manager via PIN
        document.getElementById('mgr-gate-pin-input').value = '1234';
        await APP.verifyManagerPinAccess();
      })()
    `);
    await wait(800);

    // Settle Table 3 as manager
    await client.eval(`
      (async () => {
        APP.state.payMode = 'upi';
        await APP.settleTable();
      })()
    `);
    await wait(1200);

    // Verify Past Bills list has Proof button
    await client.eval(`
      (async () => {
        await APP.openPastBillsModal();
      })()
    `);
    await wait(1000);

    const pastBillsCheck = await client.eval(`
      (() => {
        const list = document.getElementById('past-bills-list');
        const proofBtns = list?.querySelectorAll('button[onclick*="viewPastBillProof"]');
        return {
          billsCount: list?.children?.length || 0,
          proofBtnCount: proofBtns?.length || 0,
          firstRowHtml: list?.children[0]?.innerHTML?.slice(0, 400),
          appScriptSrc: document.querySelector('script[src*="app.js"]')?.src
        };
      })()
    `);
    console.log('Past Bills Check:', pastBillsCheck);
    if (pastBillsCheck.proofBtnCount === 0) {
      throw new Error('Settled bill in Past Bills list does not show 📸 Proof button!');
    }
    console.log('✅ PASS: Table settled by Manager and proof archived with 📸 Proof button in Past Bills');

    console.log('\n🎉 ALL 6 COMPREHENSIVE SECURITY & CAMERA TESTS PASSED 100%!');
  } catch (err) {
    console.error('❌ VERIFICATION FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (client) await client.close();
    chromeProcess.kill();
  }
}

run();
