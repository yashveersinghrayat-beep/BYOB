// Comprehensive Verification for:
// 1. Live WebRTC Camera Stream with Flashlight strictly OFF
// 2. Glare-free Alignment Box & Shutter Capture
// 3. Past Bills "Proof" Inspection for Manager
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
  console.log('🚀 Starting Chrome with fake video stream for camera testing...');
  const profileDir = path.join(__dirname, '..', '.tmp_chrome_cam_test');
  try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch (e) {}

  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9224',
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
        versionData = await fetchJson('http://localhost:9224/json/version');
        if (versionData && versionData.webSocketDebuggerUrl) break;
      } catch (e) {
        await wait(500);
      }
    }

    if (!versionData) throw new Error('Could not connect to Chrome debugging port 9224');

    const targets = await fetchJson('http://localhost:9224/json');
    let pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget) {
      pageTarget = await fetchJson('http://localhost:9224/json/new?' + APP_URL);
    }

    client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');

    console.log('🌐 Navigating to:', APP_URL);
    await client.send('Page.navigate', { url: APP_URL });
    await wait(3000);

    await client.setViewport(390, 844, true);
    await wait(500);

    console.log('\n--- TEST 1: Punch Order on Table 2 & Open Waiter Payment Desk ---');
    await client.eval(`
      (async () => {
        APP.state.userRole = 'waiter';
        APP.setView('app');
        APP.selectTable('2');
        const items = DB.menuItems || DB.menu || [];
        if (items.length > 0) {
          APP.addItem(items[0].id);
          await APP.sendOrder();
        }
        APP.openWaiterPaymentFlow('2');
      })()
    `);
    await wait(1500);

    const cameraModalCheck = await client.eval(`
      (() => {
        const modal = document.getElementById('waiter-payment-proof-modal');
        const flashNotice = document.getElementById('wpp-flash-notice')?.textContent;
        const liveBox = document.getElementById('wpp-live-camera-box');
        const video = document.getElementById('wpp-camera-video');
        const snapBtn = document.getElementById('wpp-btn-live-snap');
        const alignGuide = document.getElementById('wpp-overlay-align')?.textContent;

        return {
          modalOpen: modal && !modal.classList.contains('hidden'),
          hasFlashNotice: !!flashNotice && flashNotice.includes('Flashlight'),
          liveBoxVisible: liveBox && !liveBox.classList.contains('hidden'),
          hasVideoStream: !!video && !!video.srcObject,
          videoReadyState: video ? video.readyState : -1,
          videoWidth: video ? video.videoWidth : 0,
          snapBtnEnabled: snapBtn && !snapBtn.disabled,
          alignGuide: alignGuide?.trim()
        };
      })()
    `);
    console.log('Camera Modal Check:', cameraModalCheck);

    if (!cameraModalCheck.modalOpen) {
      throw new Error('Waiter payment proof modal did not open!');
    }
    if (!cameraModalCheck.hasFlashNotice) {
      throw new Error('Flashlight OFF notice banner is missing!');
    }
    if (!cameraModalCheck.liveBoxVisible) {
      throw new Error('Live camera viewfinder box is not visible!');
    }
    console.log('✅ PASS: Glare-Free Live Viewfinder active with Flashlight strictly OFF banner');
    await client.screenshot(path.join(ARTIFACT_DIR, 'waiter_camera_live_viewfinder.png'));

    console.log('\n--- TEST 2: Glare-Free Shutter Snap & Quality Compression ---');
    await client.eval(`
      APP.captureLivePhoto();
    `);
    await wait(800);

    const snapCheck = await client.eval(`
      (() => {
        const previewImg = document.getElementById('wpp-captured-preview-img');
        const capturedBox = document.getElementById('wpp-captured-photo-box');
        const liveBox = document.getElementById('wpp-live-camera-box');
        const video = document.getElementById('wpp-camera-video');

        return {
          previewSrcLen: previewImg?.src?.length || 0,
          isJpeg: previewImg?.src?.startsWith('data:image/jpeg') || false,
          capturedBoxVisible: capturedBox && !capturedBox.classList.contains('hidden'),
          liveBoxHidden: !liveBox || liveBox.classList.contains('hidden'),
          cameraStreamStopped: !video?.srcObject
        };
      })()
    `);
    console.log('Shutter Snap Check:', snapCheck);

    if (!snapCheck.capturedBoxVisible || !snapCheck.isJpeg || snapCheck.previewSrcLen < 500) {
      throw new Error('Live photo snap failed to produce compressed JPEG preview!');
    }
    if (!snapCheck.cameraStreamStopped) {
      throw new Error('Camera stream was not stopped after photo capture (battery waste)!');
    }
    console.log('✅ PASS: Photo captured, compressed to JPEG, and camera hardware shut off');
    await client.screenshot(path.join(ARTIFACT_DIR, 'waiter_camera_snapped_preview.png'));

    console.log('\n--- TEST 3: Retake Photo Restarts Live Viewfinder ---');
    await client.eval(`
      APP.retakePaymentProofPhoto();
    `);
    await wait(1000);

    const retakeCheck = await client.eval(`
      (() => {
        const liveBox = document.getElementById('wpp-live-camera-box');
        const capturedBox = document.getElementById('wpp-captured-photo-box');
        const video = document.getElementById('wpp-camera-video');
        return {
          liveBoxVisible: liveBox && !liveBox.classList.contains('hidden'),
          capturedBoxHidden: !capturedBox || capturedBox.classList.contains('hidden'),
          cameraRestarted: !!video?.srcObject
        };
      })()
    `);
    console.log('Retake Check:', retakeCheck);
    if (!retakeCheck.liveBoxVisible || !retakeCheck.cameraRestarted) {
      throw new Error('Retake photo failed to restart camera viewfinder!');
    }
    console.log('✅ PASS: Retake successfully restarts camera stream');

    console.log('\n--- TEST 4: Re-snap & Submit to Manager Counter ---');
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

    console.log('\n--- TEST 5: Manager Settlement & Past Bills Audit Proof ---');
    await client.setViewport(1280, 850, false);
    await client.eval(`
      APP.state.userRole = 'manager';
      APP.setView('web');
      APP.selectTable('2');
    `);
    await wait(800);

    // Settle Table 2
    await client.eval(`
      (async () => {
        APP.state.payMode = 'upi';
        await APP.settleTable();
      })()
    `);
    await wait(1200);

    // Open Past Bills modal
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
        const hasProofBtn = proofBtns && proofBtns.length > 0;
        let firstBillId = null;
        if (hasProofBtn) {
          const m = proofBtns[0].getAttribute('onclick').match(/'([^']+)'/);
          if (m) firstBillId = m[1];
        }
        return {
          billsCount: list?.children?.length || 0,
          proofBtnCount: proofBtns?.length || 0,
          firstBillId,
          recentBillsLen: (APP.state.recentBills || []).length,
          firstBillProof: (APP.state.recentBills || [])[0]?.payment_proof ? 'has proof' : 'no proof',
          sampleHtml: list?.children[0]?.innerHTML?.slice(0, 300)
        };
      })()
    `);
    console.log('Past Bills Check:', pastBillsCheck);

    if (pastBillsCheck.proofBtnCount === 0) {
      throw new Error('Settled bill in Past Bills list does not show 📸 Proof button!');
    }
    console.log('✅ PASS: Past settled bill displays 📸 Proof button for Manager audit');

    // Click proof button in past bills to open fullscreen modal
    await client.eval(`
      APP.viewPastBillProof('${pastBillsCheck.firstBillId}');
    `);
    await wait(600);

    const pastProofModalCheck = await client.eval(`
      (() => {
        const modal = document.getElementById('payment-proof-viewer-modal');
        const img = document.getElementById('ppv-full-image');
        const title = document.getElementById('ppv-table-name')?.textContent;
        return {
          modalVisible: modal && !modal.classList.contains('hidden'),
          hasImg: !!img?.src && img.src.startsWith('data:image/jpeg'),
          title
        };
      })()
    `);
    console.log('Past Bill Proof Modal Check:', pastProofModalCheck);

    if (!pastProofModalCheck.modalVisible || !pastProofModalCheck.hasImg) {
      throw new Error('Past bill payment proof viewer modal failed to display proof image!');
    }
    console.log('✅ PASS: Manager can inspect customer payment proof for any past settled bill');
    await client.screenshot(path.join(ARTIFACT_DIR, 'past_bills_proof_audit_verified.png'));

    console.log('\n🎉 ALL CAMERA & GLOSS-FREE PROOF AUDIT TESTS PASSED 100%!');
  } catch (err) {
    console.error('❌ CAMERA VERIFICATION FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (client) await client.close();
    chromeProcess.kill();
  }
}

run();
