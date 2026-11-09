// ==============================================================================
// 💎 ONYX POS — ADITYA MALL KITCHEN PRINTER BRIDGE & CLOUD REALTIME SYNC
// Branch: Aditya Mall (Indirapuram) | Branch Code: AM
// Supabase: https://ekvksqsondvyeaoidgcw.supabase.co
// Kitchen Printer: 192.168.1.222:9100 (80mm ESC/POS High-Speed Thermal)
// ==============================================================================

const http = require('http');
const net = require('net');

// Resilience guards to keep the bridge running 24/7 without crashes
process.on('uncaughtException', (err) => {
  console.error('⚠️ [Aditya Bridge Guard] Uncaught Exception:', err.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [Aditya Bridge Guard] Unhandled Rejection:', reason && reason.message ? reason.message : reason);
});

const CONFIG = {
  branchId: 'aditya_mall',
  branchCode: 'AM',
  branchName: 'BYOB Aditya Mall (Indirapuram)',
  supabaseUrl: 'https://ekvksqsondvyeaoidgcw.supabase.co',
  supabaseKey: process.env.SUPABASE_SECRET_KEY || 'sb_publishable_sVxPP8HbMna3levjlyeLlA_BGxpyyT4',
  anonKey: 'sb_publishable_sVxPP8HbMna3levjlyeLlA_BGxpyyT4',
  printerIp: '192.168.1.222',
  printerPort: 9100,
  httpPort: 3001,
  autoCut: true,
  beeper: true
};

const HEADERS = {
  'apikey': CONFIG.supabaseKey,
  'Authorization': `Bearer ${CONFIG.supabaseKey}`,
  'Content-Type': 'application/json'
};

function sanitizeAscii(str) {
  if (!str) return '';
  return String(str).replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
}

class AdityaPrinterBridge {
  constructor() {
    this.printedKotIds = new Set();
    this.ws = null;
    this.isWsConnected = false;
    this.wsHeartbeat = null;
    this.pollInterval = null;
    this._printLock = Promise.resolve();
    this.isPrinterOnline = true;
  }

  async start() {
    console.log('\n======================================================');
    console.log('   💎 ONYX POS — ADITYA MALL KITCHEN PRINTER BRIDGE');
    console.log('   Branch: Aditya Mall (Indirapuram) [AM]');
    console.log(`   🖨️ Thermal Printer: ${CONFIG.printerIp}:${CONFIG.printerPort} (ESC/POS 80mm)`);
    console.log(`   ☁️ Supabase Cloud: ${CONFIG.supabaseUrl}`);
    console.log('======================================================\n');

    // 1. Seed recent KOT IDs to prevent reprint on startup
    await this.seedExistingKots();

    // 2. Connect Supabase Realtime WebSocket (<25ms instant dispatch)
    this.connectRealtimeWebSocket();

    // 3. Fallback Cloud Poller (every 1.5s)
    this.pollInterval = setInterval(() => this.pollPendingKots(), 1500);

    // 4. Start local diagnostic HTTP server on port 3001
    this.startHttpServer();
  }

  async seedExistingKots() {
    try {
      const res = await fetch(`${CONFIG.supabaseUrl}/rest/v1/kots?select=id&order=created_at.desc&limit=200`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const kots = await res.json();
        for (const k of kots) {
          if (k.id) this.printedKotIds.add(k.id);
        }
        console.log(`📦 Seeded ${this.printedKotIds.size} existing KOT IDs (anti-duplicate shield ready).`);
      }
    } catch (e) {
      console.warn('⚠️ Notice during initial KOT seeding:', e.message);
    }
  }

  // --- Realtime WebSocket (<25ms multi-device sync) ---
  connectRealtimeWebSocket() {
    if (typeof globalThis.WebSocket === 'undefined') return;

    try {
      const wsEndpoint = `${CONFIG.supabaseUrl.replace(/^http/, 'ws')}/realtime/v1/websocket?apikey=${CONFIG.anonKey}&vsn=1.0.0`;
      this.ws = new WebSocket(wsEndpoint);

      this.ws.onopen = () => {
        this.isWsConnected = true;
        console.log('⚡ [Aditya Bridge] Supabase Realtime WebSocket Connected (<25ms instant KOT dispatch)');
        
        // Join Phoenix broadcast channel
        this.ws.send(JSON.stringify({
          topic: 'realtime:onyx-pos-live',
          event: 'phx_join',
          payload: { config: { broadcast: { ack: false, self: false } } },
          ref: 'aditya-srv-' + Date.now()
        }));

        if (this.wsHeartbeat) clearInterval(this.wsHeartbeat);
        this.wsHeartbeat = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
              topic: 'phoenix',
              event: 'heartbeat',
              payload: {},
              ref: 'hb-' + Date.now()
            }));
          }
        }, 25000);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'broadcast' && msg.payload) {
            const ev = msg.payload.event;
            const payload = msg.payload.payload;
            if (ev === 'KOT_PUNCHED') {
              this.handleRemoteKotPunch(payload);
            } else if (ev === 'ITEM_VOIDED') {
              this.printVoidSlip(payload);
            } else if (ev === 'TABLE_TRANSFERRED') {
              this.printTransferSlip(payload);
            }
          }
        } catch (e) { }
      };

      this.ws.onclose = () => {
        this.isWsConnected = false;
        if (this.wsHeartbeat) clearInterval(this.wsHeartbeat);
        setTimeout(() => this.connectRealtimeWebSocket(), 3500);
      };

      this.ws.onerror = () => {
        this.isWsConnected = false;
        try { this.ws.close(); } catch (e) { }
      };
    } catch (e) {
      console.warn('⚠️ WebSocket init notice:', e.message);
    }
  }

  // Handle Instant WebSocket KOT Broadcast
  handleRemoteKotPunch(payload) {
    if (!payload || !payload.tableId) return;
    const kotId = payload.kotId;
    if (kotId && this.printedKotIds.has(kotId)) return;

    console.log(`⚡ [Aditya Bridge] Realtime KOT Broadcast Received: ${kotId} (${payload.tableName || payload.tableId})`);
    this.printKot(payload);
  }

  // --- Fallback Poller for Any Pending KOTs in Supabase Cloud ---
  async pollPendingKots() {
    try {
      const res = await fetch(`${CONFIG.supabaseUrl}/rest/v1/kots?status=eq.pending&order=created_at.desc&limit=10`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(3000)
      });
      if (!res.ok) return;

      const pendingKots = await res.json();
      if (!Array.isArray(pendingKots) || pendingKots.length === 0) return;

      for (const kot of pendingKots) {
        if (this.printedKotIds.has(kot.id)) {
          // Already printed, mark active so it stops polling
          this.markKotActiveInCloud(kot.id);
          continue;
        }

        // Fetch line items for this KOT
        const itemsRes = await fetch(`${CONFIG.supabaseUrl}/rest/v1/kot_items?kot_id=eq.${encodeURIComponent(kot.id)}`, {
          headers: HEADERS,
          signal: AbortSignal.timeout(3000)
        });
        const items = itemsRes.ok ? await itemsRes.json() : [];

        console.log(`☁️ [Aditya Bridge] Poller found pending KOT: #${kot.id} for Table ${kot.table_name || kot.table_id}`);
        await this.printKot({
          kotId: kot.id,
          id: kot.id,
          tableId: kot.table_id,
          tableName: kot.table_name,
          waiterName: kot.waiter_name,
          items: items
        });

        await this.markKotActiveInCloud(kot.id);
      }
    } catch (e) {
      // Quiet background polling
    }
  }

  async markKotActiveInCloud(kotId) {
    try {
      await fetch(`${CONFIG.supabaseUrl}/rest/v1/kots?id=eq.${encodeURIComponent(kotId)}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({ status: 'active', updated_at: new Date().toISOString() })
      });
    } catch (e) { }
  }

  // Build RAW ESC/POS Byte Buffer for Kitchen Ticket
  buildKotBuffer(kotData) {
    const buffers = [];
    const pushBytes = (...arr) => buffers.push(Buffer.from(arr));
    const pushText = (txt) => buffers.push(Buffer.from(sanitizeAscii(txt) + (txt.endsWith('\n') ? '\n' : ''), 'ascii'));

    const kotId = String(kotData.kotId || kotData.id || 'NEW');
    const tableName = String(kotData.tableName || kotData.tableId || 'Table').toUpperCase();
    const waiter = String(kotData.waiterName || kotData.waiter_name || kotData.waiter || 'Floor Staff');
    const now = new Date();
    const timeStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
                    ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    // 1. Initialize Printer (ESC @)
    pushBytes(0x1B, 0x40);

    // 2. Beeper (2 short alert beeps for kitchen chef)
    if (CONFIG.beeper) {
      pushBytes(0x1B, 0x42, 0x02, 0x02);
    }

    // 3. Header
    pushBytes(0x1B, 0x61, 0x01); // Center
    pushBytes(0x1B, 0x21, 0x30); // Double Size
    pushText('BYOB ADITYA MALL\n');

    pushBytes(0x1B, 0x21, 0x00); // Normal
    pushText('KITCHEN ORDER TICKET (KOT)\n');
    pushText('================================================\n');

    // 4. Table & Punch Details
    pushBytes(0x1B, 0x61, 0x00); // Left align
    pushBytes(0x1B, 0x21, 0x20); // Double Width
    pushText(` TABLE: ${tableName}\n`);

    pushBytes(0x1B, 0x21, 0x00); // Normal
    pushText(` KOT No    : #${kotId}\n`);
    pushText(` Server    : ${waiter}\n`);
    pushText(` Punched At: ${timeStr}\n`);
    pushText('------------------------------------------------\n');

    // 5. Column Headers
    pushBytes(0x1B, 0x45, 0x01); // Bold ON
    pushText(' QTY   ITEM DESCRIPTION                NOTES    \n');
    pushBytes(0x1B, 0x45, 0x00); // Bold OFF
    pushText('------------------------------------------------\n');

    // 6. Food Items
    const items = (kotData.items || []).filter(it => !it.is_void && !it.voided);
    for (const item of items) {
      const qtyStr = `${item.qty || 1}x`.padEnd(5, ' ');
      const name = String(item.name || item.title || 'Item');

      pushBytes(0x1B, 0x21, 0x10); // Double Height for clean reading across kitchen counter
      pushText(` ${qtyStr}${name}\n`);

      const note = item.notes || item.note || item.instructions;
      if (note) {
        pushBytes(0x1B, 0x21, 0x00); // Normal
        pushText(`       * Note: ${note}\n`);
      }
    }

    pushBytes(0x1B, 0x21, 0x00); // Normal
    pushText('------------------------------------------------\n');

    if (kotData.notes || kotData.specialNote) {
      pushBytes(0x1B, 0x45, 0x01);
      pushText(` SPECIAL NOTE: ${kotData.notes || kotData.specialNote}\n`);
      pushBytes(0x1B, 0x45, 0x00);
      pushText('================================================\n');
    }

    // 7. Footer
    pushBytes(0x1B, 0x61, 0x01);
    pushText('[ ADITYA MALL KITCHEN DISPATCH - ONYX POS ]\n');

    // Feeds to clear cutter
    pushBytes(0x0A, 0x0A, 0x0A, 0x0A, 0x0A);

    // Auto-Cut (GS V 66 0)
    if (CONFIG.autoCut) {
      pushBytes(0x1D, 0x56, 0x42, 0x00);
    }

    return Buffer.concat(buffers);
  }

  // Build RAW ESC/POS Buffer for Cancelled/Void Item Slip
  buildVoidBuffer(voidData) {
    const buffers = [];
    const pushBytes = (...arr) => buffers.push(Buffer.from(arr));
    const pushText = (txt) => buffers.push(Buffer.from(sanitizeAscii(txt) + (txt.endsWith('\n') ? '\n' : ''), 'ascii'));

    const tableName = String(voidData.tableName || voidData.tableId || 'Table').toUpperCase();
    const itemName = String(voidData.itemName || (voidData.voidedItem && voidData.voidedItem.name) || 'Item');
    const qty = voidData.qty || (voidData.voidedItem && voidData.voidedItem.qty) || 1;
    const reason = String(voidData.reason || 'Customer Request');
    const staff = String(voidData.staffName || 'Staff');
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    pushBytes(0x1B, 0x40); // Init
    if (CONFIG.beeper) pushBytes(0x1B, 0x42, 0x03, 0x02); // 3 alert beeps

    pushBytes(0x1B, 0x61, 0x01); // Center
    pushBytes(0x1B, 0x21, 0x30); // Double Size
    pushText('*** ITEM CANCELLED ***\n');

    pushBytes(0x1B, 0x21, 0x00);
    pushText('================================================\n');

    pushBytes(0x1B, 0x61, 0x00); // Left
    pushBytes(0x1B, 0x21, 0x20); // Double width
    pushText(` TABLE: ${tableName}\n`);

    pushBytes(0x1B, 0x21, 0x00);
    pushText(` Time : ${now}\n`);
    pushText('------------------------------------------------\n');

    pushBytes(0x1B, 0x21, 0x30); // Big Cancel text
    pushText(` CANCEL: ${qty}x ${itemName}\n`);

    pushBytes(0x1B, 0x21, 0x00);
    pushText('------------------------------------------------\n');
    pushText(` Reason    : ${reason}\n`);
    pushText(` Authorized: ${voidData.authorizedBy || 'Manager'}\n`);
    pushText(` Staff     : ${staff}\n`);
    pushText('================================================\n');

    pushBytes(0x1B, 0x61, 0x01);
    pushBytes(0x1B, 0x45, 0x01);
    pushText('>> DO NOT PREPARE - REMOVE FROM ORDER <<\n');
    pushBytes(0x1B, 0x45, 0x00);

    pushBytes(0x0A, 0x0A, 0x0A, 0x0A, 0x0A);
    if (CONFIG.autoCut) pushBytes(0x1D, 0x56, 0x42, 0x00);

    return Buffer.concat(buffers);
  }

  // Print KOT with Serial Promise Lock
  async printKot(kotData) {
    const kotId = String(kotData.kotId || kotData.id || '');
    if (kotId && this.printedKotIds.has(kotId)) {
      return { success: true, duplicateSkipped: true };
    }

    const buffer = this.buildKotBuffer(kotData);
    return this._enqueuePrint(buffer, kotId, `KOT #${kotId || 'NEW'}`);
  }

  async printVoidSlip(voidData) {
    const buffer = this.buildVoidBuffer(voidData);
    const slipId = 'VOID-' + Date.now();
    return this._enqueuePrint(buffer, slipId, `Void Item Slip`);
  }

  async printTransferSlip(transferData) {
    const buffers = [];
    const pushBytes = (...arr) => buffers.push(Buffer.from(arr));
    const pushText = (txt) => buffers.push(Buffer.from(sanitizeAscii(txt) + (txt.endsWith('\n') ? '\n' : ''), 'ascii'));

    const fromTable = String(transferData.sourceTableId || transferData.from || '').toUpperCase();
    const toTable = String(transferData.targetTableId || transferData.to || '').toUpperCase();
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    pushBytes(0x1B, 0x40);
    if (CONFIG.beeper) pushBytes(0x1B, 0x42, 0x02, 0x02);

    pushBytes(0x1B, 0x61, 0x01);
    pushBytes(0x1B, 0x21, 0x30);
    pushText('** TABLE TRANSFER **\n');
    pushBytes(0x1B, 0x21, 0x00);
    pushText('================================================\n');

    pushBytes(0x1B, 0x61, 0x00);
    pushText(` Time : ${now}\n`);
    pushText('------------------------------------------------\n');
    pushBytes(0x1B, 0x21, 0x30);
    pushText(` ${fromTable}  -->  ${toTable}\n`);
    pushBytes(0x1B, 0x21, 0x00);
    pushText('------------------------------------------------\n');
    pushText(' Guest shifted table. Deliver food to\n');
    pushBytes(0x1B, 0x45, 0x01);
    pushText(` NEW TABLE: ${toTable}\n`);
    pushBytes(0x1B, 0x45, 0x00);
    pushText('================================================\n');

    pushBytes(0x0A, 0x0A, 0x0A, 0x0A, 0x0A);
    if (CONFIG.autoCut) pushBytes(0x1D, 0x56, 0x42, 0x00);

    const buffer = Buffer.concat(buffers);
    return this._enqueuePrint(buffer, `TRANS-${Date.now()}`, `Transfer ${fromTable} -> ${toTable}`);
  }

  _enqueuePrint(buffer, id, label) {
    this._printLock = this._printLock.catch(() => {}).then(() => {
      return this._sendSocket(buffer, id, label);
    });
    return this._printLock;
  }

  _sendSocket(buffer, id, label) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let done = false;

      const complete = (ok, msg) => {
        if (done) return;
        done = true;
        try { socket.destroy(); } catch (e) {}
        if (ok) {
          if (id) this.printedKotIds.add(id);
          this.isPrinterOnline = true;
          console.log(`🖨️ [Aditya Printer] SUCCESS: ${label} printed wirelessly to ${CONFIG.printerIp}`);
          resolve({ success: true, message: `${label} printed` });
        } else {
          this.isPrinterOnline = false;
          console.warn(`⚠️ [Aditya Printer] OFFLINE / FAILED: ${msg} (${CONFIG.printerIp})`);
          resolve({ success: false, error: msg });
        }
      };

      socket.setTimeout(2500);
      socket.connect(CONFIG.printerPort, CONFIG.printerIp, () => {
        socket.write(buffer, () => {
          setTimeout(() => complete(true), 120);
        });
      });

      socket.on('timeout', () => complete(false, 'Socket timeout connecting to 192.168.1.222:9100'));
      socket.on('error', (e) => complete(false, e.message || 'Network error'));
      socket.on('close', (h) => { if (!done) complete(false, h ? 'Interrupted' : 'Closed unexpectedly'); });
    });
  }

  // HTTP Diagnostic Server on Port 3001
  startHttpServer() {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
      }

      if (url.pathname === '/health' || url.pathname === '/api/printer/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          branch: CONFIG.branchId,
          printer: `${CONFIG.printerIp}:${CONFIG.printerPort}`,
          online: this.isPrinterOnline,
          wsConnected: this.isWsConnected,
          printedCount: this.printedKotIds.size
        }));
      }

      if (url.pathname === '/api/printer/test-kot' && req.method === 'POST') {
        const testSlip = {
          kotId: 'TEST-' + Math.floor(100 + Math.random() * 900),
          tableName: 'TEST T-01 (DIAGNOSTIC)',
          waiterName: 'Aditya Staff',
          items: [
            { name: 'TEST PRINT: Dal Makhani', qty: 1, notes: 'Rich & Creamy' },
            { name: 'TEST PRINT: Butter Roti', qty: 4, notes: 'Hot' },
            { name: 'TEST PRINT: Paneer Tikka', qty: 2, notes: 'Crispy Spicy' }
          ]
        };
        const r = await this.printKot(testSlip);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: r.success, result: r }));
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    });

    server.listen(CONFIG.httpPort, '0.0.0.0', () => {
      console.log(`📡 [Aditya Bridge] Local HTTP API ready on http://localhost:${CONFIG.httpPort}`);
    });
  }
}

const bridge = new AdityaPrinterBridge();
bridge.start();

module.exports = bridge;

