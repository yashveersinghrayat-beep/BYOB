// ONYX COMMERCIAL RESTAURANT ENGINE - Full-Stack Client DB & Realtime Sync Service
// Seamlessly connects Frontend to Native SQLite Backend via REST API & SSE Realtime Stream

let _ACTIVE_API_BASE = (typeof window !== 'undefined' && (window.location.protocol === 'http:' || window.location.protocol === 'https:'))
  ? (window.location.hostname.includes('vercel.app') ? '' : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? '' : 'https://byob-orcin.vercel.app'))
  : 'https://byob-orcin.vercel.app';

function getApiBase() {
  if (typeof window !== 'undefined' && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
    if (window.location.hostname.includes('vercel.app') || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return '';
    }
  }
  return _ACTIVE_API_BASE || 'https://byob-orcin.vercel.app';
}

const DB_SERVICE = {
  mode: 'sqlite_server', // 'supabase_cloud' | 'sqlite_server' | 'offline_fallback'
  sse: null,
  cloudChannel: null,
  currentUser: {
    id: 'usr_admin',
    name: 'Owner / Manager',
    role: 'admin',
    pin: '1234'
  },
  
  storeSettings: (() => {
    try {
      const s = typeof localStorage !== 'undefined' ? localStorage.getItem('onyx_store_settings') : null;
      return s ? JSON.parse(s) : {};
    } catch(e) { return {}; }
  })(),
  tables: [],
  categories: [],
  menuItems: [],
  kots: [],
  recentReport: null,

  listeners: {
    tables: [],
    kots: [],
    menu: [],
    store: [],
    status: [],
    appUpdate: []
  },

  latencyMs: 4,

  normalizeMenuItem(item) {
    if (!item) return item;
    let isVeg = true;
    if (item.is_veg !== undefined && item.is_veg !== null) {
      if (typeof item.is_veg === 'boolean') isVeg = item.is_veg;
      else if (typeof item.is_veg === 'number') isVeg = item.is_veg === 1;
      else if (typeof item.is_veg === 'string') isVeg = item.is_veg.toLowerCase() === 'true' || item.is_veg === '1' || item.is_veg.toLowerCase() === 'veg';
    } else if (item.isVeg !== undefined && item.isVeg !== null) {
      if (typeof item.isVeg === 'boolean') isVeg = item.isVeg;
      else if (typeof item.isVeg === 'number') isVeg = item.isVeg === 1;
      else if (typeof item.isVeg === 'string') isVeg = item.isVeg.toLowerCase() === 'true' || item.isVeg === '1' || item.isVeg.toLowerCase() === 'veg';
    } else if (item.type) {
      isVeg = String(item.type).toLowerCase() === 'veg';
    } else {
      const cat = String(item.category_id || item.category || '').toLowerCase();
      if (cat.includes('nonveg') || cat.includes('non_veg')) {
        isVeg = false;
      } else {
        const name = String(item.name || '').toLowerCase();
        const nonVegKeywords = ['chicken', 'mutton', 'fish', 'egg', 'prawn', 'keema', 'meat', 'tandoori chicken', 'shami kabab', 'seekh kebab', 'amritsari fish', 'lollipop', 'wings', 'bhurji'];
        for (const kw of nonVegKeywords) {
          if (name.includes(kw)) {
            isVeg = false;
            break;
          }
        }
      }
    }
    return {
      ...item,
      is_veg: isVeg ? 1 : 0,
      isVeg: isVeg
    };
  },

  getApiBase() {
    return getApiBase();
  },

  getServerUrl() {
    return _ACTIVE_API_BASE || (typeof window !== 'undefined' ? window.location.origin : 'http://192.168.1.6:3000');
  },

  setServerUrl(url) {
    if (!url) return;
    let clean = url.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'http://' + clean;
    }
    _ACTIVE_API_BASE = clean;
    try {
      localStorage.setItem('onyx_server_url', clean);
    } catch (e) {}
  },

  async testServerConnection(url) {
    let clean = (url || '').trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'http://' + clean;
    }
    const t0 = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${clean}/api/ping`, {
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (data && (data.success || data.ok)) {
        const latency = Math.round(performance.now() - t0);
        this.setServerUrl(clean);
        // CRITICAL FOR LIVE TRIAL: NEVER disconnect from Supabase Cloud!
        if (typeof ONYX_CLOUD_CONFIG !== 'undefined' && ONYX_CLOUD_CONFIG.isConfigured()) {
          this.mode = 'supabase_cloud';
          await this.initSupabaseCloud();
        } else {
          this.mode = 'sqlite_server';
          await this.loadInitialData();
          this.connectRealtimeSSE();
        }
        this.emitStatus();
        return { success: true, latency, url: clean };
      }
    } catch (err) {
      return { success: false, error: err.message || 'Connection timed out' };
    }
    return { success: false, error: 'Server returned error' };
  },

  async init() {
    this.initCurrentUser();

    // 0. Instantly populate tables and menu items locally (0ms) so UI renders immediately
    this.loadLocalFallback();
    this.notifyTables();
    this.notifyMenu();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[Network] Back online! Replaying queued offline actions...');
        this.replayOfflineQueue();
        if (typeof this.reconcileSupabase === 'function') this.reconcileSupabase();
      });
      window.addEventListener('focus', () => {
        if (typeof this.reconcileSupabase === 'function') this.reconcileSupabase();
      });
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if (typeof this.reconcileSupabase === 'function') this.reconcileSupabase();
        }
      });
    }

    // 1. Primary 24/7 Engine: Supabase Cloud Realtime (<25ms WebSocket sync for All Devices)
    this.startDeviceHeartbeatTimer();
    if (typeof ONYX_CLOUD_CONFIG !== 'undefined' && ONYX_CLOUD_CONFIG.isConfigured()) {
      console.log('☁️ Connecting via Supabase 24/7 Realtime Cloud Engine...');
      const cloudSuccess = await this.initSupabaseCloud();
      if (cloudSuccess) {
        this.emitStatus();
        this.replayOfflineQueue();
        return;
      }
    }

    // 2. Fall back to local server only if running directly on localhost development machine
    const serverFound = await this.autoDiscoverServer();
    if (serverFound) {
      this.subscribeSupabaseRealtime();
      return;
    }

    // 3. Fall back to local offline storage (already loaded in 0ms)
    this.emitStatus();
  },

  // Proactive multi-candidate server probing (Only for localhost dev machine)
  async autoDiscoverServer() {
    // In live restaurant trial, ALWAYS keep Supabase Cloud as primary single-source-of-truth
    if (typeof ONYX_CLOUD_CONFIG !== 'undefined' && ONYX_CLOUD_CONFIG.isConfigured()) {
      return false;
    }

    const isLocalhost = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );
    if (!isLocalhost) return false;

    const res = await this.probeServer('');
    if (res && res.success) {
      this.mode = 'sqlite_server';
      this.setServerUrl('');
      await this.loadInitialData();
      this.connectRealtimeSSE();
      this.emitStatus();
      return true;
    }
    return false;
  },

  // Mirror all local SQLite tables to Supabase Cloud in background
  async mirrorAllTablesToSupabase() {
    if (typeof ONYX_CLOUD_CONFIG === 'undefined' || !ONYX_CLOUD_CONFIG.isConfigured()) return;
    const client = ONYX_CLOUD_CONFIG.getClient();
    if (!client) return;

    try {
      if (Array.isArray(this.tables) && this.tables.length > 0) {
        for (const t of this.tables) {
          await client.from('tables').upsert({
            id: t.id,
            name: t.name,
            position: t.position,
            landmark: t.landmark,
            seats: t.seats,
            sort_order: t.sort_order,
            status: t.status,
            current_subtotal: t.currentSubtotal || 0,
            active: 1
          });
        }
      }
    } catch (e) {
      console.warn('Supabase mirror sync notice:', e);
    }
  },

  async mirrorKotToSupabase(tableId, tableName, items, waiterName, kotId) {
    if (typeof ONYX_CLOUD_CONFIG === 'undefined' || !ONYX_CLOUD_CONFIG.isConfigured()) return;
    const client = ONYX_CLOUD_CONFIG.getClient();
    if (!client) return;
    try {
      const finalKotId = kotId || ('KOT-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900));
      await client.from('kots').upsert([{
        id: finalKotId,
        table_id: tableId,
        table_name: tableName,
        waiter_name: waiterName || 'Floor Staff',
        status: 'pending'
      }]);

      const kotItems = items.map(it => ({
        kot_id: finalKotId,
        item_id: it.id || 'item',
        name: it.name,
        price: Number(it.price),
        qty: Number(it.qty),
        is_bar: it.is_bar ? true : false,
        notes: it.notes || ''
      }));
      await client.from('kot_items').insert(kotItems);

      let t = this.tables.find(x => x.id === tableId);
      const currentSub = t ? (t.currentSubtotal || 0) : 0;
      await client.from('tables').update({
        status: 'occupied',
        current_subtotal: currentSub
      }).eq('id', tableId);
    } catch (e) {
      console.warn('Supabase mirror KOT notice:', e);
    }
  },

  async mirrorBillToSupabase(bill) {
    if (!bill || typeof ONYX_CLOUD_CONFIG === 'undefined' || !ONYX_CLOUD_CONFIG.isConfigured()) return;
    const client = ONYX_CLOUD_CONFIG.getClient();
    if (!client) return;
    try {
      const sc = Number(bill.service_charge || bill.serviceCharge || 0);
      const baseRef = bill.payment_ref || bill.paymentRef || '';
      const paymentRef = sc > 0 ? (baseRef ? `${baseRef} | Service Charge: ₹${sc}` : `Fixed Service Charge: ₹${sc}`) : baseRef;

      await client.from('bills').upsert([{
        id: bill.id,
        invoice_number: bill.invoice_number || bill.invoiceNumber,
        table_id: bill.table_id || bill.tableId,
        table_name: bill.table_name || bill.tableName,
        waiter_name: bill.waiter_name || bill.waiterName || 'Floor Staff',
        cashier_name: bill.cashier_name || bill.cashierName || 'Cashier',
        customer_name: bill.customer_name || bill.customerName || 'Guest',
        customer_phone: bill.customer_phone || bill.customerPhone || '',
        subtotal: Number(bill.subtotal || 0),
        discount_type: bill.discount_type || bill.discountType || 'none',
        discount_value: Number(bill.discount_value || bill.discountValue || 0),
        discount_amount: Number(bill.discount_amount || bill.discountAmount || 0),
        cgst: Number(bill.cgst || 0),
        sgst: Number(bill.sgst || 0),
        round_off: Number(bill.round_off || bill.roundOff || 0),
        grand_total: Number(bill.grand_total || bill.grandTotal || 0),
        payment_mode: bill.payment_mode || bill.paymentMode || 'cash',
        payment_ref: paymentRef,
        split_count: Number(bill.split_count || bill.splitCount || 1),
        status: 'paid'
      }]);

      await client.from('kots').update({ status: 'billed' }).eq('table_id', bill.table_id || bill.tableId).neq('status', 'cancelled');
      await client.from('tables').update({
        status: 'vacant',
        current_subtotal: 0
      }).eq('id', bill.table_id || bill.tableId);
    } catch (e) {
      console.warn('Supabase mirror bill notice:', e);
    }
  },

  // ================= 1A. SUPABASE 24/7 CLOUD INTEGRATION =================
  async initSupabaseCloud() {
    try {
      const client = ONYX_CLOUD_CONFIG.getClient();
      if (!client) return false;

      // Test connection
      const { data: testData, error: testErr } = await client.from('tables').select('id').limit(1);
      if (testErr) {
        console.warn('Supabase connection test failed, falling back to local:', testErr);
        return false;
      }

      this.mode = 'supabase_cloud';
      await this.loadSupabaseData();
      this.subscribeSupabaseRealtime();
      this.startCloudReconciliationPoller(2000);
      this.notifyAll();
      return true;
    } catch (err) {
      console.warn('Supabase cloud init error:', err);
      return false;
    }
  },

  async loadSupabaseData() {
    const client = ONYX_CLOUD_CONFIG.getClient();
    if (!client) return;

    try {
      const [tblRes, catRes, itemRes, setRes, kotRes] = await Promise.all([
        client.from('tables').select('*').order('sort_order', { ascending: true }),
        client.from('categories').select('*').order('sort_order', { ascending: true }),
        client.from('menu_items').select('*'),
        client.from('store_settings').select('*'),
        client.from('kots').select('*, kot_items(*)').in('status', ['pending', 'preparing', 'ready', 'served'])
      ]);

      if (setRes.data && setRes.data.length > 0) {
        const s = {};
        setRes.data.forEach(r => s[r.key] = r.value);
        this.storeSettings = { ...(this.storeSettings || {}), ...s };
        try { localStorage.setItem('onyx_store_settings', JSON.stringify(this.storeSettings)); } catch(e){}
        this.notifyStore();
      }

      if (catRes.data && catRes.data.length > 0) this.categories = catRes.data;
      if (itemRes.data && itemRes.data.length > 0) this.menuItems = itemRes.data.map(i => this.normalizeMenuItem(i));
      if (kotRes.data) this.kots = kotRes.data;

      if (tblRes.data && tblRes.data.length > 0) {
        this.tables = tblRes.data.map(t => {
          const norm = (id) => String(id || '').replace(/^T-0?/, '');
          const isTableVacant = (t.status === 'vacant');
          const tableKots = isTableVacant 
            ? [] 
            : (kotRes.data || []).filter(k => (k.table_id === t.id || norm(k.table_id) === norm(t.id)) && k.status !== 'billed' && k.status !== 'cancelled');

          const placedOrders = [];
          tableKots.forEach(k => {
            if (Array.isArray(k.kot_items)) {
              k.kot_items.forEach(ki => {
                if (ki.is_void) return; // Zero permanent deletion: ignore soft-voided items
                placedOrders.push({
                  id: ki.id, // Primary key of kot_items table for exact voiding
                  item_id: ki.item_id,
                  kot_id: k.id,
                  name: ki.name,
                  price: parseFloat(ki.price),
                  qty: ki.qty,
                  notes: ki.notes || '',
                  is_bar: ki.is_bar ? 1 : 0
                });
              });
            }
          });
          const calculatedSubtotal = placedOrders.reduce((sum, item) => sum + (item.price * item.qty), 0);
          
          let waiterName = '';
          let firstSeatedTime = null;
          tableKots.forEach(k => {
            if (!waiterName && k.waiter_name && k.waiter_name !== 'Floor Staff') waiterName = k.waiter_name;
            if (k.created_at && (!firstSeatedTime || k.created_at < firstSeatedTime)) {
              firstSeatedTime = k.created_at;
            }
          });
          if (!waiterName && tableKots.length > 0) waiterName = tableKots[0].waiter_name || '';

          return {
            id: t.id,
            name: t.name,
            position: t.position,
            landmark: t.landmark,
            seats: t.seats,
            sort_order: t.sort_order,
            status: (!isTableVacant && (t.status === 'occupied' || calculatedSubtotal > 0)) ? 'occupied' : 'vacant',
            placedOrders,
            currentSubtotal: isTableVacant ? 0 : (calculatedSubtotal || parseFloat(t.current_subtotal) || 0),
            waiterName: waiterName || '',
            firstSeatedTime: firstSeatedTime || null,
            occupiedSince: isTableVacant ? null : (t.occupied_since || firstSeatedTime || null),
            occupied_since: isTableVacant ? null : (t.occupied_since || firstSeatedTime || null),
            kotCount: tableKots.length
          };
        });
      }

      this.notifyAll();
    } catch (err) {
      console.error('Error loading Supabase data:', err);
    }
  },

  _cloudReconcileTimer: null,
  _isReconciling: false,

  startCloudReconciliationPoller(intervalMs = 2000) {
    if (this._cloudReconcileTimer) clearInterval(this._cloudReconcileTimer);
    this._cloudReconcileTimer = setInterval(() => {
      this.reconcileSupabase();
    }, intervalMs);
  },

  async reconcileSupabase() {
    if (this._isReconciling) return;
    if (this.mode !== 'supabase_cloud') return;
    const client = ONYX_CLOUD_CONFIG.getClient();
    if (!client) return;

    this._isReconciling = true;
    try {
      const [tblRes, kotRes] = await Promise.all([
        client.from('tables').select('id,name,status,current_subtotal,updated_at').neq('status', 'vacant'),
        client.from('kots').select('id,table_id,waiter_name,status,created_at,kot_items(*)').in('status', ['pending', 'preparing', 'ready', 'served'])
      ]);

      if (kotRes.error) {
        console.warn('reconcileSupabase kot error:', kotRes.error);
        return;
      }

      const cloudOccupiedTables = tblRes.data || [];
      const cloudKots = kotRes.data || [];

      const norm = (id) => String(id || '').replace(/^T-0*/i, '').trim();
      let hasChanges = false;

      for (const t of this.tables) {
        const cloudT = cloudOccupiedTables.find(ct => ct.id === t.id || norm(ct.id) === norm(t.id));
        if (cloudT) {
          const targetStatus = cloudT.status || 'occupied';
          const targetSub = parseFloat(cloudT.current_subtotal) || 0;
          const matchingKots = cloudKots.filter(k => k.table_id === t.id || norm(k.table_id) === norm(t.id));
          const placedOrders = [];
          let earliestTime = null;

          matchingKots.forEach(k => {
            if (k.created_at && (!earliestTime || k.created_at < earliestTime)) earliestTime = k.created_at;
            if (Array.isArray(k.kot_items)) {
              k.kot_items.forEach(ki => {
                if (ki.is_void) return;
                placedOrders.push({
                  id: ki.id,
                  item_id: ki.item_id,
                  kot_id: k.id,
                  name: ki.name,
                  price: parseFloat(ki.price),
                  qty: ki.qty,
                  notes: ki.notes || '',
                  is_bar: ki.is_bar ? 1 : 0
                });
              });
            }
          });

          const calcSub = placedOrders.reduce((s, it) => s + (it.price * it.qty), 0);
          const finalSub = calcSub || targetSub;

          if (t.status !== targetStatus || t.currentSubtotal !== finalSub || (t.placedOrders || []).length !== placedOrders.length) {
            t.status = targetStatus;
            t.currentSubtotal = finalSub;
            t.placedOrders = placedOrders;
            if (!t.occupiedSince) {
              t.occupiedSince = earliestTime || new Date().toISOString();
              t.occupied_since = t.occupiedSince;
            }
            hasChanges = true;
          }
        } else {
          // Table should be vacant in cloud
          if (t.status !== 'vacant' || (t.currentSubtotal && t.currentSubtotal > 0) || (t.placedOrders && t.placedOrders.length > 0)) {
            t.status = 'vacant';
            t.currentSubtotal = 0;
            t.placedOrders = [];
            t.occupiedSince = null;
            t.occupied_since = null;
            t.paymentProof = null;
            t.paymentStatus = null;
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        this.saveLocalTables();
        this.notifyTables();
        this.notifyKots();
      }
    } catch (err) {
      // Silent error handling for background polling
    } finally {
      this._isReconciling = false;
    }
  },

  _debounceLoadTimer: null,
  scheduleDebouncedLoadSupabaseData() {
    if (this._debounceLoadTimer) clearTimeout(this._debounceLoadTimer);
    this._debounceLoadTimer = setTimeout(() => {
      this.loadSupabaseData();
    }, 350);
  },

  broadcastRealtime(event, payload) {
    if (!this.cloudChannel) return;
    try {
      this.cloudChannel.send({
        type: 'broadcast',
        event,
        payload
      });
    } catch (e) {
      console.warn('Realtime broadcast notice:', e);
    }
  },

  subscribeSupabaseRealtime() {
    const client = ONYX_CLOUD_CONFIG.getClient();
    if (!client) return;

    try {
      if (this.cloudChannel) {
        try { client.removeChannel(this.cloudChannel); } catch (e) {}
      }
      this.cloudChannel = client.channel('onyx-pos-live', {
        config: {
          broadcast: { ack: false, self: false },
          presence: { key: this.currentUser?.name || 'Staff' }
        }
      });

      // ⚡ INSTANT PEER-TO-PEER WEBSOCKET BROADCAST (<25ms sync across all devices)
      this.cloudChannel.on('broadcast', { event: 'KOT_PUNCHED' }, (msg) => {
        this.applyKotPunchedFromRemote(msg.payload);
      });

      this.cloudChannel.on('broadcast', { event: 'BILL_SETTLED' }, (msg) => {
        this.applyBillSettledFromRemote(msg.payload);
      });

      this.cloudChannel.on('broadcast', { event: 'TABLE_STATUS_CHANGED' }, (msg) => {
        this.applyTableStatusFromRemote(msg.payload);
      });
      this.cloudChannel.on('broadcast', { event: 'TABLE_STATUS_UPDATED' }, (msg) => {
        this.applyTableStatusFromRemote(msg.payload);
      });

      this.cloudChannel.on('broadcast', { event: 'TABLES_UPDATED' }, (msg) => {
        if (msg.payload && Array.isArray(msg.payload.tables)) {
          this.tables = msg.payload.tables;
          this.saveLocalTables();
          this.notifyTables();
        }
      });

      this.cloudChannel.on('broadcast', { event: 'ITEM_VOIDED' }, (msg) => {
        this.applyItemVoidedFromRemote(msg.payload);
      });

      this.cloudChannel.on('broadcast', { event: 'MENU_STOCK_CHANGED' }, (msg) => {
        this.applyStockUpdatedFromRemote(msg.payload);
      });

      this.cloudChannel.on('broadcast', { event: 'MENU_UPDATED' }, (msg) => {
        this.applyMenuUpdatedFromRemote(msg.payload);
      });

      // 🛑 Developer Permanent Master Kill-Switch Broadcast (<25ms)
      this.cloudChannel.on('broadcast', { event: 'DEVELOPER_KILL_SWITCH' }, (msg) => {
        if (typeof APP !== 'undefined' && APP.activateDeveloperLockout) {
          APP.activateDeveloperLockout(msg.payload?.reason);
        }
      });

      // 🚨 Remote Session Kill Switch (Manager terminates all other sessions)
      this.cloudChannel.on('broadcast', { event: 'REMOTE_SESSION_KILL' }, (msg) => {
        this.handleRemoteSessionKill(msg.payload);
      });

      // 🔄 Debounced PostgreSQL Changes Fallback (Safety Reconciliation)
      this.cloudChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => this.scheduleDebouncedLoadSupabaseData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kots' }, () => this.scheduleDebouncedLoadSupabaseData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kot_items' }, () => this.scheduleDebouncedLoadSupabaseData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, () => this.scheduleDebouncedLoadSupabaseData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => this.scheduleDebouncedLoadSupabaseData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings' }, () => this.scheduleDebouncedLoadSupabaseData())
        .subscribe((status) => {
          console.log('📡 [Supabase Realtime] Multi-Device Hub Connected:', status);
          if (status === 'SUBSCRIBED') {
            this.reconcileSupabase();
          } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            setTimeout(() => this.subscribeSupabaseRealtime(), 2500);
          }
        });
    } catch (e) {
      console.warn('Realtime subscription error:', e);
    }
  },

  applyKotPunchedFromRemote(data) {
    if (!data || !data.tableId) return;
    const norm = (id) => String(id || '').replace(/^T-0?/, '');
    let t = this.tables.find(x => x.id === data.tableId || norm(x.id) === norm(data.tableId));
    if (!t) {
      t = { id: data.tableId, name: data.tableName || ('Table ' + data.tableId), status: 'occupied', placedOrders: [], currentSubtotal: 0 };
      this.tables.push(t);
    }
    t.status = 'occupied';
    if (!t.occupiedSince) {
      t.occupiedSince = data.timestamp || new Date().toISOString();
      t.occupied_since = t.occupiedSince;
    }
    if (!t.placedOrders) t.placedOrders = [];
    if (Array.isArray(data.items)) {
      data.items.forEach(it => {
        const existing = t.placedOrders.find(p => (p.id === it.id || p.name === it.name) && (p.notes || '') === (it.notes || ''));
        if (existing) {
          existing.qty += it.qty;
        } else {
          t.placedOrders.push({ ...it });
        }
      });
    }
    if (typeof data.newSubtotal === 'number') {
      t.currentSubtotal = data.newSubtotal;
    } else {
      t.currentSubtotal = t.placedOrders.reduce((s, it) => s + (it.price * it.qty), 0);
    }

    if (data.kotId && !this.kots.some(k => k.id === data.kotId)) {
      this.kots.unshift({
        id: data.kotId,
        table_id: data.tableId,
        table_name: data.tableName,
        waiter_name: data.waiterName || 'Staff',
        status: 'pending',
        created_at: new Date().toISOString(),
        kot_items: data.items || []
      });
    }

    this.saveLocalTables();
    this.notifyTables();
    this.notifyKots();

    // Self-healing mesh: if sender reported other occupied tables that we have as vacant, reconcile immediately!
    if (Array.isArray(data.activeOccupiedTableIds)) {
      const normCheck = (id) => String(id || '').replace(/^T-0*/i, '').trim();
      const hasMissing = data.activeOccupiedTableIds.some(id => {
        const found = this.tables.find(x => x.id === id || normCheck(x.id) === normCheck(id));
        return !found || found.status === 'vacant';
      });
      if (hasMissing) {
        this.reconcileSupabase();
      }
    }

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(35); } catch (e) {}
    }
    if (typeof APP !== 'undefined' && APP.playBeep) {
      APP.playBeep('punch');
    }
  },

  applyBillSettledFromRemote(data) {
    if (!data || !data.tableId) return;
    const norm = (id) => String(id || '').replace(/^T-0?/, '');
    let t = this.tables.find(x => x.id === data.tableId || norm(x.id) === norm(data.tableId));
    if (t) {
      t.status = 'vacant';
      t.placedOrders = [];
      t.currentSubtotal = 0;
      t.occupiedSince = null;
      t.occupied_since = null;
    }
    this.kots = this.kots.filter(k => k.table_id !== data.tableId && norm(k.table_id) !== norm(data.tableId));
    this.saveLocalTables();
    this.notifyTables();
    this.notifyKots();

    // Self-healing mesh: if sender reported other occupied tables that we have as vacant, reconcile immediately!
    if (Array.isArray(data.activeOccupiedTableIds)) {
      const normCheck = (id) => String(id || '').replace(/^T-0*/i, '').trim();
      const hasMissing = data.activeOccupiedTableIds.some(id => {
        const found = this.tables.find(x => x.id === id || normCheck(x.id) === normCheck(id));
        return !found || found.status === 'vacant';
      });
      if (hasMissing) {
        this.reconcileSupabase();
      }
    }

    if (typeof APP !== 'undefined' && APP.playBeep) {
      APP.playBeep('success');
    }
  },

  applyTableStatusFromRemote(data) {
    if (!data || !data.tableId) return;
    const norm = (id) => String(id || '').replace(/^T-0?/, '');
    let t = this.tables.find(x => x.id === data.tableId || (norm(x.id) && norm(x.id) === norm(data.tableId)));
    if (t) {
      t.status = data.status || t.status;
      if (data.status === 'vacant') {
        t.placedOrders = [];
        t.currentSubtotal = 0;
        t.occupiedSince = null;
        t.occupied_since = null;
        t.paymentProof = null;
        t.paymentStatus = null;
      } else if (data.paymentProof !== undefined) {
        t.paymentProof = data.paymentProof;
        t.paymentStatus = 'proof_submitted';
      }
      this.saveLocalTables();
      this.notifyTables();
    }
  },

  applyItemVoidedFromRemote(data) {
    if (!data || !data.tableId) return;
    let t = this.tables.find(x => x.id === data.tableId);
    if (t && Array.isArray(t.placedOrders)) {
      if (data.kotItemId) {
        t.placedOrders = t.placedOrders.filter(p => p.id !== data.kotItemId);
      } else if (data.itemName) {
        const idx = t.placedOrders.findIndex(p => p.name === data.itemName);
        if (idx !== -1) t.placedOrders.splice(idx, 1);
      }
      t.currentSubtotal = t.placedOrders.reduce((s, it) => s + (it.price * it.qty), 0);
      if (t.placedOrders.length === 0) t.status = 'vacant';
      this.saveLocalTables();
      this.notifyTables();
      this.notifyKots();
    }
  },

  applyStockUpdatedFromRemote(data) {
    if (!data || !data.itemId) return;
    const target = this.menuItems.find(m => m.id === data.itemId);
    if (target) {
      target.in_stock = data.inStock ? 1 : 0;
      this.notifyMenu();
    }
  },

  applyMenuUpdatedFromRemote(data) {
    if (!data || !data.item) return;
    const normalized = this.normalizeMenuItem(data.item);
    const idx = this.menuItems.findIndex(m => m.id === normalized.id);
    if (idx !== -1) {
      this.menuItems[idx] = this.normalizeMenuItem({ ...this.menuItems[idx], ...normalized });
    } else {
      this.menuItems.push(normalized);
    }
    this.notifyMenu();
  },

  initCurrentUser() {
    const saved = localStorage.getItem('onyx_logged_user');
    if (saved) {
      try { this.currentUser = JSON.parse(saved); } catch (e) {}
    }
  },

  setCurrentUser(user) {
    this.currentUser = user;
    localStorage.setItem('onyx_logged_user', JSON.stringify(user));
    this.emitStatus();
  },

  async authenticatePin(pin) {
    try {
      const res = await fetch(`${getApiBase()}/api/auth/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      if (data.success && data.user) {
        this.setCurrentUser(data.user);
        return { success: true, user: data.user };
      }
      return { success: false, message: data.message || 'Invalid PIN' };
    } catch (e) {
      if (pin === '1234') {
        const u = { id: 'usr_admin', name: 'Admin Owner', role: 'admin', pin: '1234' };
        this.setCurrentUser(u);
        return { success: true, user: u };
      }
      return { success: false, message: 'Server offline' };
    }
  },

  // ================= 1. INITIAL DATA LOAD =================
  async loadInitialData() {
    try {
      const [storeRes, tablesRes, menuRes, kotsRes] = await Promise.all([
        fetch(`${getApiBase()}/api/store`).then(r => r.json()).catch(() => null),
        fetch(`${getApiBase()}/api/tables`).then(r => r.json()).catch(() => null),
        fetch(`${getApiBase()}/api/menu`).then(r => r.json()).catch(() => null),
        fetch(`${getApiBase()}/api/kots/active`).then(r => r.json()).catch(() => null)
      ]);

      if (storeRes && storeRes.settings) {
        this.storeSettings = storeRes.settings;
      }
      if (tablesRes && tablesRes.tables && tablesRes.tables.length > 0) {
        this.tables = tablesRes.tables;
        this.mode = 'sqlite_server';
      } else {
        this.loadLocalFallback();
      }
      if (menuRes && menuRes.items) {
        this.menuItems = menuRes.items.map(i => this.normalizeMenuItem(i));
        this.categories = menuRes.categories;
      }
      if (kotsRes && kotsRes.kots) {
        this.kots = kotsRes.kots;
      }
      this.notifyAll();
    } catch (err) {
      console.warn('Initial data load error, using local fallback:', err);
      this.loadLocalFallback();
      this.notifyAll();
    }
  },

  loadLocalFallback() {
    this.mode = 'offline_fallback';
    const saved = localStorage.getItem('onyx_local_tables');
    let loadedFromStorage = false;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.tables = parsed;
          loadedFromStorage = true;
        }
      } catch (e) {}
    }
    if (!loadedFromStorage && typeof RESTAURANT_TABLES !== 'undefined') {
      this.tables = RESTAURANT_TABLES.map(t => ({
        id: t.id,
        name: t.name,
        position: t.position,
        landmark: t.landmark,
        seats: t.seats,
        status: 'vacant',
        currentSubtotal: 0,
        placedOrders: []
      }));
    }
    if (typeof CATEGORIES !== 'undefined' && (!this.categories || this.categories.length === 0)) {
      this.categories = CATEGORIES;
    }
    if (typeof MENU_ITEMS !== 'undefined' && (!this.menuItems || this.menuItems.length === 0)) {
      this.menuItems = MENU_ITEMS.map(i => this.normalizeMenuItem(i));
    }
  },

  saveLocalTables() {
    try {
      localStorage.setItem('onyx_local_tables', JSON.stringify(this.tables));
    } catch (e) {}
  },

  // ================= 1C. OFFLINE QUEUE & RESILIENT AUTO-SYNC REPLAY =================
  queueOfflineAction(type, payload) {
    try {
      const q = this.getOfflineQueue();
      q.push({
        id: 'sync_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        type,
        payload,
        timestamp: Date.now()
      });
      localStorage.setItem('onyx_sync_queue', JSON.stringify(q));
      console.log(`[OfflineQueue] Queued ${type}. Total pending: ${q.length}`);
    } catch (e) {
      console.warn('Failed to queue offline action:', e);
    }
  },

  getOfflineQueue() {
    try {
      const data = localStorage.getItem('onyx_sync_queue');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  async replayOfflineQueue() {
    const queue = this.getOfflineQueue();
    if (queue.length === 0) return;

    console.log(`[OfflineQueue] Replaying ${queue.length} pending offline actions...`);
    const remaining = [];

    for (const item of queue) {
      try {
        if (item.type === 'PUNCH_KOT') {
          const res = await fetch(`${getApiBase()}/api/orders/punch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload)
          });
          if (!res.ok) throw new Error('Punch failed');
        } else if (item.type === 'SETTLE_BILL') {
          const res = await fetch(`${getApiBase()}/api/bills/settle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload)
          });
          if (!res.ok) throw new Error('Settle failed');
        }
      } catch (err) {
        console.warn(`[OfflineQueue] Replay failed for ${item.id}, will retry later:`, err);
        remaining.push(item);
      }
    }

    localStorage.setItem('onyx_sync_queue', JSON.stringify(remaining));
    if (queue.length > remaining.length) {
      const syncedCount = queue.length - remaining.length;
      console.log(`[OfflineQueue] Successfully synced ${syncedCount} queued actions!`);
      if (typeof APP !== 'undefined' && APP.showToast) {
        APP.showToast(`🔄 Synced ${syncedCount} offline order(s) with Server!`);
      }
      if (this.mode === 'supabase_cloud') this.loadSupabaseData();
      else this.loadInitialData();
    }
  },

  // ================= 2. REAL-TIME SERVER-SENT EVENTS (SSE) =================
  connectRealtimeSSE() {
    if (typeof EventSource === 'undefined') return;

    try {
      if (this.sse) this.sse.close();
      this.sse = new EventSource(`${getApiBase()}/api/sync/stream`);

      this.sse.addEventListener('TABLES_UPDATED', (e) => {
        const tables = JSON.parse(e.data);
        this.tables = tables;
        this.notifyTables();
      });

      this.sse.addEventListener('KOT_PUNCHED', (e) => {
        const data = JSON.parse(e.data);
        if (data.tables) this.tables = data.tables;
        if (data.activeKots) this.kots = data.activeKots;
        this.notifyTables();
        this.notifyKots();
        // Subtle haptic vibration for kitchen punch notification
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate(25); } catch(err){}
        }
      });

      this.sse.addEventListener('KOT_STATUS_UPDATED', (e) => {
        const data = JSON.parse(e.data);
        if (data.activeKots) this.kots = data.activeKots;
        this.notifyKots();
      });

      this.sse.addEventListener('BILL_SETTLED', (e) => {
        const data = JSON.parse(e.data);
        if (data.tables) this.tables = data.tables;
        if (data.activeKots) this.kots = data.activeKots;
        this.notifyTables();
        this.notifyKots();
      });

      this.sse.addEventListener('STOCK_UPDATED', (e) => {
        const item = JSON.parse(e.data);
        const target = this.menuItems.find(m => m.id === item.id);
        if (target) target.in_stock = item.in_stock;
        this.notifyMenu();
      });

      this.sse.addEventListener('STORE_UPDATED', (e) => {
        this.storeSettings = JSON.parse(e.data);
        this.notifyStore();
      });

      this.sse.addEventListener('MENU_UPDATED', (e) => {
        const data = JSON.parse(e.data);
        if (data.items) this.menuItems = data.items.map(i => this.normalizeMenuItem(i));
        if (data.categories) this.categories = data.categories;
        this.notifyMenu();
      });

      this.sse.addEventListener('BILL_UPDATED', (e) => {
        try {
          if (this.mode === 'supabase_cloud') this.loadSupabaseData();
      else this.loadInitialData();
        } catch (err) {}
      });

      this.sse.addEventListener('APP_UPDATE_RELEASED', (e) => {
        try {
          const update = JSON.parse(e.data);
          this.notifyAppUpdate(update);
        } catch (err) {}
      });

      this.sse.addEventListener('KITCHEN_PRINTER_STATUS', (e) => {
        try {
          const status = JSON.parse(e.data);
          if (window.APP && typeof window.APP.handlePrinterStatus === 'function') {
            window.APP.handlePrinterStatus(status);
          }
        } catch (err) {}
      });

      this.sse.addEventListener('DEVELOPER_KILL_SWITCH', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (typeof APP !== 'undefined' && APP.activateDeveloperLockout) {
            APP.activateDeveloperLockout(payload?.reason);
          }
        } catch (err) {}
      });

      this.sse.addEventListener('REMOTE_SESSION_KILL', (e) => {
        try {
          const payload = JSON.parse(e.data);
          this.handleRemoteSessionKill(payload);
        } catch (err) {}
      });

      this.sse.onopen = () => {
        this.mode = 'sqlite_server';
        this.emitStatus();
        this.replayOfflineQueue();
      };

      this.sse.onerror = () => {
        // Prevent exponential reconnection cascade: only reconnect if socket is completely closed
        if (this.sse && this.sse.readyState === EventSource.CLOSED) {
          if (this.sseReconnectTimer) clearTimeout(this.sseReconnectTimer);
          this.sseReconnectTimer = setTimeout(() => this.connectRealtimeSSE(), 4000);
        }
      };
    } catch (e) {
      console.warn('SSE connection failed:', e);
    }
  },

  handleRemoteSessionKill(payload) {
    if (!payload) return;
    const currentDeviceId = (typeof APP !== 'undefined' && APP.getDeviceId) ? APP.getDeviceId() : localStorage.getItem('onyx_device_id');
    if (payload.allowedDeviceId && currentDeviceId === payload.allowedDeviceId) {
      console.log('🛡️ [Security] Remote session kill ignored for allowed manager device:', currentDeviceId);
      return;
    }
    console.warn('🚨 [Security] Remote session kill event received. Locking device...');
    if (typeof APP !== 'undefined' && APP.lockoutTerminatedSession) {
      APP.lockoutTerminatedSession(payload.reason || 'Terminated remotely by Manager');
    }
  },

  // --- Active Device Heartbeat & Real-Time Tracking ---
  heartbeatTimer: null,

  startDeviceHeartbeatTimer() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    setTimeout(() => this.sendDeviceHeartbeat(), 2000);
    this.heartbeatTimer = setInterval(() => {
      this.sendDeviceHeartbeat();
    }, 25000);
  },

  async sendDeviceHeartbeat() {
    try {
      const deviceId = (typeof APP !== 'undefined' && APP.getDeviceId) 
        ? APP.getDeviceId() 
        : (localStorage.getItem('onyx_device_id') || 'DEV-ANON');

      const isAndroidApk = Boolean(window.PosAndroid || /ONYX_ANDROID_APP/i.test(navigator.userAgent));
      const platform = isAndroidApk ? 'android_apk' : (/Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile_web' : 'desktop_web');
      const deviceModel = (window.PosAndroid && window.PosAndroid.getDeviceModel) 
        ? window.PosAndroid.getDeviceModel() 
        : (typeof APP !== 'undefined' && APP.getDeviceInfo ? APP.getDeviceInfo() : 'Web Browser');
      const appVersion = (window.PosAndroid && window.PosAndroid.getAppVersion) 
        ? window.PosAndroid.getAppVersion() 
        : '5.1';
      const role = this.currentUser?.role || (typeof APP !== 'undefined' ? APP.userRole : 'waiter');
      const staffName = this.currentUser?.name || 'Staff';

      const devPayload = {
        deviceId,
        deviceType: platform,
        deviceModel,
        appVersion,
        platform,
        role,
        staffName,
        lastSeen: new Date().toISOString(),
        status: 'active'
      };

      // 1. Sync to Supabase Cloud store_settings (if Supabase configured)
      if (typeof ONYX_CLOUD_CONFIG !== 'undefined' && ONYX_CLOUD_CONFIG.isConfigured()) {
        const client = ONYX_CLOUD_CONFIG.getClient();
        if (client) {
          client.from('store_settings').upsert({
            key: `dev_device_${deviceId}`,
            value: JSON.stringify(devPayload),
            updated_at: new Date().toISOString()
          }).then(() => {}).catch(() => {});
        }
      }

      // 2. Sync to Local SQLite Server (if accessible)
      fetch(`${getApiBase()}/api/telemetry/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(devPayload)
      }).then(r => r.json()).then(data => {
        if (data && data.killSwitchActive) {
          if (typeof APP !== 'undefined' && APP.activateDeveloperLockout) {
            APP.activateDeveloperLockout(data.killReason);
          }
        }
      }).catch(() => {});

      // 3. Proactive developer kill-switch check from cached/loaded storeSettings
      if (this.storeSettings && String(this.storeSettings.developer_kill_switch_active).trim() === '1') {
        if (typeof APP !== 'undefined' && APP.activateDeveloperLockout) {
          APP.activateDeveloperLockout(this.storeSettings.developer_kill_switch_reason);
        }
      }
    } catch(err) {
      console.warn('Heartbeat error:', err);
    }
  },

  // ================= 3. CORE BUSINESS OPERATIONS =================

  // Punch KOT
  async punchKOT(tableId, tableName, items, waiterName) {
    const kotId = 'KOT-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
    const assignedWaiter = waiterName || this.currentUser.name || 'Floor Staff';

    // 0. OPTIMISTIC INSTANT LOCAL UPDATE (0ms)
    const norm = (id) => String(id || '').replace(/^T-0?/, '');
    let t = this.tables.find(x => x.id === tableId || (norm(x.id) && norm(x.id) === norm(tableId)));
    if (!t) {
      t = { id: tableId, name: tableName, status: 'occupied', placedOrders: [], currentSubtotal: 0 };
      this.tables.push(t);
    }
    t.status = 'occupied';
    if (!t.occupiedSince) {
      t.occupiedSince = new Date().toISOString();
      t.occupied_since = t.occupiedSince;
    }
    if (!t.placedOrders) t.placedOrders = [];
    items.forEach(it => {
      const existing = t.placedOrders.find(p => (p.id === it.id || p.name === it.name) && (p.notes || '') === (it.notes || ''));
      if (existing) {
        existing.qty += it.qty;
      } else {
        t.placedOrders.push({ ...it });
      }
    });
    const newSubtotal = t.placedOrders.reduce((s, it) => s + (it.price * it.qty), 0);
    t.currentSubtotal = newSubtotal;
    this.saveLocalTables();
    this.notifyTables();

    // 1. INSTANT BROADCAST TO ALL CONNECTED DEVICES (<25ms)
    const activeOccupiedTableIds = this.tables.filter(x => x.status === 'occupied' || (x.currentSubtotal || 0) > 0).map(x => x.id);
    this.broadcastRealtime('KOT_PUNCHED', {
      kotId,
      tableId,
      tableName,
      waiterName: assignedWaiter,
      items,
      newSubtotal,
      timestamp: t.occupiedSince,
      activeOccupiedTableIds
    });

    // 2. Supabase Cloud Sync Branch
    if (this.mode === 'supabase_cloud') {
      const client = ONYX_CLOUD_CONFIG.getClient();
      if (client) {
        try {
          const rawTid = String(tableId || '');
          const tidNum = rawTid.replace(/\D/g, '');
          const altTid = tidNum ? `T-${tidNum.padStart(2, '0')}` : rawTid;
          const tidVariants = Array.from(new Set([rawTid, tidNum, `T-${tidNum}`, altTid])).filter(Boolean);

          await client.from('kots').insert([{
            id: kotId,
            table_id: altTid,
            table_name: tableName,
            waiter_name: assignedWaiter,
            status: 'pending'
          }]);

          const kotItems = items.map(it => ({
            kot_id: kotId,
            item_id: it.id,
            name: it.name,
            price: it.price,
            qty: it.qty,
            is_bar: it.is_bar ? true : false,
            notes: it.notes || ''
          }));
          await client.from('kot_items').insert(kotItems);

          for (const tid of tidVariants) {
            await client.from('tables').update({
              status: 'occupied',
              current_subtotal: newSubtotal
            }).eq('id', tid);
          }

          return { id: kotId, items };
        } catch (e) {
          console.warn('Supabase cloud punch notice:', e);
        }
      }
    }

    const payload = {
      tableId,
      tableName,
      waiterName: assignedWaiter,
      items
    };

    try {
      const res = await fetch(`${getApiBase()}/api/orders/punch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        if (data.tables) this.tables = data.tables;
        this.notifyTables();
        this.mirrorKotToSupabase(tableId, tableName, items, waiterName, data.kot?.id);
        return data.kot;
      }
    } catch (e) {
      console.warn('Backend punch queued for offline replay:', e);
      this.queueOfflineAction('PUNCH_KOT', payload);
    }

    return { id: kotId, items };
  },

  // Update KOT Status (Kitchen Display)
  async updateKotStatus(kotId, status) {
    try {
      const res = await fetch(`${getApiBase()}/api/kots/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kotId, status })
      });
      const data = await res.json();
      if (data.success && data.activeKots) {
        this.kots = data.activeKots;
        this.notifyKots();
      }
      return data;
    } catch (e) {
      return { success: false };
    }
  },

  // Settle Bill
  async logPaymentFailure(failureData) {
    const entry = {
      id: failureData.id || ('FAIL-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)),
      table_id: failureData.table_id || failureData.tableId || 'T-00',
      table_name: failureData.table_name || failureData.tableName || 'Table',
      floor: failureData.floor || 'Ground Floor',
      amount: Number(failureData.amount || 0),
      payment_mode: failureData.payment_mode || failureData.paymentMode || 'card',
      reason: failureData.reason || 'Payment Cancelled',
      staff_name: failureData.staff_name || failureData.staffName || 'Staff',
      created_at: failureData.created_at || new Date().toISOString()
    };

    // Local client backup cache
    try {
      const existing = JSON.parse(localStorage.getItem('byob_card_failures') || '[]');
      existing.unshift(entry);
      localStorage.setItem('byob_card_failures', JSON.stringify(existing.slice(0, 50)));
    } catch (e) {}

    try {
      if (this.isSupabaseDirect()) {
        const client = this.getSupabaseClient();
        if (client) {
          await client.from('payment_failure_logs').insert([entry]).catch(() => {});
        }
      }
      const res = await fetch(`${getApiBase()}/api/payment/failure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      return await res.json();
    } catch (e) {
      console.warn('logPaymentFailure client sync notice (cached locally):', e);
      return { success: true, logged: entry };
    }
  },

  async getPaymentFailures(limit = 50) {
    try {
      const res = await fetch(`${getApiBase()}/api/payment/failures?limit=${limit}`);
      const data = await res.json();
      if (data && Array.isArray(data.failures) && data.failures.length > 0) {
        return data.failures;
      }
    } catch (e) {}

    try {
      const cached = JSON.parse(localStorage.getItem('byob_card_failures') || '[]');
      return cached.slice(0, limit);
    } catch (e) {
      return [];
    }
  },

  async updateTableStatus(tableId, status, paymentProof = undefined) {
    const norm = (id) => String(id || '').replace(/^T-0*/i, '').trim();
    let t = this.tables.find(x => x.id === tableId || norm(x.id) === norm(tableId));
    if (t) {
      t.status = status;
      if (paymentProof === null) {
        t.paymentProof = null;
        t.paymentStatus = null;
      } else if (paymentProof !== undefined) {
        t.paymentProof = paymentProof;
        t.paymentStatus = 'proof_submitted';
      }
      this.saveLocalTables();
      this.notifyTables();
    }
    this.broadcastRealtime('TABLE_STATUS_CHANGED', { tableId, status, paymentProof });
    this.broadcastRealtime('TABLE_STATUS_UPDATED', { tableId, status, paymentProof });
    try {
      if (this.mode === 'supabase_cloud') {
        const client = ONYX_CLOUD_CONFIG.getClient();
        if (client) {
          const upd = { status, updated_at: new Date().toISOString() };
          const rawTid = String(tableId || '');
          const tidNum = rawTid.replace(/\D/g, '');
          const altTid = tidNum ? `T-${tidNum.padStart(2, '0')}` : rawTid;
          const tidVariants = Array.from(new Set([rawTid, tidNum, `T-${tidNum}`, altTid])).filter(Boolean);

          for (const tid of tidVariants) {
            await client.from('tables').update(upd).eq('id', tid).catch(() => {});
          }
        }
        // Mirror to local server bridge if reachable
        fetch(`${getApiBase()}/api/tables/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tableId, status, paymentProof })
        }).catch(() => {});
      } else {
        await this.post('/api/tables/status', { tableId, status, paymentProof });
      }
    } catch (e) {
      console.warn('Sync table status error:', e.message);
    }
  },

  async saveTablePaymentProof(tableId, paymentProof) {
    return this.updateTableStatus(tableId, 'bill_printed', paymentProof);
  },

  async settleBill(billData) {
    const billId = 'BILL-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
    const invNo = billData.invoiceNumber || ('INV-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Date.now().toString(36).toUpperCase().slice(-4) + Math.floor(100 + Math.random() * 900));

    // 0. OPTIMISTIC INSTANT LOCAL UPDATE (0ms)
    const norm = (id) => String(id || '').replace(/^T-0*/i, '').trim();
    let t = this.tables.find(x => x.id === billData.tableId || norm(x.id) === norm(billData.tableId));
    if (t) {
      t.status = 'vacant';
      t.placedOrders = [];
      t.currentSubtotal = 0;
      t.paymentProof = null;
      t.paymentStatus = null;
      t.occupiedSince = null;
      t.occupied_since = null;
    }
    this.kots = this.kots.filter(k => k.table_id !== billData.tableId && norm(k.table_id) !== norm(billData.tableId));
    this.saveLocalTables();
    this.notifyTables();
    this.notifyKots();

    // 1. INSTANT BROADCAST TO ALL CONNECTED DEVICES (<25ms)
    const remainingOccupiedIds = this.tables.filter(x => x.id !== billData.tableId && (x.status === 'occupied' || (x.currentSubtotal || 0) > 0)).map(x => x.id);
    this.broadcastRealtime('BILL_SETTLED', {
      billId,
      invoiceNumber: invNo,
      tableId: billData.tableId,
      tableName: billData.tableName,
      activeOccupiedTableIds: remainingOccupiedIds
    });

    // 2. Supabase Cloud Sync Branch (Sanitized for Schema)
    if (this.mode === 'supabase_cloud') {
      const client = ONYX_CLOUD_CONFIG.getClient();
      if (client) {
        try {
          const sc = Number(billData.serviceCharge || 0);
          const baseRef = billData.paymentRef || '';
          let paymentRef = sc > 0 ? (baseRef ? `${baseRef} | Service Charge: ₹${sc}` : `Fixed Service Charge: ₹${sc}`) : baseRef;
          if (billData.paymentProof) {
            const proofStr = typeof billData.paymentProof === 'object' ? JSON.stringify(billData.paymentProof) : String(billData.paymentProof);
            paymentRef = paymentRef ? `${paymentRef} | PROOF::${proofStr}` : `PROOF::${proofStr}`;
          }

          const { error: billErr } = await client.from('bills').insert([{
            id: billId,
            invoice_number: invNo,
            table_id: billData.tableId,
            table_name: billData.tableName,
            waiter_name: billData.waiterName || 'Captain Rahul',
            cashier_name: this.currentUser.name || 'Cashier',
            customer_name: billData.customerName || 'Guest',
            customer_phone: billData.customerPhone || '',
            subtotal: Number(billData.subtotal || 0),
            discount_type: billData.discountType || 'none',
            discount_value: Number(billData.discountValue || 0),
            discount_amount: Number(billData.discountAmount || 0),
            cgst: Number(billData.cgst || 0),
            sgst: Number(billData.sgst || 0),
            round_off: Number(billData.roundOff || 0),
            grand_total: Number(billData.grandTotal || 0),
            payment_mode: billData.paymentMode || 'upi',
            payment_ref: paymentRef,
            split_count: Number(billData.splitCount || 1),
            status: 'paid'
          }]);

          if (billErr) {
            console.error('Supabase bill insert failed:', billErr);
          } else {
            console.log('✅ Supabase bill saved:', invNo, 'Grand Total:', billData.grandTotal);
          }

          if (Array.isArray(billData.items) && billData.items.length > 0) {
            const billItems = billData.items.map(it => ({
              bill_id: billId,
              item_id: it.id || it.item_id || 'item',
              name: it.name,
              price: Number(it.price || 0),
              qty: Number(it.qty || 1),
              amount: Number(it.price || 0) * Number(it.qty || 1)
            }));
            await client.from('bill_items').insert(billItems);
          }

          // Mark active KOTs as billed & reset table in Supabase across all ID notations
          const rawTid = String(billData.tableId || '');
          const tidNum = rawTid.replace(/\D/g, '');
          const altTid = tidNum ? `T-${tidNum.padStart(2, '0')}` : rawTid;
          const tidVariants = Array.from(new Set([rawTid, tidNum, `T-${tidNum}`, altTid])).filter(Boolean);

          for (const tid of tidVariants) {
            await client.from('kots').update({ status: 'billed' }).eq('table_id', tid).neq('status', 'cancelled');
            await client.from('tables').update({
              status: 'vacant',
              current_subtotal: 0
            }).eq('id', tid);
          }

          // Asynchronously notify local server bridge if reachable
          fetch(`${getApiBase()}/api/bills/settle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...billData, cashierName: this.currentUser.name || 'Cashier' })
          }).catch(() => {});

          await this.loadSupabaseData();
          return { id: billId, invoice_number: invNo, ...billData };
        } catch (e) {
          console.warn('Supabase cloud settle notice:', e);
        }
      }
    }

    const payload = {
      ...billData,
      cashierName: this.currentUser.name || 'Cashier'
    };

    try {
      const res = await fetch(`${getApiBase()}/api/bills/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        if (data.tables) this.tables = data.tables;
        this.notifyTables();
        return data.bill;
      }
    } catch (e) {
      console.warn('Backend settle failed, queuing for offline replay and applying local reset:', e);
      this.queueOfflineAction('SETTLE_BILL', payload);
    }

    // Local resilient settlement
    const localT = this.tables.find(x => x.id === billData.tableId);
    if (localT) {
      localT.status = 'vacant';
      localT.placedOrders = [];
      localT.currentSubtotal = 0;
    }
    this.saveLocalTables();
    this.notifyTables();
    return { id: 'LOCAL-BILL-' + Date.now(), ...billData };
  },

  // Manager Bill Modification (Audit-Trailed)
  async updateBill(editData) {
    // 1. Supabase Cloud Sync Branch
    if (this.mode === 'supabase_cloud') {
      const client = ONYX_CLOUD_CONFIG.getClient();
      if (client) {
        try {
          const updatePayload = {
            customer_name: editData.customerName,
            customer_phone: editData.customerPhone,
            payment_mode: editData.paymentMode,
            subtotal: Number(editData.subtotal),
            discount_type: editData.discountType,
            discount_value: Number(editData.discountValue || 0),
            discount_amount: Number(editData.discountAmount || 0),
            cgst: Number(editData.cgst || 0),
            sgst: Number(editData.sgst || 0),
            service_charge: Number(editData.serviceCharge || 0),
            round_off: Number(editData.roundOff || 0),
            grand_total: Number(editData.grandTotal)
          };
          await client.from('bills').update(updatePayload).eq('id', editData.billId);

          if (Array.isArray(editData.items) && editData.items.length > 0) {
            // Zero Permanent Deletion: Soft-archive previous items instead of deleting
            try {
              await client.from('bill_items').update({ is_archived: true, archived_at: new Date().toISOString() }).eq('bill_id', editData.billId).eq('is_archived', false);
            } catch (archErr) {
              console.warn('Soft-archiving old bill items in Supabase notice:', archErr);
            }
            const billItems = editData.items.map(it => ({
              bill_id: editData.billId,
              item_id: it.id || it.item_id || 'item',
              name: it.name,
              price: Number(it.price),
              qty: Number(it.qty),
              amount: Number(it.price) * Number(it.qty),
              is_archived: false
            }));
            await client.from('bill_items').insert(billItems);
          }

          // Insert edit log
          await client.from('bill_edit_logs').insert([{
            id: 'BEDT-' + Date.now().toString(36),
            bill_id: editData.billId,
            invoice_number: editData.invoiceNumber || 'INV-MODIFIED',
            manager_email: editData.managerEmail || 'admin@google.in',
            manager_name: 'Manager (Admin)',
            reason: editData.reason,
            previous_data: editData.previousData || {},
            new_data: updatePayload,
            changes_summary: editData.changesSummary || 'Bill adjusted by manager'
          }]);
        } catch (e) {
          console.warn('Supabase cloud updateBill failed, falling back to local server:', e);
        }
      }
    }

    const res = await fetch(`${getApiBase()}/api/bills/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData)
    });
    const data = await res.json();
    if (data.success) {
      return data;
    }
    throw new Error(data.error || 'Failed to update bill');
  },

  // Fetch Recent Settled Bills (For Reprinting & Manager Adjustments)
  async getRecentBills(limit = 30) {
    // 1. Try local server first if reachable (contains full SQLite records with payment_proof)
    try {
      const res = await fetch(`${getApiBase()}/api/bills/recent?limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.bills) && data.bills.length > 0) {
          return data.bills;
        }
      }
    } catch (e) {
      // Local server not reachable (e.g. standalone cloud client)
    }

    // 2. Query Supabase Cloud
    if (this.mode === 'supabase_cloud' || (typeof ONYX_CLOUD_CONFIG !== 'undefined' && ONYX_CLOUD_CONFIG.isConfigured())) {
      const client = ONYX_CLOUD_CONFIG.getClient();
      if (client) {
        try {
          const { data: bills, error } = await client
            .from('bills')
            .select('*, bill_items(*)')
            .order('created_at', { ascending: false })
            .limit(limit);
          if (!error && Array.isArray(bills)) {
            const activeBills = bills.filter(b => b.status !== 'void' && b.status !== 'cancelled');
            activeBills.forEach(b => {
              b.items = (b.bill_items || []).filter(bi => !bi.is_archived);
              if (!b.payment_proof && b.payment_ref && b.payment_ref.includes('PROOF::')) {
                const parts = b.payment_ref.split('PROOF::');
                b.payment_proof = parts[1];
                b.payment_ref = parts[0].replace(/\|\s*$/, '').trim();
              }
            });
            return activeBills;
          }
        } catch (e) {
          console.warn('Supabase getRecentBills failed, falling back to local server:', e);
        }
      }
    }

    try {
      const res = await fetch(`${getApiBase()}/api/bills/recent?limit=${limit}`);
      const data = await res.json();
      return data.success ? data.bills : [];
    } catch (e) {
      console.warn('Failed to fetch recent bills:', e);
      return [];
    }
  },

  // Fetch Bill Modification Audit Logs
  async getBillEditLogs(billId = null) {
    if (this.mode === 'supabase_cloud') {
      const client = ONYX_CLOUD_CONFIG.getClient();
      if (client) {
        try {
          let query = client.from('bill_edit_logs').select('*').order('created_at', { ascending: false });
          if (billId) query = query.eq('bill_id', billId);
          const { data, error } = await query.limit(50);
          if (!error && Array.isArray(data)) {
            return data;
          }
        } catch (e) {
          console.warn('Supabase getBillEditLogs failed, falling back to local server:', e);
        }
      }
    }

    const url = billId ? `${getApiBase()}/api/bills/edit-logs?billId=${encodeURIComponent(billId)}` : `${getApiBase()}/api/bills/edit-logs`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      return data.success ? data.logs : [];
    } catch (e) {
      console.warn('Failed to fetch bill edit logs:', e);
      return [];
    }
  },

  // Void Punched Item (Zero Permanent Deletion: Soft-Void & Device-Tracked Anti-Theft Audit)
  async voidKotItem({ kotItemId, reason, managerPin, itemName, tableId, tableName, floor, price, qty, staffName, deviceId }) {
    const cleanStaff = staffName || (typeof APP !== 'undefined' && APP.state ? (APP.state.userName || 'Floor Waiter') : 'Staff');
    const cleanDevice = deviceId || (typeof APP !== 'undefined' ? APP.getDeviceId() : 'DEVICE-PHONE');
    const amount = (price * qty) || 0;

    // 0. Optimistic instant local removal (0ms)
    let t = this.tables.find(x => x.id === tableId);
    if (t && Array.isArray(t.placedOrders)) {
      if (kotItemId) {
        t.placedOrders = t.placedOrders.filter(p => String(p.id) !== String(kotItemId));
      } else if (itemName) {
        const idx = t.placedOrders.findIndex(p => p.name === itemName);
        if (idx !== -1) t.placedOrders.splice(idx, 1);
      }
      t.currentSubtotal = t.placedOrders.reduce((s, it) => s + (it.price * it.qty), 0);
      if (t.placedOrders.length === 0) t.status = 'vacant';
      this.saveLocalTables();
      this.notifyTables();
    }

    // 1. Instant Realtime Broadcast (<25ms)
    this.broadcastRealtime('ITEM_VOIDED', {
      tableId,
      tableName: tableName || (t ? t.name : tableId),
      kotItemId,
      itemName,
      qty: qty || 1,
      reason,
      staffName: cleanStaff,
      authorizedBy: managerPin === '1234' ? 'Manager (PIN: 1234)' : `Admin/Manager (PIN: ${managerPin})`
    });

    if (this.mode === 'supabase_cloud') {
      const client = ONYX_CLOUD_CONFIG.getClient();
      if (client) {
        try {
          if (kotItemId) {
            await client.from('kot_items').update({
              is_void: true,
              void_reason: reason || 'Customer request',
              voided_at: new Date().toISOString()
            }).eq('id', kotItemId);
          } else if (itemName) {
            const { data: openKots } = await client.from('kots')
              .select('id, kot_items(*)')
              .eq('table_id', tableId)
              .not('status', 'in', '("billed","cancelled")');
            if (openKots) {
              for (const k of openKots) {
                const target = (k.kot_items || []).find(ki => ki.name === itemName && !ki.is_void);
                if (target) {
                  await client.from('kot_items').update({
                    is_void: true,
                    void_reason: reason || 'Customer request',
                    voided_at: new Date().toISOString()
                  }).eq('id', target.id);
                  break;
                }
              }
            }
          }

          // Recalculate remaining active items on table in Supabase
          const { data: remainingKots } = await client.from('kots')
            .select('id, status, kot_items(*)')
            .eq('table_id', tableId)
            .not('status', 'in', '("billed","cancelled")');

          let newSubtotal = 0;
          let hasRemainingItems = false;
          if (remainingKots) {
            for (const k of remainingKots) {
              const activeItems = (k.kot_items || []).filter(ki => !ki.is_void);
              if (activeItems.length > 0) {
                hasRemainingItems = true;
                activeItems.forEach(ki => newSubtotal += Number(ki.price || 0) * Number(ki.qty || 1));
              } else {
                await client.from('kots').update({ status: 'cancelled' }).eq('id', k.id);
              }
            }
          }

          await client.from('tables').update({
            status: hasRemainingItems ? 'occupied' : 'vacant',
            current_subtotal: newSubtotal
          }).eq('id', tableId);

          await client.from('void_logs').insert([{
            kot_item_id: kotItemId ? String(kotItemId) : null,
            table_id: tableId || null,
            table_name: tableName || null,
            floor: floor || '1st Floor',
            item_name: itemName || 'Item',
            price: price || 0,
            qty: qty || 1,
            amount: amount,
            reason: reason || 'Customer request',
            staff_name: cleanStaff,
            device_id: cleanDevice,
            authorized_by: managerPin === '1234' ? 'Manager (PIN: 1234)' : `Admin/Manager (PIN: ${managerPin})`
          }]);

          await this.loadSupabaseData();
          return { success: true };
        } catch (e) {
          console.warn('Supabase cloud voidKotItem notice:', e);
        }
      }
    }

    const res = await fetch(`${getApiBase()}/api/kots/item/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        kotItemId, 
        reason, 
        managerPin, 
        itemName, 
        tableId, 
        tableName, 
        floor, 
        price, 
        qty, 
        staffName: cleanStaff, 
        deviceId: cleanDevice 
      })
    });
    const data = await res.json();
    if (data.success) {
      return data;
    }
    throw new Error(data.error || 'Failed to void item');
  },

  async getVoidLogs(limit = 100) {
    if (this.mode === 'supabase_cloud') {
      const client = ONYX_CLOUD_CONFIG.getClient();
      if (client) {
        try {
          const { data, error } = await client.from('void_logs').select('*').order('created_at', { ascending: false }).limit(limit);
          if (!error && Array.isArray(data)) {
            const summary = {
              total_voids: data.length,
              total_amount: data.reduce((s, d) => s + (Number(d.amount) || (Number(d.price) * Number(d.qty)) || 0), 0)
            };
            return { logs: data, summary };
          }
        } catch (e) {
          console.warn('Supabase getVoidLogs failed:', e);
        }
      }
    }

    try {
      const res = await fetch(`${getApiBase()}/api/kots/voids?limit=${limit}`);
      const data = await res.json();
      return data.success ? { logs: data.logs || [], summary: data.summary || { total_voids: 0, total_amount: 0 } } : { logs: [], summary: { total_voids: 0, total_amount: 0 } };
    } catch (e) {
      console.warn('Failed to fetch void logs:', e);
      return { logs: [], summary: { total_voids: 0, total_amount: 0 } };
    }
  },

  // Update Store Settings (White-Label)
  async updateStoreSettings(settings, managerEmail = 'admin@google.in', reason = 'Store profile updated') {
    // 1. Immediately update in-memory and local storage
    this.storeSettings = { ...(this.storeSettings || {}), ...settings };
    try {
      localStorage.setItem('onyx_store_settings', JSON.stringify(this.storeSettings));
    } catch(e) {}
    this.notifyStore();

    // 2. Supabase Cloud Sync Branch
    if (typeof ONYX_CLOUD_CONFIG !== 'undefined' && ONYX_CLOUD_CONFIG.isConfigured()) {
      const client = ONYX_CLOUD_CONFIG.getClient();
      if (client) {
        try {
          for (const [k, v] of Object.entries(settings)) {
            await client.from('store_settings').upsert({ key: k, value: String(v), updated_at: new Date().toISOString() });
          }
          await client.from('bill_edit_logs').insert([{
            id: 'BEDT-STORE-' + Date.now().toString(36),
            bill_id: 'STORE_PROFILE',
            invoice_number: 'STORE_CONFIG',
            manager_email: managerEmail || 'admin@google.in',
            manager_name: 'Manager (Admin)',
            reason: reason || 'Store profile updated',
            previous_data: this.storeSettings || {},
            new_data: settings,
            changes_summary: `Store profile settings updated (${Object.keys(settings).join(', ')})`
          }]);
        } catch (e) {
          console.warn('Supabase store settings update failed:', e);
        }
      }
    }

    // 3. Local SQLite server fallback
    try {
      const res = await fetch(`${getApiBase()}/api/store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, managerEmail, reason })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          this.storeSettings = { ...this.storeSettings, ...data.settings };
          this.notifyStore();
        }
      }
    } catch (e) {
      // Local server offline or Vercel hosting, non-fatal
    }

    return this.storeSettings;
  },

  // Toggle Item In-Stock (86ing)
  async toggleStock(itemId, inStock) {
    // 0. Optimistic instant local update (0ms)
    const item = this.menuItems.find(m => m.id === itemId);
    if (item) item.in_stock = inStock ? 1 : 0;
    this.notifyMenu();

    // 1. Instant Realtime Broadcast (<25ms)
    this.broadcastRealtime('MENU_STOCK_CHANGED', { itemId, inStock: inStock ? 1 : 0 });

    if (this.mode === 'supabase_cloud') {
      const client = ONYX_CLOUD_CONFIG.getClient();
      if (client) {
        try {
          await client.from('menu_items').update({ in_stock: inStock ? 1 : 0 }).eq('id', itemId);
          return { id: itemId, in_stock: inStock ? 1 : 0 };
        } catch (e) {
          console.warn('Supabase toggleStock notice:', e);
        }
      }
    }

    try {
      const res = await fetch(`${getApiBase()}/api/menu/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, inStock })
      });
      const data = await res.json();
      if (data.success && data.item) {
        return data.item;
      }
    } catch (e) {}
    return { id: itemId, in_stock: inStock ? 1 : 0 };
  },

  // Add / Edit Menu Item
  async saveMenuItem(item) {
    // 0. Optimistic instant local update (0ms)
    const normalized = this.normalizeMenuItem(item);
    const idx = this.menuItems.findIndex(m => m.id === normalized.id);
    if (idx !== -1) {
      this.menuItems[idx] = this.normalizeMenuItem({ ...this.menuItems[idx], ...normalized });
    } else {
      this.menuItems.push(normalized);
    }
    this.notifyMenu();

    // 1. Instant Realtime Broadcast (<25ms)
    this.broadcastRealtime('MENU_UPDATED', { item: normalized });

    if (this.mode === 'supabase_cloud') {
      const client = ONYX_CLOUD_CONFIG.getClient();
      if (client) {
        try {
          await client.from('menu_items').upsert(normalized);
          return this.menuItems;
        } catch (e) {
          console.warn('Supabase saveMenuItem notice:', e);
        }
      }
    }

    try {
      const res = await fetch(`${getApiBase()}/api/menu/item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalized)
      });
      const data = await res.json();
      if (data.success) {
        this.menuItems = (data.items || []).map(i => this.normalizeMenuItem(i));
        this.notifyMenu();
        return this.menuItems;
      }
    } catch (e) {}
    return this.menuItems;
  },

  // Add / Edit Table
  async saveTable(table) {
    // 0. Optimistic instant local update (0ms)
    const idx = this.tables.findIndex(t => t.id === table.id);
    if (idx !== -1) {
      this.tables[idx] = { ...this.tables[idx], ...table };
    } else {
      this.tables.push({ ...table, status: table.status || 'vacant', placedOrders: [], currentSubtotal: 0 });
    }
    this.saveLocalTables();
    this.notifyTables();

    // 1. Instant Realtime Broadcast (<25ms)
    this.broadcastRealtime('TABLES_UPDATED', { tables: this.tables });

    if (this.mode === 'supabase_cloud') {
      const client = ONYX_CLOUD_CONFIG.getClient();
      if (client) {
        try {
          await client.from('tables').upsert({
            id: table.id,
            name: table.name,
            floor: table.floor || '1st Floor',
            position: table.position || '',
            landmark: table.landmark || '',
            seats: table.seats || 4,
            sort_order: table.sort_order || 0,
            status: table.status || 'vacant',
            active: 1
          });
          return this.tables;
        } catch (e) {
          console.warn('Supabase saveTable notice:', e);
        }
      }
    }

    try {
      const res = await fetch(`${getApiBase()}/api/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(table)
      });
      const data = await res.json();
      if (data.success) {
        this.tables = data.tables;
        this.notifyTables();
        return data.tables;
      }
    } catch (e) {}
    return this.tables;
  },

  // Delete Table
  async deleteTable(tableId) {
    // 0. Optimistic instant local update (0ms)
    this.tables = this.tables.filter(t => t.id !== tableId);
    this.saveLocalTables();
    this.notifyTables();

    // 1. Instant Realtime Broadcast (<25ms)
    this.broadcastRealtime('TABLES_UPDATED', { tables: this.tables });

    if (this.mode === 'supabase_cloud') {
      const client = ONYX_CLOUD_CONFIG.getClient();
      if (client) {
        try {
          await client.from('tables').update({ active: 0 }).eq('id', tableId);
          return this.tables;
        } catch (e) {
          console.warn('Supabase deleteTable notice:', e);
        }
      }
    }

    try {
      const res = await fetch(`${getApiBase()}/api/tables/${tableId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        this.tables = data.tables;
        this.notifyTables();
        return data.tables;
      }
    } catch (e) {}
    return this.tables;
  },

  // Get Live Sales Analytics & Business Efficiency Report
  buildEmptySalesReport(period = 'daily', startDate = null, endDate = null) {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    let start = startDate;
    let end = endDate || today;
    let periodLabel = `Daily Report (${today})`;

    if (!start) {
      if (period === 'weekly') {
        const d = new Date(now.getTime() - 6 * 86400000);
        start = d.toISOString().slice(0, 10);
        periodLabel = `Weekly Report (Last 7 Days: ${start} to ${end})`;
      } else if (period === 'monthly') {
        const d = new Date(now.getFullYear(), now.getMonth(), 1);
        start = d.toISOString().slice(0, 10);
        periodLabel = `Monthly Report (Current Month: ${start} to ${end})`;
      } else {
        start = today;
        periodLabel = `Daily Report (${today})`;
      }
    }

    return {
      date: today,
      period: period || 'daily',
      periodLabel,
      startDate: start,
      endDate: end,
      activeDays: 1,
      summary: {
        total_bills: 0,
        total_revenue: 0,
        total_subtotal: 0,
        total_cgst: 0,
        total_sgst: 0,
        total_tax: 0,
        total_discounts: 0,
        discount_rate_pct: 0,
        aov: 0,
        revenue_per_day: 0,
        total_round_off: 0
      },
      paymentBreakdown: [],
      payment_modes: {
        cash: { amount: 0, count: 0, pct: 0 },
        upi: { amount: 0, count: 0, pct: 0 },
        card: { amount: 0, count: 0, pct: 0 }
      },
      timeline_trend: [],
      dayparts: {
        lunch: { label: 'Lunch (12 PM - 4 PM)', count: 0, revenue: 0, pct: 0 },
        snacks: { label: 'Evening Snacks (4 PM - 7 PM)', count: 0, revenue: 0, pct: 0 },
        dinner: { label: 'Dinner Peak (7 PM - 11 PM)', count: 0, revenue: 0, pct: 0 },
        late_night: { label: 'Late Night (11 PM - 4 AM)', count: 0, revenue: 0, pct: 0 },
        busiest_hour: 'N/A'
      },
      floor_efficiency: [
        { floor: 'Ground Floor', tables_count: 18, bills_count: 0, revenue: 0, pct: 0, rev_per_table: 0, turn_rate: 0 },
        { floor: '1st Floor', tables_count: 7, bills_count: 0, revenue: 0, pct: 0, rev_per_table: 0, turn_rate: 0 },
        { floor: '2nd Floor', tables_count: 17, bills_count: 0, revenue: 0, pct: 0, rev_per_table: 0, turn_rate: 0 }
      ],
      topItems: [],
      top_items: [],
      category_breakdown: [],
      dietary: { veg: { revenue: 0, pct: 50 }, non_veg: { revenue: 0, pct: 50 } },
      staff_leaderboard: [],
      void_audit: { total_voids: 0, total_amount: 0, loss_pct: 0, staff_involved: 0, recent_voids: [] },
      recentBills: []
    };
  },

  async computeSupabaseSalesReport(client, { period = 'daily', date = null, startDate = null, endDate = null } = {}) {
    const empty = this.buildEmptySalesReport(period, startDate, endDate);
    try {
      const { data: bills, error } = await client
        .from('bills')
        .select('*, bill_items(*)')
        .order('created_at', { ascending: false });

      if (error || !Array.isArray(bills) || bills.length === 0) {
        return empty;
      }

      const filtered = bills.filter(b => {
        if (b.status === 'void' || b.status === 'cancelled') return false;
        const d = (b.created_at || '').slice(0, 10);
        if (empty.startDate && d < empty.startDate) return false;
        if (empty.endDate && d > empty.endDate) return false;
        return true;
      });

      if (filtered.length === 0) return empty;

      let totalRev = 0, totalSub = 0, totalCgst = 0, totalSgst = 0, totalDisc = 0, totalRound = 0;
      const paymentModes = {
        cash: { amount: 0, count: 0, pct: 0 },
        upi: { amount: 0, count: 0, pct: 0 },
        card: { amount: 0, count: 0, pct: 0 }
      };
      const floorCounts = {
        'Ground Floor': { bills: 0, rev: 0 },
        '1st Floor': { bills: 0, rev: 0 },
        '2nd Floor': { bills: 0, rev: 0 }
      };

      filtered.forEach(b => {
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

      const aov = filtered.length > 0 ? Math.round(totalRev / filtered.length) : 0;
      const discRate = totalRev > 0 ? Number(((totalDisc / totalRev) * 100).toFixed(1)) : 0;

      let voidAudit = { total_voids: 0, total_amount: 0, loss_pct: 0, staff_involved: 0, recent_voids: [] };
      try {
        const { data: voids } = await client.from('void_logs').select('*').order('created_at', { ascending: false });
        if (Array.isArray(voids)) {
          const vSum = voids.reduce((acc, v) => acc + Number(v.amount || 0), 0);
          voidAudit = {
            total_voids: voids.length,
            total_amount: vSum,
            loss_pct: totalRev > 0 ? Number(((vSum / totalRev) * 100).toFixed(1)) : 0,
            staff_involved: new Set(voids.map(v => v.staff_name)).size,
            recent_voids: voids.slice(0, 20)
          };
        }
      } catch (e) {}

      return {
        ...empty,
        summary: {
          total_bills: filtered.length,
          total_revenue: totalRev,
          total_subtotal: totalSub,
          total_cgst: totalCgst,
          total_sgst: totalSgst,
          total_tax: totalCgst + totalSgst,
          total_discounts: totalDisc,
          discount_rate_pct: discRate,
          aov,
          revenue_per_day: totalRev,
          total_round_off: totalRound
        },
        payment_modes: paymentModes,
        floor_efficiency: [
          { floor: 'Ground Floor', tables_count: 18, bills_count: floorCounts['Ground Floor'].bills, revenue: floorCounts['Ground Floor'].rev, pct: totalRev > 0 ? Math.round((floorCounts['Ground Floor'].rev / totalRev) * 100) : 0, rev_per_table: Math.round(floorCounts['Ground Floor'].rev / 18), turn_rate: Number((floorCounts['Ground Floor'].bills / 18).toFixed(1)) },
          { floor: '1st Floor', tables_count: 7, bills_count: floorCounts['1st Floor'].bills, revenue: floorCounts['1st Floor'].rev, pct: totalRev > 0 ? Math.round((floorCounts['1st Floor'].rev / totalRev) * 100) : 0, rev_per_table: Math.round(floorCounts['1st Floor'].rev / 7), turn_rate: Number((floorCounts['1st Floor'].bills / 7).toFixed(1)) },
          { floor: '2nd Floor', tables_count: 17, bills_count: floorCounts['2nd Floor'].bills, revenue: floorCounts['2nd Floor'].rev, pct: totalRev > 0 ? Math.round((floorCounts['2nd Floor'].rev / totalRev) * 100) : 0, rev_per_table: Math.round(floorCounts['2nd Floor'].rev / 17), turn_rate: Number((floorCounts['2nd Floor'].bills / 17).toFixed(1)) }
        ],
        void_audit: voidAudit,
        recentBills: filtered.slice(0, 30).map(b => ({
          ...b,
          items: (b.bill_items || []).filter(bi => !bi.is_archived)
        }))
      };
    } catch (e) {
      console.warn('computeSupabaseSalesReport exception:', e);
      return empty;
    }
  },

  async getSalesAnalytics(params = null) {
    const period = (params && typeof params === 'object' && params.period) || (typeof params === 'string' ? 'daily' : 'weekly');
    let startDate = params && typeof params === 'object' ? params.startDate : null;
    let endDate = params && typeof params === 'object' ? params.endDate : null;
    let date = typeof params === 'string' ? params : (params && typeof params === 'object' ? params.date : null);

    if (this.mode === 'supabase_cloud') {
      const client = ONYX_CLOUD_CONFIG.getClient();
      if (client) {
        try {
          const report = await this.computeSupabaseSalesReport(client, { period, date, startDate, endDate });
          if (report) {
            this.recentReport = report;
            return report;
          }
        } catch (e) {
          console.warn('Supabase computeSalesReport error, falling back:', e);
        }
      }
    }

    let url = `${getApiBase()}/api/reports/efficiency`;
    const q = new URLSearchParams();
    if (period) q.set('period', period);
    if (date) q.set('date', date);
    if (startDate) q.set('startDate', startDate);
    if (endDate) q.set('endDate', endDate);
    url += `?${q.toString()}`;

    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.report) {
          this.recentReport = data.report;
          return data.report;
        }
      }
    } catch (e) {
      console.warn('Fallback server sales report error:', e);
    }
    return this.buildEmptySalesReport(period, startDate, endDate);
  },

  // Get Staff List
  async getStaff() {
    const res = await fetch('/api/staff');
    const data = await res.json();
    return data.staff || [];
  },

  // Save Staff User
  async saveStaff(staff) {
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(staff)
    });
    const data = await res.json();
    return data.staff || [];
  },

  // ================= MANAGER SECURITY & PIN API =================
  async getManagerSecurityStatus() {
    try {
      const res = await fetch(`${getApiBase()}/api/manager/security/status`, { cache: 'no-store' });
      const data = await res.json();
      return data;
    } catch (e) {
      console.warn('Fallback getManagerSecurityStatus:', e);
      return { success: true, isPinSet: false, securityQuestion: 'What was the name of your first restaurant?' };
    }
  },

  async setupInitialManagerPin({ newPin, securityQuestion, securityAnswer }) {
    const res = await fetch(`${getApiBase()}/api/manager/security/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPin, securityQuestion, securityAnswer })
    });
    return await res.json();
  },

  async changeManagerPin({ oldPin, newPin, securityQuestion, securityAnswer }) {
    const res = await fetch(`${getApiBase()}/api/manager/security/change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPin, newPin, securityQuestion, securityAnswer })
    });
    return await res.json();
  },

  async verifyForgotPinAnswer(answer) {
    const res = await fetch(`${getApiBase()}/api/manager/security/forgot-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer })
    });
    return await res.json();
  },

  async resetManagerPinWithAnswer({ answer, newPin }) {
    const res = await fetch(`${getApiBase()}/api/manager/security/forgot-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer, newPin })
    });
    return await res.json();
  },

  // ================= 4. SUBSCRIPTIONS & EVENT NOTIFICATIONS =================
  onTablesUpdate(cb) { this.listeners.tables.push(cb); cb(this.tables); },
  onKotsUpdate(cb) { this.listeners.kots.push(cb); cb(this.kots); },
  onMenuUpdate(cb) { this.listeners.menu.push(cb); cb({ categories: this.categories, items: this.menuItems }); },
  onStoreUpdate(cb) { this.listeners.store.push(cb); cb(this.storeSettings); },
  onStatusUpdate(cb) { this.listeners.status.push(cb); this.emitStatus(); },
  onAppUpdate(cb) {
    if (typeof cb === 'function') {
      this.listeners.appUpdate.push(cb);
      this.getAppUpdateInfo().then(u => { if (u) cb(u); }).catch(() => {});
    }
  },

  notifyTables() {
    this.listeners.tables.forEach(cb => { try { cb(this.tables); } catch(e){} });
  },
  notifyKots() {
    this.listeners.kots.forEach(cb => { try { cb(this.kots); } catch(e){} });
  },
  notifyMenu() {
    this.listeners.menu.forEach(cb => { try { cb({ categories: this.categories, items: this.menuItems }); } catch(e){} });
  },
  notifyStore() {
    this.listeners.store.forEach(cb => { try { cb(this.storeSettings); } catch(e){} });
  },
  notifyAppUpdate(update) {
    this.listeners.appUpdate.forEach(cb => { try { cb(update); } catch(e){ console.error('App update listener error:', e); } });
  },
  notifyAll() {
    this.notifyStore();
    this.notifyTables();
    this.notifyMenu();
    this.notifyKots();
    this.emitStatus();
  },

  // Fetch App Update Status (Dual: SQLite Server or Supabase)
  async getAppUpdateInfo() {
    if (this.mode === 'sqlite_server') {
      try {
        const res = await fetch(`${getApiBase()}/api/app/version`, { cache: 'no-store' });
        const data = await res.json();
        if (data.success && data.update) {
          return data.update;
        }
      } catch (e) {
        console.warn('Failed to fetch update info from SQLite server:', e);
      }
    }

    if (this.mode === 'supabase_cloud' || typeof ONYX_CLOUD_CONFIG !== 'undefined') {
      const client = ONYX_CLOUD_CONFIG.getClient();
      if (client) {
        try {
          const { data, error } = await client.from('store_settings').select('*');
          if (!error && Array.isArray(data)) {
            const s = {};
            data.forEach(r => s[r.key] = r.value);
            if (s.app_latest_version) {
              return {
                id: 1,
                current_version: '2.4',
                latest_version: s.app_latest_version || '2.4',
                min_supported_version: s.app_min_supported_version || '2.4',
                force_update: (s.app_force_update === '1' || s.app_force_update === 1 || s.app_force_update === 'true') ? 1 : 0,
                update_title: s.app_update_title || 'Mandatory App Update',
                update_notes: s.app_update_notes || 'Bug fixes and performance enhancements',
                apk_url: s.app_apk_url || '/ONYX_POS.apk',
                apk_size: s.app_apk_size || '0.13 MB',
                released_at: s.app_released_at || new Date().toISOString()
              };
            }
          }
        } catch (e) {}
      }
    }

    return {
      id: 1,
      current_version: '2.4',
      latest_version: '2.4',
      min_supported_version: '2.4',
      force_update: 0,
      update_title: 'ONYX POS Official Release',
      update_notes: 'Commercial restaurant release',
      apk_url: '/ONYX_POS.apk',
      apk_size: '0.13 MB'
    };
  },

  // Manager: Push App Update (Dual: SQLite Server + Supabase Mirror)
  async setAppUpdate(updateData) {
    let result = null;

    if (this.mode === 'sqlite_server') {
      try {
        const res = await fetch(`${getApiBase()}/api/app/version`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });
        const data = await res.json();
        if (data.success) {
          result = data.update;
          this.notifyAppUpdate(result);
        }
      } catch (e) {
        console.warn('Failed to post app update to local server:', e);
      }
    }

    // Mirror to Supabase Cloud store_settings so remote mobile phones get it too!
    if (typeof ONYX_CLOUD_CONFIG !== 'undefined' && ONYX_CLOUD_CONFIG.isConfigured()) {
      const client = ONYX_CLOUD_CONFIG.getClient();
      if (client) {
        try {
          const pairs = [
            { key: 'app_latest_version', value: String(updateData.latestVersion || '2.4') },
            { key: 'app_min_supported_version', value: String(updateData.minSupportedVersion || '2.4') },
            { key: 'app_force_update', value: (updateData.forceUpdate ? '1' : '0') },
            { key: 'app_update_title', value: String(updateData.updateTitle || 'Mandatory App Update') },
            { key: 'app_update_notes', value: String(updateData.updateNotes || '') },
            { key: 'app_apk_url', value: String(updateData.apkUrl || '/ONYX_POS.apk') },
            { key: 'app_apk_size', value: String(updateData.apkSize || '0.13 MB') },
            { key: 'app_released_at', value: new Date().toISOString() }
          ];
          for (const p of pairs) {
            await client.from('store_settings').upsert(p);
          }
        } catch (e) {
          console.warn('Supabase update mirror notice:', e);
        }
      }
    }

    return result || updateData;
  },

  emitStatus() {
    let modeLabel = 'Native SQLite WAL Engine';
    if (this.mode === 'supabase_cloud') {
      modeLabel = '☁️ Supabase Cloud (Live)';
    } else if (this.mode === 'sqlite_server') {
      modeLabel = '💻 Local SQLite Server';
    } else {
      modeLabel = '📱 Local Offline Storage';
    }

    const statusData = {
      mode: this.mode,
      modeLabel,
      latencyMs: this.latencyMs,
      activeTablesCount: this.tables.filter(t => t.status === 'occupied').length,
      activeKotsCount: this.kots.length,
      currentUser: this.currentUser
    };
    this.listeners.status.forEach(cb => { try { cb(statusData); } catch(e){} });
  }
};

// Auto initialize on load
if (typeof window !== 'undefined') {
  window.DB = DB_SERVICE;
  window.DB_SERVICE = DB_SERVICE;
  DB_SERVICE.init();
}
