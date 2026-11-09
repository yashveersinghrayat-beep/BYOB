// scripts/capture-missing-perm.js
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

async function testMissing() {
  const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = path.join(__dirname, '..', '.tmp_chrome_perm_missing');
  if (fs.existsSync(userDataDir)) {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9224',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    'http://localhost:3000'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const httpGet = (url) => new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });

  const targets = await httpGet('http://localhost:9224/json');
  const target = targets.find(t => t.type === 'page') || targets[0];
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  const send = (method, params = {}) => new Promise((resolve) => {
    const id = Math.floor(Math.random() * 100000);
    const handler = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === id) { ws.removeEventListener('message', handler); resolve(msg.result); }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 2.6, mobile: true });
  await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Linux; Android 14; motorola edge 50 fusion) AppleWebKit/537.36 Mobile Safari/537.36' });

  // Clear any cached permission and reload
  await send('Runtime.evaluate', { expression: 'localStorage.clear(); sessionStorage.clear(); location.reload();', awaitPromise: true });
  await new Promise(r => setTimeout(r, 2500));

  const state = await send('Runtime.evaluate', {
    expression: `(() => {
      const modal = document.getElementById('permission-modal');
      const cam = document.getElementById('perm-camera-badge');
      const notif = document.getElementById('perm-notify-badge');
      const isVisible = modal && !modal.classList.contains('hidden');
      return { isVisible, camText: cam ? cam.textContent.trim() : null, notifText: notif ? notif.textContent.trim() : null };
    })()`,
    returnByValue: true
  });

  console.log('Uncached launch state on mobile:', state.result.value);

  // Take screenshot of missing state
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const artDir = 'C:\\Users\\Root\\.gemini\\antigravity\\brain\\f1f8793d-1155-42c4-8097-e03e241314a4';
  fs.writeFileSync(path.join(artDir, 'permission_gateway_prompt_mobile.png'), Buffer.from(shot.data, 'base64'));
  console.log('📸 Captured authentic permission_gateway_prompt_mobile.png with missing permission!');

  ws.close();
  chromeProc.kill('SIGKILL');
  try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
}

testMissing().catch(console.error);
