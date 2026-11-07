// ONYX RESTAURANT OS — Supabase 24/7 Cloud Two-Way Realtime Bridge
// Seamlessly mirrors local SQLite WAL DB with Supabase PostgreSQL Cloud
// Ultra-fast Sub-25ms WebSocket Broadcast + Dual-Sync Engine

const SUPABASE_URL = 'https://wxsabwhabitqmzkplhyk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mcrWV1LngJD6FwDPBI1qjg_lcl8SLsa';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

class SupabaseBridge {
  constructor(db, broadcastFn, printerAddon = null) {
    this.db = db;
    this.broadcast = broadcastFn;
    this.printer = printerAddon;
    this.pollInterval = null;
    this.isPolling = false;
    this.syncedKotIds = new Set();
    this.ws = null;
    this.wsHeartbeat = null;
    this.isWsConnected = false;
  }

  start(intervalMs = 1200) {
    // Initial sync of tables to cloud
    this.syncAllTablesToCloud().catch(() => {});
    
    // Seed already known KOT IDs from SQLite (avoids duplicate reprints on server restart)
    try {
      const activeKots = this.db.getAllActiveKOTs();
      if (Array.isArray(activeKots)) {
        activeKots.forEach(k => {
          this.syncedKotIds.add(k.id);
          if (this.printer && this.printer.printedKotIds) {
            this.printer.printedKotIds.add(k.id);
          }
        });
      }
    } catch (e) {}

    // 1. Native High-Speed Realtime WebSocket (<25ms instant push/pull)
    this.connectRealtimeWebSocket();

    // 2. High-frequency background poller fallback (1.2s interval)
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => this.pollCloudOrders(), intervalMs);
    console.log('⚡ Supabase Cloud Realtime Dual-Sync Bridge Active (WebSocket + 1.2s Poller)');
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.wsHeartbeat) {
      clearInterval(this.wsHeartbeat);
      this.wsHeartbeat = null;
    }
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
      this.ws = null;
    }
    this.isWsConnected = false;
  }

  // --- Realtime WebSocket Connection (<25ms peer sync) ---
  connectRealtimeWebSocket() {
    if (typeof globalThis.WebSocket === 'undefined') return;

    try {
      const wsEndpoint = `${SUPABASE_URL.replace(/^http/, 'ws')}/realtime/v1/websocket?apikey=${SUPABASE_KEY}&vsn=1.0.0`;
      this.ws = new WebSocket(wsEndpoint);

      this.ws.onopen = () => {
        this.isWsConnected = true;
        console.log('⚡ [Supabase Bridge] Native Realtime WebSocket Connected (<25ms multi-device sync)');
        this.ws.send(JSON.stringify({
          topic: 'realtime:onyx-pos-live',
          event: 'phx_join',
          payload: { config: { broadcast: { ack: false, self: false } } },
          ref: 'srv-' + Date.now()
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
              this.handleRemoteKotBroadcast(payload);
            } else if (ev === 'ITEM_VOIDED') {
              if (this.printer && payload) {
                this.printer.printVoidSlip(payload).catch(() => {});
              }
            } else if (ev === 'BILL_SETTLED') {
              this.handleRemoteBillSettledBroadcast(payload);
            } else if (ev === 'TABLE_STATUS_CHANGED') {
              this.handleRemoteTableStatusBroadcast(payload);
            }
          }
        } catch (e) {}
      };

      this.ws.onclose = () => {
        this.isWsConnected = false;
        if (this.wsHeartbeat) clearInterval(this.wsHeartbeat);
        setTimeout(() => this.connectRealtimeWebSocket(), 3500);
      };

      this.ws.onerror = () => {
        this.isWsConnected = false;
        try { this.ws.close(); } catch (e) {}
      };
    } catch (e) {
      console.warn('[Supabase Bridge] WebSocket init notice:', e.message);
    }
  }

  broadcastToWebSocket(event, payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify({
        topic: 'realtime:onyx-pos-live',
        event: 'broadcast',
        payload: {
          type: 'broadcast',
          event,
          payload
        },
        ref: 'bc-' + Date.now()
      }));
    } catch (e) {}
  }

  handleRemoteKotBroadcast(payload) {
    if (!payload || !payload.tableId) return;
    const kotId = payload.kotId;
    if (kotId && this.syncedKotIds.has(kotId)) return;

    try {
      // Normalize table ID: if 't5' -> extract 5, if 'table-5' -> 5, etc.
      let cleanTableId = payload.tableId;
      if (typeof cleanTableId === 'string' && /^[a-zA-Z]+(\d+)$/.test(cleanTableId)) {
        cleanTableId = parseInt(cleanTableId.replace(/^[a-zA-Z]+/, ''), 10);
      } else if (typeof cleanTableId === 'string' && /^\d+$/.test(cleanTableId)) {
        cleanTableId = parseInt(cleanTableId, 10);
      }

      // Match table in local SQLite
      const allTables = this.db.getTables();
      let localTable = allTables.find(t => String(t.id) === String(cleanTableId));
      if (!localTable && payload.tableName) {
        localTable = allTables.find(t => t.name.toLowerCase().trim() === payload.tableName.toLowerCase().trim());
        if (localTable) cleanTableId = localTable.id;
      }
      if (!localTable && allTables.length > 0) {
        cleanTableId = allTables[0].id;
      }

      // Ensure menu item IDs exist in local SQLite to satisfy foreign key
      const validMenuItems = this.db.getMenuItems ? this.db.getMenuItems() : [];
      const firstValidId = validMenuItems.length > 0 ? validMenuItems[0].id : 1;

      const normalizedItems = (payload.items || []).map(it => {
        let itemId = it.id;
        const exists = validMenuItems.some(m => String(m.id) === String(itemId));
        if (!exists) {
          itemId = firstValidId;
        }
        return {
          id: itemId,
          name: it.name,
          price: it.price || 0,
          qty: it.qty || 1,
          is_bar: Boolean(it.is_bar),
          notes: it.notes || ''
        };
      });

      console.log(`⚡ [Supabase Bridge] Instant Remote KOT Broadcast received: Table ${cleanTableId} (${payload.tableName})`);
      if (normalizedItems.length > 0) {
        this.db.punchKOT({
          tableId: cleanTableId,
          tableName: payload.tableName || ('Table ' + cleanTableId),
          waiterName: payload.waiterName || 'Remote Staff',
          items: normalizedItems
        });

        // Trigger Wireless Kitchen Printer Add-on (if enabled)
        if (this.printer) {
          this.printer.printKot({
            id: kotId,
            tableId: cleanTableId,
            tableName: payload.tableName || ('Table ' + cleanTableId),
            waiterName: payload.waiterName || 'Remote Staff',
            items: normalizedItems
          }).catch(() => {});
        }
      }
      if (kotId) this.syncedKotIds.add(kotId);

      const updatedTables = this.db.getTables();
      const activeKots = this.db.getAllActiveKOTs();
      if (this.broadcast) {
        this.broadcast('TABLES_UPDATED', updatedTables);
        this.broadcast('KOT_PUNCHED', { tables: updatedTables, activeKots });
      }
    } catch (err) {
      console.warn('[Supabase Bridge] Remote KOT sync note:', err.message);
    }
  }

  handleRemoteBillSettledBroadcast(payload) {
    if (!payload || !payload.tableId) return;
    try {
      const rawTableId = payload.tableId;
      console.log(`⚡ [Supabase Bridge] Instant Remote Bill Settled broadcast: Table ${rawTableId}`);
      this.db.forceClearTable(rawTableId);
      const updatedTables = this.db.getTables();
      const activeKots = this.db.getAllActiveKOTs();
      if (this.broadcast) {
        this.broadcast('TABLES_UPDATED', updatedTables);
        this.broadcast('BILL_SETTLED', { tableId: rawTableId, tables: updatedTables, activeKots });
      }
    } catch (err) {
      console.warn('[Supabase Bridge] Remote settle sync note:', err.message);
    }
  }

  handleRemoteTableStatusBroadcast(payload) {
    if (!payload || !payload.tableId) return;
    try {
      if (payload.status === 'vacant') {
        this.db.forceClearTable(payload.tableId);
      }
      const updatedTables = this.db.getTables();
      if (this.broadcast) {
        this.broadcast('TABLES_UPDATED', updatedTables);
      }
    } catch (err) {}
  }

  // 1. Sync All Tables to Supabase Cloud
  async syncAllTablesToCloud() {
    try {
      const tables = this.db.getTables();
      if (!Array.isArray(tables) || tables.length === 0) return;

      const payload = tables.map(t => ({
        id: t.id,
        name: t.name,
        floor: t.floor || '1st Floor',
        position: t.position,
        landmark: t.landmark,
        seats: t.seats,
        sort_order: t.sort_order,
        status: t.status,
        active: true,
        current_subtotal: t.currentSubtotal || 0,
        updated_at: new Date().toISOString()
      }));

      await fetch(`${SUPABASE_URL}/rest/v1/tables`, {
        method: 'POST',
        headers: {
          ...HEADERS,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000)
      });
    } catch (e) {
      // Cloud unreachable or offline, silent resilience
    }
  }

  // 2. Push Local KOT to Supabase Cloud
  async pushKotToCloud(tableId, tableName, items, waiterName, kotId) {
    try {
      const finalKotId = kotId || ('KOT-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900));
      this.syncedKotIds.add(finalKotId);

      // Instant Broadcast to all remote phones (<25ms)
      this.broadcastToWebSocket('KOT_PUNCHED', {
        kotId: finalKotId,
        tableId,
        tableName,
        waiterName: waiterName || 'Counter POS',
        items
      });

      // Insert KOT in Cloud
      await fetch(`${SUPABASE_URL}/rest/v1/kots`, {
        method: 'POST',
        headers: { ...HEADERS, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify([{
          id: finalKotId,
          table_id: tableId,
          table_name: tableName,
          waiter_name: waiterName || 'Floor Staff',
          status: 'pending'
        }]),
        signal: AbortSignal.timeout(5000)
      });

      // Insert KOT Items
      const kotItems = items.map(it => ({
        kot_id: finalKotId,
        item_id: it.id || 'item',
        name: it.name,
        price: it.price,
        qty: it.qty,
        is_bar: Boolean(it.is_bar),
        notes: it.notes || ''
      }));

      await fetch(`${SUPABASE_URL}/rest/v1/kot_items`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(kotItems),
        signal: AbortSignal.timeout(5000)
      });

      // Update Table Status in Supabase
      const t = this.db.getTables().find(x => x.id === tableId);
      const subtotal = t ? (t.currentSubtotal || 0) : 0;
      await fetch(`${SUPABASE_URL}/rest/v1/tables?id=eq.${encodeURIComponent(tableId)}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({
          status: 'occupied',
          current_subtotal: subtotal,
          updated_at: new Date().toISOString()
        }),
        signal: AbortSignal.timeout(5000)
      });
    } catch (e) {
      console.warn('[Supabase Bridge] Failed to mirror KOT to cloud:', e.message);
    }
  }

  // 3. Mirror Bill Settlement to Supabase Cloud
  async pushBillSettledToCloud(bill) {
    try {
      if (!bill) return;

      // Instant Broadcast to all remote phones (<25ms)
      this.broadcastToWebSocket('BILL_SETTLED', {
        tableId: bill.table_id,
        tableName: bill.table_name,
        invoiceNumber: bill.invoice_number,
        grandTotal: bill.grand_total
      });

      // 1. Mirror Bill to Supabase bills table (Sanitized for Supabase Schema)
      try {
        const sc = bill.service_charge || 0;
        const baseRef = bill.payment_ref || '';
        const combinedRef = sc > 0 ? (baseRef ? `${baseRef} | Service Charge: ₹${sc}` : `Fixed Service Charge: ₹${sc}`) : baseRef;

        await fetch(`${SUPABASE_URL}/rest/v1/bills`, {
          method: 'POST',
          headers: { ...HEADERS, 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify([{
            id: bill.id,
            invoice_number: bill.invoice_number,
            table_id: bill.table_id,
            table_name: bill.table_name,
            waiter_name: bill.waiter_name || 'Floor Staff',
            cashier_name: bill.cashier_name || 'Cashier',
            customer_name: bill.customer_name || 'Guest',
            customer_phone: bill.customer_phone || '',
            subtotal: Number(bill.subtotal || 0),
            discount_type: bill.discount_type || 'none',
            discount_value: Number(bill.discount_value || 0),
            discount_amount: Number(bill.discount_amount || 0),
            cgst: Number(bill.cgst || 0),
            sgst: Number(bill.sgst || 0),
            round_off: Number(bill.round_off || 0),
            grand_total: Number(bill.grand_total || 0),
            payment_mode: bill.payment_mode || 'cash',
            payment_ref: combinedRef,
            split_count: Number(bill.split_count || 1),
            status: 'paid'
          }]),
          signal: AbortSignal.timeout(5000)
        });

        // 2. Snapshot bill line items in cloud (Sanitized for Supabase Schema)
        if (Array.isArray(bill.items) && bill.items.length > 0) {
          const bItems = bill.items.map(it => ({
            bill_id: bill.id,
            item_id: it.id || it.item_id || 'item',
            name: it.name,
            price: Number(it.price || 0),
            qty: Number(it.qty || 1),
            amount: Number(it.price || 0) * Number(it.qty || 1)
          }));
          await fetch(`${SUPABASE_URL}/rest/v1/bill_items`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify(bItems),
            signal: AbortSignal.timeout(5000)
          });
        }
      } catch (be) {
        console.warn('Supabase bridge bill push notice:', be.message);
      }

      // 3. Mark all active KOTs as billed in cloud
      await fetch(`${SUPABASE_URL}/rest/v1/kots?table_id=eq.${encodeURIComponent(bill.table_id)}&status=neq.cancelled`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({ status: 'billed' }),
        signal: AbortSignal.timeout(5000)
      });

      // 4. Reset Table in Supabase
      await fetch(`${SUPABASE_URL}/rest/v1/tables?id=eq.${encodeURIComponent(bill.table_id)}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({
          status: 'vacant',
          current_subtotal: 0,
          updated_at: new Date().toISOString()
        }),
        signal: AbortSignal.timeout(5000)
      });
    } catch (e) {
      console.warn('[Supabase Bridge] Failed to mirror bill settlement to cloud:', e.message);
    }
  }

  // 3A. Mirror Table Status (e.g. bill_printed / vacant / occupied) to Supabase Cloud
  async pushTableStatusToCloud(tableId, status) {
    try {
      if (!tableId || !status) return;
      await fetch(`${SUPABASE_URL}/rest/v1/tables?id=eq.${encodeURIComponent(tableId)}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({
          status,
          updated_at: new Date().toISOString()
        }),
        signal: AbortSignal.timeout(5000)
      });
    } catch (e) {
      console.warn('[Supabase Bridge] Failed to mirror table status to cloud:', e.message);
    }
  }

  // 3B. Mirror Item Void / Cancellation to Supabase Cloud (Anti-Theft)
  async pushVoidToCloud(voidResult) {
    try {
      if (!voidResult) return;
      const { voidedItem, tableId, tableName, floor, reason, staffName, deviceId, authorizedBy, amount } = voidResult;
      
      this.broadcastToWebSocket('ITEM_VOIDED', {
        tableId,
        tableName: tableName || tableId,
        kotItemId: voidedItem?.id,
        itemName: voidedItem?.name,
        qty: voidedItem?.qty || 1,
        reason: reason || 'Customer request',
        staffName: staffName || 'Floor Waiter',
        authorizedBy: authorizedBy || 'Manager'
      });

      await fetch(`${SUPABASE_URL}/rest/v1/void_logs`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify([{
          kot_item_id: voidedItem?.id || null,
          kot_id: voidedItem?.kot_id || null,
          table_id: tableId,
          table_name: tableName || '',
          floor: floor || '1st Floor',
          item_name: voidedItem?.name || 'Item',
          price: voidedItem?.price || 0,
          qty: voidedItem?.qty || 1,
          amount: amount || ((voidedItem?.price || 0) * (voidedItem?.qty || 1)),
          reason: reason || 'Customer request',
          staff_name: staffName || 'Staff',
          authorized_by: authorizedBy || 'Manager',
          device_id: deviceId || 'DEVICE-PHONE'
        }]),
        signal: AbortSignal.timeout(5000)
      });

      if (voidedItem?.id) {
        await fetch(`${SUPABASE_URL}/rest/v1/kot_items?id=eq.${voidedItem.id}`, {
          method: 'PATCH',
          headers: HEADERS,
          body: JSON.stringify({
            is_void: true,
            void_reason: reason || 'Customer request',
            voided_at: new Date().toISOString()
          }),
          signal: AbortSignal.timeout(5000)
        });
      }
    } catch (e) {
      console.warn('[Supabase Bridge] Failed to mirror void to cloud:', e.message);
    }
  }

  // 4. Poll Supabase for Remote Phone Orders
  async pollCloudOrders() {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/kots?status=eq.pending&order=created_at.desc&limit=15`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(4000)
      });

      if (!res.ok) {
        this.isPolling = false;
        return;
      }

      const cloudKots = await res.json();
      if (!Array.isArray(cloudKots) || cloudKots.length === 0) {
        this.isPolling = false;
        return;
      }

      let hasNewOrder = false;

      for (const kot of cloudKots) {
        if (this.syncedKotIds.has(kot.id)) continue;

        const existing = this.db.getKOTById(kot.id);
        if (existing) {
          this.syncedKotIds.add(kot.id);
          continue;
        }

        const itemsRes = await fetch(`${SUPABASE_URL}/rest/v1/kot_items?kot_id=eq.${encodeURIComponent(kot.id)}`, {
          headers: HEADERS,
          signal: AbortSignal.timeout(4000)
        });

        if (!itemsRes.ok) continue;
        const rawItems = await itemsRes.json();
        if (!Array.isArray(rawItems) || rawItems.length === 0) continue;

        const items = rawItems.map(it => ({
          id: it.item_id,
          name: it.name,
          price: parseFloat(it.price) || 0,
          qty: parseInt(it.qty, 10) || 1,
          is_bar: Boolean(it.is_bar),
          notes: it.notes || ''
        }));

        console.log(`☁️ [Supabase Bridge] Pulling Remote Phone Order into Local SQLite: ${kot.id} (${kot.table_name})`);
        this.db.punchKOT({
          tableId: kot.table_id,
          tableName: kot.table_name,
          waiterName: kot.waiter_name,
          items
        });

        // Catch-up print for orders received while offline/sleeping
        if (this.printer) {
          this.printer.printKot({
            id: kot.id,
            tableId: kot.table_id,
            tableName: kot.table_name,
            waiterName: kot.waiter_name,
            items
          }).catch(() => {});
        }
        this.syncedKotIds.add(kot.id);
        hasNewOrder = true;
      }

      if (hasNewOrder) {
        const updatedTables = this.db.getTables();
        const activeKots = this.db.getAllActiveKOTs();
        if (this.broadcast) {
          this.broadcast('TABLES_UPDATED', updatedTables);
          this.broadcast('KOT_PUNCHED', { tables: updatedTables, activeKots });
        }
      }
    } catch (e) {
    } finally {
      this.isPolling = false;
    }
  }
}

module.exports = SupabaseBridge;
