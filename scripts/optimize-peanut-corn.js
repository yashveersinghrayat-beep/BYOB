const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

function connectCDP(wsUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(wsUrl);
    const req = http.request({
      hostname: url.hostname, port: url.port, path: url.pathname,
      headers: { 'Connection': 'Upgrade', 'Upgrade': 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': Buffer.from('cdp-key-resize').toString('base64') }
    });
    req.on('upgrade', (res, socket) => {
      let nextId = 1; const pending = new Map();
      function send(method, params = {}) {
        return new Promise((resFn, rejFn) => {
          const id = nextId++; pending.set(id, { resolve: resFn, reject: rejFn });
          const payload = Buffer.from(JSON.stringify({ id, method, params }));
          const len = payload.length;
          let header;
          if (len < 126) {
            header = Buffer.from([0x81, 0x80 | len, 0, 0, 0, 0]);
          } else if (len <= 65535) {
            header = Buffer.alloc(8); header[0] = 0x81; header[1] = 0x80 | 126; header.writeUInt16BE(len, 2);
          } else {
            header = Buffer.alloc(14); header[0] = 0x81; header[1] = 0x80 | 127; header.writeBigUInt64BE(BigInt(len), 2);
          }
          socket.write(Buffer.concat([header, payload]));
        });
      }
      let buf = Buffer.alloc(0);
      socket.on('data', chunk => {
        buf = Buffer.concat([buf, chunk]);
        while (buf.length >= 2) {
          const b2 = buf[1]; let payloadLen = b2 & 0x7f; let offset = 2;
          if (payloadLen === 126) {
            if (buf.length < 4) break;
            payloadLen = buf.readUInt16BE(2); offset = 4;
          } else if (payloadLen === 127) {
            if (buf.length < 10) break;
            payloadLen = Number(buf.readBigUInt64BE(2)); offset = 10;
          }
          if (buf.length < offset + payloadLen) break;
          const msgBuf = buf.slice(offset, offset + payloadLen);
          buf = buf.slice(offset + payloadLen);
          try {
            const data = JSON.parse(msgBuf.toString('utf8'));
            if (data.id && pending.has(data.id)) {
              const { resolve } = pending.get(data.id);
              pending.delete(data.id);
              resolve(data.result);
            }
          } catch (e) {}
        }
      });
      resolve({ send, close: () => socket.destroy() });
    });
    req.on('error', reject); req.end();
  });
}

(async () => {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const cdpPort = 9233;
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1200));

  http.get(`http://localhost:${cdpPort}/json/list`, res => {
    let d = ''; res.on('data', c => d += c);
    res.on('end', async () => {
      const targets = JSON.parse(d);
      const pageTarget = targets.find(t => t.type === 'page') || targets[0];
      const cdp = await connectCDP(pageTarget.webSocketDebuggerUrl);
      await cdp.send('Page.enable');

      async function resizeAndSave(inPath, outPath) {
        const base64In = fs.readFileSync(inPath).toString('base64');
        const mime = 'image/jpeg';
        const expr = `(function() {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const size = 400;
              canvas.width = size;
              canvas.height = size;
              const ctx = canvas.getContext('2d');
              const minDim = Math.min(img.width, img.height);
              const sx = (img.width - minDim) / 2;
              const sy = (img.height - minDim) / 2;
              ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
              resolve(canvas.toDataURL('image/jpeg', 0.82));
            };
            img.src = 'data:${mime};base64,${base64In}';
          });
        })()`;
        const res = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
        const dataUrl = res.result.value;
        const b64 = dataUrl.split(',')[1];
        fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
        console.log(`Saved optimized ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
      }

      await resizeAndSave(path.join(__dirname, '..', 'scratch', 'wiki_peanuts.jpg'), path.join(__dirname, '..', 'images', 'dishes', 'v_peanut_masala.jpg'));
      await resizeAndSave(path.join(__dirname, '..', 'scratch', 'wiki_corn.jpg'), path.join(__dirname, '..', 'images', 'dishes', 'v_crispy_corn.jpg'));

      cdp.close();
      chromeProc.kill();
    });
  });
})();
