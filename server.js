// ONYX COMMERCIAL RESTAURANT ENGINE - Production Server & Realtime SSE Hub
// Powers: Waiter Handhelds, Cashier Counter POS, Kitchen KDS & Owner Admin Portal

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const os = require('os');
const DB = require('./backend/database.js');
const SupabaseBridge = require('./backend/supabase-bridge.js');

// Modular Kitchen Thermal Printer Add-on with Safe Cloud Fallback
let KitchenPrinterAddon;
let KITCHEN_PRINTER_CONFIG = { enabled: false, printerIp: '192.168.1.222', printerPort: 9100 };
try {
  const mod = require('./backend/kitchen-printer-addon.js');
  KitchenPrinterAddon = mod.KitchenPrinterAddon;
  KITCHEN_PRINTER_CONFIG = mod.KITCHEN_PRINTER_CONFIG;
} catch (e) {
  KitchenPrinterAddon = class {
    constructor(broadcast) { this.broadcast = broadcast || (() => {}); this.isOnline = false; this.pendingQueue = []; }
    isEnabled() { return false; }
    async printKot() {}
    async printTransferSlip() {}
    async printVoidSlip() {}
    async retryPending() { return { success: true, count: 0, remaining: 0 }; }
  };
}

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.apk': 'application/vnd.android.package-archive'
};

// Connected Real-time SSE Clients (Waiters, Cashier, Kitchen, Admin)
const sseClients = new Set();

function broadcastEvent(eventType, payload) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// Modular Wireless Kitchen Printer Addon (TN260 / POS-80 over Wi-Fi Port 9100)
const kitchenPrinter = new KitchenPrinterAddon(broadcastEvent);

// 24/7 Supabase Cloud Sync Bridge (passes kitchen printer for remote mobile orders)
const bridge = new SupabaseBridge(DB, broadcastEvent, kitchenPrinter);

// JSON Response Helper
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Parse Request Body Helper (Compatible with Node stream & Vercel pre-parsed body)
function parseBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object') return Promise.resolve(req.body);
    try {
      return Promise.resolve(JSON.parse(req.body));
    } catch (e) {
      return Promise.resolve({});
    }
  }

  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

async function handleRequest(req, res) {
  // Normalize incoming URL for local Node and Vercel serverless rewrites
  let reqUrl = req.url || '/';
  if (req.originalUrl && req.originalUrl.startsWith('/api')) {
    reqUrl = req.originalUrl;
  } else if (req.headers && req.headers['x-matched-path'] && req.headers['x-matched-path'].startsWith('/api')) {
    reqUrl = req.headers['x-matched-path'];
  }

  const parsedUrl = new URL(reqUrl, 'http://' + (req.headers.host || 'localhost:3000'));
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // ================= 1. REAL-TIME SERVER-SENT EVENTS (SSE) =================
  if (pathname === '/api/sync/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('event: connected\ndata: {"status": "ok"}\n\n');
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // ================= 2. REST API ENDPOINTS =================
  try {
    // --- Health Ping (Latency Check) ---
    if (pathname === '/api/ping') {
      return sendJSON(res, 200, { success: true, ok: true, timestamp: Date.now() });
    }

    // --- Network & Wi-Fi Phone Connect Info ---
    if (pathname === '/api/network/info' && method === 'GET') {
      const host = req.headers.host || 'localhost:3000';
      const isVercel = process.env.VERCEL || host.includes('vercel.app');
      const proto = (req.headers['x-forwarded-proto'] || (isVercel ? 'https' : 'http')) + '://';

      const localIps = getLocalIpAddresses();
      const primaryIp = localIps.length > 0 ? localIps[0].address : 'localhost';
      const phoneUrl = isVercel ? `${proto}${host}` : `http://${primaryIp}:${PORT}`;

      return sendJSON(res, 200, {
        success: true,
        port: PORT,
        isVercel: !!isVercel,
        primaryIp,
        phoneUrl,
        localIps
      });
    }

    // --- OTA App Updates & Mandatory Force Updates ---
    if (pathname === '/api/app/version' && method === 'GET') {
      return sendJSON(res, 200, { success: true, update: DB.getAppUpdateInfo() });
    }
    if (pathname === '/api/app/version' && method === 'POST') {
      const body = await parseBody(req);
      const update = DB.setAppUpdate(body);
      broadcastEvent('APP_UPDATE_RELEASED', update);
      return sendJSON(res, 200, { success: true, update });
    }

    // --- Store Profile ---
    if (pathname === '/api/store' && method === 'GET') {
      return sendJSON(res, 200, { success: true, settings: DB.getSettings() });
    }
    if (pathname === '/api/store' && method === 'POST') {
      const body = await parseBody(req);
      const settingsData = body.settings || body;
      const updated = DB.updateSettings(settingsData, body.managerEmail, body.reason);
      try {
        const supaKey = 'sb_publishable_mcrWV1LngJD6FwDPBI1qjg_lcl8SLsa';
        for (const [k, v] of Object.entries(settingsData)) {
          await fetch('https://wxsabwhabitqmzkplhyk.supabase.co/rest/v1/store_settings', {
            method: 'POST',
            headers: {
              'apikey': supaKey,
              'Authorization': 'Bearer ' + supaKey,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({ key: k, value: String(v), updated_at: new Date().toISOString() })
          });
        }
      } catch(e) {}
      broadcastEvent('STORE_UPDATED', updated);
      return sendJSON(res, 200, { success: true, settings: updated });
    }

    // --- Staff & PIN Auth ---
    if (pathname === '/api/auth/pin' && method === 'POST') {
      const body = await parseBody(req);
      const user = DB.authenticatePin(body.pin);
      if (user) {
        return sendJSON(res, 200, { success: true, user });
      } else {
        return sendJSON(res, 401, { success: false, message: 'Invalid 4-digit PIN' });
      }
    }
    if (pathname === '/api/staff' && method === 'GET') {
      return sendJSON(res, 200, { success: true, staff: DB.getAllStaff() });
    }
    if (pathname === '/api/staff' && method === 'POST') {
      const body = await parseBody(req);
      const staffList = DB.saveStaff(body);
      return sendJSON(res, 200, { success: true, staff: staffList });
    }
    if (pathname === '/api/staff/delete' && method === 'POST') {
      const body = await parseBody(req);
      const result = DB.deleteStaff(body.staffId);
      return sendJSON(res, 200, { success: true, result, staff: DB.getAllStaff() });
    }

    // --- Manager Master PIN & Security Recovery Routes ---
    if (pathname === '/api/manager/security/status' && method === 'GET') {
      return sendJSON(res, 200, { success: true, ...DB.getManagerSecurityStatus() });
    }
    if (pathname === '/api/manager/security/setup' && method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = DB.setupInitialManagerPin(body);
        broadcastEvent('MANAGER_SECURITY_UPDATED', result);
        return sendJSON(res, 200, result);
      } catch (err) {
        return sendJSON(res, 400, { success: false, error: err.message });
      }
    }
    if (pathname === '/api/manager/security/change' && method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = DB.changeManagerPin(body);
        broadcastEvent('MANAGER_SECURITY_UPDATED', result);
        return sendJSON(res, 200, result);
      } catch (err) {
        return sendJSON(res, 400, { success: false, error: err.message });
      }
    }
    if (pathname === '/api/manager/security/forgot-verify' && method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = DB.verifyForgotPinAnswer(body.answer);
        return sendJSON(res, 200, result);
      } catch (err) {
        return sendJSON(res, 403, { success: false, error: err.message });
      }
    }
    if (pathname === '/api/manager/security/forgot-reset' && method === 'POST') {
      const body = await parseBody(req);
      try {
        const result = DB.resetManagerPinWithAnswer(body);
        broadcastEvent('MANAGER_SECURITY_UPDATED', result);
        return sendJSON(res, 200, result);
      } catch (err) {
        return sendJSON(res, 400, { success: false, error: err.message });
      }
    }

    // --- Dynamic Tables ---
    if (pathname === '/api/tables' && method === 'GET') {
      return sendJSON(res, 200, { success: true, tables: DB.getTables() });
    }
    if (pathname === '/api/tables' && method === 'POST') {
      const body = await parseBody(req);
      const tables = DB.saveTable(body);
      broadcastEvent('TABLES_UPDATED', tables);
      return sendJSON(res, 200, { success: true, tables });
    }
    if (pathname.startsWith('/api/tables/') && method === 'DELETE') {
      const tableId = pathname.replace('/api/tables/', '');
      const tables = DB.deleteTable(tableId);
      broadcastEvent('TABLES_UPDATED', tables);
      return sendJSON(res, 200, { success: true, tables });
    }
    if (pathname === '/api/tables/transfer' && method === 'POST') {
      const body = await parseBody(req);
      const result = DB.transferTable(body.sourceTableId, body.targetTableId);
      broadcastEvent('TABLES_UPDATED', DB.getTables());
      // Wireless Kitchen Printer: Print Table Shift Slip for Chefs
      kitchenPrinter.printTransferSlip(body).catch(() => {});
      return sendJSON(res, 200, { success: true, result });
    }
    if (pathname === '/api/tables/force-clear' && method === 'POST') {
      const body = await parseBody(req);
      const result = DB.forceClearTable(body.tableId);
      broadcastEvent('TABLES_UPDATED', DB.getTables());
      return sendJSON(res, 200, { success: true, result });
    }
    if (pathname === '/api/tables/status' && method === 'POST') {
      const body = await parseBody(req);
      if (body.tableId && body.status) {
        const tables = DB.updateTableStatus(body.tableId, body.status, body.paymentProof);
        broadcastEvent('TABLES_UPDATED', tables);
        bridge.broadcastToWebSocket('TABLES_UPDATED', { tableId: body.tableId, status: body.status, paymentProof: body.paymentProof });
        bridge.pushTableStatusToCloud(body.tableId, body.status, body.paymentProof);
        return sendJSON(res, 200, { success: true, tables });
      }
      return sendJSON(res, 400, { success: false, error: 'tableId and status required' });
    }
    if (pathname === '/api/tables/payment-proof' && method === 'POST') {
      const body = await parseBody(req);
      if (body.tableId && body.paymentProof !== undefined) {
        const status = body.paymentProof ? 'bill_printed' : 'occupied';
        const tables = DB.updateTableStatus(body.tableId, status, body.paymentProof);
        broadcastEvent('TABLES_UPDATED', tables);
        bridge.broadcastToWebSocket('TABLES_UPDATED', { tableId: body.tableId, status, paymentProof: body.paymentProof });
        bridge.pushTableStatusToCloud(body.tableId, status, body.paymentProof);
        return sendJSON(res, 200, { success: true, tables });
      }
      return sendJSON(res, 400, { success: false, error: 'tableId required' });
    }

    // --- Menu Management ---
    if (pathname === '/api/menu' && method === 'GET') {
      return sendJSON(res, 200, {
        success: true,
        categories: DB.getCategories(),
        items: DB.getMenuItems()
      });
    }
    if (pathname === '/api/menu/category' && method === 'POST') {
      const body = await parseBody(req);
      const categories = DB.saveCategory(body);
      broadcastEvent('MENU_UPDATED', { categories, items: DB.getMenuItems() });
      return sendJSON(res, 200, { success: true, categories });
    }
    if (pathname === '/api/menu/item' && method === 'POST') {
      const body = await parseBody(req);
      const items = DB.saveMenuItem(body);
      broadcastEvent('MENU_UPDATED', { categories: DB.getCategories(), items });
      return sendJSON(res, 200, { success: true, items });
    }
    if (pathname === '/api/menu/stock' && method === 'POST') {
      const body = await parseBody(req);
      const updated = DB.toggleItemStock(body.itemId, body.inStock);
      broadcastEvent('STOCK_UPDATED', updated);
      return sendJSON(res, 200, { success: true, item: updated });
    }
    if (pathname === '/api/menu/price' && method === 'POST') {
      const body = await parseBody(req);
      const updated = DB.updateMenuItemPrice(body.itemId, body.price);
      broadcastEvent('MENU_UPDATED', { categories: DB.getCategories(), items: DB.getMenuItems() });
      return sendJSON(res, 200, { success: true, item: updated });
    }
    if (pathname === '/api/menu/delete' && method === 'POST') {
      const body = await parseBody(req);
      const result = DB.deleteMenuItem(body.itemId);
      broadcastEvent('MENU_UPDATED', { categories: DB.getCategories(), items: DB.getMenuItems() });
      return sendJSON(res, 200, { success: true, result });
    }

    // --- KOT Order Punching ---
    if (pathname === '/api/orders/punch' && method === 'POST') {
      const body = await parseBody(req);
      const kot = DB.punchKOT(body);
      const tables = DB.getTables();
      const activeKots = DB.getAllActiveKOTs();
      broadcastEvent('KOT_PUNCHED', { kot, tables, activeKots });
      bridge.pushKotToCloud(body.tableId, body.tableName, body.items, body.waiterName, kot.id);
      // Auto Wireless Print to Kitchen Printer Addon (if enabled)
      kitchenPrinter.printKot(kot).catch(() => {});
      return sendJSON(res, 200, { success: true, kot, tables });
    }

    // --- Kitchen Printer Add-on Control Routes ---
    if (pathname === '/api/printer/status' && method === 'GET') {
      return sendJSON(res, 200, {
        success: true,
        enabled: kitchenPrinter.isEnabled(),
        online: kitchenPrinter.isOnline,
        printerIp: KITCHEN_PRINTER_CONFIG.printerIp,
        pendingCount: kitchenPrinter.pendingQueue.length
      });
    }
    if (pathname === '/api/printer/retry' && method === 'POST') {
      const result = await kitchenPrinter.retryPending();
      return sendJSON(res, 200, { success: true, ...result });
    }

    // --- Kitchen KDS ---
    if (pathname === '/api/kots/active' && method === 'GET') {
      return sendJSON(res, 200, { success: true, kots: DB.getAllActiveKOTs() });
    }
    if (pathname === '/api/kots/status' && method === 'POST') {
      const body = await parseBody(req);
      const kot = DB.updateKotStatus(body.kotId, body.status);
      const activeKots = DB.getAllActiveKOTs();
      const tables = DB.getTables();
      broadcastEvent('KOT_STATUS_UPDATED', { kot, activeKots, tables });
      broadcastEvent('TABLES_UPDATED', tables);
      return sendJSON(res, 200, { success: true, kot, activeKots, tables });
    }

    // --- Void Punched Item (Anti-Theft Protected & Device Tracked) ---
    if (pathname === '/api/kots/item/void' && method === 'POST') {
      const body = await parseBody(req);
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      body.clientIp = clientIp;
      try {
        const result = DB.voidKotItem(body);
        const tables = DB.getTables();
        const activeKots = DB.getAllActiveKOTs();
        broadcastEvent('TABLES_UPDATED', tables);
        broadcastEvent('ITEM_VOIDED', { result, tables, activeKots });
        bridge.pushVoidToCloud(result);
        // Wireless Kitchen Printer: Print Immediate Cancellation Slip for Chefs
        kitchenPrinter.printVoidSlip(result).catch(() => {});
        return sendJSON(res, 200, { success: true, result, tables, activeKots });
      } catch (err) {
        return sendJSON(res, 403, { success: false, error: err.message });
      }
    }

    // --- Billing & Settlement ---
    if (pathname === '/api/payment/failure' && method === 'POST') {
      const body = await parseBody(req);
      const logged = DB.logPaymentFailure(body);
      return sendJSON(res, 200, { success: true, logged });
    }
    if (pathname === '/api/payment/failures' && method === 'GET') {
      const limit = parseInt(parsedUrl.searchParams.get('limit') || '50');
      const failures = DB.getPaymentFailures(limit);
      return sendJSON(res, 200, { success: true, failures });
    }

    if (pathname === '/api/bills/settle' && method === 'POST') {
      const body = await parseBody(req);
      const bill = DB.settleBill(body);
      const tables = DB.getTables();
      const activeKots = DB.getAllActiveKOTs();
      broadcastEvent('BILL_SETTLED', { bill, tables, activeKots });
      bridge.pushBillSettledToCloud(bill);
      return sendJSON(res, 200, { success: true, bill, tables });
    }

    // --- Manager Bill Modification & Audit Trail ---
    if (pathname === '/api/bills/update' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const result = DB.updateBill(body);
        const tables = DB.getTables();
        broadcastEvent('BILL_UPDATED', { bill: result.updatedBill, changesSummary: result.changesSummary });
        return sendJSON(res, 200, { 
          success: true, 
          updatedBill: result.updatedBill, 
          changesSummary: result.changesSummary, 
          logId: result.logId 
        });
      } catch (err) {
        const isAuth = err.message && err.message.includes('Unauthorized');
        return sendJSON(res, isAuth ? 403 : 400, { success: false, error: err.message });
      }
    }

    // --- Bill Modification Audit Logs ---
    if (pathname === '/api/bills/edit-logs' && method === 'GET') {
      const billId = parsedUrl.searchParams.get('billId') || null;
      const limit = parseInt(parsedUrl.searchParams.get('limit') || '50');
      const logs = DB.getBillEditLogs(billId, limit);
      return sendJSON(res, 200, { success: true, logs });
    }

    // --- Authentication: Manager Login ---
    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await parseBody(req);
      const { email, password } = body;
      
      // Check Manager Credentials
      if (email === 'admin@google.in' && password === 'Admin@#1234') {
        return sendJSON(res, 200, {
          success: true,
          role: 'manager',
          email: 'admin@google.in',
          name: 'Owner / Manager'
        });
      }

      // Check Staff DB for backup
      const staff = DB.getAllStaff().find(s => (s.email === email || s.pin === password) && (s.role === 'admin' || s.role === 'cashier'));
      if (staff && password === 'Admin@#1234') {
        return sendJSON(res, 200, {
          success: true,
          role: 'manager',
          email: email || 'admin@google.in',
          name: staff.name
        });
      }

      return sendJSON(res, 401, { success: false, error: 'Invalid Manager credentials. Check email & password.' });
    }

    // --- Recent Bills (For Bill Reprint & Audit) ---
    if (pathname === '/api/bills/recent' && method === 'GET') {
      const limit = parseInt(parsedUrl.searchParams.get('limit') || '30');
      let bills = DB.getRecentBills(limit);
      if (!bills || bills.length === 0) {
        try {
          const supaKey = 'sb_publishable_mcrWV1LngJD6FwDPBI1qjg_lcl8SLsa';
          const cloudRes = await fetch(`https://wxsabwhabitqmzkplhyk.supabase.co/rest/v1/bills?select=*,bill_items(*)&order=created_at.desc&limit=${limit}`, {
            headers: { 'apikey': supaKey, 'Authorization': 'Bearer ' + supaKey }
          });
          if (cloudRes.ok) {
            const cloudBills = await cloudRes.json();
            if (Array.isArray(cloudBills)) {
              bills = cloudBills.filter(b => b.status !== 'void' && b.status !== 'cancelled').map(b => ({
                ...b,
                final_total: b.grand_total,
                tax: Number(((b.cgst || 0) + (b.sgst || 0)).toFixed(2)),
                items: b.bill_items || []
              }));
            }
          }
        } catch(e) {}
      }
      return sendJSON(res, 200, { success: true, bills: bills || [] });
    }

    // --- Void Audit Logs (Anti-Theft Dashboard) ---
    if (pathname === '/api/kots/voids' && method === 'GET') {
      const limit = parseInt(parsedUrl.searchParams.get('limit') || '50');
      const logs = DB.getVoidLogs(limit);
      const summary = DB.getVoidSummaryToday ? DB.getVoidSummaryToday() : { total_voids: logs.length, total_amount: 0 };
      return sendJSON(res, 200, { success: true, logs, summary });
    }

    // --- Sales Analytics & Business Efficiency Reports ---
    if ((pathname === '/api/reports/sales' || pathname === '/api/reports/efficiency') && method === 'GET') {
      const period = parsedUrl.searchParams.get('period') || (parsedUrl.searchParams.get('date') ? 'daily' : 'weekly');
      const date = parsedUrl.searchParams.get('date') || null;
      const startDate = parsedUrl.searchParams.get('startDate') || parsedUrl.searchParams.get('start') || null;
      const endDate = parsedUrl.searchParams.get('endDate') || parsedUrl.searchParams.get('end') || null;

      let report = DB.getBusinessEfficiencyReport({ period, date, startDate, endDate });
      if (!report || !report.summary?.total_bills) {
        try {
          const supaKey = 'sb_publishable_mcrWV1LngJD6FwDPBI1qjg_lcl8SLsa';
          const cloudRes = await fetch('https://wxsabwhabitqmzkplhyk.supabase.co/rest/v1/bills?select=*,bill_items(*)&order=created_at.desc', {
            headers: { 'apikey': supaKey, 'Authorization': 'Bearer ' + supaKey }
          });
          if (cloudRes.ok) {
            const cloudBills = await cloudRes.json();
            const valid = (cloudBills || []).filter(b => b.status !== 'void' && b.status !== 'cancelled');
            if (valid.length > 0) {
              let totalRev = 0, totalSub = 0, totalCgst = 0, totalSgst = 0, totalDisc = 0, totalRound = 0;
              const paymentModes = {
                cash: { amount: 0, count: 0, pct: 0 },
                upi: { amount: 0, count: 0, pct: 0 },
                card: { amount: 0, count: 0, pct: 0 }
              };
              const floorCounts = {
                'Ground Floor': { bills: 0, rev: 0, pct: 0 },
                '1st Floor': { bills: 0, rev: 0, pct: 0 },
                '2nd Floor': { bills: 0, rev: 0, pct: 0 }
              };

              valid.forEach(b => {
                const rev = Number(b.grand_total || 0);
                const sub = Number(b.subtotal || 0);
                const cgst = Number(b.cgst || 0);
                const sgst = Number(b.sgst || 0);
                const disc = Number(b.discount_amount || 0);
                const round = Number(b.round_off || 0);
                totalRev += rev;
                totalSub += sub;
                totalCgst += cgst;
                totalSgst += sgst;
                totalDisc += disc;
                totalRound += round;

                const mode = (b.payment_mode || 'upi').toLowerCase();
                if (paymentModes[mode]) {
                  paymentModes[mode].amount += rev;
                  paymentModes[mode].count += 1;
                }

                const tNum = parseInt(String(b.table_id || '').replace(/\D/g, ''), 10);
                let floor = 'Ground Floor';
                if (tNum >= 26) floor = '2nd Floor';
                else if (tNum >= 19) floor = '1st Floor';
                floorCounts[floor].bills += 1;
                floorCounts[floor].rev += rev;
              });

              Object.keys(paymentModes).forEach(m => {
                paymentModes[m].pct = totalRev > 0 ? Number(((paymentModes[m].amount / totalRev) * 100).toFixed(1)) : 0;
              });

              const floorList = Object.keys(floorCounts).map(k => ({
                floor: k,
                revenue: floorCounts[k].rev,
                bills_count: floorCounts[k].bills,
                pct: totalRev > 0 ? Number(((floorCounts[k].rev / totalRev) * 100).toFixed(1)) : 0
              }));

              const aov = valid.length > 0 ? Math.round(totalRev / valid.length) : 0;

              report = {
                period,
                periodLabel: `${valid.length} Settled Invoices Audit`,
                summary: {
                  total_bills: valid.length,
                  total_revenue: totalRev,
                  total_subtotal: totalSub,
                  total_cgst: totalCgst,
                  total_sgst: totalSgst,
                  total_tax: totalCgst + totalSgst,
                  total_discounts: totalDisc,
                  discount_rate_pct: totalRev > 0 ? Number(((totalDisc / totalRev) * 100).toFixed(1)) : 0,
                  aov,
                  total_round_off: totalRound
                },
                payment_modes: paymentModes,
                floor_efficiency: floorList,
                recentBills: valid
              };
            }
          }
        } catch(e) {}
      }
      return sendJSON(res, 200, { success: true, report });
    }

    // --- Secret Telemetry & Remote Debugging Audit Logger ---
    if (pathname === '/api/telemetry/batch' && method === 'POST') {
      const body = await parseBody(req);
      const events = Array.isArray(body) ? body : (body.events || []);
      const forwarded = req.headers['x-forwarded-for'];
      const rawIp = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
      const clientIp = (rawIp === '::1' || rawIp === '::ffff:127.0.0.1') ? '127.0.0.1' : (rawIp || '').replace(/^::ffff:/, '') || '127.0.0.1';
      
      const result = DB.logTelemetryBatch(events, clientIp);
      return sendJSON(res, 200, { success: true, count: result.inserted, clientIp });
    }

    if (pathname === '/api/telemetry/logs' && method === 'GET') {
      const deviceId = parsedUrl.searchParams.get('deviceId') || null;
      const eventType = parsedUrl.searchParams.get('eventType') || null;
      const tableId = parsedUrl.searchParams.get('tableId') || null;
      const limit = parseInt(parsedUrl.searchParams.get('limit') || '100');
      const logs = DB.getTelemetryLogs({ deviceId, eventType, tableId }, limit);
      return sendJSON(res, 200, { success: true, logs });
    }

  } catch (apiErr) {
    console.error('API Error:', apiErr);
    return sendJSON(res, 500, { success: false, error: apiErr.message });
  }

  // ================= 3. STATIC FILE SERVING =================
  let reqPath = pathname;
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const filePath = path.join(__dirname, reqPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content, 'utf-8');
    }
  });
}

const server = http.createServer(handleRequest);

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const k of Object.keys(interfaces)) {
    for (const net of interfaces[k]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({ iface: k, address: net.address });
      }
    }
  }
  return addresses;
}

module.exports = handleRequest;

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    const localIps = getLocalIpAddresses();
    bridge.start();
    console.log('\n======================================================');
    console.log('   💎 ONYX RESTAURANT OS — Production Server Running');
    console.log('   Client / Business Commercial Suite');
    console.log('------------------------------------------------------');
    console.log(`   💻 Billing Counter / Cashier PC:`);
    console.log(`      http://localhost:${PORT}`);
    console.log('');
    if (localIps.length > 0) {
      console.log(`   📱 Waiter Phones (Connected to Restaurant Wi-Fi):`);
      localIps.forEach(ip => {
        console.log(`      👉 http://${ip.address}:${PORT}  (${ip.iface})`);
      });
    }
    console.log('------------------------------------------------------');
    console.log('   📦 Database: Native SQLite WAL (onyx_restaurant.db)');
    console.log('   ⚡ Realtime Sync: Server-Sent Events (SSE) Active');
    console.log(`   🖨️ Kitchen Printer Addon: ${KITCHEN_PRINTER_CONFIG.enabled ? 'ACTIVE (' + KITCHEN_PRINTER_CONFIG.printerIp + ':9100)' : 'DISABLED'}`);
    console.log('======================================================\n');
  });
}
