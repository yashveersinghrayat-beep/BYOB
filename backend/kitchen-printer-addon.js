// ==============================================================================
// 💎 ONYX KITCHEN THERMAL PRINTER ADD-ON (MODULAR PLUG-AND-PLAY)
// Direct ESC/POS Network Driver over Wi-Fi / LAN (Port 9100)
// To Disable: Set KITCHEN_PRINTER_CONFIG.enabled = false
// ==============================================================================

const net = require('net');

const KITCHEN_PRINTER_CONFIG = {
  enabled: true,               // <-- Switch: true (Auto-print ON) | false (OFF)
  printerIp: '192.168.1.222',  // Static IP configured on TN260 / POS-80
  printerPort: 9100,           // Standard ESC/POS RAW Port
  timeoutMs: 2500,             // 2.5s connection timeout (never blocks server)
  restaurantName: 'ONYX RESTAURANT',
  autoCut: true,
  debug: true
};

class KitchenPrinterAddon {
  constructor(broadcastFn) {
    this.broadcast = broadcastFn || (() => {});
    this.isOnline = true;
    this.pendingQueue = [];
    this.printedKotIds = new Set();
    this._printLock = Promise.resolve(); // Serial Mutex Lock for TCP 9100 concurrency
  }

  // Check if addon is active (and not running in remote cloud serverless without LAN)
  isEnabled() {
    if (process.env.VERCEL) return false; // Physical printing runs on local counter PC
    return Boolean(KITCHEN_PRINTER_CONFIG.enabled);
  }

  // Helper to extract clean KOT ID from any payload variant
  getKotId(kotData) {
    return String(kotData.id || kotData.kotId || kotData.kot_id || '').trim();
  }

  // Sanitize input to clean ASCII (removes emojis, unicode and garbled symbols, preserves formatting)
  sanitizeAscii(txt) {
    if (!txt) return '';
    return String(txt)
      .replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]/gu, '') // Remove emojis safely
      .replace(/[^\x20-\x7E\n\r\t]/g, ' '); // Replace non-ASCII with clean spaces, preserve whitespace/padding
  }

  // Format KOT to ESC/POS binary buffer
  buildEscPosBuffer(kotData) {
    const buffers = [];

    // Helper: Push raw bytes
    const pushBytes = (...arr) => buffers.push(Buffer.from(arr));
    // Helper: Push clean ASCII text string
    const pushText = (txt) => buffers.push(Buffer.from(this.sanitizeAscii(txt) + (txt.endsWith('\n') ? '\n' : ''), 'ascii'));

    // 1. Initialize Printer (ESC @)
    pushBytes(0x1B, 0x40);

    // 2. Header (Center Aligned, Double Size)
    pushBytes(0x1B, 0x61, 0x01); // Center
    pushBytes(0x1B, 0x21, 0x30); // Double Height + Width
    pushText(`${KITCHEN_PRINTER_CONFIG.restaurantName}\n`);

    pushBytes(0x1B, 0x21, 0x10); // Double Height
    pushText('** KITCHEN ORDER TICKET **\n');

    pushBytes(0x1B, 0x21, 0x00); // Normal text
    pushText('================================================\n');

    // 3. Metadata
    const tableName = String(kotData.tableName || kotData.table_name || kotData.tableId || kotData.table_id || 'Table').toUpperCase();
    const kotId = this.getKotId(kotData) || ('KOT-' + Date.now().toString(36).toUpperCase());
    const waiter = String(kotData.waiterName || kotData.waiter_name || kotData.waiter || 'Floor Staff');
    const now = new Date();
    const timeStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
                    ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    pushBytes(0x1B, 0x61, 0x00); // Left align
    pushBytes(0x1B, 0x21, 0x20); // Double Width
    pushText(` TABLE: ${tableName}\n`);

    pushBytes(0x1B, 0x21, 0x00); // Normal
    pushText(` KOT No    : #${kotId}\n`);
    pushText(` Server    : ${waiter}\n`);
    pushText(` Punched At: ${timeStr}\n`);
    pushText('------------------------------------------------\n');

    // 4. Column Header
    pushBytes(0x1B, 0x45, 0x01); // Bold ON
    pushText(' QTY   ITEM DESCRIPTION                NOTES    \n');
    pushBytes(0x1B, 0x45, 0x00); // Bold OFF
    pushText('------------------------------------------------\n');

    // 5. Items (filter out voided items)
    const items = (kotData.items || []).filter(it => !it.is_void && (!it.voided));
    for (const item of items) {
      const qtyStr = `${item.qty || 1}x`.padEnd(5, ' ');
      const name = String(item.name || item.title || 'Item');

      pushBytes(0x1B, 0x21, 0x10); // Double Height for clean kitchen reading
      pushText(` ${qtyStr}${name}\n`);

      // Cooking notes / preferences (indented clean ASCII)
      const note = item.notes || item.note || item.instructions;
      if (note) {
        pushBytes(0x1B, 0x21, 0x00); // Normal
        pushText(`       * Note: ${note}\n`);
      }
    }

    pushBytes(0x1B, 0x21, 0x00); // Normal
    pushText('------------------------------------------------\n');

    // 6. Special Order Notes if any
    if (kotData.notes || kotData.specialNote) {
      pushBytes(0x1B, 0x45, 0x01); // Bold
      pushText(` SPECIAL INSTRUCTIONS: ${kotData.notes || kotData.specialNote}\n`);
      pushBytes(0x1B, 0x45, 0x00);
      pushText('================================================\n');
    }

    // 7. Footer
    pushBytes(0x1B, 0x61, 0x01); // Center
    pushText('[ AUTOMATED KITCHEN DISPATCH - ONYX POS ]\n');

    // Line Feeds to clear cutter
    pushBytes(0x0A, 0x0A, 0x0A, 0x0A, 0x0A);

    // Partial Cut (GS V 66 0)
    if (KITCHEN_PRINTER_CONFIG.autoCut) {
      pushBytes(0x1D, 0x56, 0x42, 0x00);
    }

    return Buffer.concat(buffers);
  }

  // Core Send with Concurrency Mutex & Non-blocking Caller Return
  async printKot(kotData) {
    if (!this.isEnabled()) {
      if (KITCHEN_PRINTER_CONFIG.debug) console.log('🖨️ [Kitchen Printer] Addon is disabled. Skipping print.');
      return { success: false, disabled: true };
    }

    const activeItems = (kotData.items || []).filter(it => !it.is_void && (!it.voided) && (it.qty > 0));
    if (activeItems.length === 0) {
      if (KITCHEN_PRINTER_CONFIG.debug) console.log('🖨️ [Kitchen Printer] No active items in KOT. Skipping empty print.');
      return { success: true, skippedEmpty: true };
    }

    const kotId = this.getKotId(kotData);
    if (kotId && this.printedKotIds.has(kotId)) {
      if (KITCHEN_PRINTER_CONFIG.debug) console.log(`🖨️ [Kitchen Printer] KOT #${kotId} already printed. Anti-duplicate skipped.`);
      return { success: true, duplicateSkipped: true };
    }

    // Prune printed IDs cache if exceeding 2000 to prevent long-term memory leaks
    if (this.printedKotIds.size > 2000) {
      let count = 0;
      for (const id of this.printedKotIds) {
        this.printedKotIds.delete(id);
        if (++count >= 500) break;
      }
    }

    // Chain print jobs sequentially so concurrent waiter punches never collide on port 9100
    const executeInSerialQueue = () => {
      this._printLock = this._printLock.catch(() => {}).then(() => {
        return this._doSocketPrint(kotData, kotId);
      });
      return this._printLock;
    };

    // Caller gets an asynchronous Promise - caller is NEVER stalled!
    return executeInSerialQueue();
  }

  // Format and Print Kitchen Cancellation / Void Item Ticket
  async printVoidSlip(voidData) {
    if (!this.isEnabled()) return { success: false, disabled: true };

    const buffers = [];
    const pushBytes = (...arr) => buffers.push(Buffer.from(arr));
    const pushText = (txt) => buffers.push(Buffer.from(this.sanitizeAscii(txt) + (txt.endsWith('\n') ? '\n' : ''), 'ascii'));

    pushBytes(0x1B, 0x40); // Init
    pushBytes(0x1B, 0x61, 0x01); // Center
    pushBytes(0x1B, 0x21, 0x30); // Double Size
    pushText('*** ITEM CANCELLED ***\n');

    pushBytes(0x1B, 0x21, 0x00); // Normal
    pushText('================================================\n');

    const tableName = String(voidData.tableName || voidData.tableId || 'Table').toUpperCase();
    const item = voidData.voidedItem || {};
    const itemName = String(item.name || voidData.itemName || 'Item');
    const qty = item.qty || voidData.qty || 1;
    const reason = String(voidData.reason || 'Customer Request');
    const staff = String(voidData.staffName || 'Staff');
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    pushBytes(0x1B, 0x61, 0x00); // Left align
    pushBytes(0x1B, 0x21, 0x20); // Double Width
    pushText(` TABLE: ${tableName}\n`);

    pushBytes(0x1B, 0x21, 0x00);
    pushText(` Time : ${now}\n`);
    pushText('------------------------------------------------\n');

    pushBytes(0x1B, 0x21, 0x30); // Big text for cancelled item!
    pushText(` CANCEL: ${qty}x ${itemName}\n`);

    pushBytes(0x1B, 0x21, 0x00);
    pushText('------------------------------------------------\n');
    pushText(` Reason    : ${reason}\n`);
    pushText(` Authorized: ${voidData.authorizedBy || 'Manager'}\n`);
    pushText(` Staff     : ${staff}\n`);
    pushText('================================================\n');

    pushBytes(0x1B, 0x61, 0x01);
    pushBytes(0x1B, 0x45, 0x01); // Bold
    pushText('>> DO NOT PREPARE - REMOVE FROM ORDER <<\n');
    pushBytes(0x1B, 0x45, 0x00);

    pushBytes(0x0A, 0x0A, 0x0A, 0x0A, 0x0A);
    if (KITCHEN_PRINTER_CONFIG.autoCut) {
      pushBytes(0x1D, 0x56, 0x42, 0x00);
    }

    const buffer = Buffer.concat(buffers);
    const voidId = 'VOID-' + (item.id || Date.now());

    this._printLock = this._printLock.catch(() => {}).then(() => {
      return this._doSocketBufferPrint(buffer, voidId, `Void ${qty}x ${itemName}`);
    });
    return this._printLock;
  }

  // Format and Print Table Transfer Notification
  async printTransferSlip(transferData) {
    if (!this.isEnabled()) return { success: false, disabled: true };

    const buffers = [];
    const pushBytes = (...arr) => buffers.push(Buffer.from(arr));
    const pushText = (txt) => buffers.push(Buffer.from(this.sanitizeAscii(txt) + (txt.endsWith('\n') ? '\n' : ''), 'ascii'));

    pushBytes(0x1B, 0x40); // Init
    pushBytes(0x1B, 0x61, 0x01); // Center
    pushBytes(0x1B, 0x21, 0x30); // Double Size
    pushText('** TABLE TRANSFER **\n');

    pushBytes(0x1B, 0x21, 0x00);
    pushText('================================================\n');

    const fromTable = String(transferData.sourceTableId || transferData.from || '').toUpperCase();
    const toTable = String(transferData.targetTableId || transferData.to || '').toUpperCase();
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    pushBytes(0x1B, 0x61, 0x00);
    pushText(` Time : ${now}\n`);
    pushText('------------------------------------------------\n');
    pushBytes(0x1B, 0x21, 0x30); // Big text
    pushText(` ${fromTable}  -->  ${toTable}\n`);
    pushBytes(0x1B, 0x21, 0x00);
    pushText('------------------------------------------------\n');
    pushText(' Guest shifted table. Deliver active KOT food to\n');
    pushBytes(0x1B, 0x45, 0x01);
    pushText(` NEW TABLE: ${toTable}\n`);
    pushBytes(0x1B, 0x45, 0x00);
    pushText('================================================\n');

    pushBytes(0x0A, 0x0A, 0x0A, 0x0A, 0x0A);
    if (KITCHEN_PRINTER_CONFIG.autoCut) {
      pushBytes(0x1D, 0x56, 0x42, 0x00);
    }

    const buffer = Buffer.concat(buffers);
    const transferId = `TRANSFER-${fromTable}-${toTable}-${Date.now()}`;

    this._printLock = this._printLock.catch(() => {}).then(() => {
      return this._doSocketBufferPrint(buffer, transferId, `Shift ${fromTable} -> ${toTable}`);
    });
    return this._printLock;
  }

  _doSocketBufferPrint(buffer, jobId, label = 'Slip') {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let finished = false;

      const finish = (ok, errorMsg = null) => {
        if (finished) return;
        finished = true;
        try { socket.destroy(); } catch (e) {}

        if (ok) {
          this.notifyStatus(true);
          console.log(`🖨️ [Kitchen Printer] SUCCESS: ${label} printed wirelessly`);
          resolve({ success: true });
        } else {
          this.notifyStatus(false, errorMsg);
          console.warn(`⚠️ [Kitchen Printer] OFFLINE: ${errorMsg}`);
          resolve({ success: false, error: errorMsg });
        }
      };

      socket.setTimeout(KITCHEN_PRINTER_CONFIG.timeoutMs);
      socket.connect(KITCHEN_PRINTER_CONFIG.printerPort, KITCHEN_PRINTER_CONFIG.printerIp, () => {
        socket.write(buffer, () => {
          setTimeout(() => finish(true), 150);
        });
      });
      socket.on('timeout', () => finish(false, 'Connection timeout'));
      socket.on('error', (err) => finish(false, err.message || 'TCP error'));
      socket.on('close', (hadError) => {
        if (!finished) finish(false, hadError ? 'Transmission interrupted' : 'Connection closed unexpectedly');
      });
    });
  }

  _doSocketPrint(kotData, kotId) {
    const buffer = this.buildEscPosBuffer(kotData);

    return new Promise((resolve) => {
      const socket = new net.Socket();
      let finished = false;

      const finish = (ok, errorMsg = null) => {
        if (finished) return;
        finished = true;
        try { socket.destroy(); } catch (e) {}

        if (ok) {
          if (kotId) this.printedKotIds.add(kotId);
          this.pendingQueue = this.pendingQueue.filter(k => this.getKotId(k) !== kotId);
          this.notifyStatus(true);
          console.log(`🖨️ [Kitchen Printer] SUCCESS: KOT #${kotId || 'NEW'} printed wirelessly to ${KITCHEN_PRINTER_CONFIG.printerIp}`);
          resolve({ success: true });
        } else {
          if (kotId && !this.pendingQueue.some(k => this.getKotId(k) === kotId)) {
            this.pendingQueue.push(kotData);
          }
          this.notifyStatus(false, errorMsg, kotData);
          console.warn(`⚠️ [Kitchen Printer] OFFLINE / FAILED: ${errorMsg} (${KITCHEN_PRINTER_CONFIG.printerIp})`);
          resolve({ success: false, error: errorMsg });
        }
      };

      socket.setTimeout(KITCHEN_PRINTER_CONFIG.timeoutMs);

      socket.connect(KITCHEN_PRINTER_CONFIG.printerPort, KITCHEN_PRINTER_CONFIG.printerIp, () => {
        socket.write(buffer, () => {
          setTimeout(() => finish(true), 150);
        });
      });

      socket.on('timeout', () => {
        finish(false, 'Connection timeout (Printer may be OFF or unreachable on Wi-Fi)');
      });

      socket.on('error', (err) => {
        finish(false, err.message || 'TCP Network error');
      });

      socket.on('close', (hadError) => {
        if (!finished) {
          finish(false, hadError ? 'Transmission interrupted' : 'Printer closed connection unexpectedly');
        }
      });
    });
  }

  // Notify UI via Realtime SSE about Printer Health
  notifyStatus(online, errorMsg = null, failedKot = null) {
    this.isOnline = online;
    try {
      this.broadcast('KITCHEN_PRINTER_STATUS', {
        online: this.isOnline,
        printerIp: KITCHEN_PRINTER_CONFIG.printerIp,
        pendingCount: this.pendingQueue.length,
        error: errorMsg,
        failedKot: failedKot ? {
          kotId: this.getKotId(failedKot),
          tableName: failedKot.tableName || failedKot.table_name || failedKot.tableId || failedKot.table_id || 'Table'
        } : null,
        timestamp: Date.now()
      });
    } catch (e) {}
  }

  // Retry all pending orders in queue (Called from UI Retry button)
  async retryPending() {
    if (this.pendingQueue.length === 0) return { count: 0, succeeded: 0, remaining: 0 };
    console.log(`🖨️ [Kitchen Printer] Retrying ${this.pendingQueue.length} pending KOTs...`);
    const queue = [...this.pendingQueue];
    let succeeded = 0;
    for (const kot of queue) {
      const res = await this.printKot(kot);
      if (!res || !res.success) {
        // Printer still offline - stop immediately to prevent caller hanging
        break;
      }
      succeeded++;
    }
    return { count: queue.length, succeeded, remaining: this.pendingQueue.length };
  }
}

module.exports = {
  KitchenPrinterAddon,
  KITCHEN_PRINTER_CONFIG
};

