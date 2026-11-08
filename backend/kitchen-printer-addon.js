// ==============================================================================
// 💎 ONYX DUAL THERMAL PRINTER SYSTEM (STRICT SEPARATION ENGINE)
// 1. KITCHEN PRINTER (KOT): Direct ESC/POS Network Driver over Wi-Fi / LAN (Port 9100)
//    -> Strictly receives KOT Order Tickets, Item Void Slips, Table Shift Slips.
// 2. BILL PRINTER (CASHIER): Counter 80mm Thermal Receipt Driver
//    -> Strictly receives Customer Invoices, Final Settlement Receipts, Tax Bills.
// ==============================================================================

const net = require('net');

const KITCHEN_PRINTER_CONFIG = {
  enabled: true,               // Switch: true (Auto-print ON) | false (OFF)
  printerIp: '192.168.225.4',  // Kitchen Thermal Printer IP on Ground Floor (Port 9100)
  printerPort: 9100,           // Standard ESC/POS RAW Port
  timeoutMs: 2500,             // 2.5s connection timeout (never blocks server)
  restaurantName: 'BYOB INDIRAPURAM',
  autoCut: true,
  debug: true
};

const BILL_PRINTER_CONFIG = {
  enabled: true,
  mode: 'browser',             // 'browser' (Windows POS Driver) | 'network' (Direct Wi-Fi / LAN RAW Socket)
  printerIp: '192.168.1.250',  // Static IP if in network mode
  printerPort: 9100,
  timeoutMs: 3000,
  autoCut: true
};

function sanitizeAscii(txt) {
  if (!txt) return '';
  return String(txt)
    .replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]/gu, '') // Remove emojis safely
    .replace(/[^\x20-\x7E\n\r\t]/g, ' '); // Replace non-ASCII with clean spaces
}

// ==============================================================================
// 1. KITCHEN KOT PRINTER ADDON (WI-FI / LAN)
// ==============================================================================
class KitchenPrinterAddon {
  constructor(broadcastFn, dbInstance = null) {
    this.broadcast = broadcastFn || (() => {});
    this.db = dbInstance;
    this.isOnline = true;
    this.pendingQueue = [];
    this.printedKotIds = new Set();
    this._printLock = Promise.resolve(); // Serial Mutex Lock for TCP 9100 concurrency

    this.loadConfigFromDb();
  }

  loadConfigFromDb() {
    if (!this.db || typeof this.db.getSettings !== 'function') return;
    try {
      const s = this.db.getSettings();
      if (s.kitchen_printer_ip) KITCHEN_PRINTER_CONFIG.printerIp = s.kitchen_printer_ip.trim();
      if (s.kitchen_printer_port) KITCHEN_PRINTER_CONFIG.printerPort = parseInt(s.kitchen_printer_port) || 9100;
      if (s.kitchen_printer_enabled !== undefined) {
        KITCHEN_PRINTER_CONFIG.enabled = (s.kitchen_printer_enabled === '1' || s.kitchen_printer_enabled === 'true' || s.kitchen_printer_enabled === true);
      }
      if (s.restaurant_name) KITCHEN_PRINTER_CONFIG.restaurantName = s.restaurant_name;
    } catch (e) {
      console.warn('Error loading KOT printer config from DB:', e.message);
    }
  }

  isEnabled() {
    if (process.env.VERCEL) return false; // Physical printing runs on local counter PC / network
    return Boolean(KITCHEN_PRINTER_CONFIG.enabled);
  }

  getKotId(kotData) {
    return String(kotData.id || kotData.kotId || kotData.kot_id || '').trim();
  }

  // Format KOT to ESC/POS binary buffer
  buildEscPosBuffer(kotData) {
    const buffers = [];
    const pushBytes = (...arr) => buffers.push(Buffer.from(arr));
    const pushText = (txt) => buffers.push(Buffer.from(sanitizeAscii(txt) + (txt.endsWith('\n') ? '\n' : ''), 'ascii'));

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

      // Cooking notes / preferences
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

    // Prune printed IDs cache if exceeding 2000
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

    return executeInSerialQueue();
  }

  // Format and Print Kitchen Cancellation / Void Item Ticket
  async printVoidSlip(voidData) {
    if (!this.isEnabled()) return { success: false, disabled: true };

    const buffers = [];
    const pushBytes = (...arr) => buffers.push(Buffer.from(arr));
    const pushText = (txt) => buffers.push(Buffer.from(sanitizeAscii(txt) + (txt.endsWith('\n') ? '\n' : ''), 'ascii'));

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
    const pushText = (txt) => buffers.push(Buffer.from(sanitizeAscii(txt) + (txt.endsWith('\n') ? '\n' : ''), 'ascii'));

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

  // Diagnostic Test Print
  async testPrint() {
    const testKot = {
      id: 'TEST-' + Math.floor(100 + Math.random() * 900),
      tableName: 'TEST KITCHEN (DIAGNOSTIC)',
      waiterName: 'Kitchen Diagnostics',
      items: [
        { qty: 1, name: 'TEST PRINT: Butter Naan', notes: 'Crispy' },
        { qty: 2, name: 'TEST PRINT: Paneer Tikka', notes: 'Extra Spicy' }
      ],
      notes: `Direct Wi-Fi Socket Communication OK (${KITCHEN_PRINTER_CONFIG.printerIp})`
    };
    return this.printKot(testKot);
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
          console.log(`🖨️ [Kitchen Printer] SUCCESS: ${label} printed wirelessly to ${KITCHEN_PRINTER_CONFIG.printerIp}`);
          resolve({ success: true, message: `${label} printed to ${KITCHEN_PRINTER_CONFIG.printerIp}` });
        } else {
          this.notifyStatus(false, errorMsg);
          console.warn(`⚠️ [Kitchen Printer] OFFLINE: ${errorMsg} (${KITCHEN_PRINTER_CONFIG.printerIp})`);
          resolve({ success: false, error: errorMsg });
        }
      };

      socket.setTimeout(KITCHEN_PRINTER_CONFIG.timeoutMs);
      socket.connect(KITCHEN_PRINTER_CONFIG.printerPort, KITCHEN_PRINTER_CONFIG.printerIp, () => {
        socket.write(buffer, () => {
          setTimeout(() => finish(true), 150);
        });
      });
      socket.on('timeout', () => finish(false, 'Connection timeout (Printer may be OFF or unreachable on Wi-Fi)'));
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
          resolve({ success: true, message: `KOT printed to ${KITCHEN_PRINTER_CONFIG.printerIp}` });
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
        break; // Still offline
      }
      succeeded++;
    }
    return { count: queue.length, succeeded, remaining: this.pendingQueue.length };
  }
}

// ==============================================================================
// 2. CASHIER BILL PRINTER ADDON (80MM THERMAL)
// ==============================================================================
class BillPrinterAddon {
  constructor(broadcastFn, dbInstance = null) {
    this.broadcast = broadcastFn || (() => {});
    this.db = dbInstance;
    this.isOnline = true;
    this._printLock = Promise.resolve();
    this.loadConfigFromDb();
  }

  loadConfigFromDb() {
    if (!this.db || typeof this.db.getSettings !== 'function') return;
    try {
      const s = this.db.getSettings();
      if (s.bill_printer_mode) BILL_PRINTER_CONFIG.mode = s.bill_printer_mode;
      if (s.bill_printer_ip) BILL_PRINTER_CONFIG.printerIp = s.bill_printer_ip.trim();
      if (s.bill_printer_port) BILL_PRINTER_CONFIG.printerPort = parseInt(s.bill_printer_port) || 9100;
    } catch (e) {
      console.warn('Error loading Bill printer config from DB:', e.message);
    }
  }

  // Format 80mm Bill to ESC/POS binary buffer
  buildEscPosBillBuffer(billData) {
    const buffers = [];
    const pushBytes = (...arr) => buffers.push(Buffer.from(arr));
    const pushText = (txt) => buffers.push(Buffer.from(sanitizeAscii(txt) + (txt.endsWith('\n') ? '\n' : ''), 'ascii'));

    // ESC @ (Init)
    pushBytes(0x1B, 0x40);

    // Center header
    pushBytes(0x1B, 0x61, 0x01);
    pushBytes(0x1B, 0x21, 0x30); // Double size
    pushText(`${billData.restaurantName || 'BYOB INDIRAPURAM'}\n`);

    pushBytes(0x1B, 0x21, 0x00); // Normal
    if (billData.tagline) pushText(`${billData.tagline}\n`);
    if (billData.address) pushText(`${billData.address}\n`);
    if (billData.gstin) pushText(`GSTIN: ${billData.gstin}\n`);
    if (billData.phone) pushText(`Phone: ${billData.phone}\n`);
    pushText('================================================\n');

    pushBytes(0x1B, 0x21, 0x10); // Double height
    pushText('TAX INVOICE / CASH MEMO\n');
    pushBytes(0x1B, 0x21, 0x00);
    pushText('================================================\n');

    // Left align metadata
    pushBytes(0x1B, 0x61, 0x00);
    pushText(` Invoice No : ${billData.invNo || 'INV-001'}\n`);
    pushText(` Date & Time: ${billData.dateTime || new Date().toLocaleString('en-IN')}\n`);
    pushText(` Table      : ${billData.tableName || 'Table'}\n`);
    pushText(` Server     : ${billData.waiterName || 'Staff'}\n`);
    if (billData.customerName && billData.customerName !== 'Guest') {
      pushText(` Guest      : ${billData.customerName}\n`);
    }
    pushText('------------------------------------------------\n');
    pushBytes(0x1B, 0x45, 0x01); // Bold
    pushText(' QTY  ITEM DESCRIPTION            PRICE   AMOUNT \n');
    pushBytes(0x1B, 0x45, 0x00);
    pushText('------------------------------------------------\n');

    const items = billData.items || [];
    for (const item of items) {
      const qtyStr = `${item.qty || 1}x`.padEnd(5, ' ');
      const name = String(item.name || 'Item').slice(0, 24).padEnd(25, ' ');
      const rate = `${item.price || 0}`.padStart(6, ' ');
      const amt = `${(item.price || 0) * (item.qty || 1)}`.padStart(7, ' ');
      pushText(` ${qtyStr}${name}${rate} ${amt}\n`);
    }

    pushText('------------------------------------------------\n');
    pushText(` Subtotal                         : Rs.${billData.subtotal || 0}\n`);
    if (billData.discountAmount > 0) {
      pushText(` Discount                         :-Rs.${billData.discountAmount}\n`);
    }
    if (billData.cgst > 0) {
      pushText(` CGST (2.5%)                      : Rs.${billData.cgst}\n`);
    }
    if (billData.sgst > 0) {
      pushText(` SGST (2.5%)                      : Rs.${billData.sgst}\n`);
    }
    if (billData.serviceCharge > 0) {
      pushText(` Service Charge                   : Rs.${billData.serviceCharge}\n`);
    }
    if (billData.roundOff) {
      pushText(` Round Off                        : Rs.${billData.roundOff}\n`);
    }
    pushText('================================================\n');

    // Grand total double size
    pushBytes(0x1B, 0x21, 0x30);
    pushText(` TOTAL: Rs.${billData.grandTotal || 0}\n`);
    pushBytes(0x1B, 0x21, 0x00);
    pushText('================================================\n');

    if (billData.payMode) {
      pushText(` Payment Mode: ${billData.payMode.toUpperCase()}\n`);
    }
    pushBytes(0x1B, 0x61, 0x01); // Center
    pushText(`${billData.footer || 'Thank you for visiting! Have a wonderful day.'}\n`);
    pushText('[ COMMERCIAL POS SYSTEM - ONYX BYOB ]\n');

    // Feed and cut
    pushBytes(0x0A, 0x0A, 0x0A, 0x0A, 0x0A);
    if (BILL_PRINTER_CONFIG.autoCut) {
      pushBytes(0x1D, 0x56, 0x42, 0x00);
    }

    return Buffer.concat(buffers);
  }

  async printBill(billData) {
    if (BILL_PRINTER_CONFIG.mode !== 'network') {
      return { success: false, mode: 'browser', message: 'Bill printer configured for Windows Browser print' };
    }
    const buffer = this.buildEscPosBillBuffer(billData);
    this._printLock = this._printLock.catch(() => {}).then(() => {
      return this._doSocketBillPrint(buffer);
    });
    return this._printLock;
  }

  _doSocketBillPrint(buffer) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let finished = false;
      const finish = (ok, errorMsg = null) => {
        if (finished) return;
        finished = true;
        try { socket.destroy(); } catch (e) {}
        if (ok) {
          console.log(`🖨️ [Bill Printer] SUCCESS: 80mm Bill printed to ${BILL_PRINTER_CONFIG.printerIp}`);
          resolve({ success: true, message: `Printed to ${BILL_PRINTER_CONFIG.printerIp}` });
        } else {
          console.warn(`⚠️ [Bill Printer] OFFLINE: ${errorMsg} (${BILL_PRINTER_CONFIG.printerIp})`);
          resolve({ success: false, error: errorMsg });
        }
      };

      socket.setTimeout(BILL_PRINTER_CONFIG.timeoutMs);
      socket.connect(BILL_PRINTER_CONFIG.printerPort, BILL_PRINTER_CONFIG.printerIp, () => {
        socket.write(buffer, () => {
          setTimeout(() => finish(true), 150);
        });
      });
      socket.on('timeout', () => finish(false, 'Connection timeout (Bill printer unreachable)'));
      socket.on('error', (err) => finish(false, err.message || 'TCP error'));
      socket.on('close', (hadError) => {
        if (!finished) finish(false, hadError ? 'Interrupted' : 'Closed unexpectedly');
      });
    });
  }

  async testPrint() {
    const testBill = {
      restaurantName: 'BYOB INDIRAPURAM',
      tagline: 'Bring Your Own Bottle Experience',
      address: 'Plot 14, Dr. Sushila Naiyyar Marg, Indirapuram, Ghaziabad',
      gstin: '07AABCB1234F1Z9',
      phone: '+91 98765 43210',
      invNo: 'TEST-BILL-' + Math.floor(100 + Math.random() * 900),
      dateTime: new Date().toLocaleString('en-IN'),
      tableName: 'Counter Diagnostics',
      waiterName: 'Manager Diagnostic',
      items: [
        { qty: 1, name: 'TEST: Butter Naan', price: 40 },
        { qty: 2, name: 'TEST: Paneer Butter Masala', price: 260 }
      ],
      subtotal: 560,
      cgst: 14,
      sgst: 14,
      grandTotal: 588,
      payMode: 'Cash / Test',
      footer: 'Cashier Bill Printer Communication Verified!'
    };
    return this.printBill(testBill);
  }
}

function updatePrinterConfig(newConfig, dbInstance = null) {
  if (newConfig.kitchen_printer_ip) KITCHEN_PRINTER_CONFIG.printerIp = newConfig.kitchen_printer_ip.trim();
  if (newConfig.kitchen_printer_port) KITCHEN_PRINTER_CONFIG.printerPort = parseInt(newConfig.kitchen_printer_port) || 9100;
  if (newConfig.kitchen_printer_enabled !== undefined) {
    KITCHEN_PRINTER_CONFIG.enabled = (newConfig.kitchen_printer_enabled === '1' || newConfig.kitchen_printer_enabled === true || newConfig.kitchen_printer_enabled === 'true');
  }
  if (newConfig.bill_printer_mode) BILL_PRINTER_CONFIG.mode = newConfig.bill_printer_mode;
  if (newConfig.bill_printer_ip) BILL_PRINTER_CONFIG.printerIp = newConfig.bill_printer_ip.trim();
  if (newConfig.bill_printer_port) BILL_PRINTER_CONFIG.printerPort = parseInt(newConfig.bill_printer_port) || 9100;

  if (dbInstance && typeof dbInstance.updateSettings === 'function') {
    dbInstance.updateSettings({
      kitchen_printer_ip: KITCHEN_PRINTER_CONFIG.printerIp,
      kitchen_printer_port: KITCHEN_PRINTER_CONFIG.printerPort,
      kitchen_printer_enabled: KITCHEN_PRINTER_CONFIG.enabled ? '1' : '0',
      bill_printer_mode: BILL_PRINTER_CONFIG.mode,
      bill_printer_ip: BILL_PRINTER_CONFIG.printerIp,
      bill_printer_port: BILL_PRINTER_CONFIG.printerPort
    });
  }

  return {
    kitchen: { ...KITCHEN_PRINTER_CONFIG },
    bill: { ...BILL_PRINTER_CONFIG }
  };
}

module.exports = {
  KitchenPrinterAddon,
  BillPrinterAddon,
  KITCHEN_PRINTER_CONFIG,
  BILL_PRINTER_CONFIG,
  updatePrinterConfig
};
