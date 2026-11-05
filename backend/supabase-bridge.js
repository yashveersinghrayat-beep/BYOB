// ONYX RESTAURANT OS — Supabase 24/7 Cloud Two-Way Sync Bridge
// Seamlessly mirrors local SQLite WAL DB with Supabase PostgreSQL Cloud
// Ensures phone handhelds and counter POS stay 100% in sync across Wi-Fi, 4G/5G, and remote networks

const SUPABASE_URL = 'https://wxsabwhabitqmzkplhyk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mcrWV1LngJD6FwDPBI1qjg_lcl8SLsa';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

class SupabaseBridge {
  constructor(db, broadcastFn) {
    this.db = db;
    this.broadcast = broadcastFn;
    this.pollInterval = null;
    this.isPolling = false;
    this.syncedKotIds = new Set();
  }

  start(intervalMs = 3500) {
    // Initial sync of tables to cloud
    this.syncAllTablesToCloud().catch(() => {});
    
    // Seed already known KOT IDs from SQLite
    try {
      const activeKots = this.db.getAllActiveKOTs();
      if (Array.isArray(activeKots)) {
        activeKots.forEach(k => this.syncedKotIds.add(k.id));
      }
    } catch (e) {}

    // Start background poller for remote phone orders
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => this.pollCloudOrders(), intervalMs);
    console.log('☁️ Supabase Cloud Two-Way Sync Bridge Active (3.5s interval)');
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
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

      const res = await fetch(`${SUPABASE_URL}/rest/v1/tables`, {
        method: 'POST',
        headers: {
          ...HEADERS,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        // success
      }
    } catch (e) {
      // Cloud unreachable or offline, silent resilience
    }
  }

  // 2. Push Local KOT to Supabase Cloud
  async pushKotToCloud(tableId, tableName, items, waiterName, kotId) {
    try {
      const finalKotId = kotId || ('KOT-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900));
      this.syncedKotIds.add(finalKotId);

      // Insert KOT
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

      // 1. Mirror Bill to Supabase bills table
      try {
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
            subtotal: bill.subtotal || 0,
            discount_type: bill.discount_type || 'none',
            discount_value: bill.discount_value || 0,
            discount_amount: bill.discount_amount || 0,
            cgst: bill.cgst || 0,
            sgst: bill.sgst || 0,
            service_charge: bill.service_charge || 0,
            round_off: bill.round_off || 0,
            grand_total: bill.grand_total || 0,
            payment_mode: bill.payment_mode || 'cash',
            payment_ref: bill.payment_ref || '',
            split_count: bill.split_count || 1,
            status: 'paid',
            restaurant_name: bill.restaurant_name || 'BYOB INDIRAPURAM',
            gstin: bill.gstin || '',
            fssai: bill.fssai || ''
          }]),
          signal: AbortSignal.timeout(5000)
        });

        // 2. Snapshot bill line items in cloud
        if (Array.isArray(bill.items) && bill.items.length > 0) {
          const bItems = bill.items.map(it => ({
            bill_id: bill.id,
            item_id: it.id || it.item_id || 'item',
            name: it.name,
            price: it.price,
            qty: it.qty,
            amount: (it.price * it.qty),
            notes: it.notes || ''
          }));
          await fetch(`${SUPABASE_URL}/rest/v1/bill_items`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify(bItems),
            signal: AbortSignal.timeout(5000)
          });
        }
      } catch (be) {
        // Continue to reset table status
      }

      // 3. Mark KOTs as billed in cloud
      await fetch(`${SUPABASE_URL}/rest/v1/kots?table_id=eq.${encodeURIComponent(bill.table_id)}&status=eq.pending`, {
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

  // 3B. Mirror Item Void / Cancellation to Supabase Cloud (Anti-Theft)
  async pushVoidToCloud(voidResult) {
    try {
      if (!voidResult) return;
      const { voidedItem, tableId, tableName, floor, reason, staffName, deviceId, authorizedBy, amount } = voidResult;
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
      // Fetch active pending KOTs from cloud
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

        // Check if KOT exists in SQLite
        const existing = this.db.getKOTById(kot.id);
        if (existing) {
          this.syncedKotIds.add(kot.id);
          continue;
        }

        // Fetch items for this cloud KOT
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

        // Punch into local SQLite
        console.log(`☁️ [Supabase Bridge] Pulling Remote Phone Order into Local SQLite: ${kot.id} (${kot.table_name})`);
        const savedKot = this.db.punchKOT({
          tableId: kot.table_id,
          tableName: kot.table_name,
          waiterName: kot.waiter_name,
          items
        });
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
      // Network hiccup / offline, continue silently
    } finally {
      this.isPolling = false;
    }
  }
}

module.exports = SupabaseBridge;
