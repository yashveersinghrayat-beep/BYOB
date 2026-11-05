// ONYX COMMERCIAL RESTAURANT ENGINE - Full-Stack Client DB & Realtime Sync Service
// Seamlessly connects Frontend to Native SQLite Backend via REST API & SSE Realtime Stream

let _ACTIVE_API_BASE = (typeof window !== 'undefined' && (window.location.protocol === 'http:' || window.location.protocol === 'https:'))
  ? ''
  : (typeof localStorage !== 'undefined' && localStorage.getItem('onyx_server_url'))
    ? localStorage.getItem('onyx_server_url')
    : 'http://192.168.1.6:3000';

function getApiBase() {
  if (typeof window !== 'undefined' && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
    return '';
  }
  return _ACTIVE_API_BASE || 'http://192.168.1.6:3000';
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
  
  storeSettings: {},
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
        this.mode = 'sqlite_server';
        await this.loadInitialData();
        this.connectRealtimeSSE();
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
      });
    }

    // 1. Proactively auto-discover local server (Wi-Fi / Localhost / Subnet Auto-Scan)
    const serverFound = await this.autoDiscoverServer();
    if (serverFound) return;

    // 2. Fall back to Supabase 24/7 Cloud (For remote phone connections outside Wi-Fi)
    if (typeof ONYX_CLOUD_CONFIG !== 'undefined' && ONYX_CLOUD_CONFIG.isConfigured()) {
      const cloudSuccess = await this.initSupabaseCloud();
      if (cloudSuccess) {
        this.emitStatus();
        this.replayOfflineQueue();
        return;
      }
    }

    // 3. Fall back to local offline storage (already loaded in 0ms)
    this.emitStatus();
  },

  // Proactive multi-candidate server probing and fast subnet discovery
  async autoDiscoverServer() {
    const candidates = [];
    if (typeof window !== 'undefined' && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
      candidates.push('');
    }
    const savedServer = (typeof localStorage !== 'undefined') ? localStorage.getItem('onyx_server_url') : null;
    if (savedServer && !candidates.includes(savedServer)) candidates.push(savedServer);

    const knownIps = [
      'http://192.168.1.6:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://10.0.2.2:3000',
      'http://192.168.1.36:3000',
      'http://192.168.1.35:3000'
    ];
    for (const ip of knownIps) {
      if (!candidates.includes(ip)) candidates.push(ip);
    }

    let winningCandidate = null;
    try {
      const probePromises = candidates.map(candidate => {
        const pingUrl = candidate ? `${candidate}/api/ping` : '/api/ping';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 650);
        return fetch(pingUrl, { cache: 'no-store', signal: controller.signal })
          .then(r => r.json())
          .then(data => {
            clearTimeout(timeoutId);
            if (data && (data.success || data.ok)) return candidate;
            return null;
          })
          .catch(() => {
            clearTimeout(timeoutId);
            return null;
          });
      });

      const probeResults = await Promise.all(probePromises);
      winningCandidate = probeResults.find(c => c !== null);
    } catch (e) {}

    // Fallback Subnet Scan: If candidates didn't respond, probe 192.168.1.1 to 192.168.1.30
    if (!winningCandidate) {
      try {
        const subnetIps = [];
        for (let i = 1; i <= 30; i++) {
          const ip = `http://192.168.1.${i}:3000`;
          if (!candidates.includes(ip)) subnetIps.push(ip);
        }
        const subnetPromises = subnetIps.map(ip => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 450);
          return fetch(`${ip}/api/ping`, { cache: 'no-store', signal: controller.signal })
            .then(r => r.json())
            .then(d => {
              clearTimeout(timeoutId);
              if (d && (d.success || d.ok)) return ip;
              return null;
            })
            .catch(() => {
              clearTimeout(timeoutId);
              return null;
            });
        });
        const subnetResults = await Promise.all(subnetPromises);
        winningCandidate = subnetResults.find(c => c !== null);
      } catch (e) {}
    }

    if (winningCandidate !== null && winningCandidate !== undefined) {
      this.mode = 'sqlite_server';
      this.setServerUrl(winningCandidate);
      await this.loadInitialData();
      this.connectRealtimeSSE();
      this.emitStatus();
      this.replayOfflineQueue();
      this.mirrorAllTablesToSupabase();
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
      await client.from('bills').upsert([{
        id: bill.id,
        invoice_number: bill.invoice_number,
        table_id: bill.table_id,
        table_name: bill.table_name,
        waiter_name: bill.waiter_name,
        cashier_name: bill.cashier_name,
        customer_name: bill.customer_name,
        customer_phone: bill.customer_phone,
        subtotal: Number(bill.subtotal),
        discount_type: bill.discount_type,
        discount_value: Number(bill.discount_value || 0),
        discount_amount: Number(bill.discount_amount || 0),
        cgst: Number(bill.cgst || 0),
        sgst: Number(bill.sgst || 0),
        service_charge: Number(bill.service_charge || 0),
        round_off: Number(bill.round_off || 0),
        grand_total: Number(bill.grand_total),
        payment_mode: bill.payment_mode,
        split_count: bill.split_count || 1,
        status: 'paid',
        restaurant_name: bill.restaurant_name,
        gstin: bill.gstin,
        fssai: bill.fssai
      }]);

      await client.from('tables').update({
        status: 'vacant',
        current_subtotal: 0
      }).eq('id', bill.table_id);
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
        this.storeSettings = s;
      }

      if (catRes.data && catRes.data.length > 0) this.categories = catRes.data;
      if (itemRes.data && itemRes.data.length > 0) this.menuItems = itemRes.data;
      if (kotRes.data) this.kots = kotRes.data;

      if (tblRes.data && tblRes.data.length > 0) {
        this.tables = tblRes.data.map(t => {
          const tableKots = (kotRes.data || []).filter(k => k.table_id === t.id);
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
          return {
            id: t.id,
            name: t.name,
            position: t.position,
            landmark: t.landmark,
            seats: t.seats,
            sort_order: t.sort_order,
            status: (t.status === 'occupied' || calculatedSubtotal > 0) ? 'occupied' : 'vacant',
            placedOrders,
            currentSubtotal: calculatedSubtotal || parseFloat(t.current_subtotal) || 0
          };
        });
      }

      this.notifyAll();
    } catch (err) {
      console.error('Error loading Supabase data:', err);
    }
  },

  subscribeSupabaseRealtime() {
    const client = ONYX_CLOUD_CONFIG.getClient();
    if (!client) return;

    try {
      if (this.cloudChannel) {
        client.removeChannel(this.cloudChannel);
      }
      this.cloudChannel = client.channel('onyx-pos-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => this.loadSupabaseData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kots' }, () => this.loadSupabaseData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kot_items' }, () => this.loadSupabaseData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, () => this.loadSupabaseData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => this.loadSupabaseData())
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription error:', e);
    }
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
        this.menuItems = menuRes.items;
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
      this.menuItems = MENU_ITEMS;
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
      this.loadInitialData();
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
        if (data.items) this.menuItems = data.items;
        if (data.categories) this.categories = data.categories;
        this.notifyMenu();
      });

      this.sse.addEventListener('BILL_UPDATED', (e) => {
        try {
          this.loadInitialData();
        } catch (err) {}
      });

      this.sse.addEventListener('APP_UPDATE_RELEASED', (e) => {
        try {
          const update = JSON.parse(e.data);
          this.notifyAppUpdate(update);
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

  // ================= 3. CORE BUSINESS OPERATIONS =================

  // Punch KOT
  async punchKOT(tableId, tableName, items, waiterName) {
    // 1. Supabase Cloud Sync Branch
    if (this.mode === 'supabase_cloud') {
      const client = ONYX_CLOUD_CONFIG.getClient();
      if (client) {
        try {
          const kotId = 'KOT-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
          const assignedWaiter = waiterName || this.currentUser.name || 'Floor Staff';

          await client.from('kots').insert([{
            id: kotId,
            table_id: tableId,
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

          // Update table status in Supabase
          let t = this.tables.find(x => x.id === tableId);
          const currentSub = t ? (t.currentSubtotal || 0) : 0;
          const addedTotal = items.reduce((s, it) => s + (it.price * it.qty), 0);
          const newSub = currentSub + addedTotal;

          await client.from('tables').update({
            status: 'occupied',
            current_subtotal: newSub
          }).eq('id', tableId);

          await this.loadSupabaseData();
          return { id: kotId, items };
        } catch (e) {
          console.warn('Supabase cloud punch failed, falling back to local:', e);
        }
      }
    }

    const payload = {
      tableId,
      tableName,
      waiterName: waiterName || this.currentUser.name || 'Floor Staff',
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
      console.warn('Backend punch failed, queuing for offline replay and applying local update:', e);
      this.queueOfflineAction('PUNCH_KOT', payload);
    }

    // Local resilient update
    let t = this.tables.find(x => x.id === tableId);
    if (!t) {
      t = { id: tableId, name: tableName, status: 'occupied', placedOrders: [], currentSubtotal: 0 };
      this.tables.push(t);
    }
    t.status = 'occupied';
    if (!t.placedOrders) t.placedOrders = [];
    items.forEach(it => {
      const existing = t.placedOrders.find(p => p.id === it.id && (p.notes || '') === (it.notes || ''));
      if (existing) {
        existing.qty += it.qty;
      } else {
        t.placedOrders.push({ ...it });
      }
    });
    t.currentSubtotal = t.placedOrders.reduce((s, it) => s + (it.price * it.qty), 0);
    this.saveLocalTables();
    this.notifyTables();
    return { id: 'LOCAL-KOT-' + Date.now(), items };
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
  async settleBill(billData) {
    // 1. Supabase Cloud Sync Branch
    if (this.mode === 'supabase_cloud') {
      const client = ONYX_CLOUD_CONFIG.getClient();
      if (client) {
        try {
          const billId = 'BILL-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
          const invNo = billData.invoiceNumber || ('INV-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Date.now().toString(36).toUpperCase().slice(-4) + Math.floor(100 + Math.random() * 900));
          
          await client.from('bills').insert([{
            id: billId,
            invoice_number: invNo,
            table_id: billData.tableId,
            table_name: billData.tableName,
            waiter_name: billData.waiterName || 'Captain Rahul',
            cashier_name: this.currentUser.name || 'Cashier',
            customer_name: billData.customerName || 'Guest',
            customer_phone: billData.customerPhone || '',
            subtotal: Number(billData.subtotal),
            discount_type: billData.discountType || 'none',
            discount_value: Number(billData.discountValue || 0),
            discount_amount: Number(billData.discountAmount || 0),
            cgst: Number(billData.cgst || 0),
            sgst: Number(billData.sgst || 0),
            service_charge: Number(billData.serviceCharge || 0),
            round_off: Number(billData.roundOff || 0),
            grand_total: Number(billData.grandTotal),
            payment_mode: billData.paymentMode || 'upi',
            split_count: billData.splitCount || 1,
            status: 'paid',
            restaurant_name: billData.restaurantName || (this.storeSettings && this.storeSettings.restaurant_name) || 'BYOB INDIRAPURAM',
            gstin: billData.gstin || (this.storeSettings && this.storeSettings.gstin) || '',
            fssai: billData.fssai || (this.storeSettings && this.storeSettings.fssai) || ''
          }]);

          if (Array.isArray(billData.items) && billData.items.length > 0) {
            const billItems = billData.items.map(it => ({
              bill_id: billId,
              item_id: it.id || it.item_id || 'item',
              name: it.name,
              price: Number(it.price),
              qty: Number(it.qty),
              amount: Number(it.price) * Number(it.qty),
              is_archived: false
            }));
            await client.from('bill_items').insert(billItems);
          }

          // Mark active KOTs as served in Supabase
          await client.from('kots').update({ status: 'served' }).eq('table_id', billData.tableId).neq('status', 'cancelled');

          // Mark table vacant in Supabase
          await client.from('tables').update({
            status: 'vacant',
            current_subtotal: 0
          }).eq('id', billData.tableId);

          await this.loadSupabaseData();
          return { id: billId, invoice_number: invNo, ...billData };
        } catch (e) {
          console.warn('Supabase cloud settle failed, falling back to local:', e);
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
    let t = this.tables.find(x => x.id === billData.tableId);
    if (t) {
      t.status = 'vacant';
      t.placedOrders = [];
      t.currentSubtotal = 0;
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
    if (this.mode === 'supabase_cloud') {
      const client = ONYX_CLOUD_CONFIG.getClient();
      if (client) {
        try {
          const { data: bills, error } = await client
            .from('bills')
            .select('*, bill_items(*)')
            .order('created_at', { ascending: false })
            .limit(limit);
          if (!error && Array.isArray(bills)) {
            bills.forEach(b => {
              b.items = (b.bill_items || []).filter(bi => !bi.is_archived);
            });
            return bills;
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

    if (this.mode === 'supabase_cloud') {
      const client = ONYX_CLOUD_CONFIG.getClient();
      if (client) {
        try {
          await client.from('kot_items').update({
            is_void: true,
            void_reason: reason || 'Customer request',
            voided_at: new Date().toISOString()
          }).eq('id', kotItemId);

          await client.from('void_logs').insert([{
            kot_item_id: kotItemId,
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
          console.warn('Supabase cloud voidKotItem failed, falling back to local server:', e);
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
    // 1. Supabase Cloud Sync Branch
    if (this.mode === 'supabase_cloud') {
      const client = ONYX_CLOUD_CONFIG.getClient();
      if (client) {
        try {
          for (const [k, v] of Object.entries(settings)) {
            await client.from('store_settings').upsert({ key: k, value: String(v) });
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

    const res = await fetch(`${getApiBase()}/api/store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings, managerEmail, reason })
    });
    const data = await res.json();
    if (data.success) {
      this.storeSettings = data.settings;
      this.notifyStore();
      return data.settings;
    }
    throw new Error(data.error || 'Failed to update store settings');
  },

  // Toggle Item In-Stock (86ing)
  async toggleStock(itemId, inStock) {
    const res = await fetch(`${getApiBase()}/api/menu/stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, inStock })
    });
    const data = await res.json();
    if (data.success) {
      const item = this.menuItems.find(m => m.id === itemId);
      if (item) item.in_stock = data.item.in_stock;
      this.notifyMenu();
      return data.item;
    }
    throw new Error(data.error || 'Failed to toggle stock');
  },

  // Add / Edit Menu Item
  async saveMenuItem(item) {
    const res = await fetch(`${getApiBase()}/api/menu/item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    const data = await res.json();
    if (data.success) {
      this.menuItems = data.items;
      this.notifyMenu();
      return data.items;
    }
    throw new Error(data.error || 'Failed to save menu item');
  },

  // Add / Edit Table
  async saveTable(table) {
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
    throw new Error(data.error || 'Failed to save table');
  },

  // Delete Table
  async deleteTable(tableId) {
    const res = await fetch(`${getApiBase()}/api/tables/${tableId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      this.tables = data.tables;
      this.notifyTables();
      return data.tables;
    }
    throw new Error(data.error || 'Failed to delete table');
  },

  // Get Live Sales Analytics & Business Efficiency Report
  async getSalesAnalytics(params = null) {
    let url = `${getApiBase()}/api/reports/sales`;
    if (typeof params === 'string') {
      url += `?date=${encodeURIComponent(params)}`;
    } else if (params && typeof params === 'object') {
      const q = new URLSearchParams();
      if (params.period) q.set('period', params.period);
      if (params.date) q.set('date', params.date);
      if (params.startDate) q.set('startDate', params.startDate);
      if (params.endDate) q.set('endDate', params.endDate);
      url += `?${q.toString()}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    if (data.success) {
      this.recentReport = data.report;
      return data.report;
    }
    throw new Error(data.error || 'Failed to load sales report');
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
  DB_SERVICE.init();
}
