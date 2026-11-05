// BYOB INDIRAPURAM — Menu • Table • Billing Engine
// Client-Ready Architecture with SQLite Persistence & Multi-Device Realtime Sync

const APP = {
  CURRENT_VERSION: "2.4",

  state: {
    currentView: "app", // 'app' (Handheld Waiter) | 'web' (Billing Counter POS)
    appScreen: "tables", // 'tables' (Default: Floor Map) | 'menu' (Order Taking)
    subMode: "speed", // 'speed' (High-speed 1-tap waiter grid) | 'visual' (Photos)
    selectedTableId: "T-01", // Default Table 1
    activeCategory: "top_hits",
    dietFilter: "all", // 'all' | 'veg' | 'nonveg'
    searchQuery: "",
    splitCount: 1, // Default split bill is 1 person (Single Bill)
    activeFloorFilter: "1st Floor", // '1st Floor' (15) | '2nd Floor' (10) | 'Rooftop' (10) | 'all' (35)
    payMode: "upi", // 'upi' | 'card' | 'cash'
    cashTendered: 0,
    activeNoteItemId: null,
    activeVoidItem: null,
    searchDebounceTimer: null,
    discountType: "none", // 'none' | 'percent' | 'flat'
    discountValue: 0,
    isRoundOff: true,
    userRole: localStorage.getItem('onyx_user_role') || 'waiter', // 'waiter' | 'manager'
    userEmail: localStorage.getItem('onyx_user_email') || 'waiter@onyx',
    userName: localStorage.getItem('onyx_user_name') || 'Floor Staff',
    activeEditBill: null,
    editBillItems: [],
    pendingUpdate: null,
    latestUpdateInfo: null,
    isForceUpdateLocked: false,
    mgrReportPeriod: 'weekly',
    mgrReportStartDate: null,
    mgrReportEndDate: null,
    mgrPeriodBills: [],

    // Local Pending Tray (Items selected by waiter in current round before punching)
    localCarts: {
      "T-01": [], "T-02": [], "T-03": [], "T-04": [],
      "T-05": [], "T-06": [], "T-07": [], "T-08": [],
      "T-09": [], "T-10": [], "T-11": [], "T-12": []
    }
  },

  // Helper to load & persist pending draft carts across browser reloads
  loadLocalCarts() {
    try {
      const saved = localStorage.getItem('onyx_pending_carts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          this.state.localCarts = { ...this.state.localCarts, ...parsed };
        }
      }
    } catch (e) {
      console.warn('Failed to load local pending carts:', e);
    }
  },

  saveLocalCarts() {
    try {
      localStorage.setItem('onyx_pending_carts', JSON.stringify(this.state.localCarts));
    } catch (e) {
      console.warn('Failed to save local pending carts:', e);
    }
  },

  getStaffName() {
    return this.state.userName || this.state.currentStaffName || localStorage.getItem('onyx_staff_name') || localStorage.getItem('onyx_user_name') || 'Floor Staff';
  },

  // ================= 0. USER AUTH & ROLE MANAGEMENT =================
  initAuth() {
    if (!this.state.userRole) {
      this.state.userRole = 'waiter';
      this.state.userEmail = 'waiter@onyx';
      this.state.userName = 'Floor Staff';
      localStorage.setItem('onyx_user_role', 'waiter');
      localStorage.setItem('onyx_user_email', 'waiter@onyx');
      localStorage.setItem('onyx_user_name', 'Floor Staff');
    }
    this.renderAuthBadge();
  },

  renderAuthBadge() {
    const container = document.getElementById('header-auth-badge');
    const pastBillsBtn = document.getElementById('btn-past-bills');
    if (pastBillsBtn) {
      if (this.state.userRole === 'manager') {
        pastBillsBtn.classList.remove('hidden');
      } else {
        pastBillsBtn.classList.add('hidden');
      }
    }

    this.updateVoidAuditBadgeCount();

    if (!container) return;

    if (this.state.userRole === 'manager') {
      container.className = "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs shadow";
      container.innerHTML = `
        <span class="text-xs">👑</span>
        <span class="text-[11px] font-bold text-amber-300 hidden sm:inline">Manager</span>
        <span class="text-[9px] font-mono text-neutral-400 hidden md:inline">(${this.state.userEmail || 'Manager'})</span>
        <button onclick="APP.openVoidAuditModal()" title="Anti-Theft Void Audit Log" class="text-[10px] text-red-300 hover:text-white font-bold ml-1 px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 flex items-center gap-1"><span>🚨</span><span>Audit</span></button>
        <button onclick="APP.openStoreSettingsModal()" title="Configure Restaurant Name, GSTIN, Taxes & Footer on Bills" class="text-[10px] text-amber-300 hover:text-white font-bold ml-1 px-2 py-0.5 rounded bg-amber-500/25 border border-amber-500/50 flex items-center gap-1"><span>⚙️</span><span>Profile</span></button>
        <button onclick="APP.openWelcomeAuthModal()" title="Switch User / Logout" class="text-[10px] text-neutral-400 hover:text-white underline ml-1 font-medium">Switch</button>
      `;
    } else if (this.state.userRole === 'waiter') {
      container.className = "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#141824] border border-[#2b3347] text-xs shadow";
      container.innerHTML = `
        <span class="text-xs">👤</span>
        <span class="text-[11px] font-bold text-neutral-300 hidden sm:inline">Waiter</span>
        <button onclick="APP.openWelcomeAuthModal()" title="Login as Manager" class="text-[10px] text-amber-400 hover:text-amber-300 font-bold ml-1">🔐 Manager</button>
      `;
    } else {
      container.className = "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#141824] border border-[#2b3347] text-xs shadow";
      container.innerHTML = `
        <button onclick="APP.openWelcomeAuthModal()" class="text-[11px] text-amber-400 font-bold flex items-center gap-1">
          <span>🔐</span>
          <span>Login</span>
        </button>
      `;
    }
  },

  openWelcomeAuthModal() {
    const modal = document.getElementById('welcome-auth-modal');
    if (modal) modal.classList.remove('hidden');
    const err = document.getElementById('manager-login-error');
    if (err) err.classList.add('hidden');
    const email = document.getElementById('manager-login-email');
    if (email) email.value = '';
    const pass = document.getElementById('manager-login-pass');
    if (pass) pass.value = '';
  },

  closeWelcomeAuthModal() {
    const modal = document.getElementById('welcome-auth-modal');
    if (modal) modal.classList.add('hidden');
  },

  loginAsWaiter() {
    this.state.userRole = 'waiter';
    this.state.userEmail = 'waiter@onyx';
    this.state.userName = 'Floor Staff';
    localStorage.setItem('onyx_user_role', 'waiter');
    localStorage.setItem('onyx_user_email', 'waiter@onyx');
    localStorage.setItem('onyx_user_name', 'Floor Staff');
    this.renderAuthBadge();
    this.closeWelcomeAuthModal();
    this.haptic('success');
    this.showToast('👤 Waiter Mode Active');
  },

  async loginAsManager() {
    const emailInput = document.getElementById('manager-login-email');
    const passInput = document.getElementById('manager-login-pass');
    const errEl = document.getElementById('manager-login-error');
    const email = (emailInput?.value || '').trim();
    const pass = (passInput?.value || '').trim();

    if (!pass) {
      if (errEl) {
        errEl.textContent = 'Please enter manager password';
        errEl.classList.remove('hidden');
      }
      return;
    }

    try {
      const apiBase = (window.DB && typeof window.DB.getApiBase === 'function') ? window.DB.getApiBase() : '';
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });
      const data = await res.json();
      if (data.success) {
        this.state.userRole = 'manager';
        this.state.userEmail = data.email || 'admin@google.in';
        this.state.userName = data.name || 'Owner / Manager';
        localStorage.setItem('onyx_user_role', 'manager');
        localStorage.setItem('onyx_user_email', this.state.userEmail);
        localStorage.setItem('onyx_user_name', this.state.userName);
        this.renderAuthBadge();
        this.closeWelcomeAuthModal();
        this.haptic('success');
        this.showToast(`👑 Manager Access Granted (${this.state.userEmail})`);
        if (window.OnyxTelemetry) window.OnyxTelemetry.log('LOGIN_SUCCESS', 'action', { role: 'manager', email: this.state.userEmail });
        return;
      } else {
        if (window.OnyxTelemetry) window.OnyxTelemetry.log('LOGIN_FAILED', 'action', { email });
        if (errEl) {
          errEl.textContent = data.error || 'Invalid credentials';
          errEl.classList.remove('hidden');
        }
      }
    } catch (e) {
      if (email === 'admin@google.in' && pass === 'Admin@#1234') {
        this.state.userRole = 'manager';
        this.state.userEmail = 'admin@google.in';
        this.state.userName = 'Owner / Manager';
        localStorage.setItem('onyx_user_role', 'manager');
        localStorage.setItem('onyx_user_email', 'admin@google.in');
        localStorage.setItem('onyx_user_name', 'Owner / Manager');
        this.renderAuthBadge();
        this.closeWelcomeAuthModal();
        this.haptic('success');
        this.showToast('👑 Manager Access Granted (admin@google.in)');
        return;
      }
      if (errEl) {
        errEl.textContent = 'Invalid credentials';
        errEl.classList.remove('hidden');
      }
    }
  },

  // Helper to get Table definition
  getTable(tid = null) {
    const targetId = tid || this.state.selectedTableId;
    return RESTAURANT_TABLES.find(t => t.id === targetId) || RESTAURANT_TABLES[0];
  },

  // Helper to get Live Table State (from SQLite backend / DB Service)
  getLiveTable(tid = null) {
    const targetId = tid || this.state.selectedTableId;
    if (window.DB && window.DB.tables && window.DB.tables.length > 0) {
      const found = window.DB.tables.find(t => t.id === targetId);
      if (found) return found;
    }
    const def = (typeof RESTAURANT_TABLES !== 'undefined' ? RESTAURANT_TABLES : []).find(t => t.id === targetId);
    return {
      id: targetId,
      name: def ? def.name : `Table ${parseInt(targetId.replace('T-', ''))}`,
      position: def ? def.position : 'Main Hall',
      floor: def ? def.floor : '1st Floor',
      landmark: def ? def.landmark : '',
      seats: def ? def.seats : 4,
      status: 'vacant',
      currentSubtotal: 0,
      placedOrders: []
    };
  },

  // Helper to get current waiter's pending local round cart for selected table
  getLocalCart(tid = null) {
    const targetId = tid || this.state.selectedTableId;
    if (!this.state.localCarts[targetId]) {
      this.state.localCarts[targetId] = [];
    }
    return this.state.localCarts[targetId];
  },

  // Subtle Haptic Feedback (Phone Vibration on critical touchpoints)
  haptic(pattern = 'light') {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (pattern === 'light') {
          navigator.vibrate(15); // Subtle 15ms pulse on adding item
        } else if (pattern === 'tick') {
          navigator.vibrate(10); // Crisp 10ms tick on qty +/-
        } else if (pattern === 'selection') {
          navigator.vibrate(18); // Crisp 18ms pulse on table selection
        } else if (pattern === 'success') {
          navigator.vibrate([25, 40, 25]); // Distinct double-pulse on punch order or bill settle
        }
      } catch (e) {}
    }
  },

  // ================= PHONE PERMISSIONS, WAKE LOCK, FULLSCREEN & AUDIO SYNTH =================
  wakeLock: null,
  audioCtx: null,
  deferredInstallPrompt: null,

  setupPhoneFeatures() {
    // 1. Keep phone screen awake while on duty (Screen Wake Lock API)
    this.requestWakeLock();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.requestWakeLock();
      }
    });

    // 2. Setup PWA Install Listener
    this.setupPwaInstall();

    // 3. Audio Synth on first touch/click
    const unlockAudio = () => {
      this.initAudio();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });

    // 4. Native Screen Auto-Adjust: On mobile devices, ensure full edge-to-edge layout
    if (window.innerWidth < 1024 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      this.state.currentView = 'app';
      const webBtn = document.getElementById('btn-view-web');
      if (webBtn && window.innerWidth < 640) {
        webBtn.classList.add('hidden');
      }
    }
  },

  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log('💡 Screen WakeLock Active: Display will stay on');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
      }
    } catch (err) {}
  },

  toggleFullscreen() {
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const el = document.documentElement;
        let p = null;
        if (el.requestFullscreen) {
          p = el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          p = el.webkitRequestFullscreen();
        }
        if (p && typeof p.catch === 'function') {
          p.catch(err => console.log('Fullscreen not supported in this view'));
        }
        this.showToast('⛶ Fullscreen POS Kiosk Mode Active');
        this.haptic('selection');
        this.playBeep('add');
        const icon = document.getElementById('fullscreen-icon');
        if (icon) icon.textContent = '✕⛶';
      } else {
        let p = null;
        if (document.exitFullscreen) {
          p = document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          p = document.webkitExitFullscreen();
        }
        if (p && typeof p.catch === 'function') {
          p.catch(err => console.log('Exit fullscreen not supported'));
        }
        const icon = document.getElementById('fullscreen-icon');
        if (icon) icon.textContent = '⛶';
      }
    } catch (e) {
      console.warn('Fullscreen notice:', e);
    }
  },

  setupPwaInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      const installBtn = document.getElementById('btn-install-pwa');
      if (installBtn) installBtn.classList.remove('hidden');
      const welcomeInstallBtn = document.getElementById('welcome-install-pwa-btn');
      if (welcomeInstallBtn) welcomeInstallBtn.classList.remove('hidden');
    });

    window.addEventListener('appinstalled', () => {
      this.deferredInstallPrompt = null;
      const installBtn = document.getElementById('btn-install-pwa');
      if (installBtn) installBtn.classList.add('hidden');
      const welcomeInstallBtn = document.getElementById('welcome-install-pwa-btn');
      if (welcomeInstallBtn) welcomeInstallBtn.classList.add('hidden');
      this.showToast('🎉 ONYX POS App Installed Successfully!');
    });
  },

  async installPwaApp() {
    if (!this.deferredInstallPrompt) {
      this.showToast('ℹ️ To install: Tap browser menu (⋮ or Share) ➔ "Add to Home Screen"');
      return;
    }
    try {
      this.deferredInstallPrompt.prompt();
      const choice = await this.deferredInstallPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        this.showToast('🚀 Installing ONYX POS...');
      }
      this.deferredInstallPrompt = null;
    } catch (e) {
      this.showToast('ℹ️ To install: Tap browser menu (⋮) ➔ "Add to Home Screen"');
    }
  },

  initAudio() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx && !this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
    } catch (e) {}
  },

  playBeep(type = 'add') {
    try {
      if (!this.audioCtx) this.initAudio();
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      const now = this.audioCtx.currentTime;

      if (type === 'add') {
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'punch') {
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.setValueAtTime(987.77, now + 0.09); // B5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'settle') {
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.07); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.14); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.21); // C6
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.start(now);
        osc.stop(now + 0.38);
      } else if (type === 'void') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(330, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      }
    } catch (e) {}
  },

  init() {
    this.loadLocalCarts(); // Restore draft carts on reload (Item 9)
    this.initAuth(); // Initialize User Role / Welcome Gateway
    this.goToTables(false); // Initial launch opens Table View First!
    this.setupHistoryNavigation();
    this.setupDbSubscriptions();
    this.setupAppUpdateListeners();
    this.initSystemHealthMonitor();
    this.setupPhoneFeatures();
    this.renderAll();
    this.updateCartUI();
    this.updateTableHeaderBadges();
  },

  // ================= 1. NATIVE PHONE GESTURE & BROWSER HISTORY NAVIGATION =================
  setupHistoryNavigation() {
    if (typeof history === 'undefined' || typeof window === 'undefined') return;

    // Set initial baseline state so there is always a state in history
    history.replaceState({ screen: 'tables' }, '', '#tables');
    // Push once so the very first back gesture on phone has a history entry to catch!
    history.pushState({ screen: 'tables' }, '', '#tables');

    let lastBackTap = 0;

    window.addEventListener('popstate', (event) => {
      // Force update lock check: if locked, completely trap back navigation
      if (this.state.isForceUpdateLocked) {
        history.pushState({ screen: 'force_update' }, '', '#update');
        return;
      }
      // 1. Check open utility / master modals first
      const phoneModal = document.getElementById('phone-connect-modal');
      if (phoneModal && !phoneModal.classList.contains('hidden')) {
        this.closePhoneConnectModal();
        this.haptic('tick');
        return;
      }
      const authModal = document.getElementById('welcome-auth-modal');
      if (authModal && !authModal.classList.contains('hidden')) {
        this.closeWelcomeAuthModal();
        this.haptic('tick');
        return;
      }
      const editBillModal = document.getElementById('edit-bill-modal');
      if (editBillModal && !editBillModal.classList.contains('hidden')) {
        this.closeEditBillModal();
        this.haptic('tick');
        return;
      }
      const storeModal = document.getElementById('store-settings-modal');
      if (storeModal && !storeModal.classList.contains('hidden')) {
        this.closeStoreSettingsModal();
        this.haptic('tick');
        return;
      }
      const voidModal = document.getElementById('void-item-modal');
      if (voidModal && !voidModal.classList.contains('hidden')) {
        this.closeVoidModal();
        this.haptic('tick');
        return;
      }
      const pastBillsModal = document.getElementById('past-bills-modal');
      if (pastBillsModal && !pastBillsModal.classList.contains('hidden')) {
        this.closePastBillsModal();
        this.haptic('tick');
        return;
      }
      const noteModal = document.getElementById('item-note-modal');
      if (noteModal && !noteModal.classList.contains('hidden')) {
        this.closeItemNoteModal();
        this.haptic('tick');
        return;
      }
      const auditModal = document.getElementById('bill-audit-logs-modal');
      if (auditModal && !auditModal.classList.contains('hidden')) {
        this.closeBillAuditLogsModal();
        this.haptic('tick');
        return;
      }

      const epsonModal = document.getElementById('epson-modal');
      const billingModal = document.getElementById('billing-modal');

      // 2. If Receipt Modal is Open -> Close it (Single step back to Billing)
      if (epsonModal && !epsonModal.classList.contains('hidden')) {
        this.closeEpsonReceiptModal(false);
        this.haptic('tick');
        return;
      }

      // 3. If Billing Modal is Open -> Close it (Single step back to Menu / Orders)
      if (billingModal && !billingModal.classList.contains('hidden')) {
        this.closeBillingPage(false);
        this.haptic('tick');
        return;
      }

      // 4. If on Menu Screen -> Go back to Floor Map
      if (this.state.appScreen === 'menu') {
        this.goToTables(false);
        this.haptic('tick');
        return;
      }

      // 5. If already on Floor Map: Prevent phone swipe from closing the app accidentally!
      if (this.state.appScreen === 'tables') {
        const now = Date.now();
        if (now - lastBackTap < 2000) {
          // Double back within 2 seconds: Allow natural exit
          return;
        }
        lastBackTap = now;
        this.showToast('ℹ️ Press back again to exit POS');
        this.haptic('light');
        // Restore history guard
        history.pushState({ screen: 'tables' }, '', '#tables');
      }
    });

    // Keyboard Shortcuts for Cashier Desk (Escape closes active modal)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const phoneModal = document.getElementById('phone-connect-modal');
        if (phoneModal && !phoneModal.classList.contains('hidden')) { this.closePhoneConnectModal(); return; }
        const authModal = document.getElementById('welcome-auth-modal');
        if (authModal && !authModal.classList.contains('hidden')) { this.closeWelcomeAuthModal(); return; }
        const editBillModal = document.getElementById('edit-bill-modal');
        if (editBillModal && !editBillModal.classList.contains('hidden')) { this.closeEditBillModal(); return; }
        const storeModal = document.getElementById('store-settings-modal');
        if (storeModal && !storeModal.classList.contains('hidden')) { this.closeStoreSettingsModal(); return; }
        const voidModal = document.getElementById('void-item-modal');
        if (voidModal && !voidModal.classList.contains('hidden')) { this.closeVoidModal(); return; }
        const pastBillsModal = document.getElementById('past-bills-modal');
        if (pastBillsModal && !pastBillsModal.classList.contains('hidden')) { this.closePastBillsModal(); return; }
        const noteModal = document.getElementById('item-note-modal');
        if (noteModal && !noteModal.classList.contains('hidden')) { this.closeItemNoteModal(); return; }
        const auditModal = document.getElementById('bill-audit-logs-modal');
        if (auditModal && !auditModal.classList.contains('hidden')) { this.closeBillAuditLogsModal(); return; }
        const epsonModal = document.getElementById('epson-modal');
        if (epsonModal && !epsonModal.classList.contains('hidden')) { this.closeEpsonReceiptModal(false); return; }
        const billingModal = document.getElementById('billing-modal');
        if (billingModal && !billingModal.classList.contains('hidden')) { this.closeBillingPage(false); return; }
      }

      // Keyboard Shortcut Ctrl+P / Cmd+P -> Strict 80mm Thermal Receipt Print
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        const epsonModal = document.getElementById('epson-modal');
        if (epsonModal && !epsonModal.classList.contains('hidden')) {
          this.printThermalReceipt();
        } else {
          this.openEpsonReceiptModal(true);
        }
        return;
      }
    });

    // Native browser print trigger (e.g. Chrome File -> Print) dynamic roll height injection
    window.addEventListener('beforeprint', () => {
      const receiptEl = document.getElementById('epson-print-wrapper');
      const heightMm = Math.max(140, Math.ceil((receiptEl ? (receiptEl.scrollHeight || receiptEl.offsetHeight) : 600) * 0.264583) + 15);
      let dynStyle = document.getElementById('dynamic-epson-page-style');
      if (!dynStyle) {
        dynStyle = document.createElement('style');
        dynStyle.id = 'dynamic-epson-page-style';
        document.head.appendChild(dynStyle);
      }
      dynStyle.textContent = `@page { size: 80mm ${heightMm}mm !important; margin: 0mm !important; } @media print { @page { size: 80mm ${heightMm}mm !important; margin: 0mm !important; } }`;
    });
  },

  // ================= 2. REALTIME DB SYNC SUBSCRIPTIONS =================
  setupDbSubscriptions() {
    if (!window.DB) return;

    // Live Engine Status Updates (Cloud vs Local)
    window.DB.onStatusUpdate((status) => {
      this.updateCloudStatusBadge(status);
    });

    // Live Table State Updates (Across all connected phones/counter)
    window.DB.onTablesUpdate((tables) => {
      this.renderFloorTables();
      this.updateCartUI();
      this.updateTableHeaderBadges();
      this.updateFloorBottomDock();
      this.renderMenuItems();

      // If billing modal is open for current table, refresh its items
      const billingModal = document.getElementById('billing-modal');
      if (billingModal && !billingModal.classList.contains('hidden')) {
        this.refreshBillingModalData();
      }
    });

    // Live Menu Updates
    window.DB.onMenuUpdate((menu) => {
      this.renderCategories();
      this.renderMenuItems();
    });

    // Live OTA App Updates & Force Update Listener
    if (typeof window.DB.onAppUpdate === 'function') {
      window.DB.onAppUpdate((update) => {
        this.handleIncomingAppUpdate(update);
      });
    }
  },

  // ================= 3. TABLE NAVIGATION (FLOOR MAP FIRST) =================
  // Open Floor Map Screen
  goToTables(push = true) {
    this.state.appScreen = "tables";
    const screenTables = document.getElementById('app-screen-tables');
    const screenMenu = document.getElementById('app-screen-menu');

    if (screenTables) screenTables.classList.remove('hidden');
    if (screenMenu) screenMenu.classList.add('hidden');

    if (push && typeof history !== 'undefined') {
      if (window.location.hash !== '#tables') {
        history.pushState({ screen: 'tables' }, '', '#tables');
      }
    }

    this.renderFloorTables();
    this.updateFloorBottomDock();
  },

  // Select Table from Floor Map (Instant Radiant Amber Highlight + Floor Bottom Dock Update)
  selectTable(tableId) {
    this.haptic('selection');
    const isAlreadySelected = this.state.selectedTableId === tableId;
    this.state.selectedTableId = tableId;

    // Instantly re-render floor map so tapped table lights up in radiant yellow
    this.renderFloorTables();
    this.updateTableHeaderBadges();
    this.updateCartUI();
    this.updateFloorBottomDock();

    const table = this.getTable();
    const live = this.getLiveTable();
    const isOccupied = (live.currentSubtotal || 0) > 0 || live.status === 'occupied';

    // If on Mobile Handheld View:
    // If the table was already selected, tapping it again immediately opens the menu!
    if (this.state.currentView === 'app') {
      if (isAlreadySelected && this.state.appScreen === 'tables') {
        this.openMenuForSelectedTable();
        return;
      }
    }

    this.showToast(`Selected ${table.name} (${table.position}) • ${isOccupied ? `🔴 ₹${live.currentSubtotal}` : '🟢 Free'}`);
  },

  // Open Menu for currently selected table
  openMenuForSelectedTable(push = true) {
    this.state.appScreen = "menu";
    const screenTables = document.getElementById('app-screen-tables');
    const screenMenu = document.getElementById('app-screen-menu');

    if (screenTables) screenTables.classList.add('hidden');
    if (screenMenu) screenMenu.classList.remove('hidden');

    if (push && typeof history !== 'undefined') {
      if (window.location.hash !== '#menu') {
        history.pushState({ screen: 'menu', tableId: this.state.selectedTableId }, '', '#menu');
      }
    }

    this.renderCategories();
    this.renderMenuItems();
    this.updateCartUI();
    this.updateTableHeaderBadges();
  },

  // Update Floor Bottom Dock
  updateFloorBottomDock() {
    const table = this.getTable();
    const live = this.getLiveTable();
    const placedOrders = live.placedOrders || [];
    const subtotal = live.currentSubtotal || placedOrders.reduce((s, i) => s + (i.price * i.qty), 0);
    const isOccupied = subtotal > 0 || live.status === 'occupied';

    const dockName = document.getElementById('dock-table-name');
    const dockBadge = document.getElementById('dock-table-badge');
    const dockInfo = document.getElementById('dock-table-info');
    const dockBillBtn = document.getElementById('dock-bill-btn');
    const dockMenuBtn = document.getElementById('dock-menu-btn');
    const dockIcon = document.getElementById('dock-status-icon');
    const summaryBadge = document.getElementById('floor-summary-badge');

    // Update Live Count Summary in Header: e.g. "6 Free • 6 Occupied"
    if (summaryBadge && window.DB && window.DB.tables && window.DB.tables.length > 0) {
      const occCount = window.DB.tables.filter(t => (t.currentSubtotal || 0) > 0 || t.status === 'occupied').length;
      const freeCount = Math.max(0, 12 - occCount);
      summaryBadge.innerHTML = `<span class="text-emerald-400">🟢 ${freeCount} Free</span> • <span class="text-red-400">🔴 ${occCount} Occ</span>`;
    }

    if (dockName) dockName.textContent = table.name;
    if (dockInfo) dockInfo.textContent = `${table.position.split('•')[0].trim()} • 👥 ${table.seats} Seats`;

    if (isOccupied) {
      if (dockBadge) {
        dockBadge.className = "text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white font-mono shadow";
        dockBadge.textContent = `🔴 OCCUPIED • ₹${subtotal}`;
      }
      if (dockIcon) {
        dockIcon.className = "w-7 h-7 rounded-lg bg-red-500/20 border border-red-500 flex items-center justify-center text-xs font-black text-red-400 shadow";
        dockIcon.textContent = "🔴";
      }
      if (dockBillBtn) dockBillBtn.classList.remove('hidden');
      if (dockMenuBtn) dockMenuBtn.innerHTML = `<span>🍽️ Add Items (${table.name}) →</span>`;
    } else {
      if (dockBadge) {
        dockBadge.className = "text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-black shadow";
        dockBadge.textContent = `🟢 FREE / VACANT`;
      }
      if (dockIcon) {
        dockIcon.className = "w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-xs font-black text-emerald-400 shadow";
        dockIcon.textContent = "🟢";
      }
      if (dockBillBtn) dockBillBtn.classList.add('hidden');
      if (dockMenuBtn) dockMenuBtn.innerHTML = `<span>🍽️ Take Order (${table.name}) →</span>`;
    }
  },

  // ================= 3. VIEWPORT SWITCHER (APP vs WEB vs MANAGER) =================
  setView(view) {
    if (view === 'manager') {
      // If not authenticated as admin/manager, prompt for PIN
      if (this.state.userRole !== 'admin' && this.state.userRole !== 'manager') {
        this.closeManagerSidebar();
        document.body.classList.remove('mgr-view-active');
        document.body.classList.remove('mgr-sidebar-open');
        this.openManagerPinGate();
        return;
      }
    } else {
      this.closeManagerSidebar();
      document.body.classList.remove('mgr-view-active');
      document.body.classList.remove('mgr-sidebar-open');
    }

    this.state.currentView = view;
    const btnApp = document.getElementById('btn-view-app');
    const btnWeb = document.getElementById('btn-view-web');
    const btnMgr = document.getElementById('btn-view-manager');
    const containerApp = document.getElementById('view-app-container');
    const containerWeb = document.getElementById('view-web-container');
    const containerMgr = document.getElementById('view-manager-container');
    const hdrBtn = document.getElementById('hdr-sidebar-toggle-btn');
    const hdrSecPill = document.getElementById('hdr-manager-section-pill');

    if (view === 'app') {
      this.closeManagerSidebar();
      document.body.classList.remove('mgr-view-active');
      document.body.classList.remove('mgr-sidebar-open');
      if (containerApp) containerApp.classList.remove('hidden');
      if (containerWeb) containerWeb.classList.add('hidden');
      if (containerMgr) containerMgr.classList.add('hidden');
      if (hdrBtn) { hdrBtn.classList.add('hidden'); hdrBtn.style.display = 'none'; }
      if (hdrSecPill) { hdrSecPill.classList.add('hidden'); hdrSecPill.classList.remove('flex'); hdrSecPill.style.display = 'none'; }
      if (btnApp) btnApp.className = "px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-amber-500 text-black flex items-center gap-1 shadow";
      if (btnWeb) btnWeb.className = "px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white transition-all flex items-center gap-1";
      if (btnMgr) btnMgr.className = "px-3 py-1.5 rounded-lg text-xs font-bold text-amber-400 hover:text-amber-300 hover:bg-[#202738] transition-all flex items-center gap-1";
      if (this.state.appScreen === 'tables') this.goToTables();
    } else if (view === 'web') {
      this.closeManagerSidebar();
      document.body.classList.remove('mgr-view-active');
      document.body.classList.remove('mgr-sidebar-open');
      if (containerApp) containerApp.classList.add('hidden');
      if (containerWeb) containerWeb.classList.remove('hidden');
      if (containerMgr) containerMgr.classList.add('hidden');
      if (hdrBtn) { hdrBtn.classList.add('hidden'); hdrBtn.style.display = 'none'; }
      if (hdrSecPill) { hdrSecPill.classList.add('hidden'); hdrSecPill.classList.remove('flex'); hdrSecPill.style.display = 'none'; }
      if (btnWeb) btnWeb.className = "px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-amber-500 text-black flex items-center gap-1 shadow";
      if (btnApp) btnApp.className = "px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white transition-all flex items-center gap-1";
      if (btnMgr) btnMgr.className = "px-3 py-1.5 rounded-lg text-xs font-bold text-amber-400 hover:text-amber-300 hover:bg-[#202738] transition-all flex items-center gap-1";
    } else if (view === 'manager') {
      document.body.classList.add('mgr-view-active');
      if (containerApp) containerApp.classList.add('hidden');
      if (containerWeb) containerWeb.classList.add('hidden');
      if (containerMgr) containerMgr.classList.remove('hidden');
      if (hdrBtn) { hdrBtn.classList.remove('hidden'); hdrBtn.style.display = 'flex'; }
      if (hdrSecPill) { hdrSecPill.classList.remove('hidden'); hdrSecPill.classList.add('flex'); hdrSecPill.style.display = 'flex'; }
      if (btnMgr) btnMgr.className = "px-3.5 py-1.5 rounded-lg text-xs font-black transition-all bg-gradient-to-r from-amber-500 to-amber-600 text-black flex items-center gap-1 shadow-lg";
      if (btnApp) btnApp.className = "px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white transition-all flex items-center gap-1";
      if (btnWeb) btnWeb.className = "px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white transition-all flex items-center gap-1";
      this.renderManagerDashboard();
    }

    this.renderAll();
    this.updateCartUI();
  },

  setSubMode(mode) {
    this.state.subMode = mode;
    const btnSpeed = document.getElementById('btn-sub-speed');
    const btnVisual = document.getElementById('btn-sub-visual');

    if (mode === 'speed') {
      if (btnSpeed) btnSpeed.className = "px-2.5 py-1 rounded font-bold bg-amber-500 text-black";
      if (btnVisual) btnVisual.className = "px-2.5 py-1 rounded font-semibold text-neutral-400";
    } else {
      if (btnVisual) btnVisual.className = "px-2.5 py-1 rounded font-bold bg-amber-500 text-black";
      if (btnSpeed) btnSpeed.className = "px-2.5 py-1 rounded font-semibold text-neutral-400";
    }
    this.renderMenuItems();
  },

  renderAll() {
    this.renderFloorTables();
    this.renderCategories();
    this.renderQuickBar();
    this.renderMenuItems();
  },

  // ================= 4. FLOOR TABLES RENDERING & 3-FLOOR SWITCHING =================
  setFloorFilter(floor) {
    this.state.activeFloorFilter = floor;

    // Mobile tabs active styling
    const mobTabs = {
      '1st Floor': 'mobile-floor-tab-f1',
      '2nd Floor': 'mobile-floor-tab-f2',
      'Rooftop': 'mobile-floor-tab-rt',
      'all': 'mobile-floor-tab-all'
    };
    Object.entries(mobTabs).forEach(([f, id]) => {
      const el = document.getElementById(id);
      if (el) {
        if (f === floor) {
          el.className = 'mobile-floor-btn active px-3 py-1.5 rounded-xl text-xs font-black transition-all bg-amber-500 text-black shadow flex items-center gap-1 flex-shrink-0';
        } else {
          el.className = 'mobile-floor-btn px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-[#171b26] text-neutral-300 hover:text-white border border-[#2b3347] flex items-center gap-1 flex-shrink-0';
        }
      }
    });

    // Web tabs active styling
    const webTabs = {
      '1st Floor': 'web-floor-tab-f1',
      '2nd Floor': 'web-floor-tab-f2',
      'Rooftop': 'web-floor-tab-rt',
      'all': 'web-floor-tab-all'
    };
    Object.entries(webTabs).forEach(([f, id]) => {
      const el = document.getElementById(id);
      if (el) {
        if (f === floor) {
          el.className = 'web-floor-btn active px-2.5 py-1 rounded-lg text-xs font-black transition-all bg-amber-500 text-black shadow flex items-center gap-1';
        } else {
          el.className = 'web-floor-btn px-2.5 py-1 rounded-lg text-xs font-bold transition-all bg-[#1c2130] text-neutral-300 hover:text-white border border-[#2b3347] flex items-center gap-1';
        }
      }
    });

    this.renderFloorTables();
  },

  renderFloorTables() {
    const mobileGrid = document.getElementById('app-floor-grid');
    const webStrip = document.getElementById('web-tables-strip');

    const currentFloor = this.state.activeFloorFilter || '1st Floor';
    const filteredTables = (currentFloor === 'all') 
      ? RESTAURANT_TABLES 
      : RESTAURANT_TABLES.filter(t => t.floor === currentFloor);

    const summaryBadge = document.getElementById('floor-summary-badge');
    if (summaryBadge) {
      summaryBadge.textContent = currentFloor === 'all' 
        ? '35 Tables (All Floors)' 
        : `${filteredTables.length} Tables (${currentFloor})`;
    }

    // 1. Mobile Floor Grid (Used in app-screen-tables)
    if (mobileGrid) {
      mobileGrid.innerHTML = filteredTables.map(t => {
        const isCurrent = t.id === this.state.selectedTableId;
        const liveTable = this.getLiveTable(t.id);
        const placedOrders = liveTable.placedOrders || [];
        const subtotal = liveTable.currentSubtotal || placedOrders.reduce((s, i) => s + (i.price * i.qty), 0);
        const isOccupied = subtotal > 0 || liveTable.status === 'occupied';
        const cleanPosition = (t.position || 'Hall').split('•')[0].trim();

        const draftItems = this.getLocalCart(t.id);
        const draftCount = draftItems.reduce((s, i) => s + i.qty, 0);

        let cardClass = "";
        let headerBadge = "";
        let middleHtml = "";
        let footerHtml = "";

        if (isOccupied) {
          if (isCurrent) {
            // Selected & Occupied
            cardClass = "table-card-selected-occupied";
            headerBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white shadow ring-2 ring-amber-400">🔴 ₹${subtotal} OCCUPIED</span>`;
          } else if (draftCount > 0) {
            // Unselected & Occupied with Draft Items
            cardClass = "table-card-occupied border-2 border-amber-400";
            headerBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white shadow">🔴 ₹${subtotal}</span><span class="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-400 text-black shadow animate-pulse">DRAFT(${draftCount})</span>`;
          } else {
            // Unselected & Occupied
            cardClass = "table-card-occupied";
            headerBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white shadow">🔴 ₹${subtotal} OCCUPIED</span>`;
          }

          middleHtml = `
            <div class="my-1">
              <div class="text-xl font-black font-mono text-white tracking-tight leading-none">₹${subtotal}</div>
              <div class="text-[10px] font-bold text-red-200 mt-1 truncate">${placedOrders.length} item(s) running</div>
            </div>
          `;

          footerHtml = `
            <div class="flex items-center justify-between text-[10px] pt-1.5 border-t border-red-500/30 text-neutral-300 font-medium w-full">
              <span>👥 ${t.seats} Seats</span>
              <span class="truncate font-bold text-neutral-200">${cleanPosition}</span>
            </div>
          `;
        } else {
          // Free / Vacant Table
          if (isCurrent) {
            // Selected & Free
            cardClass = "table-card-selected-free";
            headerBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-black shadow ring-2 ring-amber-400">🟢 FREE (SELECTED)</span>`;
          } else if (draftCount > 0) {
            // Unselected & Free with Draft Items
            cardClass = "table-card-free border-2 border-amber-400/80";
            headerBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-black shadow animate-pulse">🟡 DRAFT (${draftCount})</span>`;
          } else {
            // Unselected & Free
            cardClass = "table-card-free";
            headerBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-black shadow">🟢 FREE</span>`;
          }

          middleHtml = `
            <div class="my-1">
              <div class="text-base font-extrabold ${draftCount > 0 ? 'text-amber-300' : 'text-emerald-300'} tracking-tight leading-none">${draftCount > 0 ? `${draftCount} Pending` : 'Ready'}</div>
              <div class="text-[10px] font-medium ${draftCount > 0 ? 'text-amber-400' : 'text-emerald-400/90'} mt-1">${draftCount > 0 ? 'Unpunched Round' : 'Tap to select'}</div>
            </div>
          `;

          footerHtml = `
            <div class="flex items-center justify-between text-[10px] pt-1.5 border-t border-emerald-500/30 text-neutral-300 font-medium w-full">
              <span>👥 ${t.seats} Seats</span>
              <span class="truncate font-bold text-neutral-200">${cleanPosition}</span>
            </div>
          `;
        }

        return `
          <button 
            onclick="APP.selectTable('${t.id}')"
            class="floor-table-card ${cardClass} p-3 rounded-2xl text-left transition-all flex flex-col justify-between min-h-[120px] shadow-lg group">
            
            <!-- Top Row: Table Name + Single Clean Badge -->
            <div class="flex items-center justify-between w-full">
              <span class="text-sm font-black text-white group-hover:text-amber-300 transition-colors">${t.name}</span>
              ${headerBadge}
            </div>

            <!-- Middle: Large Rupee Amount or Status -->
            ${middleHtml}

            <!-- Bottom: Capacity & Position -->
            ${footerHtml}
          </button>
        `;
      }).join('');
    }

    // 2. Web POS Top Tables Strip (Clean, Uncrowded & Instant Visual)
    if (webStrip) {
      webStrip.innerHTML = filteredTables.map(t => {
        const isCurrent = t.id === this.state.selectedTableId;
        const liveTable = this.getLiveTable(t.id);
        const subtotal = liveTable.currentSubtotal || (liveTable.placedOrders || []).reduce((s, i) => s + (i.price * i.qty), 0);
        const isOccupied = subtotal > 0 || liveTable.status === 'occupied';
        const draftItems = this.getLocalCart(t.id);
        const draftCount = draftItems.reduce((s, i) => s + i.qty, 0);

        let btnClasses = "";
        let statusBadge = "";

        if (isCurrent) {
          if (isOccupied) {
            btnClasses = "bg-red-600 text-white border-2 border-yellow-300 font-black shadow-[0_0_16px_rgba(239,68,68,0.9)] scale-105 z-10 ring-2 ring-yellow-400";
            statusBadge = `🔴 ₹${subtotal}`;
          } else {
            btnClasses = "bg-emerald-600 text-white border-2 border-yellow-300 font-black shadow-[0_0_16px_rgba(16,185,129,0.9)] scale-105 z-10 ring-2 ring-yellow-400";
            statusBadge = "🟢 Free";
          }
        } else if (isOccupied) {
          btnClasses = "bg-[#450e17] text-white border-2 border-red-500 hover:border-red-400 font-bold shadow-[0_3px_10px_rgba(239,68,68,0.35)]";
          statusBadge = `🔴 ₹${subtotal}`;
        } else {
          btnClasses = draftCount > 0 
            ? "bg-[#251e08] text-amber-200 border-2 border-amber-400 font-bold shadow-[0_3px_10px_rgba(245,158,11,0.3)]"
            : "bg-[#083822] text-emerald-100 border-2 border-emerald-500 hover:border-emerald-400 font-bold shadow-[0_3px_10px_rgba(16,185,129,0.25)]";
          statusBadge = "🟢 Free";
        }

        if (draftCount > 0) {
          statusBadge += ` (+${draftCount})`;
        }

        return `
          <button 
            onclick="APP.selectTable('${t.id}')"
            class="p-2 rounded-xl text-center transition-all ${btnClasses} flex flex-col justify-center items-center">
            <div class="text-xs font-black truncate w-full">${t.name}</div>
            <div class="text-[10px] font-mono font-bold mt-0.5">${statusBadge}</div>
          </button>
        `;
      }).join('');
    }
  },

  // ================= 5. CATEGORIES & MENU =================
  renderCategories() {
    // 1. Mobile Vertical Category Rail
    const appRail = document.getElementById('app-rail');
    if (appRail) {
      appRail.innerHTML = CATEGORIES.map(c => {
        const active = this.state.activeCategory === c.id;
        return `
          <button 
            onclick="APP.setCategory('${c.id}')"
            class="rail-btn ${active ? 'active' : ''}">
            <span class="text-base mb-0.5">${c.icon}</span>
            <span>${c.name}</span>
          </button>
        `;
      }).join('');
    }

    // 2. Web Horizontal Pills
    const webBar = document.getElementById('web-category-bar');
    if (webBar) {
      webBar.innerHTML = CATEGORIES.map(c => {
        const active = this.state.activeCategory === c.id;
        return `
          <button 
            onclick="APP.setCategory('${c.id}')"
            class="whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              active 
                ? 'bg-amber-500 text-black shadow-md' 
                : 'bg-[#181c28] text-neutral-300 hover:text-white border border-[#2b3347]'
            }">
            <span>${c.icon}</span> <span class="ml-1">${c.name}</span>
          </button>
        `;
      }).join('');
    }
  },

  renderQuickBar() {
    const webBar = document.getElementById('web-quick-bar');
    if (!webBar) return;

    webBar.innerHTML = QUICK_BAR.map(item => `
      <button 
        onclick="APP.addItem('${item.id}')"
        class="flex-shrink-0 flex items-center gap-2 bg-[#171a25] border border-[#2b3347] hover:border-amber-500 px-3 py-1.5 rounded-xl transition-all active:scale-95 text-left group">
        <span class="text-xl">${item.icon}</span>
        <div>
          <div class="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">${item.name}</div>
          <div class="text-xs font-bold text-amber-400 font-mono">₹${item.price}</div>
        </div>
        <div class="ml-1 w-5 h-5 rounded-md bg-amber-500/10 group-hover:bg-amber-500 text-amber-400 group-hover:text-black flex items-center justify-center font-bold text-xs">
          +
        </div>
      </button>
    `).join('');
  },

  renderMenuItems() {
    const appContainer = document.getElementById('app-items-container');
    const webContainer = document.getElementById('web-menu-list');
    const currentCart = this.getLocalCart();

    let items = (window.DB && window.DB.menuItems && window.DB.menuItems.length > 0) 
      ? window.DB.menuItems 
      : MENU_ITEMS;

    // Filter Category (Bypassed when searching so all 81 items across all categories are searchable)
    const isSearching = (this.state.searchQuery || '').trim().length > 0;
    if (!isSearching) {
      if (this.state.activeCategory === 'top_hits') {
        items = items.filter(i => TOP_HITS_IDS.includes(i.id) || i.is_top_hit === 1);
      } else if (this.state.activeCategory !== 'all') {
        items = items.filter(i => (i.category === this.state.activeCategory) || (i.category_id === this.state.activeCategory));
      }
    }

    // Filter Diet
    if (this.state.dietFilter === 'veg') {
      items = items.filter(i => i.isVeg || i.is_veg === 1);
    } else if (this.state.dietFilter === 'nonveg') {
      items = items.filter(i => !(i.isVeg || i.is_veg === 1));
    }

    // Smart Acronym, Alias & Fast Substring Search
    if ((this.state.searchQuery || '').trim()) {
      const q = this.state.searchQuery.toLowerCase().trim();
      const aliasMap = {
        'ct': ['chicken tikka', 'tandoori chicken', 'chicken'],
        'pt': ['paneer tikka', 'paneer'],
        'bn': ['butter naan', 'naan'],
        'bc': ['butter chicken', 'chicken'],
        'dm': ['dal makhani', 'dal'],
        'bm': ['butter masala', 'paneer butter'],
        'pz': ['pyaz', 'onion', 'salad'],
        'py': ['pyaz', 'onion', 'salad'],
        'ch': ['chutney', 'chilli', 'crispy corn'],
        'cht': ['chutney'],
        'ic': ['ice', 'ice bucket', 'without ice'],
        'so': ['soda', 'coke', 'thums up', 'mixer'],
        'gl': ['glass', 'glasses'],
        'kp': ['kadhai paneer'],
        'mp': ['matar paneer'],
        'cb': ['chicken biryani'],
        'vb': ['veg biryani'],
        'mb': ['mutton biryani'],
        'tr': ['tandoori roti'],
        'gn': ['garlic naan']
      };

      const matchedAliases = aliasMap[q] || [];

      items = items.filter(i => {
        const name = i.name.toLowerCase();
        if (name.includes(q)) return true;
        const acronym = name.split(/\s+/).map(w => w[0]).join('');
        if (acronym.startsWith(q) || acronym.includes(q)) return true;
        if (matchedAliases.some(al => name.includes(al))) return true;
        return false;
      });

      // Sort exact matches or acronym-starts first
      items.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aAcro = aName.split(/\s+/).map(w => w[0]).join('');
        const bAcro = bName.split(/\s+/).map(w => w[0]).join('');
        const aScore = (aAcro === q ? 3 : (aName.startsWith(q) ? 2 : (aAcro.startsWith(q) ? 1 : 0)));
        const bScore = (bAcro === q ? 3 : (bName.startsWith(q) ? 2 : (bAcro.startsWith(q) ? 1 : 0)));
        return bScore - aScore;
      });
    }

    // --- RENDER FOR MOBILE APP VIEW ---
    if (appContainer) {
      if (items.length === 0) {
        appContainer.innerHTML = `
          <div class="py-12 text-center text-neutral-400">
            <p class="text-xs font-bold text-neutral-300">No items found</p>
            <p class="text-[10px] text-neutral-500 mt-1">Try another keyword or category.</p>
          </div>
        `;
      } else if (this.state.subMode === 'speed') {
        // High-Speed Waiter Tiles (Instant 1-Tap)
        appContainer.innerHTML = items.map(item => {
          const inCart = currentCart.find(c => c.id === item.id);
          const qty = inCart ? inCart.qty : 0;
          const isVeg = item.isVeg || item.is_veg === 1;
          const noteText = (inCart && inCart.notes) ? inCart.notes : '';
          const isBarItem = item.is_bar || item.category === 'mixers' || item.category_id === 'mixers' || item.id.startsWith('m_') || item.id.startsWith('qb_');

          return `
            <div class="speed-tile ${qty > 0 ? 'has-qty' : ''}">
              <div class="flex items-center gap-2.5 flex-1 min-w-0" onclick="APP.addItem('${item.id}')">
                
                <!-- Crisp Food Thumbnail (Recognizable at a glance in small tile) -->
                <div class="w-12 h-12 rounded-xl overflow-hidden bg-neutral-900 border border-[#2b3447] flex-shrink-0 relative shadow-sm cursor-pointer group" onclick="event.stopPropagation(); APP.openPhotoModal('${item.id}')" title="Tap to preview dish">
                  <img src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop';" class="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-200">
                  <span class="${isVeg ? 'badge-veg' : 'badge-nonveg'} absolute top-1 left-1 ring-1 ring-black shadow"></span>
                </div>

                <div class="truncate flex-1 min-w-0">
                  <div class="text-xs font-black text-white truncate leading-tight">${item.name}</div>
                  <div class="text-xs font-bold text-amber-400 font-mono mt-0.5">₹${item.price}</div>
                  ${noteText ? `<div class="text-[10px] text-amber-300 font-semibold truncate flex items-center gap-1 mt-0.5"><span class="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">📝 ${noteText}</span></div>` : ''}

                  <!-- ⚡ Instant 1-Touch Quick Modifiers (No Modal Needed - 0.2s Speed) -->
                  <div class="flex items-center gap-1 mt-1 overflow-x-auto hide-scrollbar">
                    ${isBarItem ? `
                      <button type="button" onclick="event.stopPropagation(); APP.addWithQuickPreference('${item.id}', '🧊 Without Ice')" class="px-1.5 py-0.5 rounded text-[9px] font-bold ${noteText.includes('Without Ice') ? 'bg-cyan-400 text-black font-black' : 'bg-[#181d2a] text-neutral-300 border border-[#2b354b]'} active:scale-95 transition-all">🧊 No Ice</button>
                      <button type="button" onclick="event.stopPropagation(); APP.addWithQuickPreference('${item.id}', '❄️ Super Chilled')" class="px-1.5 py-0.5 rounded text-[9px] font-bold ${noteText.includes('Chilled') ? 'bg-cyan-400 text-black font-black' : 'bg-[#181d2a] text-neutral-300 border border-[#2b354b]'} active:scale-95 transition-all">❄️ Chilled</button>
                    ` : `
                      <button type="button" onclick="event.stopPropagation(); APP.addWithQuickPreference('${item.id}', '🌶️ Spicy')" class="px-1.5 py-0.5 rounded text-[9px] font-bold ${noteText.includes('Spicy') && !noteText.includes('Mild') ? 'bg-amber-400 text-black font-black' : 'bg-[#181d2a] text-neutral-300 border border-[#2b354b]'} active:scale-95 transition-all">🌶️ Spicy</button>
                      <button type="button" onclick="event.stopPropagation(); APP.addWithQuickPreference('${item.id}', '🌱 Mild Spicy')" class="px-1.5 py-0.5 rounded text-[9px] font-bold ${noteText.includes('Mild') ? 'bg-amber-400 text-black font-black' : 'bg-[#181d2a] text-neutral-300 border border-[#2b354b]'} active:scale-95 transition-all">🌱 Mild</button>
                      <button type="button" onclick="event.stopPropagation(); APP.addWithQuickPreference('${item.id}', '🧅 Pyaz Extra')" class="px-1.5 py-0.5 rounded text-[9px] font-bold ${noteText.includes('Pyaz') ? 'bg-amber-400 text-black font-black' : 'bg-[#181d2a] text-neutral-300 border border-[#2b354b]'} active:scale-95 transition-all">🧅 +Pyaz</button>
                      <button type="button" onclick="event.stopPropagation(); APP.addWithQuickPreference('${item.id}', '✨ Extra Crispy')" class="px-1.5 py-0.5 rounded text-[9px] font-bold ${noteText.includes('Crispy') ? 'bg-amber-400 text-black font-black' : 'bg-[#181d2a] text-neutral-300 border border-[#2b354b]'} active:scale-95 transition-all">✨ Crispy</button>
                    `}
                  </div>
                </div>
              </div>

              <!-- Action Controls -->
              <div class="flex items-center gap-1.5 flex-shrink-0">
                ${qty > 0 ? `
                  <button 
                    onclick="APP.openItemNoteModal('${item.id}')" 
                    title="More custom preferences" 
                    class="w-7 h-7 rounded-xl ${noteText ? 'bg-amber-500 text-black font-black ring-2 ring-amber-400/40' : 'bg-[#1a1f2e] text-neutral-400 hover:text-amber-300 border border-[#2f384f]'} flex items-center justify-center text-xs transition-colors">
                    📝
                  </button>
                  <div class="flex items-center bg-[#150f05] border-2 border-amber-400 rounded-xl p-0.5 shadow-md">
                    <button onclick="APP.changeQty('${item.id}', -1)" class="w-6 h-6 rounded-lg bg-[#2b1c08] text-amber-300 hover:bg-amber-500 hover:text-black font-black text-xs flex items-center justify-center transition-colors">-</button>
                    <span class="text-xs font-black text-amber-300 font-mono w-6 text-center">${qty}</span>
                    <button onclick="APP.changeQty('${item.id}', 1)" class="w-6 h-6 rounded-lg bg-amber-400 text-black hover:bg-amber-300 font-black text-xs flex items-center justify-center transition-colors">+</button>
                  </div>
                ` : `
                  <button 
                    onclick="APP.openItemNoteModal('${item.id}')"
                    title="Add with custom preferences"
                    class="w-7 h-7 rounded-xl bg-[#161a25] hover:bg-amber-500/20 text-neutral-400 hover:text-amber-300 border border-[#2b354b] flex items-center justify-center text-xs transition-colors">
                    📝
                  </button>
                  <button 
                    onclick="APP.addItem('${item.id}')"
                    class="h-7 px-3 bg-[#1a1f2e] hover:bg-amber-400 hover:text-black text-amber-300 font-extrabold text-xs rounded-xl border border-amber-400/50 transition-all flex items-center gap-1 active:scale-90 shadow-sm">
                    <span>+ Add</span>
                  </button>
                `}
              </div>
            </div>
          `;
        }).join('');
      } else {
        // Visual Photos Mode
        appContainer.innerHTML = items.map(item => {
          const inCart = currentCart.find(c => c.id === item.id);
          const qty = inCart ? inCart.qty : 0;
          const isVeg = item.isVeg || item.is_veg === 1;
          const noteText = (inCart && inCart.notes) ? inCart.notes : '';
          const isBarItem = item.is_bar || item.category === 'mixers' || item.category_id === 'mixers' || item.id.startsWith('m_') || item.id.startsWith('qb_');

          return `
            <div class="menu-card p-3 flex gap-3 items-center justify-between">
              <div class="flex-1 pr-2">
                <div class="flex items-center gap-1.5 mb-1">
                  <span class="${isVeg ? 'badge-veg' : 'badge-nonveg'}"></span>
                  <h3 class="text-xs font-bold text-white leading-snug">${item.name}</h3>
                </div>
                <div class="text-xs font-bold text-amber-400 font-mono mb-1">₹${item.price}</div>
                <p class="text-[10px] text-neutral-400 line-clamp-2">${item.desc || item.description || ''}</p>
                ${noteText ? `<div class="text-[10px] text-amber-300 font-semibold mt-1"><span class="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">📝 ${noteText}</span></div>` : ''}

                <!-- ⚡ Instant 1-Touch Quick Modifiers -->
                <div class="flex items-center gap-1 mt-1 overflow-x-auto hide-scrollbar">
                  ${isBarItem ? `
                    <button type="button" onclick="event.stopPropagation(); APP.addWithQuickPreference('${item.id}', '🧊 Without Ice')" class="px-1.5 py-0.5 rounded text-[9px] font-bold ${noteText.includes('Without Ice') ? 'bg-cyan-400 text-black font-black' : 'bg-[#181d2a] text-neutral-300 border border-[#2b354b]'} active:scale-95 transition-all">🧊 No Ice</button>
                    <button type="button" onclick="event.stopPropagation(); APP.addWithQuickPreference('${item.id}', '❄️ Super Chilled')" class="px-1.5 py-0.5 rounded text-[9px] font-bold ${noteText.includes('Chilled') ? 'bg-cyan-400 text-black font-black' : 'bg-[#181d2a] text-neutral-300 border border-[#2b354b]'} active:scale-95 transition-all">❄️ Chilled</button>
                  ` : `
                    <button type="button" onclick="event.stopPropagation(); APP.addWithQuickPreference('${item.id}', '🌶️ Spicy')" class="px-1.5 py-0.5 rounded text-[9px] font-bold ${noteText.includes('Spicy') && !noteText.includes('Mild') ? 'bg-amber-400 text-black font-black' : 'bg-[#181d2a] text-neutral-300 border border-[#2b354b]'} active:scale-95 transition-all">🌶️ Spicy</button>
                    <button type="button" onclick="event.stopPropagation(); APP.addWithQuickPreference('${item.id}', '🌱 Mild Spicy')" class="px-1.5 py-0.5 rounded text-[9px] font-bold ${noteText.includes('Mild') ? 'bg-amber-400 text-black font-black' : 'bg-[#181d2a] text-neutral-300 border border-[#2b354b]'} active:scale-95 transition-all">🌱 Mild</button>
                    <button type="button" onclick="event.stopPropagation(); APP.addWithQuickPreference('${item.id}', '🧅 Pyaz Extra')" class="px-1.5 py-0.5 rounded text-[9px] font-bold ${noteText.includes('Pyaz') ? 'bg-amber-400 text-black font-black' : 'bg-[#181d2a] text-neutral-300 border border-[#2b354b]'} active:scale-95 transition-all">🧅 +Pyaz</button>
                  `}
                </div>
              </div>

              <div class="flex flex-col items-center flex-shrink-0 w-20">
                <div class="w-16 h-16 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 mb-1.5 cursor-pointer group relative shadow-md" onclick="APP.openPhotoModal('${item.id}')" title="Tap to preview dish">
                  <img src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop';" class="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-200">
                  <span class="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/60 text-[8px] text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">🔍</span>
                </div>
                ${qty > 0 ? `
                  <div class="w-full flex items-center justify-between bg-neutral-950 border border-amber-500 rounded p-0.5 mb-1">
                    <button onclick="APP.changeQty('${item.id}', -1)" class="w-4 h-4 bg-neutral-800 text-amber-400 font-bold text-[10px]">-</button>
                    <span class="text-[10px] font-bold text-white font-mono">${qty}</span>
                    <button onclick="APP.changeQty('${item.id}', 1)" class="w-4 h-4 bg-amber-500 text-black font-bold text-[10px]">+</button>
                  </div>
                  <button 
                    onclick="APP.openItemNoteModal('${item.id}')"
                    class="w-full py-0.5 rounded text-[9px] font-bold ${noteText ? 'bg-amber-500 text-black font-black' : 'bg-[#1a1f2e] text-neutral-400 border border-[#2f384f]'}">
                    📝 ${noteText ? 'Edit' : 'Note'}
                  </button>
                ` : `
                  <div class="w-full flex items-center gap-1">
                    <button onclick="APP.openItemNoteModal('${item.id}')" title="Add with note" class="w-6 py-1 bg-[#161a25] text-neutral-400 hover:text-amber-300 border border-[#2b354b] text-[10px] font-bold rounded flex items-center justify-center">
                      📝
                    </button>
                    <button onclick="APP.addItem('${item.id}')" class="flex-1 py-1 bg-amber-500/10 hover:bg-amber-500 hover:text-black text-amber-400 border border-amber-500/50 text-[10px] font-extrabold rounded">
                      + ADD
                    </button>
                  </div>
                `}
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // --- RENDER FOR WEB / POS VIEW ---
    if (webContainer) {
      if (items.length === 0) {
        webContainer.innerHTML = `
          <div class="col-span-full py-12 text-center text-neutral-400">
            <p class="text-sm font-semibold text-neutral-300">No items found</p>
          </div>
        `;
      } else {
        webContainer.innerHTML = items.map(item => {
          const inCart = currentCart.find(c => c.id === item.id);
          const qty = inCart ? inCart.qty : 0;
          const isVeg = item.isVeg || item.is_veg === 1;
          const noteText = (inCart && inCart.notes) ? inCart.notes : '';
          const isBarItem = item.is_bar || item.category === 'mixers' || item.category_id === 'mixers' || item.id.startsWith('m_') || item.id.startsWith('qb_');

          return `
            <div class="menu-card p-3.5 flex gap-3 items-center justify-between rounded-2xl transition-all ${
              qty > 0 ? 'border-2 border-amber-400 bg-[#251a09] shadow-[0_0_15px_rgba(245,158,11,0.25)]' : 'border border-[#23293a] bg-[#131620]'
            }">
              <div class="flex-1 pr-2">
                <div class="flex items-center gap-1.5 mb-1">
                  <span class="${isVeg ? 'badge-veg' : 'badge-nonveg'}"></span>
                  <h3 class="text-sm font-bold text-white leading-snug">${item.name}</h3>
                </div>
                <div class="text-sm font-bold text-amber-400 font-mono mb-1">₹${item.price}</div>
                <p class="text-xs text-neutral-400 line-clamp-2">${item.desc || item.description || ''}</p>
                ${noteText ? `<div class="text-xs text-amber-300 font-semibold mt-1 flex items-center gap-1"><span class="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">📝 Note: ${noteText}</span></div>` : ''}

                <!-- ⚡ Instant 1-Touch Quick Modifiers -->
                <div class="flex items-center gap-1.5 mt-2 overflow-x-auto hide-scrollbar">
                  ${isBarItem ? `
                    <button type="button" onclick="event.stopPropagation(); APP.addWithQuickPreference('${item.id}', '🧊 Without Ice')" class="px-2 py-0.5 rounded-lg text-[10px] font-bold ${noteText.includes('Without Ice') ? 'bg-cyan-400 text-black font-black' : 'bg-[#181d2a] text-neutral-300 hover:text-white border border-[#2b354b]'} active:scale-95 transition-all">🧊 No Ice</button>
                    <button type="button" onclick="event.stopPropagation(); APP.addWithQuickPreference('${item.id}', '❄️ Super Chilled')" class="px-2 py-0.5 rounded-lg text-[10px] font-bold ${noteText.includes('Chilled') ? 'bg-cyan-400 text-black font-black' : 'bg-[#181d2a] text-neutral-300 hover:text-white border border-[#2b354b]'} active:scale-95 transition-all">❄️ Chilled</button>
                  ` : `
                    <button type="button" onclick="event.stopPropagation(); APP.addWithQuickPreference('${item.id}', '🌶️ Spicy')" class="px-2 py-0.5 rounded-lg text-[10px] font-bold ${noteText.includes('Spicy') && !noteText.includes('Mild') ? 'bg-amber-400 text-black font-black' : 'bg-[#181d2a] text-neutral-300 hover:text-white border border-[#2b354b]'} active:scale-95 transition-all">🌶️ Spicy</button>
                    <button type="button" onclick="event.stopPropagation(); APP.addWithQuickPreference('${item.id}', '🌱 Mild Spicy')" class="px-2 py-0.5 rounded-lg text-[10px] font-bold ${noteText.includes('Mild') ? 'bg-amber-400 text-black font-black' : 'bg-[#181d2a] text-neutral-300 hover:text-white border border-[#2b354b]'} active:scale-95 transition-all">🌱 Mild</button>
                    <button type="button" onclick="event.stopPropagation(); APP.addWithQuickPreference('${item.id}', '🧅 Pyaz Extra')" class="px-2 py-0.5 rounded-lg text-[10px] font-bold ${noteText.includes('Pyaz') ? 'bg-amber-400 text-black font-black' : 'bg-[#181d2a] text-neutral-300 hover:text-white border border-[#2b354b]'} active:scale-95 transition-all">🧅 +Pyaz</button>
                    <button type="button" onclick="event.stopPropagation(); APP.addWithQuickPreference('${item.id}', '✨ Extra Crispy')" class="px-2 py-0.5 rounded-lg text-[10px] font-bold ${noteText.includes('Crispy') ? 'bg-amber-400 text-black font-black' : 'bg-[#181d2a] text-neutral-300 hover:text-white border border-[#2b354b]'} active:scale-95 transition-all">✨ Crispy</button>
                  `}
                </div>
              </div>

              <div class="flex flex-col items-center flex-shrink-0 w-24">
                <div class="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 mb-2 cursor-pointer group relative shadow-md" onclick="APP.openPhotoModal('${item.id}')" title="Tap to preview dish">
                  <img src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop';" class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-200">
                  <span class="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/75 text-[9px] text-amber-300 font-bold backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">🔍 View</span>
                </div>

                ${qty > 0 ? `
                  <div class="w-full flex items-center justify-between bg-[#150f05] border-2 border-amber-400 rounded-xl p-1 shadow-md mb-1.5">
                    <button onclick="APP.changeQty('${item.id}', -1)" class="w-5 h-5 rounded-lg bg-[#2b1c08] text-amber-300 hover:bg-amber-400 hover:text-black font-black text-xs flex items-center justify-center transition-colors">-</button>
                    <span class="text-xs font-black text-amber-300 font-mono">${qty}</span>
                    <button onclick="APP.changeQty('${item.id}', 1)" class="w-5 h-5 rounded-lg bg-amber-400 text-black hover:bg-amber-300 font-black text-xs flex items-center justify-center transition-colors">+</button>
                  </div>
                  <button 
                    onclick="APP.openItemNoteModal('${item.id}')"
                    class="w-full py-1 rounded-lg text-[10px] font-bold ${noteText ? 'bg-amber-500 text-black' : 'bg-[#1a1f2e] text-neutral-300 hover:text-amber-300 border border-[#2c354a]'}">
                    📝 ${noteText ? 'Edit Note' : 'Add Note'}
                  </button>
                ` : `
                  <div class="w-full flex items-center gap-1">
                    <button 
                      onclick="APP.openItemNoteModal('${item.id}')"
                      title="Add with cooking instructions & preferences"
                      class="w-8 py-1.5 bg-[#181d2a] hover:bg-amber-500/20 text-neutral-300 hover:text-amber-300 border border-[#2c364d] text-xs font-bold rounded-xl flex items-center justify-center transition-colors">
                      📝
                    </button>
                    <button 
                      onclick="APP.addItem('${item.id}')"
                      class="flex-1 py-1.5 bg-[#1e222e] border border-amber-400/60 hover:bg-amber-400 hover:text-black text-amber-300 text-xs uppercase font-extrabold rounded-xl transition-all shadow-sm">
                      + ADD
                    </button>
                  </div>
                `}
              </div>
            </div>
          `;
        }).join('');
      }
    }
  },

  setCategory(catId) {
    this.state.activeCategory = catId;
    this.renderCategories();
    this.renderMenuItems();
  },

  setDietFilter(type) {
    this.state.dietFilter = type;

    // Update Mobile buttons
    const aAll = document.getElementById('app-diet-all');
    const aVeg = document.getElementById('app-diet-veg');
    const aNonVeg = document.getElementById('app-diet-nonveg');
    if (aAll && aVeg && aNonVeg) {
      [aAll, aVeg, aNonVeg].forEach(b => b.className = "px-2 py-1 rounded text-neutral-400");
      if (type === 'all') aAll.className = "px-2 py-1 rounded font-bold bg-neutral-800 text-white";
      if (type === 'veg') aVeg.className = "px-2 py-1 rounded font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40";
      if (type === 'nonveg') aNonVeg.className = "px-2 py-1 rounded font-bold bg-red-950 text-red-300 border border-red-500/40";
    }

    // Update Web buttons
    const wAll = document.getElementById('web-filter-all');
    const wVeg = document.getElementById('web-filter-veg');
    const wNonVeg = document.getElementById('web-filter-nonveg');
    if (wAll && wVeg && wNonVeg) {
      [wAll, wVeg, wNonVeg].forEach(b => b.className = "px-4 py-1.5 rounded-lg text-xs font-semibold text-neutral-400");
      if (type === 'all') wAll.className = "px-4 py-1.5 rounded-lg text-xs font-bold bg-neutral-800 text-white";
      if (type === 'veg') wVeg.className = "px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40";
      if (type === 'nonveg') wNonVeg.className = "px-4 py-1.5 rounded-lg text-xs font-bold bg-red-950 text-red-300 border border-red-500/40";
    }

    this.renderMenuItems();
  },

  handleSearch(text) {
    const clearBtn = document.getElementById('app-clear-search');
    if (clearBtn) {
      if (text.trim().length > 0) {
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
      }
    }
    clearTimeout(this.state.searchDebounceTimer);
    this.state.searchDebounceTimer = setTimeout(() => {
      this.state.searchQuery = text;
      this.renderMenuItems();
    }, 150);
  },

  clearSearch() {
    this.state.searchQuery = "";
    clearTimeout(this.state.searchDebounceTimer);
    const inp1 = document.getElementById('app-search-input');
    const inp2 = document.getElementById('web-search-input');
    if (inp1) inp1.value = "";
    if (inp2) inp2.value = "";
    const clearBtn = document.getElementById('app-clear-search');
    if (clearBtn) clearBtn.classList.add('hidden');
    this.renderMenuItems();
  },

  // Add Item to Current Waiter's Local Round Cart
  addItem(itemId) {
    this.haptic('light');
    this.playBeep('add');
    const allItems = (window.DB && window.DB.menuItems && window.DB.menuItems.length > 0) 
      ? window.DB.menuItems 
      : MENU_ITEMS;
    const item = allItems.find(m => m.id === itemId) || QUICK_BAR.find(q => q.id === itemId);
    if (!item) return;

    const cart = this.getLocalCart();
    const existing = cart.find(c => c.id === itemId);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        id: item.id,
        name: item.name,
        price: item.price,
        qty: 1,
        category: item.category || item.category_id || 'general',
        notes: ''
      });
    }

    this.saveLocalCarts();
    this.renderMenuItems();
    this.updateCartUI();
    this.renderFloorTables();
    this.showToast(`+1 ${item.name} (${this.getTable().name})`);
  },

  changeQty(itemId, delta) {
    this.haptic('tick');
    this.playBeep('add');
    const cart = this.getLocalCart();
    const index = cart.findIndex(c => c.id === itemId);
    if (index > -1) {
      cart[index].qty += delta;
      if (cart[index].qty <= 0) {
        cart.splice(index, 1);
      }
    }
    this.saveLocalCarts();
    this.renderMenuItems();
    this.updateCartUI();
    this.renderFloorTables();
  },

  // ================= 5AA. 1-TAP INLINE QUICK PREFERENCES (NO MODAL NEEDED - 0.2s SPEED) =================
  addWithQuickPreference(itemId, prefTag) {
    this.haptic('light');
    this.playBeep('add');

    const cart = this.getLocalCart();
    let inCart = cart.find(c => c.id === itemId);

    // If item not yet in cart, add with qty 1 and this preference immediately!
    if (!inCart) {
      const allItems = (window.DB && window.DB.menuItems && window.DB.menuItems.length > 0) 
        ? window.DB.menuItems 
        : MENU_ITEMS;
      const item = allItems.find(m => m.id === itemId) || QUICK_BAR.find(q => q.id === itemId);
      if (!item) return;

      inCart = {
        id: item.id,
        name: item.name,
        price: item.price,
        qty: 1,
        category: item.category || item.category_id || 'general',
        notes: prefTag
      };
      cart.push(inCart);
      this.showToast(`⚡ Added ${item.name} (${prefTag})`);
    } else {
      // Item already in cart: toggle or append preference
      let currentNotes = (inCart.notes || '').split(',').map(s => s.trim()).filter(Boolean);

      // Handle spice mutual exclusivity
      const isSpice = prefTag.includes('Spicy') || prefTag.includes('Mild') || prefTag.includes('Non-Spicy');
      if (isSpice) {
        const cleanTag = prefTag.replace(/^[^\w\s]+/, '').trim().toLowerCase();
        const hadThisSpice = currentNotes.some(n => n.toLowerCase().includes(cleanTag));
        // Remove any existing spice
        currentNotes = currentNotes.filter(n => !n.includes('Spicy') && !n.includes('Mild') && !n.includes('Non-Spicy'));
        if (!hadThisSpice) {
          currentNotes.unshift(prefTag);
        }
      } else {
        // Other tags: toggle on/off
        const cleanTag = prefTag.replace(/^[^\w\s]+/, '').trim().toLowerCase();
        const existingIdx = currentNotes.findIndex(n => n.toLowerCase().includes(cleanTag));
        if (existingIdx >= 0) {
          currentNotes.splice(existingIdx, 1);
        } else {
          currentNotes.push(prefTag);
        }
      }

      inCart.notes = currentNotes.join(', ');
      this.showToast(`📝 ${inCart.name}: ${inCart.notes || 'Normal'}`);
    }

    this.saveLocalCarts();
    this.renderMenuItems();
    this.updateCartUI();
  },

  // ================= 5AB. 1-TAP ROUND EXTRAS & INSTRUCTIONS (PYAZ, CHUTNEY, NIMBU, ETC.) =================
  addQuickRoundExtra(name, price = 0) {
    this.haptic('medium');
    this.playBeep('add');
    const cart = this.getLocalCart();
    
    // Check if this extra is already in tray
    const existing = cart.find(c => c.name === name);
    if (existing) {
      existing.qty += 1;
      this.showToast(`➕ ${name} (x${existing.qty})`);
    } else {
      cart.push({
        id: 'extra_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1000),
        name: name,
        price: price,
        qty: 1,
        category: 'sides',
        is_bar: name.includes('Ice') || name.includes('Glasses') ? 1 : 0,
        notes: '⚡ Quick Table Extra'
      });
      this.showToast(`⚡ Added to round: ${name}`);
    }

    this.saveLocalCarts();
    this.updateCartUI();
    this.renderMenuItems();
  },

  // ================= 5B. KITCHEN COOKING NOTES & FOOD PREFERENCES =================
  openItemNoteModal(itemId) {
    this.state.activeNoteItemId = itemId;
    this.state.selectedPreferences = [];

    const allItems = (window.DB && window.DB.menuItems && window.DB.menuItems.length > 0) 
      ? window.DB.menuItems 
      : MENU_ITEMS;
    const item = allItems.find(m => m.id === itemId) || QUICK_BAR.find(q => q.id === itemId);
    const cart = this.getLocalCart();
    const inCart = cart.find(c => c.id === itemId);

    const titleEl = document.getElementById('note-modal-item-name');
    const inputEl = document.getElementById('item-note-custom-input');
    const modal = document.getElementById('item-note-modal');

    if (titleEl) {
      titleEl.textContent = item ? `${item.name} (₹${item.price})` : 'Food Preferences';
    }

    // Collect all valid tags from chip buttons
    const chipButtons = document.querySelectorAll('.pref-chip');
    const knownTags = Array.from(chipButtons).map(b => b.dataset.prefTag).filter(Boolean);

    let existingNotes = (inCart && inCart.notes) ? inCart.notes : '';
    let customRemnant = [];

    if (existingNotes) {
      const parts = existingNotes.split(',').map(s => s.trim()).filter(Boolean);
      parts.forEach(part => {
        const matched = knownTags.find(kt => kt.toLowerCase() === part.toLowerCase() || kt.includes(part) || part.includes(kt.replace(/^[^\w\s]+/, '').trim()));
        if (matched && !this.state.selectedPreferences.includes(matched)) {
          this.state.selectedPreferences.push(matched);
        } else {
          customRemnant.push(part);
        }
      });
    }

    if (inputEl) {
      inputEl.value = customRemnant.join(', ');
    }

    this.syncPreferenceChipsUI(false);
    if (modal) modal.classList.remove('hidden');
    this.haptic('tick');
  },

  closeItemNoteModal() {
    const modal = document.getElementById('item-note-modal');
    if (modal) modal.classList.add('hidden');
    this.state.activeNoteItemId = null;
    this.state.selectedPreferences = [];
  },

  togglePreferenceChip(tag, category) {
    if (!this.state.selectedPreferences) this.state.selectedPreferences = [];

    const idx = this.state.selectedPreferences.indexOf(tag);
    if (idx >= 0) {
      // Deselect chip
      this.state.selectedPreferences.splice(idx, 1);
    } else {
      // Select chip with mutual exclusion rules
      if (category === 'spice') {
        const spiceTags = ['🌶️ Spicy', '🌱 Mild Spicy', '🔥 Extra Spicy', '🚫 Non-Spicy'];
        this.state.selectedPreferences = this.state.selectedPreferences.filter(t => !spiceTags.includes(t));
      } else if (category === 'ice') {
        const iceTags = ['🧊 Without Ice', '🪣 Ice Bucket Alag'];
        this.state.selectedPreferences = this.state.selectedPreferences.filter(t => !iceTags.includes(t));
      }
      this.state.selectedPreferences.push(tag);
    }

    this.haptic('tick');
    this.syncPreferenceChipsUI(false);
  },

  applyQuickCombo(comboArray) {
    if (!this.state.selectedPreferences) this.state.selectedPreferences = [];
    if (!Array.isArray(comboArray)) return;

    comboArray.forEach(tag => {
      if (tag.includes('Spicy') || tag.includes('Non-Spicy')) {
        const spiceTags = ['🌶️ Spicy', '🌱 Mild Spicy', '🔥 Extra Spicy', '🚫 Non-Spicy'];
        this.state.selectedPreferences = this.state.selectedPreferences.filter(t => !spiceTags.includes(t));
      }
      if (!this.state.selectedPreferences.includes(tag)) {
        this.state.selectedPreferences.push(tag);
      }
    });

    this.haptic('tick');
    this.syncPreferenceChipsUI(false);
  },

  onCustomNoteInput() {
    this.syncPreferenceChipsUI(false);
  },

  syncPreferenceChipsUI(updateInput = false) {
    const selected = this.state.selectedPreferences || [];
    const chipButtons = document.querySelectorAll('.pref-chip');
    
    chipButtons.forEach(btn => {
      const tag = btn.dataset.prefTag;
      if (selected.includes(tag)) {
        btn.className = "pref-chip px-2.5 py-1 rounded-xl bg-amber-400 text-black border border-amber-300 ring-2 ring-amber-400/40 font-black text-[11px] flex items-center gap-1 shadow-md scale-[1.02] transition-all";
      } else {
        btn.className = "pref-chip px-2.5 py-1 rounded-xl bg-[#161a25] text-neutral-200 text-[11px] font-medium border border-[#2b354b] hover:border-amber-400/50 flex items-center gap-1 transition-all active:scale-95";
      }
    });

    const inputEl = document.getElementById('item-note-custom-input');
    const customText = inputEl ? inputEl.value.trim() : '';

    const allParts = [...selected];
    if (customText) allParts.push(customText);

    const countEl = document.getElementById('note-modal-items-count');
    if (countEl) countEl.textContent = `${allParts.length} tag${allParts.length === 1 ? '' : 's'}`;

    const previewEl = document.getElementById('note-modal-preview-text');
    if (previewEl) {
      if (allParts.length === 0) {
        previewEl.textContent = "Normal Preparation (No special instructions)";
        previewEl.className = "text-xs font-medium text-neutral-400 min-h-[1.2rem]";
      } else {
        previewEl.textContent = allParts.join(', ');
        previewEl.className = "text-xs font-black text-amber-300 break-words leading-relaxed min-h-[1.2rem]";
      }
    }
  },

  // Legacy fallback for backward compatibility
  applyQuickTag(tag) {
    this.togglePreferenceChip(tag);
  },

  saveItemNote() {
    const itemId = this.state.activeNoteItemId;
    if (!itemId) {
      this.closeItemNoteModal();
      return;
    }

    const selected = this.state.selectedPreferences || [];
    const inputEl = document.getElementById('item-note-custom-input');
    const customText = inputEl ? inputEl.value.trim() : '';

    const allParts = [...selected];
    if (customText) allParts.push(customText);
    const noteText = allParts.join(', ');

    const cart = this.getLocalCart();
    let inCart = cart.find(c => c.id === itemId);

    if (!inCart && noteText) {
      // If item was not yet in cart, add it with qty 1 and note
      const allItems = (window.DB && window.DB.menuItems && window.DB.menuItems.length > 0) 
        ? window.DB.menuItems 
        : MENU_ITEMS;
      const item = allItems.find(m => m.id === itemId) || QUICK_BAR.find(q => q.id === itemId);
      if (item) {
        inCart = {
          id: item.id,
          name: item.name,
          price: item.price,
          qty: 1,
          category: item.category || item.category_id || 'general',
          notes: noteText
        };
        cart.push(inCart);
      }
    } else if (inCart) {
      inCart.notes = noteText;
    }

    this.closeItemNoteModal();
    this.saveLocalCarts();
    this.renderMenuItems();
    this.updateCartUI();
    this.haptic('success');
    this.showToast(noteText ? `📝 Preferences saved: "${noteText}"` : 'Note removed');
  },

  clearItemNote() {
    const itemId = this.state.activeNoteItemId;
    if (itemId) {
      const cart = this.getLocalCart();
      const inCart = cart.find(c => c.id === itemId);
      if (inCart) {
        inCart.notes = '';
      }
    }
    this.state.selectedPreferences = [];
    const inputEl = document.getElementById('item-note-custom-input');
    if (inputEl) inputEl.value = '';
    this.syncPreferenceChipsUI();
    this.closeItemNoteModal();
    this.saveLocalCarts();
    this.renderMenuItems();
    this.updateCartUI();
    this.showToast('Preferences cleared');
  },

  toggleTrayDrawer() {
    const drawer = document.getElementById('app-tray-drawer');
    const icon = document.getElementById('app-tray-toggle-icon');
    if (!drawer) return;

    const isHidden = drawer.classList.contains('hidden');
    if (isHidden) {
      drawer.classList.remove('hidden');
      if (icon) icon.textContent = '▼ Close';
      this.haptic('tick');
    } else {
      drawer.classList.add('hidden');
      if (icon) icon.textContent = '▲ Review';
    }
  },

  // ================= 5C. DISH PHOTO ZOOM & HIGH-RES PREVIEW MODAL =================
  openPhotoModal(itemId) {
    const allItems = (window.DB && window.DB.menuItems && window.DB.menuItems.length > 0) 
      ? window.DB.menuItems 
      : MENU_ITEMS;
    const item = allItems.find(m => m.id === itemId) || QUICK_BAR.find(q => q.id === itemId);
    if (!item) return;

    const modal = document.getElementById('dish-photo-modal');
    const img = document.getElementById('dish-modal-img');
    const title = document.getElementById('dish-modal-title');
    const price = document.getElementById('dish-modal-price');
    const desc = document.getElementById('dish-modal-desc');
    const diet = document.getElementById('dish-modal-diet');
    const addBtn = document.getElementById('dish-modal-add-btn');

    if (img) {
      img.src = item.image;
      img.onerror = () => { img.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop'; };
    }
    if (title) title.textContent = item.name;
    if (price) price.textContent = `₹${item.price}`;
    if (desc) desc.textContent = item.desc || item.description || 'Specialty chef preparation with authentic restaurant ingredients.';
    if (diet) {
      const isVeg = item.isVeg || item.is_veg === 1;
      diet.className = isVeg ? 'badge-veg absolute bottom-3 left-3 shadow ring-2 ring-black' : 'badge-nonveg absolute bottom-3 left-3 shadow ring-2 ring-black';
    }
    if (addBtn) {
      addBtn.onclick = () => {
        this.addItem(item.id);
        this.closePhotoModal();
      };
    }
    const noteBtn = document.getElementById('dish-modal-note-btn');
    if (noteBtn) {
      noteBtn.onclick = () => {
        this.closePhotoModal();
        this.openItemNoteModal(item.id);
      };
    }
    if (modal) modal.classList.remove('hidden');
  },

  closePhotoModal() {
    const modal = document.getElementById('dish-photo-modal');
    if (modal) modal.classList.add('hidden');
  },

  updateCartUI() {
    const cart = this.getLocalCart();
    const liveTable = this.getLiveTable();
    const placedOrders = liveTable.placedOrders || [];

    const count = cart.reduce((s, i) => s + i.qty, 0);
    const roundTotal = cart.reduce((s, i) => s + (i.price * i.qty), 0);
    const { grandTotal } = this.calculateTotalBill();

    // 1. Mobile Handheld Glanceable Bottom Bar (Inline Preview - Zero Click)
    const inlineItems = document.getElementById('app-tray-inline-items');
    const roundTotalEl = document.getElementById('app-tray-round-total');
    const fireBtn = document.getElementById('app-btn-fire');

    if (inlineItems && roundTotalEl && fireBtn) {
      if (count > 0) {
        const summary = cart.map(c => `${c.name.split(' ')[0]} x${c.qty}${c.notes ? ' (📝)' : ''}`).join(', ');
        inlineItems.textContent = summary;
        roundTotalEl.textContent = `₹${roundTotal}`;
        fireBtn.disabled = false;
        fireBtn.textContent = `🔥 Punch Order (₹${roundTotal})`;
      } else {
        inlineItems.textContent = "Round tray empty";
        roundTotalEl.textContent = `₹0`;
        fireBtn.disabled = true;
        fireBtn.textContent = `🔥 Punch Order`;
      }
    }

    // 1B. Mobile Handheld Expandable Round Tray Drawer
    const trayDrawerItems = document.getElementById('app-tray-drawer-items');
    if (trayDrawerItems) {
      if (cart.length === 0) {
        trayDrawerItems.innerHTML = `<div class="py-2.5 text-center text-neutral-500 text-[11px] font-medium">Round tray is empty. Tap '+ Add' on any dish to take order.</div>`;
      } else {
        trayDrawerItems.innerHTML = cart.map(c => `
          <div class="flex items-center justify-between p-2 rounded-xl bg-[#0b0e15] border border-[#232b3d]">
            <div class="flex-1 min-w-0 pr-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-white truncate">${c.name}</span>
                <span class="text-xs font-mono font-bold text-amber-400">₹${c.price * c.qty}</span>
              </div>
              ${c.notes ? `<div class="text-[10px] text-amber-300 font-semibold truncate flex items-center gap-1 mt-0.5"><span class="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">📝 ${c.notes}</span></div>` : ''}
              
              <!-- ⚡ Instant 1-Touch Modifiers in Tray -->
              <div class="flex items-center gap-1 mt-1 overflow-x-auto hide-scrollbar">
                <button type="button" onclick="APP.addWithQuickPreference('${c.id}', '🌶️ Spicy')" class="px-1.5 py-0.5 rounded text-[9px] font-bold ${c.notes?.includes('Spicy') && !c.notes?.includes('Mild') ? 'bg-amber-400 text-black font-black' : 'bg-[#181d2a] text-neutral-300 border border-[#2b354b]'} active:scale-95 transition-all">🌶️</button>
                <button type="button" onclick="APP.addWithQuickPreference('${c.id}', '🌱 Mild Spicy')" class="px-1.5 py-0.5 rounded text-[9px] font-bold ${c.notes?.includes('Mild') ? 'bg-amber-400 text-black font-black' : 'bg-[#181d2a] text-neutral-300 border border-[#2b354b]'} active:scale-95 transition-all">🌱</button>
                <button type="button" onclick="APP.addWithQuickPreference('${c.id}', '🧅 Pyaz Extra')" class="px-1.5 py-0.5 rounded text-[9px] font-bold ${c.notes?.includes('Pyaz') ? 'bg-amber-400 text-black font-black' : 'bg-[#181d2a] text-neutral-300 border border-[#2b354b]'} active:scale-95 transition-all">🧅</button>
                <button type="button" onclick="APP.addWithQuickPreference('${c.id}', '🥣 Chutney Extra')" class="px-1.5 py-0.5 rounded text-[9px] font-bold ${c.notes?.includes('Chutney') ? 'bg-amber-400 text-black font-black' : 'bg-[#181d2a] text-neutral-300 border border-[#2b354b]'} active:scale-95 transition-all">🥣</button>
                <button type="button" onclick="APP.addWithQuickPreference('${c.id}', '✨ Extra Crispy')" class="px-1.5 py-0.5 rounded text-[9px] font-bold ${c.notes?.includes('Crispy') ? 'bg-amber-400 text-black font-black' : 'bg-[#181d2a] text-neutral-300 border border-[#2b354b]'} active:scale-95 transition-all">✨</button>
              </div>
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <button onclick="APP.openItemNoteModal('${c.id}')" title="Custom preference note" class="px-2 py-1 rounded-lg text-[10px] font-bold ${c.notes ? 'bg-amber-500 text-black font-black' : 'bg-[#181d2a] text-neutral-300 border border-[#2a3449]'}">
                📝
              </button>
              <div class="flex items-center bg-[#150f05] border border-amber-400 rounded-lg p-0.5">
                <button onclick="APP.changeQty('${c.id}', -1)" class="w-5 h-5 rounded bg-[#2b1c08] text-amber-300 font-bold text-[10px] flex items-center justify-center">-</button>
                <span class="text-[10px] font-bold text-amber-300 font-mono w-5 text-center">${c.qty}</span>
                <button onclick="APP.changeQty('${c.id}', 1)" class="w-5 h-5 rounded bg-amber-400 text-black font-bold text-[10px] flex items-center justify-center">+</button>
              </div>
            </div>
          </div>
        `).join('');
      }
    }

    // 2. Mobile Header Tab Amount
    const appTabAmount = document.getElementById('app-header-tab-amount');
    if (appTabAmount) appTabAmount.textContent = `₹${grandTotal}`;

    // 3. Web POS Sidebar Updates
    const posPendingCount = document.getElementById('pos-pending-count');
    const posTrayList = document.getElementById('pos-tray-items');
    const posFireBtn = document.getElementById('pos-fire-btn');
    const posPlacedList = document.getElementById('pos-placed-items');
    const posStatusPill = document.getElementById('pos-table-status-pill');

    if (posStatusPill) {
      if (liveTable.status === 'occupied' || placedOrders.length > 0) {
        posStatusPill.className = "text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30";
        posStatusPill.textContent = "Occupied";
      } else {
        posStatusPill.className = "text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
        posStatusPill.textContent = "Free";
      }
    }

    if (posPendingCount) posPendingCount.textContent = `${count} items (₹${roundTotal})`;

    if (posTrayList) {
      if (cart.length === 0) {
        posTrayList.innerHTML = `<div class="text-xs text-neutral-500 py-1.5">Round empty. Tap '+ Add' to take order.</div>`;
        if (posFireBtn) posFireBtn.disabled = true;
      } else {
        posTrayList.innerHTML = cart.map(i => `
          <div class="py-1.5 border-b border-[#23293a]">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-white truncate max-w-[150px]">${i.name}</span>
              <div class="flex items-center gap-1.5">
                <button onclick="APP.openItemNoteModal('${i.id}')" title="Cooking note" class="px-1.5 py-0.5 rounded text-[10px] ${i.notes ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50' : 'text-neutral-500 hover:text-neutral-300'}">
                  📝
                </button>
                <span class="text-amber-400 font-mono">x${i.qty}</span>
                <span class="font-mono font-bold text-white">₹${i.price * i.qty}</span>
              </div>
            </div>
            ${i.notes ? `<div class="text-[10px] text-amber-300/90 pl-1 pt-0.5 flex items-center gap-1 font-medium"><span>↳</span> <span>${i.notes}</span></div>` : ''}
          </div>
        `).join('');
        if (posFireBtn) posFireBtn.disabled = false;
      }
    }

    if (posPlacedList) {
      if (placedOrders.length === 0) {
        posPlacedList.innerHTML = `<div class="text-xs text-neutral-500 py-1.5">No orders punched on this table yet.</div>`;
      } else {
        posPlacedList.innerHTML = placedOrders.map(i => `
          <div class="py-1.5 border-b border-[#23293a] text-xs">
            <div class="flex items-center justify-between">
              <span class="text-neutral-300 truncate max-w-[140px]">${i.name} <span class="text-amber-400 font-mono">x${i.qty}</span></span>
              <div class="flex items-center gap-1.5">
                <span class="font-mono font-bold text-white">₹${i.price * i.qty}</span>
                <button 
                  onclick="APP.openVoidModal('${i.id}', '${i.name.replace(/'/g, "\\'")}', '${i.kot_id || ''}', '${this.state.selectedTableId}', ${i.price}, ${i.qty})"
                  title="Remove / Void Item (Anti-Theft Audited)" 
                  class="px-2 py-0.5 rounded bg-red-500/15 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 flex items-center gap-1 text-[10px] font-bold transition-all">
                  <span>🗑️</span>
                  <span>Remove</span>
                </button>
              </div>
            </div>
            ${i.notes ? `<div class="text-[10px] text-amber-300/90 pl-1 pt-0.5 flex items-center gap-1 font-medium"><span>↳</span> <span>${i.notes}</span></div>` : ''}
          </div>
        `).join('');
      }
    }
  },

  // ================= 6. PUNCH ORDER (SAVED DIRECTLY TO SQLITE BACKEND) =================
  async sendOrder() {
    const cart = this.getLocalCart();
    if (cart.length === 0) return;

    const count = cart.reduce((s, i) => s + i.qty, 0);
    const targetTableId = this.state.selectedTableId;
    const tableName = this.getTable().name;
    const waiterName = this.getStaffName();

    try {
      if (window.DB) {
        await window.DB.punchKOT(targetTableId, tableName, [...cart], waiterName);
      }
    } catch (e) {
      console.warn('Backend sync failed, using memory:', e);
    }

    // Clear local round tray for this table and update storage
    this.state.localCarts[targetTableId] = [];
    this.saveLocalCarts();
    this.haptic('success');
    this.playBeep('punch');
    this.renderMenuItems();
    this.updateCartUI();
    this.renderFloorTables();
    this.updateFloorBottomDock();
    this.updateTableHeaderBadges();
    this.showToast(`🔥 ${count} item(s) punched to ${tableName}! Saved to Database.`);
  },

  calculateTotalBill() {
    const liveTable = this.getLiveTable();
    const placedOrders = liveTable.placedOrders || [];
    const subtotal = placedOrders.reduce((s, i) => s + (i.price * i.qty), 0);

    let discountAmount = 0;
    if (this.state.discountType === 'percent') {
      discountAmount = Math.round(subtotal * (this.state.discountValue / 100) * 100) / 100;
    } else if (this.state.discountType === 'flat') {
      discountAmount = Math.min(subtotal, Math.max(0, parseFloat(this.state.discountValue) || 0));
    }

    const taxable = Math.max(0, subtotal - discountAmount);

    const store = (window.DB && window.DB.storeSettings) || {};
    const cgstPct = parseFloat(store.cgst_percent !== undefined ? store.cgst_percent : 2.5);
    const sgstPct = parseFloat(store.sgst_percent !== undefined ? store.sgst_percent : 2.5);
    const servPct = parseFloat(store.service_charge_percent !== undefined ? store.service_charge_percent : 0);

    const cgstRate = isNaN(cgstPct) ? 0.025 : (cgstPct / 100);
    const sgstRate = isNaN(sgstPct) ? 0.025 : (sgstPct / 100);
    const servRate = isNaN(servPct) ? 0 : (servPct / 100);

    const cgst = Math.round(taxable * cgstRate * 100) / 100;
    const sgst = Math.round(taxable * sgstRate * 100) / 100;
    const serviceCharge = Math.round(taxable * servRate * 100) / 100;
    const rawTotal = taxable + cgst + sgst + serviceCharge;

    let grandTotal = rawTotal;
    let roundOff = 0;
    if (this.state.isRoundOff) {
      grandTotal = Math.round(rawTotal);
      roundOff = Math.round((grandTotal - rawTotal) * 100) / 100;
    } else {
      grandTotal = Math.round(rawTotal * 100) / 100;
    }

    const perPerson = Math.round(grandTotal / (this.state.splitCount || 1));
    return { subtotal, discountAmount, taxable, cgst, sgst, serviceCharge, roundOff, grandTotal, perPerson, cgstPct, sgstPct, servPct };
  },

  // ================= 7. DETAILED BILLING & SETTLEMENT =================
  setDiscount(val, type) {
    if (val > 0 && this.state.userRole !== 'manager') {
      this.showToast('🔒 Manager credentials required to apply discounts');
      this.openWelcomeAuthModal();
      return;
    }

    this.state.discountType = type;
    this.state.discountValue = val;

    const flatInp = document.getElementById('bill-flat-discount-input');
    if (flatInp && type !== 'flat') flatInp.value = '';

    const btnNone = document.getElementById('btn-disc-0');
    const btn5 = document.getElementById('btn-disc-5');
    const btn10 = document.getElementById('btn-disc-10');
    const btn20 = document.getElementById('btn-disc-20');
    const allBtns = [btnNone, btn5, btn10, btn20];

    allBtns.forEach(b => {
      if (b) b.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-300 hover:text-white";
    });

    if ((type === 'none' || val === 0) && btnNone) {
      btnNone.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-black";
    } else if (type === 'percent') {
      if (val === 5 && btn5) btn5.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-black";
      if (val === 10 && btn10) btn10.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-black";
      if (val === 20 && btn20) btn20.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-black";
    }

    this.refreshBillingModalData();
  },

  setFlatDiscount(val) {
    const num = parseFloat(val) || 0;
    if (num > 0) {
      if (this.state.userRole !== 'manager') {
        this.showToast('🔒 Manager credentials required to apply discounts');
        const flatInp = document.getElementById('bill-flat-discount-input');
        if (flatInp) flatInp.value = '';
        this.openWelcomeAuthModal();
        return;
      }

      this.state.discountType = 'flat';
      this.state.discountValue = num;
      ['btn-disc-0', 'btn-disc-5', 'btn-disc-10', 'btn-disc-20'].forEach(id => {
        const b = document.getElementById(id);
        if (b) b.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-300 hover:text-white";
      });
    } else {
      this.setDiscount(0, 'none');
    }
    this.refreshBillingModalData();
  },

  toggleRoundOff(checked) {
    this.state.isRoundOff = !!checked;
    this.refreshBillingModalData();
  },

  openBillingPage(push = true) {
    const modal = document.getElementById('billing-modal');
    const table = this.getTable();
    const liveTable = this.getLiveTable();

    document.getElementById('bill-page-title').textContent = `${table.name} — Detailed Billing & Settlement`;
    document.getElementById('bill-page-subtitle').textContent = `${table.position} (${table.landmark}) • Server: ${this.getStaffName()}`;

    this.state.splitCount = 1;
    this.clearCashTendered();
    this.refreshBillingModalData();

    // Reset payment tab to UPI
    this.setPayMode('upi');
    if (modal) modal.classList.remove('hidden');

    if (push && typeof history !== 'undefined') {
      if (window.location.hash !== '#billing') {
        history.pushState({ screen: 'billing', tableId: this.state.selectedTableId }, '', '#billing');
      }
    }
  },

  refreshBillingModalData() {
    const liveTable = this.getLiveTable();
    const placedOrders = liveTable.placedOrders || [];
    const { subtotal, discountAmount, taxable, cgst, sgst, roundOff, grandTotal, perPerson } = this.calculateTotalBill();

    const itemsContainer = document.getElementById('bill-detailed-items');
    const roundsCountEl = document.getElementById('bill-rounds-count');
    if (roundsCountEl) roundsCountEl.textContent = `${placedOrders.length} round items`;

    if (itemsContainer) {
      if (placedOrders.length === 0) {
        itemsContainer.innerHTML = `<div class="py-8 text-center text-neutral-400">No orders punched on this table yet. Add items and tap 'Punch Order'.</div>`;
      } else {
        itemsContainer.innerHTML = placedOrders.map((i, idx) => `
          <div class="flex items-center justify-between py-2 border-b border-[#252b3b]">
            <div class="flex items-center gap-2">
              <span class="text-neutral-500 font-mono text-[10px]">#${idx + 1}</span>
              <div>
                <div class="font-bold text-white text-xs">${i.name}</div>
                <div class="text-[10px] text-neutral-400 flex items-center gap-2">
                  <span>🕒 Order Round</span>
                  ${i.notes ? `<span class="text-amber-300 font-medium">📝 ${i.notes}</span>` : ''}
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-amber-400 font-mono text-xs">x${i.qty}</span>
              <span class="font-mono font-bold text-white text-xs w-14 text-right">₹${i.price * i.qty}</span>
              <button 
                onclick="APP.openVoidModal('${i.id}', '${i.name.replace(/'/g, "\\'")}', '${i.kot_id || ''}', '${this.state.selectedTableId}', ${i.price}, ${i.qty})"
                title="Remove item from bill (Anti-Theft Audited)" 
                class="px-2 py-0.5 rounded bg-red-500/15 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 text-[10px] font-bold transition-all flex items-center gap-1">
                <span>🗑️</span>
                <span>Remove</span>
              </button>
            </div>
          </div>
        `).join('');
      }
    }

    // Financials
    document.getElementById('bill-subtotal').textContent = `₹${subtotal}`;

    // Discount breakdown
    const discRow = document.getElementById('bill-discount-row');
    const discAmtEl = document.getElementById('bill-discount-amount');
    if (discRow && discAmtEl) {
      if (discountAmount > 0) {
        discRow.classList.remove('hidden');
        discAmtEl.textContent = `-₹${discountAmount.toFixed(2)}`;
      } else {
        discRow.classList.add('hidden');
      }
    }

    document.getElementById('bill-cgst').textContent = `₹${cgst.toFixed(2)}`;
    document.getElementById('bill-sgst').textContent = `₹${sgst.toFixed(2)}`;

    // Round-off
    const roundOffEl = document.getElementById('bill-round-off');
    if (roundOffEl) {
      roundOffEl.textContent = `${roundOff >= 0 ? '+' : ''}₹${roundOff.toFixed(2)}`;
    }

    document.getElementById('bill-grand-total').textContent = `₹${grandTotal}`;
    document.getElementById('bill-share-per-person').textContent = `₹${perPerson}`;
    document.getElementById('bill-split-display').textContent = this.state.splitCount === 1 ? '1 Person (Single Bill)' : `${this.state.splitCount} Persons`;
    document.getElementById('bill-split-slider').value = this.state.splitCount;

    // Keep Cash Payment calculations and dynamic exact button in sync with total
    this.updateCashCalculation(this.state.cashTendered || 0);
  },

  closeBillingPage(updateHistory = true) {
    const modal = document.getElementById('billing-modal');
    if (modal) modal.classList.add('hidden');
    if (updateHistory && typeof history !== 'undefined' && window.location.hash === '#billing') {
      history.back();
    }
  },

  setSplit(count) {
    this.state.splitCount = Math.max(1, parseInt(count) || 1);
    const { perPerson } = this.calculateTotalBill();
    const splitDisp = document.getElementById('bill-split-display');
    const perPersonEl = document.getElementById('bill-share-per-person');
    if (splitDisp) {
      splitDisp.textContent = this.state.splitCount === 1 ? '1 Person (Single Bill)' : `${this.state.splitCount} Persons (${this.state.splitCount} Shares)`;
    }
    if (perPersonEl) perPersonEl.textContent = `₹${perPerson}`;
  },

  setPayMode(mode) {
    this.state.payMode = mode;
    const tabUpi = document.getElementById('pay-tab-upi');
    const tabCard = document.getElementById('pay-tab-card');
    const tabCash = document.getElementById('pay-tab-cash');
    const secUpi = document.getElementById('pay-section-upi');
    const secCard = document.getElementById('pay-section-card');
    const secCash = document.getElementById('pay-section-cash');

    [tabUpi, tabCard, tabCash].forEach(t => {
      if (t) t.className = "py-2 rounded-lg font-semibold text-neutral-400 hover:text-white";
    });
    [secUpi, secCard, secCash].forEach(s => {
      if (s) s.classList.add('hidden');
    });

    if (mode === 'upi') {
      if (tabUpi) tabUpi.className = "py-2 rounded-lg font-bold bg-amber-500 text-black";
      if (secUpi) secUpi.classList.remove('hidden');
    } else if (mode === 'card') {
      if (tabCard) tabCard.className = "py-2 rounded-lg font-bold bg-amber-500 text-black";
      if (secCard) secCard.classList.remove('hidden');
    } else if (mode === 'cash') {
      if (tabCash) tabCash.className = "py-2 rounded-lg font-bold bg-amber-500 text-black";
      if (secCash) secCash.classList.remove('hidden');
      this.updateCashCalculation(this.state.cashTendered || 0);
    }
  },

  // --- Real-Time Cash Calculator (Custom figures like 550, 570, quick chips & smart change) ---
  onCashInput(val) {
    const num = Math.max(0, parseFloat(val) || 0);
    this.updateCashCalculation(num);
  },

  setCashTendered(amount) {
    const num = Math.max(0, parseFloat(amount) || 0);
    const input = document.getElementById('cash-tendered-input');
    if (input) input.value = num > 0 ? num : '';
    this.updateCashCalculation(num);
  },

  addCashTendered(delta) {
    const input = document.getElementById('cash-tendered-input');
    const current = parseFloat(input?.value) || (this.state.cashTendered || 0);
    const next = Math.max(0, current + delta);
    this.setCashTendered(next);
  },

  setCashExact() {
    const { grandTotal } = this.calculateTotalBill();
    this.setCashTendered(grandTotal);
  },

  clearCashTendered() {
    this.state.cashTendered = 0;
    const input = document.getElementById('cash-tendered-input');
    if (input) input.value = '';
    this.updateCashCalculation(0);
  },

  updateCashCalculation(tendered) {
    const num = Math.max(0, parseFloat(tendered) || 0);
    this.state.cashTendered = num;
    const { grandTotal } = this.calculateTotalBill();

    const billEl = document.getElementById('cash-card-bill-total');
    const receivedEl = document.getElementById('cash-card-received');
    const returnLabel = document.getElementById('cash-return-label');
    const changeEl = document.getElementById('cash-change-return');
    const shortAlert = document.getElementById('cash-short-alert');
    const shortText = document.getElementById('cash-short-text');
    const exactAlert = document.getElementById('cash-exact-alert');
    const refEl = document.getElementById('cash-bill-reference');
    const exactBtn = document.getElementById('btn-cash-exact');

    if (billEl) billEl.textContent = `₹${grandTotal}`;
    if (refEl) refEl.textContent = `Bill: ₹${grandTotal}`;
    if (exactBtn) exactBtn.textContent = `🎯 Exact ₹${grandTotal}`;
    if (receivedEl) receivedEl.textContent = num > 0 ? `₹${num}` : '₹0';

    if (num === 0) {
      if (returnLabel) returnLabel.innerHTML = '<span>💰 Return Change:</span>';
      if (changeEl) {
        changeEl.textContent = '₹0';
        changeEl.className = 'font-mono font-black text-base text-neutral-400';
      }
      if (shortAlert) shortAlert.classList.add('hidden');
      if (exactAlert) exactAlert.classList.add('hidden');
    } else if (num === grandTotal) {
      if (returnLabel) returnLabel.innerHTML = '<span>💰 Return Change:</span>';
      if (changeEl) {
        changeEl.textContent = '₹0';
        changeEl.className = 'font-mono font-black text-base text-emerald-400';
      }
      if (shortAlert) shortAlert.classList.add('hidden');
      if (exactAlert) exactAlert.classList.remove('hidden');
    } else if (num > grandTotal) {
      const change = num - grandTotal;
      if (returnLabel) returnLabel.innerHTML = '<span>💰 Return Change:</span>';
      if (changeEl) {
        changeEl.textContent = `₹${Math.round(change)}`;
        changeEl.className = 'font-mono font-black text-base text-emerald-400';
      }
      if (shortAlert) shortAlert.classList.add('hidden');
      if (exactAlert) exactAlert.classList.add('hidden');
    } else {
      // num < grandTotal: SHORTFALL!
      const short = grandTotal - num;
      if (returnLabel) returnLabel.innerHTML = '<span>⚠️ Short / Remaining Due:</span>';
      if (changeEl) {
        changeEl.textContent = `-₹${Math.round(short)}`;
        changeEl.className = 'font-mono font-black text-base text-red-400';
      }
      if (shortAlert) shortAlert.classList.remove('hidden');
      if (shortText) shortText.textContent = `Short by ₹${Math.round(short)} — Guest still owes balance!`;
      if (exactAlert) exactAlert.classList.add('hidden');
    }
  },

  // Settle Table: Complete Payment, Free Table & Archive Settlement
  async settleTable() {
    const table = this.getTable();
    const liveTable = this.getLiveTable();
    const placedOrders = liveTable.placedOrders || [];
    const { subtotal, discountAmount, taxable, cgst, sgst, serviceCharge, roundOff, grandTotal } = this.calculateTotalBill();

    if (placedOrders.length === 0) {
      this.showToast('No orders to settle on this table!');
      return;
    }

    // Cash validation: If cash mode, check if cash received is sufficient
    if (this.state.payMode === 'cash') {
      if (this.state.cashTendered > 0 && this.state.cashTendered < grandTotal) {
        const short = grandTotal - this.state.cashTendered;
        if (!confirm(`⚠️ Cash received (₹${this.state.cashTendered}) is less than Bill (₹${grandTotal}) by ₹${short}!\n\nDo you want to proceed with settlement anyway?`)) {
          return;
        }
      } else if (!this.state.cashTendered || this.state.cashTendered === 0) {
        // Cashier settled without typing cash amount -> assume exact payment
        this.state.cashTendered = grandTotal;
      }
    }

    const custName = (document.getElementById('bill-customer-name')?.value || '').trim() || 'Guest';
    const custPhone = (document.getElementById('bill-customer-phone')?.value || '').trim();
    this.state.customerName = custName;
    this.state.customerPhone = custPhone;

    const cashChange = this.state.payMode === 'cash' ? Math.max(0, (this.state.cashTendered || grandTotal) - grandTotal) : 0;
    const paymentRef = this.state.payMode === 'cash'
      ? `Cash Recvd: ₹${this.state.cashTendered || grandTotal} | Change: ₹${Math.round(cashChange)}`
      : (this.state.payMode === 'card' ? (document.querySelector('#pay-section-card input')?.value || 'TXN-CARD') : 'UPI-VERIFIED');

    try {
      if (window.DB) {
        await window.DB.settleBill({
          tableId: this.state.selectedTableId,
          tableName: table.name,
          waiterName: this.getStaffName(),
          customerName: custName,
          customerPhone: custPhone,
          items: placedOrders,
          subtotal,
          discountType: this.state.discountType,
          discountValue: this.state.discountValue,
          discountAmount,
          cgst,
          sgst,
          serviceCharge: serviceCharge || 0,
          roundOff,
          grandTotal,
          paymentMode: this.state.payMode,
          paymentRef,
          splitCount: this.state.splitCount
        });
      }
    } catch (e) {
      console.warn('Backend settle failed, clearing local tab:', e);
    }

    this.state.localCarts[this.state.selectedTableId] = [];
    this.saveLocalCarts();
    this.haptic('success');
    this.playBeep('settle');
    const billingModal = document.getElementById('billing-modal');
    if (billingModal) billingModal.classList.add('hidden');
    this.closeEpsonReceiptModal();
    this.updateCartUI();
    this.renderMenuItems();
    this.renderFloorTables();
    this.updateTableHeaderBadges();
    this.updateFloorBottomDock();
    this.goToTables(); // Return to floor map after settlement
    this.showToast(`✅ ${table.name} settled (₹${grandTotal}) & marked Free in Database!`);
  },

  // ================= 8. EPSON 80MM THERMAL RECEIPT =================
  openEpsonReceiptModal(push = true, customBill = null) {
    const modal = document.getElementById('epson-modal');
    const table = this.getTable();
    const liveTable = this.getLiveTable();

    let items = [];
    let subtotal = 0;
    let discountAmount = 0;
    let cgst = 0;
    let sgst = 0;
    let roundOff = 0;
    let grandTotal = 0;
    let perPerson = 0;
    let invId = "";
    let tableName = "";
    let waiterName = this.getStaffName();
    let payMode = "UPI";
    let splitCount = 1;
    let dateStr = "";
    let timeStr = "";
    let custName = "";
    let custPhone = "";

    let billTotals = null;
    if (customBill) {
      items = customBill.items || [];
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch(e) { items = []; }
      }
      subtotal = parseFloat(customBill.subtotal) || 0;
      discountAmount = parseFloat(customBill.discount_amount || customBill.discount) || 0;
      cgst = parseFloat(customBill.cgst) || 0;
      sgst = parseFloat(customBill.sgst) || 0;
      roundOff = parseFloat(customBill.round_off) || 0;
      grandTotal = parseFloat(customBill.grand_total) || 0;
      invId = customBill.invoice_number || ("BYOB-" + Math.floor(1000 + Math.random() * 9000));
      tableName = customBill.table_name || customBill.table_id || "TABLE";
      waiterName = customBill.waiter_name || this.getStaffName();
      payMode = (customBill.payment_mode || "UPI").toUpperCase();
      splitCount = customBill.split_count || 1;
      perPerson = Math.round(grandTotal / splitCount);
      const dt = new Date(customBill.created_at || Date.now());
      dateStr = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      timeStr = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      custName = customBill.customer_name || '';
      custPhone = customBill.customer_phone || '';
    } else {
      const placedOrders = liveTable.placedOrders || [];
      billTotals = this.calculateTotalBill();
      items = placedOrders;
      subtotal = billTotals.subtotal;
      discountAmount = billTotals.discountAmount;
      cgst = billTotals.cgst;
      sgst = billTotals.sgst;
      roundOff = billTotals.roundOff;
      grandTotal = billTotals.grandTotal;
      perPerson = billTotals.perPerson;
      invId = "BYOB-" + Math.floor(1000 + Math.random() * 9000);
      tableName = `${table.name.toUpperCase()} (${table.position})`;
      waiterName = this.getStaffName();
      payMode = this.state.payMode.toUpperCase();
      splitCount = this.state.splitCount;
      const now = new Date();
      dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      custName = (document.getElementById('bill-customer-name')?.value || '').trim();
      custPhone = (document.getElementById('bill-customer-phone')?.value || '').trim();
    }

    // Dynamic Restaurant Identity & Tax Header on 80mm Receipt
    const store = (window.DB && window.DB.storeSettings) || {};
    const restName = customBill?.restaurant_name || store.restaurant_name || 'BYOB INDIRAPURAM';
    const tagline = store.tagline || 'Bring Your Own Bottle Experience';
    const address = store.address || 'Plot 14, Dr. Sushila Naiyyar Marg, Indirapuram, Ghaziabad';
    const gstin = customBill?.gstin || store.gstin || '07AABCB1234F1Z9';
    const fssai = customBill?.fssai || store.fssai || '12724055000123';
    const upi = store.upi_vpa || 'byobindirapuram@icici';
    const footer = store.bill_footer || 'Guests are welcome to Bring Their Own Bottle.';

    const restNameEl = document.getElementById('epson-restaurant-name');
    const taglineEl = document.getElementById('epson-restaurant-tagline');
    const addressEl = document.getElementById('epson-restaurant-address');
    const taxEl = document.getElementById('epson-restaurant-tax');
    const upiEl = document.getElementById('epson-upi-id');
    const footerEl = document.getElementById('epson-bill-footer');

    if (restNameEl) restNameEl.textContent = restName.toUpperCase();
    if (taglineEl) taglineEl.textContent = tagline;
    if (addressEl) addressEl.textContent = address;
    if (taxEl) taxEl.textContent = `GSTIN: ${gstin} | FSSAI: ${fssai}`;
    if (upiEl) upiEl.textContent = `UPI ID: ${upi}`;
    if (footerEl) footerEl.textContent = footer;

    // CGST & SGST Dynamic Percentage Labels
    const cgstPct = store.cgst_percent !== undefined ? store.cgst_percent : '2.5';
    const sgstPct = store.sgst_percent !== undefined ? store.sgst_percent : '2.5';
    const cgstLabel = document.getElementById('epson-cgst-label');
    const sgstLabel = document.getElementById('epson-sgst-label');
    if (cgstLabel) cgstLabel.textContent = `CGST (${cgstPct}%):`;
    if (sgstLabel) sgstLabel.textContent = `SGST (${sgstPct}%):`;

    // Service Charge Row
    const servRow = document.getElementById('epson-service-charge-row');
    const servVal = document.getElementById('epson-service-charge');
    const servChargeAmount = customBill ? (parseFloat(customBill.service_charge) || 0) : (billTotals?.serviceCharge || 0);
    if (servRow && servVal) {
      if (servChargeAmount > 0) {
        servRow.classList.remove('hidden');
        servVal.textContent = `₹${servChargeAmount.toFixed(2)}`;
      } else {
        servRow.classList.add('hidden');
      }
    }

    document.getElementById('epson-inv-no').textContent = `INV: #${invId}`;
    document.getElementById('epson-date-time').textContent = `${dateStr} ${timeStr}`;
    document.getElementById('epson-table-info').textContent = `TABLE: ${tableName}`;
    document.getElementById('epson-waiter-info').textContent = `CAPTAIN: ${waiterName}`;

    // Guest Info Row on Receipt
    const guestRow = document.getElementById('epson-guest-row');
    const guestNameEl = document.getElementById('epson-guest-name');
    const guestPhoneEl = document.getElementById('epson-guest-phone');
    if (guestRow && guestNameEl && guestPhoneEl) {
      if ((custName && custName !== 'Guest') || custPhone) {
        guestRow.classList.remove('hidden');
        guestNameEl.textContent = `GUEST: ${custName || 'Guest'}`;
        guestPhoneEl.textContent = custPhone ? `M: ${custPhone}` : '';
      } else {
        guestRow.classList.add('hidden');
      }
    }

    const itemsContainer = document.getElementById('epson-items-list');
    if (items.length === 0) {
      itemsContainer.innerHTML = `<div class="text-center py-2">-- NO ITEMS BILLED --</div>`;
    } else {
      itemsContainer.innerHTML = items.map(i => `
        <div class="text-[10px]">
          <div class="flex justify-between items-center">
            <span class="w-36 truncate font-semibold">${i.name}</span>
            <span class="w-8 text-center font-mono">${i.qty}</span>
            <span class="w-12 text-right font-mono">₹${i.price}</span>
            <span class="w-14 text-right font-mono font-bold">₹${i.price * i.qty}</span>
          </div>
          ${i.notes ? `<div class="text-[8px] text-neutral-600 pl-2">↳ Note: ${i.notes}</div>` : ''}
        </div>
      `).join('');
    }

    document.getElementById('epson-subtotal').textContent = `₹${subtotal.toFixed(2)}`;

    const discRow = document.getElementById('epson-discount-row');
    const discEl = document.getElementById('epson-discount');
    if (discRow && discEl) {
      if (discountAmount > 0) {
        discRow.classList.remove('hidden');
        discEl.textContent = `-₹${discountAmount.toFixed(2)}`;
      } else {
        discRow.classList.add('hidden');
      }
    }

    document.getElementById('epson-cgst').textContent = `₹${cgst.toFixed(2)}`;
    document.getElementById('epson-sgst').textContent = `₹${sgst.toFixed(2)}`;

    const roundOffEl = document.getElementById('epson-round-off');
    if (roundOffEl) {
      roundOffEl.textContent = `${roundOff >= 0 ? '+' : ''}₹${roundOff.toFixed(2)}`;
    }

    document.getElementById('epson-net-total').textContent = `₹${grandTotal.toFixed(2)}`;
    document.getElementById('epson-pay-mode').textContent = `MODE: ${payMode} (PAID)`;
    document.getElementById('epson-split-share').textContent = `SPLIT (${splitCount}): ₹${perPerson}/HEAD`;

    // Cash tender & change on Epson 80mm thermal receipt
    const cashRow = document.getElementById('epson-cash-row');
    const cashTenderedEl = document.getElementById('epson-cash-tendered');
    const cashChangeEl = document.getElementById('epson-cash-change');
    if (cashRow && cashTenderedEl && cashChangeEl) {
      if (payMode === 'CASH') {
        cashRow.classList.remove('hidden');
        let tendered = customBill?.cash_tendered;
        if (!tendered && customBill?.payment_ref && customBill.payment_ref.includes('Cash Recvd: ₹')) {
          const match = customBill.payment_ref.match(/Cash Recvd: ₹([0-9.]+)/);
          if (match) tendered = parseFloat(match[1]);
        }
        if (!tendered) tendered = this.state.cashTendered || grandTotal;
        const change = Math.max(0, tendered - grandTotal);
        cashTenderedEl.textContent = `CASH RECVD: ₹${Number(tendered).toFixed(2)}`;
        cashChangeEl.textContent = `CHANGE: ₹${Number(change).toFixed(2)}`;
      } else {
        cashRow.classList.add('hidden');
      }
    }

    if (modal) modal.classList.remove('hidden');

    if (push && typeof history !== 'undefined') {
      if (window.location.hash !== '#receipt') {
        history.pushState({ screen: 'receipt' }, '', '#receipt');
      }
    }
  },

  closeEpsonReceiptModal(updateHistory = true) {
    const modal = document.getElementById('epson-modal');
    if (modal) modal.classList.add('hidden');
    if (updateHistory && typeof history !== 'undefined' && window.location.hash === '#receipt') {
      history.back();
    }
  },

  // ================= 8E. HIGH-PRECISION 80MM EPSON THERMAL ROLL ENGINE =================
  printThermalReceipt(forceNewWindow = false) {
    this.playBeep('click');
    const receiptEl = document.getElementById('epson-print-wrapper');
    if (!receiptEl) {
      window.print();
      return;
    }

    // Dynamic continuous roll height calculation: 1px = 0.264583mm @ 96 DPI, + 15mm tear margin
    const computedHeightMm = Math.max(120, Math.ceil((receiptEl.scrollHeight || receiptEl.offsetHeight || 600) * 0.264583) + 15);

    // Update dynamic @page style on main document
    let dynStyle = document.getElementById('dynamic-epson-page-style');
    if (!dynStyle) {
      dynStyle = document.createElement('style');
      dynStyle.id = 'dynamic-epson-page-style';
      document.head.appendChild(dynStyle);
    }
    dynStyle.textContent = `@page { size: 80mm ${computedHeightMm}mm !important; margin: 0mm !important; } @media print { @page { size: 80mm ${computedHeightMm}mm !important; margin: 0mm !important; } }`;

    const receiptHtml = receiptEl.innerHTML;
    const invNo = document.getElementById('epson-inv-no')?.textContent || 'RECEIPT';

    const fullPrintDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${invNo} - BYOB Indirapuram</title>
  <style>
    @page {
      size: 80mm ${computedHeightMm}mm;
      margin: 0mm;
    }
    @media print {
      @page {
        size: 80mm ${computedHeightMm}mm;
        margin: 0mm;
      }
      html, body {
        width: 80mm !important;
        max-width: 80mm !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
        overflow: visible !important;
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      width: 80mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 2mm 2.5mm 6mm 2.5mm;
      background: #ffffff;
      color: #000000;
      font-family: 'JetBrains Mono', 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.35;
      font-weight: 600;
    }
    .epson-receipt {
      width: 100%;
      max-width: 75mm;
      margin: 0 auto;
      background: #ffffff;
      color: #000000;
      padding: 0;
      box-shadow: none;
    }
    .epson-receipt * {
      color: #000000 !important;
    }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .font-black { font-weight: 900; }
    .font-mono { font-family: 'JetBrains Mono', 'Courier New', Courier, monospace; }
    .uppercase { text-transform: uppercase; }
    .tracking-widest { letter-spacing: 0.08em; }
    .tracking-wider { letter-spacing: 0.04em; }
    .flex { display: flex; justify-content: space-between; align-items: center; }
    .flex-col { display: flex; flex-direction: column; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .justify-center { justify-content: center; }
    .w-full { width: 100%; }
    .w-36 { width: 35mm; }
    .w-8 { width: 8mm; }
    .w-12 { width: 13mm; }
    .w-14 { width: 16mm; }
    .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    hr {
      border: none;
      border-top: 1px dashed #000000 !important;
      margin: 4px 0;
    }
    .double-hr {
      border: none;
      border-top: 2px solid #000000 !important;
      margin: 5px 0;
    }
    .hidden { display: none !important; }
    svg { display: block; margin: 0 auto; }
    .space-y-0\\.5 > * + * { margin-top: 2px; }
    .space-y-1 > * + * { margin-top: 3px; }
    .py-1 { padding-top: 2px; padding-bottom: 2px; }
    .py-2 { padding-top: 4px; padding-bottom: 4px; }
    .pt-0\\.5 { padding-top: 2px; }
    .pt-1 { padding-top: 3px; }
    .mt-0\\.5 { margin-top: 2px; }
    .mt-1 { margin-top: 3px; }
    .mb-1 { margin-bottom: 3px; }
    .text-sm { font-size: 13px; font-weight: 900; }
    .text-xs { font-size: 11px; }
    .text-\\[10px\\] { font-size: 10px; }
    .text-\\[9px\\] { font-size: 9px; }
    .text-\\[8px\\] { font-size: 8px; }
    .text-\\[7px\\] { font-size: 7px; }
  </style>
</head>
<body>
  ${receiptHtml}
</body>
</html>`;

    if (forceNewWindow) {
      const printWin = window.open('', '_blank', 'width=360,height=650');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(fullPrintDoc);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => {
          printWin.print();
        }, 250);
        return;
      }
    }

    // Default seamless hidden iframe method
    let printFrame = document.getElementById('onyx-thermal-print-frame');
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'onyx-thermal-print-frame';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      printFrame.style.opacity = '0';
      printFrame.style.pointerEvents = 'none';
      document.body.appendChild(printFrame);
    }

    try {
      const frameDoc = printFrame.contentWindow.document;
      frameDoc.open();
      frameDoc.write(fullPrintDoc);
      frameDoc.close();

      setTimeout(() => {
        try {
          printFrame.contentWindow.focus();
          printFrame.contentWindow.print();
        } catch (e) {
          console.warn('Iframe print failed, falling back to window.open:', e);
          const printWin = window.open('', '_blank', 'width=360,height=650');
          if (printWin) {
            printWin.document.open();
            printWin.document.write(fullPrintDoc);
            printWin.document.close();
            printWin.focus();
            setTimeout(() => { printWin.print(); }, 250);
          } else {
            window.print();
          }
        }
      }, 250);
    } catch (err) {
      console.warn('Thermal print error, calling window.print():', err);
      window.print();
    }
  },

  // ================= 8B. ANTI-THEFT DEVICE IDENTITY & ITEM REMOVAL =================
  getDeviceId() {
    let deviceId = localStorage.getItem('onyx_device_id');
    if (!deviceId) {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const rand = Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase();
      deviceId = (isMobile ? 'PHONE-' : 'DESK-') + rand;
      localStorage.setItem('onyx_device_id', deviceId);
    }
    return deviceId;
  },

  getDeviceInfo() {
    const ua = navigator.userAgent;
    let model = 'Web Browser';
    if (/Android/i.test(ua)) {
      const m = ua.match(/Android\s([0-9\.]+);?\s?([^;\)]+)?/i);
      model = m && m[2] ? `Android (${m[2].trim()})` : 'Android Handheld';
    } else if (/iPhone|iPad/i.test(ua)) {
      model = 'Apple iOS Handheld';
    } else if (/Windows/i.test(ua)) {
      model = 'Windows Counter PC';
    }
    return model;
  },

  openVoidModal(kotItemId, itemName, kotId, tableId, price = 0, qty = 1) {
    const targetTable = RESTAURANT_TABLES.find(t => t.id === tableId) || this.getLiveTable(tableId) || {};
    const floor = targetTable.floor || '1st Floor';
    const tableName = targetTable.name || tableId || 'Active Table';
    const amount = (price * qty) || 0;

    this.state.activeVoidItem = { kotItemId, itemName, kotId, tableId, tableName, floor, price, qty, amount };

    const modal = document.getElementById('void-item-modal');
    const details = document.getElementById('void-item-details');
    const titleQty = document.getElementById('void-item-title-qty');
    const amountBadge = document.getElementById('void-amount-badge');
    const floorBadge = document.getElementById('void-item-floor-badge');
    const deviceBadge = document.getElementById('void-device-badge');
    const staffInput = document.getElementById('void-staff-name');
    const pinInput = document.getElementById('void-manager-pin');

    if (details) details.textContent = `${itemName} • ${tableName} (${floor})`;
    if (titleQty) titleQty.textContent = `${itemName} x${qty}`;
    if (amountBadge) amountBadge.textContent = `-₹${amount}`;
    if (floorBadge) floorBadge.textContent = floor;
    if (deviceBadge) deviceBadge.textContent = `${this.getDeviceId()} • ${this.getDeviceInfo()}`;
    
    // Always require fresh explicit staff name entry for anti-theft accountability (Never auto-fill dummy names)
    if (staffInput) {
      staffInput.value = '';
      staffInput.placeholder = 'Apna Asli Naam Daalein (Mandatory)';
    }
    if (pinInput) pinInput.value = '';

    const errEl = document.getElementById('void-modal-error');
    if (errEl) {
      errEl.classList.add('hidden');
      errEl.textContent = '';
    }

    if (modal) modal.classList.remove('hidden');
    setTimeout(() => {
      if (staffInput) staffInput.focus();
    }, 100);
  },

  closeVoidModal() {
    const modal = document.getElementById('void-item-modal');
    if (modal) modal.classList.add('hidden');
    this.state.activeVoidItem = null;
  },

  async confirmVoidItem() {
    if (!this.state.activeVoidItem) return;
    const { kotItemId, itemName, tableId, tableName, floor, price, qty, amount } = this.state.activeVoidItem;
    const staffInput = document.getElementById('void-staff-name');
    const staffName = (staffInput ? staffInput.value : '').trim();
    const reason = document.getElementById('void-reason-select')?.value || '';
    const pinInput = document.getElementById('void-manager-pin');
    const managerPin = (pinInput ? pinInput.value : '').trim();
    const deviceId = this.getDeviceId();
    const deviceInfo = this.getDeviceInfo();
    const errEl = document.getElementById('void-modal-error');

    const showError = msg => {
      if (errEl) {
        errEl.textContent = msg;
        errEl.classList.remove('hidden');
      }
      this.showToast(msg);
      this.haptic('error');
    };

    const dummyNames = ['captain waiter', 'waiter', 'captain', 'server', 'staff', 'admin', 'test'];
    if (!staffName || dummyNames.includes(staffName.toLowerCase())) {
      showError('❌ Waiter / Staff Name daalna MANDATORY hai! Apna asli naam darj karein.');
      staffInput?.focus();
      return;
    }

    if (!reason || reason.trim().length === 0) {
      showError('❌ Cancellation reason is mandatory.');
      return;
    }

    if (!managerPin) {
      showError('❌ Manager PIN is mandatory to cancel items! (Default PIN: 1234)');
      pinInput?.focus();
      return;
    }

    try {
      const res = await window.DB.voidKotItem({
        kotItemId,
        reason,
        managerPin,
        itemName,
        tableId,
        tableName,
        floor,
        price,
        qty,
        staffName,
        deviceId,
        deviceInfo
      });

      if (res && res.success) {
        this.haptic('success');
        this.playBeep('void');
        this.showToast(`🗑️ Removed "${itemName}" (-₹${amount}) • Audited on Dashboard`);

        this.closeVoidModal();

        // Reload data and sync UI
        if (window.DB && window.DB.loadInitialData) {
          await window.DB.loadInitialData();
        }

        // Re-render table orders and billing screen if open
        this.renderTableOrders(tableId);
        this.renderFloorTables();
        this.updateFloorBottomDock();

        const billingModal = document.getElementById('billing-modal');
        if (billingModal && !billingModal.classList.contains('hidden')) {
          this.openBillingPage(tableId, false);
        }

        this.updateVoidAuditBadgeCount();
      } else {
        showError(`❌ ${res?.error || 'Failed to remove item'}`);
      }
    } catch (err) {
      console.error('Void item error:', err);
      showError(`❌ ${err.message || 'Error voiding item'}`);
    }
  },

  // ================= 8B-2. ANTI-THEFT DASHBOARD & REMOVED ITEMS LOGS =================
  async openVoidAuditModal() {
    const modal = document.getElementById('void-audit-modal');
    if (modal) modal.classList.remove('hidden');
    await this.refreshVoidLogs();
  },

  closeVoidAuditModal() {
    const modal = document.getElementById('void-audit-modal');
    if (modal) modal.classList.add('hidden');
  },

  async refreshVoidLogs() {
    const container = document.getElementById('void-audit-list');
    const kpiAmount = document.getElementById('void-kpi-amount');
    const kpiCount = document.getElementById('void-kpi-count');

    if (container) {
      container.innerHTML = `<div class="text-center py-8 text-neutral-400">Loading audit records...</div>`;
    }

    try {
      const data = await window.DB.getVoidLogs(100);
      const logs = (data && data.logs) ? data.logs : (Array.isArray(data) ? data : []);
      const summary = (data && data.summary) ? data.summary : {
        total_voids: logs.length,
        total_amount: logs.reduce((s, l) => s + (Number(l.amount) || (Number(l.price) * Number(l.qty)) || 0), 0)
      };

      if (kpiAmount) kpiAmount.textContent = `₹${summary.total_amount}`;
      if (kpiCount) kpiCount.textContent = `${summary.total_voids} Items`;

      this.updateHeaderVoidBadge(summary.total_voids, summary.total_amount);

      if (!container) return;

      if (logs.length === 0) {
        container.innerHTML = `
          <div class="text-center py-10 bg-[#161a26] rounded-2xl border border-[#252b3d] p-6">
            <span class="text-3xl block mb-2">🛡️</span>
            <div class="text-sm font-bold text-white">No Suspicious Items Removed</div>
            <div class="text-xs text-neutral-400 mt-1">All punched food orders and customer bills are intact.</div>
          </div>
        `;
        return;
      }

      container.innerHTML = logs.map(l => {
        const amt = Number(l.amount) || (Number(l.price) * Number(l.qty)) || 0;
        const timeStr = l.created_at ? new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today';
        const isManagerAuth = (l.authorized_by || '').includes('Manager');

        return `
          <div class="p-3 rounded-xl bg-[#161a26] border border-red-500/25 hover:border-red-500/50 transition-all flex flex-col gap-2 shadow">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 font-bold text-[10px] border border-red-500/30">
                  🗑️ REMOVED
                </span>
                <span class="font-extrabold text-white text-xs">${l.item_name} <span class="text-amber-400 font-mono">x${l.qty || 1}</span></span>
              </div>
              <span class="text-sm font-black font-mono text-red-400">-₹${amt}</span>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] pt-1.5 border-t border-[#252c3e] text-neutral-300">
              <div>
                <span class="text-neutral-500 block">Table & Floor:</span>
                <span class="font-bold text-white">${l.table_name || ('Table ' + l.table_id)} • ${l.floor || '1st Floor'}</span>
              </div>
              <div>
                <span class="text-neutral-500 block">Removed By (Staff):</span>
                <span class="font-bold text-amber-300">${l.staff_name || 'Staff'}</span>
              </div>
              <div>
                <span class="text-neutral-500 block">Device ID:</span>
                <span class="font-mono font-bold text-blue-300">${l.device_id || 'DEVICE-PHONE'}</span>
              </div>
              <div class="text-right sm:text-left">
                <span class="text-neutral-500 block">Time:</span>
                <span class="font-mono text-neutral-400">${timeStr}</span>
              </div>
            </div>

            <div class="flex items-center justify-between text-[10px] pt-1 bg-[#10131d] px-2 py-1 rounded-lg">
              <span class="text-neutral-400"><strong class="text-neutral-300">Reason:</strong> ${l.reason || 'Customer cancellation'}</span>
              <span class="${isManagerAuth ? 'text-emerald-400' : 'text-amber-400'} font-bold">
                ${isManagerAuth ? '✅ Manager Approved' : '⚠️ Staff Self-Removal'}
              </span>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      if (container) {
        container.innerHTML = `<div class="text-center py-6 text-red-400 text-xs">Error loading audit records: ${e.message}</div>`;
      }
    }
  },

  async updateVoidAuditBadgeCount() {
    try {
      const data = await window.DB.getVoidLogs(50);
      const summary = (data && data.summary) ? data.summary : {
        total_voids: (data && data.logs ? data.logs.length : (Array.isArray(data) ? data.length : 0)),
        total_amount: 0
      };
      this.updateHeaderVoidBadge(summary.total_voids, summary.total_amount);
    } catch (e) {}
  },

  updateHeaderVoidBadge(count, amount) {
    const badge = document.getElementById('btn-void-audit-badge');
    const text = document.getElementById('header-void-count');
    if (!badge) return;

    if (this.state.userRole === 'manager' && count > 0) {
      badge.classList.remove('hidden');
      if (text) text.textContent = `${count} Void${count > 1 ? 's' : ''} (₹${amount})`;
    } else {
      badge.classList.add('hidden');
    }
  },

  // ================= 8C. PAST BILLS REPRINT MODAL (STRICT MANAGER ACCESS ONLY) =================
  async openPastBillsModal() {
    if (this.state.userRole !== 'manager') {
      this.showToast('🔒 Access Restricted: Last orders & past bills are only visible to Manager');
      this.openWelcomeAuthModal();
      return;
    }

    const modal = document.getElementById('past-bills-modal');
    const list = document.getElementById('past-bills-list');
    if (modal) modal.classList.remove('hidden');

    try {
      const bills = await window.DB.getRecentBills(25);
      if (Array.isArray(bills) && bills.length > 0) {
        this.state.recentBills = bills;
        this.state.recentBillsMap = {};
        bills.forEach(b => { this.state.recentBillsMap[b.id] = b; });

        list.innerHTML = bills.map(b => {
          const dt = new Date(b.created_at || Date.now());
          const timeFormatted = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ', ' + dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
          return `
            <div class="p-3 rounded-xl bg-[#0f121a] border border-[#23293a] flex items-center justify-between hover:border-amber-500/50 transition-colors">
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-white text-xs">${b.table_name || ('Table ' + b.table_id)}</span>
                  <span class="text-amber-400 font-mono text-[10px] font-bold">#${b.invoice_number}</span>
                  <span class="text-[9px] uppercase px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">${b.payment_mode}</span>
                </div>
                <div class="text-[10px] text-neutral-400 mt-0.5">
                  🕒 ${timeFormatted} • ${b.waiter_name || 'Staff'} ${b.customer_name && b.customer_name !== 'Guest' ? `• 👤 ${b.customer_name}` : ''}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-mono font-black text-sm text-emerald-400">₹${b.grand_total}</span>
                <button 
                  onclick="APP.reprintBill('${b.id}')"
                  class="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1 shadow">
                  <span>🖨️</span>
                  <span>Reprint</span>
                </button>
                <button 
                  onclick="APP.openEditBillModal('${b.id}')"
                  class="px-2.5 py-1.5 rounded-lg bg-[#251f28] hover:bg-[#3d2e40] border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1 shadow transition-all">
                  <span>✏️</span>
                  <span>Edit</span>
                </button>
              </div>
            </div>
          `;
        }).join('');
      } else {
        list.innerHTML = `<div class="text-center py-8 text-neutral-400">No settled bills found yet.</div>`;
      }
    } catch (e) {
      list.innerHTML = `<div class="text-center py-8 text-red-400">Failed to load recent bills from server.</div>`;
    }
  },

  closePastBillsModal() {
    const modal = document.getElementById('past-bills-modal');
    if (modal) modal.classList.add('hidden');
  },

  // ================= 8C-2. WAITER PHONE WI-FI QR CONNECT MODAL =================
  async openPhoneConnectModal() {
    const modal = document.getElementById('phone-connect-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    try {
      const apiBase = (window.DB && typeof window.DB.getApiBase === 'function') ? window.DB.getApiBase() : '';
      const res = await fetch(`${apiBase}/api/network/info`);
      const data = await res.json();
      const phoneUrl = (data && data.phoneUrl) ? data.phoneUrl : window.location.origin;
      const urlEl = document.getElementById('phone-connect-url');
      if (urlEl) urlEl.textContent = phoneUrl;

      const qrImg = document.getElementById('phone-qr-img');
      if (qrImg) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(phoneUrl)}`;
      }
    } catch (e) {
      const fallbackUrl = window.location.origin;
      const urlEl = document.getElementById('phone-connect-url');
      if (urlEl) urlEl.textContent = fallbackUrl;
      const qrImg = document.getElementById('phone-qr-img');
      if (qrImg) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(fallbackUrl)}`;
      }
    }
  },

  closePhoneConnectModal() {
    const modal = document.getElementById('phone-connect-modal');
    if (modal) modal.classList.add('hidden');
  },

  copyPhoneUrl() {
    const urlEl = document.getElementById('phone-connect-url');
    const txt = urlEl ? urlEl.textContent : '';
    if (txt) {
      navigator.clipboard.writeText(txt).then(() => {
        this.showToast('📋 Copied phone Wi-Fi URL to clipboard!');
        this.haptic('tick');
      }).catch(() => {
        this.showToast(txt);
      });
    }
  },

  // ================= 8C-3. POS SERVER & IP CONFIGURATION MODAL =================
  openServerConfigModal() {
    const modal = document.getElementById('server-config-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    const input = document.getElementById('cfg-server-url-input');
    if (input && window.DB) {
      input.value = window.DB.getServerUrl() || 'http://192.168.1.6:3000';
    }

    const modeBadge = document.getElementById('cfg-active-mode');
    const latencyEl = document.getElementById('cfg-latency-text');
    const feedback = document.getElementById('cfg-test-feedback');
    if (feedback) feedback.classList.add('hidden');

    if (modeBadge && window.DB) {
      if (window.DB.mode === 'sqlite_server') {
        modeBadge.textContent = '⚡ Local High-Speed Wi-Fi';
        modeBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      } else if (window.DB.mode === 'supabase_cloud') {
        modeBadge.textContent = '☁️ Supabase 24/7 Cloud';
        modeBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30';
      } else {
        modeBadge.textContent = '💾 Offline Local Fallback';
        modeBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30';
      }
    }

    if (latencyEl && window.DB) {
      latencyEl.textContent = `${window.DB.latencyMs || 4} ms`;
    }
  },

  closeServerConfigModal() {
    const modal = document.getElementById('server-config-modal');
    if (modal) modal.classList.add('hidden');
  },

  async testAndSaveServerConfig() {
    const input = document.getElementById('cfg-server-url-input');
    const btn = document.getElementById('btn-test-save-server');
    const feedback = document.getElementById('cfg-test-feedback');
    if (!input || !window.DB) return;

    const url = input.value.trim();
    if (!url) {
      this.showToast('Please enter server address');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳ Testing connection to server...</span>';
    }

    const res = await window.DB.testServerConnection(url);

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>⚡ Test & Connect Server</span>';
    }

    if (feedback) {
      feedback.classList.remove('hidden');
      if (res.success) {
        feedback.className = 'text-xs font-bold p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-left';
        feedback.innerHTML = `✅ Successfully connected to Server!<br><span class="font-mono text-[10px] text-emerald-200">Latency: ${res.latency}ms • Realtime SSE Active</span>`;
        this.showToast('✅ Connected to POS Server!');
        this.haptic('success');
        this.renderFloorTables();
        this.renderMenuItems();
        setTimeout(() => this.closeServerConfigModal(), 1200);
      } else {
        feedback.className = 'text-xs font-bold p-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-left';
        feedback.innerHTML = `❌ Connection failed: ${res.error || 'Server unreachable'}<br><span class="text-[10px] font-normal text-rose-200">Ensure the PC and phone are on the same Wi-Fi network, or tap "Connect via 24/7 Supabase Cloud".</span>`;
        this.haptic('error');
      }
    }
  },

  async switchToCloudMode() {
    if (!window.DB) return;
    this.showToast('☁️ Switching to Supabase 24/7 Cloud mode...');
    const ok = await window.DB.initSupabaseCloud();
    if (ok) {
      this.showToast('✅ Live on Supabase 24/7 Cloud!');
      this.renderFloorTables();
      this.renderMenuItems();
      this.closeServerConfigModal();
    } else {
      this.showToast('⚠️ Cloud connection unavailable');
    }
  },

  reprintBill(bill) {
    if (this.state.userRole !== 'manager') {
      this.showToast('🔒 Access Restricted: Reprinting past bills requires Manager role');
      this.openWelcomeAuthModal();
      return;
    }
    const billObj = typeof bill === 'string' ? (this.state.recentBillsMap?.[bill] || this.state.recentBills?.find(b => b.id === bill)) : bill;
    if (!billObj) return;
    this.closePastBillsModal();
    this.openEpsonReceiptModal(true, billObj);
    this.showToast(`🖨️ Loaded Invoice #${billObj.invoice_number} for reprint`);
  },

  // ================= 8D. MANAGER BILL EDITOR & AUDIT LOGGING =================
  openEditBillModal(bill) {
    if (this.state.userRole !== 'manager') {
      this.showToast('🔒 Manager credentials required to edit bill');
      this.openWelcomeAuthModal();
      return;
    }

    const billObj = typeof bill === 'string' ? (this.state.recentBillsMap?.[bill] || this.state.recentBills?.find(b => b.id === bill)) : bill;
    if (!billObj) return;

    this.state.activeEditBill = billObj;
    this.state.editBillItems = Array.isArray(billObj.items) ? JSON.parse(JSON.stringify(billObj.items)) : [];

    const invBadge = document.getElementById('edit-bill-inv-badge');
    const metaEl = document.getElementById('edit-bill-table-meta');
    const custName = document.getElementById('edit-bill-cust-name');
    const custPhone = document.getElementById('edit-bill-cust-phone');
    const payMode = document.getElementById('edit-bill-payment-mode');
    const subtotalEl = document.getElementById('edit-bill-subtotal');
    const discType = document.getElementById('edit-bill-discount-type');
    const discVal = document.getElementById('edit-bill-discount-val');
    const cgstEl = document.getElementById('edit-bill-cgst');
    const sgstEl = document.getElementById('edit-bill-sgst');
    const servChargeEl = document.getElementById('edit-bill-service-charge');
    const roundOffEl = document.getElementById('edit-bill-round-off');
    const grandTotalEl = document.getElementById('edit-bill-grand-total');
    const reasonPreset = document.getElementById('edit-bill-reason-preset');
    const reasonText = document.getElementById('edit-bill-reason-text');

    const restNameEl = document.getElementById('edit-bill-rest-name');
    const gstinEl = document.getElementById('edit-bill-gstin');
    const fssaiEl = document.getElementById('edit-bill-fssai');
    const store = (window.DB && window.DB.storeSettings) || {};

    if (restNameEl) restNameEl.value = billObj.restaurant_name || store.restaurant_name || 'BYOB INDIRAPURAM';
    if (gstinEl) gstinEl.value = billObj.gstin || store.gstin || '07AABCB1234F1Z9';
    if (fssaiEl) fssaiEl.value = billObj.fssai || store.fssai || '12724055000123';

    if (invBadge) invBadge.textContent = `#${billObj.invoice_number}`;
    if (metaEl) {
      const dt = new Date(billObj.created_at || Date.now());
      metaEl.textContent = `${billObj.table_name || 'Table'} • Settle: ${dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}, ${dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
    }
    if (custName) custName.value = (billObj.customer_name === 'Guest' ? '' : (billObj.customer_name || ''));
    if (custPhone) custPhone.value = billObj.customer_phone || '';
    if (payMode) payMode.value = (billObj.payment_mode || 'upi').toLowerCase();
    if (subtotalEl) subtotalEl.value = billObj.subtotal || 0;
    if (discType) discType.value = billObj.discount_type || 'none';
    if (discVal) discVal.value = billObj.discount_value || 0;
    if (cgstEl) cgstEl.value = billObj.cgst || 0;
    if (sgstEl) sgstEl.value = billObj.sgst || 0;
    if (servChargeEl) servChargeEl.value = billObj.service_charge || 0;
    if (roundOffEl) roundOffEl.value = billObj.round_off || 0;
    if (grandTotalEl) grandTotalEl.textContent = `₹${billObj.grand_total || 0}`;
    if (reasonPreset) reasonPreset.value = 'Guest requested GST invoice details';
    if (reasonText) reasonText.value = '';

    this.renderEditBillItemsList();
    this.recalculateEditBillTotals();

    const modal = document.getElementById('edit-bill-modal');
    if (modal) modal.classList.remove('hidden');
  },

  closeEditBillModal() {
    const modal = document.getElementById('edit-bill-modal');
    if (modal) modal.classList.add('hidden');
    this.state.activeEditBill = null;
    this.state.editBillItems = [];
  },

  renderEditBillItemsList() {
    const list = document.getElementById('edit-bill-items-list');
    if (!list) return;

    if (!this.state.editBillItems || this.state.editBillItems.length === 0) {
      list.innerHTML = `<div class="text-neutral-500 text-center py-3">No line items in this bill. Click "+ Add Item" to add.</div>`;
      return;
    }

    list.innerHTML = this.state.editBillItems.map((item, idx) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.qty) || 1;
      const lineTotal = price * qty;
      return `
        <div class="p-2 rounded-xl bg-[#0e1119] border border-[#23293a] flex items-center justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="font-bold text-white text-xs truncate">${item.name}</div>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="text-[10px] text-neutral-400">Rate: ₹</span>
              <input 
                type="number" 
                value="${price}" 
                oninput="APP.updateEditBillItemPrice(${idx}, this.value)" 
                class="w-16 px-1.5 py-0.5 rounded bg-[#181d2a] border border-[#2e374d] text-amber-400 font-mono text-[11px] outline-none focus:border-amber-400">
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="flex items-center bg-[#181d2a] border border-[#2e374d] rounded-lg overflow-hidden">
              <button onclick="APP.changeEditBillItemQty(${idx}, -1)" class="w-6 h-6 flex items-center justify-center text-xs font-bold text-neutral-300 hover:text-white bg-[#222839]">-</button>
              <span class="px-2 font-mono font-bold text-xs text-white">${qty}</span>
              <button onclick="APP.changeEditBillItemQty(${idx}, 1)" class="w-6 h-6 flex items-center justify-center text-xs font-bold text-neutral-300 hover:text-white bg-[#222839]">+</button>
            </div>
            <span class="font-mono font-bold text-xs text-emerald-400 w-16 text-right">₹${lineTotal}</span>
            <button onclick="APP.removeEditBillItem(${idx})" title="Remove item" class="w-6 h-6 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800/40 text-red-300 flex items-center justify-center text-xs">✕</button>
          </div>
        </div>
      `;
    }).join('');
  },



  changeEditBillItemQty(idx, delta) {
    if (!this.state.editBillItems[idx]) return;
    this.state.editBillItems[idx].qty = Math.max(1, (Number(this.state.editBillItems[idx].qty) || 1) + delta);
    this.renderEditBillItemsList();
    this.recalculateEditBillTotals();
  },

  updateEditBillItemPrice(idx, newPrice) {
    if (!this.state.editBillItems[idx]) return;
    this.state.editBillItems[idx].price = Math.max(0, Number(newPrice) || 0);
    this.recalculateEditBillTotals();
  },

  removeEditBillItem(idx) {
    if (!this.state.editBillItems[idx]) return;
    this.state.editBillItems.splice(idx, 1);
    this.renderEditBillItemsList();
    this.recalculateEditBillTotals();
  },

  editBillAddItemPrompt() {
    const name = prompt('Enter dish name:');
    if (!name || !name.trim()) return;
    const priceStr = prompt('Enter price (₹):', '250');
    const price = Math.max(0, Number(priceStr) || 0);

    this.state.editBillItems.push({
      id: 'custom-' + Date.now(),
      name: name.trim(),
      price: price,
      qty: 1,
      amount: price
    });
    this.renderEditBillItemsList();
    this.recalculateEditBillTotals();
  },

  recalculateEditBillTotals(skipTaxRecalc = false) {
    let subtotal = 0;
    if (this.state.editBillItems && this.state.editBillItems.length > 0) {
      subtotal = this.state.editBillItems.reduce((acc, it) => acc + ((Number(it.price) || 0) * (Number(it.qty) || 1)), 0);
      const subtotalEl = document.getElementById('edit-bill-subtotal');
      if (subtotalEl) subtotalEl.value = subtotal;
    } else {
      subtotal = Number(document.getElementById('edit-bill-subtotal')?.value || 0);
    }

    const discType = document.getElementById('edit-bill-discount-type')?.value || 'none';
    const discVal = Number(document.getElementById('edit-bill-discount-val')?.value || 0);
    let discountAmount = 0;
    if (discType === 'percent') {
      discountAmount = Math.round((subtotal * discVal) / 100);
    } else if (discType === 'flat') {
      discountAmount = discVal;
    }
    discountAmount = Math.min(discountAmount, subtotal);

    const taxable = Math.max(0, subtotal - discountAmount);

    const store = (window.DB && window.DB.storeSettings) || {};
    const cgstPct = parseFloat(store.cgst_percent !== undefined ? store.cgst_percent : 2.5) || 2.5;
    const sgstPct = parseFloat(store.sgst_percent !== undefined ? store.sgst_percent : 2.5) || 2.5;
    const servPct = parseFloat(store.service_charge_percent !== undefined ? store.service_charge_percent : 0) || 0;

    let cgst = 0;
    let sgst = 0;
    let servCharge = 0;
    if (!skipTaxRecalc) {
      cgst = parseFloat((taxable * (cgstPct / 100)).toFixed(2));
      sgst = parseFloat((taxable * (sgstPct / 100)).toFixed(2));
      servCharge = parseFloat((taxable * (servPct / 100)).toFixed(2));
      const cgstEl = document.getElementById('edit-bill-cgst');
      const sgstEl = document.getElementById('edit-bill-sgst');
      const servEl = document.getElementById('edit-bill-service-charge');
      if (cgstEl) cgstEl.value = cgst;
      if (sgstEl) sgstEl.value = sgst;
      if (servEl && servPct > 0) servEl.value = servCharge;
    } else {
      cgst = Number(document.getElementById('edit-bill-cgst')?.value || 0);
      sgst = Number(document.getElementById('edit-bill-sgst')?.value || 0);
      servCharge = Number(document.getElementById('edit-bill-service-charge')?.value || 0);
    }

    let roundOff = 0;
    const rawTotal = taxable + cgst + sgst + servCharge;
    if (!skipTaxRecalc) {
      const rounded = Math.round(rawTotal);
      roundOff = parseFloat((rounded - rawTotal).toFixed(2));
      const roundOffEl = document.getElementById('edit-bill-round-off');
      if (roundOffEl) roundOffEl.value = roundOff;
    } else {
      roundOff = Number(document.getElementById('edit-bill-round-off')?.value || 0);
    }

    const grandTotal = Math.round(rawTotal + roundOff);
    const grandTotalEl = document.getElementById('edit-bill-grand-total');
    if (grandTotalEl) grandTotalEl.textContent = `₹${grandTotal}`;
  },

  handleEditReasonPresetChange(val) {
    const input = document.getElementById('edit-bill-reason-text');
    if (!input) return;
    if (val === 'Other') {
      input.value = '';
      input.placeholder = 'Type custom reason here...';
      input.focus();
    } else {
      input.placeholder = `Additional remarks for "${val}" (optional)...`;
    }
  },

  async saveBillModifications() {
    if (this.state.userRole !== 'manager') {
      this.showToast('🔒 Manager login required');
      this.openWelcomeAuthModal();
      return;
    }

    if (!this.state.activeEditBill) return;

    const preset = document.getElementById('edit-bill-reason-preset')?.value || '';
    const customReason = (document.getElementById('edit-bill-reason-text')?.value || '').trim();
    const finalReason = (preset === 'Other' || customReason) ? (customReason || preset) : preset;

    if (!finalReason) {
      this.showToast('⚠️ Please enter a reason for modifying this bill');
      return;
    }

    const custName = (document.getElementById('edit-bill-cust-name')?.value || '').trim();
    const custPhone = (document.getElementById('edit-bill-cust-phone')?.value || '').trim();
    const restaurantName = (document.getElementById('edit-bill-rest-name')?.value || '').trim();
    const gstin = (document.getElementById('edit-bill-gstin')?.value || '').trim();
    const fssai = (document.getElementById('edit-bill-fssai')?.value || '').trim();
    const paymentMode = document.getElementById('edit-bill-payment-mode')?.value || 'upi';
    const subtotal = Number(document.getElementById('edit-bill-subtotal')?.value || 0);
    const discountType = document.getElementById('edit-bill-discount-type')?.value || 'none';
    const discountValue = Number(document.getElementById('edit-bill-discount-val')?.value || 0);
    
    let discountAmount = 0;
    if (discountType === 'percent') discountAmount = Math.round((subtotal * discountValue) / 100);
    else if (discountType === 'flat') discountAmount = discountValue;

    const cgst = Number(document.getElementById('edit-bill-cgst')?.value || 0);
    const sgst = Number(document.getElementById('edit-bill-sgst')?.value || 0);
    const serviceCharge = Number(document.getElementById('edit-bill-service-charge')?.value || 0);
    const roundOff = Number(document.getElementById('edit-bill-round-off')?.value || 0);
    const grandTotal = Number(document.getElementById('edit-bill-grand-total')?.textContent.replace('₹', '') || 0);

    const payload = {
      billId: this.state.activeEditBill.id,
      invoiceNumber: this.state.activeEditBill.invoice_number,
      managerEmail: this.state.userEmail || '',
      authorizedRole: this.state.userRole || 'manager',
      reason: finalReason,
      restaurantName,
      gstin,
      fssai,
      customerName: custName || 'Guest',
      customerPhone: custPhone,
      paymentMode,
      subtotal,
      discountType,
      discountValue,
      discountAmount,
      cgst,
      sgst,
      serviceCharge,
      roundOff,
      grandTotal,
      items: this.state.editBillItems
    };

    try {
      const res = await window.DB.updateBill(payload);
      this.haptic('success');
      this.showToast(`✅ Invoice #${this.state.activeEditBill.invoice_number} updated & logged!`);
      if (window.OnyxTelemetry) window.OnyxTelemetry.log('BILL_EDITED', 'action', { billId: payload.billId, invoiceNumber: payload.invoiceNumber, reason: payload.reason });
      this.closeEditBillModal();
      this.openPastBillsModal(); // Refresh list with updated invoice
    } catch (err) {
      this.showToast(`❌ ${err.message || 'Failed to update bill'}`);
    }
  },

  // ================= 8E. BILL MODIFICATION AUDIT LOGS VIEWER =================
  async openBillAuditLogsModal() {
    const modal = document.getElementById('bill-audit-logs-modal');
    const list = document.getElementById('bill-audit-logs-list');
    if (modal) modal.classList.remove('hidden');

    try {
      const logs = await window.DB.getBillEditLogs();
      if (logs && logs.length > 0) {
        list.innerHTML = logs.map(l => {
          const dt = new Date(l.created_at || Date.now());
          const timeStr = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ', ' + dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
          return `
            <div class="p-3 rounded-xl bg-[#0e1119] border border-[#23293a] space-y-1.5">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="font-mono text-amber-400 font-bold text-xs">#${l.invoice_number}</span>
                  <span class="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded">${l.manager_email}</span>
                </div>
                <span class="text-[10px] text-neutral-400">🕒 ${timeStr}</span>
              </div>
              <div class="text-[11px] font-mono text-emerald-300 bg-[#141926] p-2 rounded-lg border border-[#232b40]">
                ${l.changes_summary}
              </div>
              <div class="text-[10px] text-neutral-300 flex items-center gap-1">
                <span class="text-neutral-500 font-bold uppercase">Reason:</span>
                <span>${l.reason}</span>
              </div>
            </div>
          `;
        }).join('');
      } else {
        list.innerHTML = `<div class="text-center py-8 text-neutral-400">No bill edit audit records found yet.</div>`;
      }
    } catch (e) {
      list.innerHTML = `<div class="text-center py-8 text-red-400">Failed to load audit logs.</div>`;
    }
  },

  closeBillAuditLogsModal() {
    const modal = document.getElementById('bill-audit-logs-modal');
    if (modal) modal.classList.add('hidden');
  },

  // ================= 8F. RESTAURANT BILL PROFILE & STORE CONFIG MODAL =================
  openStoreSettingsModal() {
    if (this.state.userRole !== 'manager') {
      this.showToast('🔒 Manager credentials required to edit restaurant profile & taxes');
      this.openWelcomeAuthModal();
      return;
    }

    const modal = document.getElementById('store-settings-modal');
    const store = (window.DB && window.DB.storeSettings) || {};

    const nameEl = document.getElementById('store-setting-name');
    const taglineEl = document.getElementById('store-setting-tagline');
    const addressEl = document.getElementById('store-setting-address');
    const phoneEl = document.getElementById('store-setting-phone');
    const emailEl = document.getElementById('store-setting-email');
    const gstinEl = document.getElementById('store-setting-gstin');
    const fssaiEl = document.getElementById('store-setting-fssai');
    const upiEl = document.getElementById('store-setting-upi');
    const cgstEl = document.getElementById('store-setting-cgst');
    const sgstEl = document.getElementById('store-setting-sgst');
    const serviceEl = document.getElementById('store-setting-service');
    const footerEl = document.getElementById('store-setting-footer');
    const reasonEl = document.getElementById('store-setting-reason');

    if (nameEl) nameEl.value = store.restaurant_name || 'BYOB INDIRAPURAM';
    if (taglineEl) taglineEl.value = store.tagline || 'Bring Your Own Bottle Experience';
    if (addressEl) addressEl.value = store.address || 'Plot 14, Dr. Sushila Naiyyar Marg, Indirapuram, Ghaziabad';
    if (phoneEl) phoneEl.value = store.phone || '+91 98765 43210';
    if (emailEl) emailEl.value = store.email || 'contact@byobindirapuram.com';
    if (gstinEl) gstinEl.value = store.gstin || '07AABCB1234F1Z9';
    if (fssaiEl) fssaiEl.value = store.fssai || '12724055000123';
    if (upiEl) upiEl.value = store.upi_vpa || 'byobindirapuram@icici';
    if (cgstEl) cgstEl.value = store.cgst_percent || '2.5';
    if (sgstEl) sgstEl.value = store.sgst_percent || '2.5';
    if (serviceEl) serviceEl.value = store.service_charge_percent || '0';
    if (footerEl) footerEl.value = store.bill_footer || 'Thank you for visiting! Guests are welcome to Bring Their Own Bottle.';
    if (reasonEl) reasonEl.value = '';

    // Populate OTA App Update Controls
    if (window.DB && typeof window.DB.getAppUpdateInfo === 'function') {
      window.DB.getAppUpdateInfo().then(info => {
        const latestVerEl = document.getElementById('update-setting-latest-version');
        const minVerEl = document.getElementById('update-setting-min-version');
        const forceEl = document.getElementById('update-setting-force-toggle');
        const titleEl = document.getElementById('update-setting-title');
        const notesEl = document.getElementById('update-setting-notes');

        if (latestVerEl) latestVerEl.value = info.latest_version || '2.5';
        if (minVerEl) minVerEl.value = info.min_supported_version || '2.4';
        if (forceEl) forceEl.checked = Number(info.force_update) === 1;
        if (titleEl) titleEl.value = info.update_title || 'Critical POS & Sync Engine Update';
        if (notesEl) notesEl.value = info.update_notes || 'Bug fixes, new billing features & synchronization speed improvements.';
      }).catch(() => {});
    }

    if (modal) modal.classList.remove('hidden');
  },

  closeStoreSettingsModal() {
    const modal = document.getElementById('store-settings-modal');
    if (modal) modal.classList.add('hidden');
  },

  async pushAppUpdateFromSettings() {
    if (this.state.userRole !== 'manager') {
      this.showToast('🔒 Manager authorization required');
      this.openWelcomeAuthModal();
      return;
    }

    const latestVersion = (document.getElementById('update-setting-latest-version')?.value || '').trim() || '2.5';
    const minSupportedVersion = (document.getElementById('update-setting-min-version')?.value || '').trim() || '2.4';
    const forceUpdate = document.getElementById('update-setting-force-toggle')?.checked || false;
    const updateTitle = (document.getElementById('update-setting-title')?.value || '').trim() || 'Mandatory App Update';
    const updateNotes = (document.getElementById('update-setting-notes')?.value || '').trim() || 'Critical bug fixes and performance updates.';

    try {
      if (window.DB && typeof window.DB.setAppUpdate === 'function') {
        await window.DB.setAppUpdate({
          latestVersion,
          minSupportedVersion,
          forceUpdate,
          updateTitle,
          updateNotes,
          apkUrl: '/ONYX_POS.apk',
          apkSize: '0.13 MB',
          updatedBy: this.state.userEmail || 'Manager'
        });
        this.showToast(`📢 Update v${latestVersion} pushed! Force lock: ${forceUpdate ? 'ACTIVE' : 'OFF'}`);
        this.haptic('success');
        this.playBeep('punch');
        this.closeStoreSettingsModal();
      }
    } catch (e) {
      console.error('Failed to push update:', e);
      this.showToast('❌ Failed to push update: ' + e.message);
    }
  },

  async saveStoreSettingsModal() {
    if (this.state.userRole !== 'manager') {
      this.showToast('🔒 Manager login required');
      this.openWelcomeAuthModal();
      return;
    }

    const reason = (document.getElementById('store-setting-reason')?.value || '').trim();
    if (!reason) {
      this.showToast('⚠️ Please enter a reason for updating restaurant profile');
      return;
    }

    const newSettings = {
      restaurant_name: (document.getElementById('store-setting-name')?.value || '').trim() || 'BYOB INDIRAPURAM',
      tagline: (document.getElementById('store-setting-tagline')?.value || '').trim(),
      address: (document.getElementById('store-setting-address')?.value || '').trim(),
      phone: (document.getElementById('store-setting-phone')?.value || '').trim(),
      email: (document.getElementById('store-setting-email')?.value || '').trim(),
      gstin: (document.getElementById('store-setting-gstin')?.value || '').trim(),
      fssai: (document.getElementById('store-setting-fssai')?.value || '').trim(),
      upi_vpa: (document.getElementById('store-setting-upi')?.value || '').trim(),
      cgst_percent: (document.getElementById('store-setting-cgst')?.value || '2.5').trim(),
      sgst_percent: (document.getElementById('store-setting-sgst')?.value || '2.5').trim(),
      service_charge_percent: (document.getElementById('store-setting-service')?.value || '0').trim(),
      bill_footer: (document.getElementById('store-setting-footer')?.value || '').trim()
    };

    try {
      await window.DB.updateStoreSettings(newSettings, this.state.userEmail || 'admin@google.in', reason);
      this.haptic('success');
      this.showToast('✅ Restaurant Bill Profile & Tax Config Updated!');
      this.closeStoreSettingsModal();
      this.refreshBillingModalData();
      this.updateCartUI();
    } catch (err) {
      this.showToast(`❌ ${err.message || 'Failed to update store settings'}`);
    }
  },

  updateTableHeaderBadges() {
    const t = this.getTable();
    // Top Bar
    const hName = document.getElementById('header-table-name');
    const hLandmark = document.getElementById('header-table-landmark');
    if (hName) hName.textContent = t.name;
    if (hLandmark) hLandmark.textContent = `(${t.position})`;

    // Mobile App Sub Header
    const appSub = document.getElementById('app-sub-table');
    const appLandmark = document.getElementById('app-sub-landmark');
    if (appSub) appSub.textContent = t.name;
    if (appLandmark) appLandmark.textContent = t.position;

    // Web POS Title & Landmark
    const posTitle = document.getElementById('pos-table-title');
    const posLandmark = document.getElementById('pos-table-landmark');
    if (posTitle) posTitle.textContent = t.name;
    if (posLandmark) posLandmark.textContent = `${t.landmark} • ${t.seats} Seats`;
  },

  // ================= 9. REAL-TIME SERVER & DATABASE DUAL HEALTH MONITOR =================
  initSystemHealthMonitor() {
    // Initial health check immediately
    this.checkSystemHealth();
    // Re-check periodically every 8 seconds
    setInterval(() => this.checkSystemHealth(), 8000);
  },

  _smoothedServerLatency: null,
  _smoothedDbLatency: null,
  _consecutiveSlowCount: 0,

  async checkSystemHealth() {
    let serverHealth = { status: 'red', latency: 0, label: 'Down' };
    let dbHealth = { status: 'red', latency: 0, label: 'Offline' };

    // 1. Check Server Latency via /api/ping with Moving Average Smoothing
    try {
      const t0 = performance.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const apiBase = (window.DB && typeof window.DB.getApiBase === 'function') ? window.DB.getApiBase() : '';
      const res = await fetch(`${apiBase}/api/ping`, { cache: 'no-store', signal: controller.signal });
      clearTimeout(timeoutId);
      const rawLatency = Math.round(performance.now() - t0);

      if (res.ok) {
        if (this._smoothedServerLatency === null) {
          this._smoothedServerLatency = rawLatency;
        } else {
          // Exponential moving average (70% previous, 30% current) prevents jitter flickering
          this._smoothedServerLatency = Math.round((this._smoothedServerLatency * 0.7) + (rawLatency * 0.3));
        }

        const displayLatency = this._smoothedServerLatency;
        // Commercial threshold: <= 380ms is solid green for cloud/mobile edge
        if (displayLatency <= 380) {
          this._consecutiveSlowCount = 0;
          serverHealth = { status: 'green', latency: displayLatency, label: `${displayLatency}ms` };
        } else {
          this._consecutiveSlowCount = (this._consecutiveSlowCount || 0) + 1;
          if (this._consecutiveSlowCount >= 2) {
            serverHealth = { status: 'yellow', latency: displayLatency, label: `Slow (${displayLatency}ms)` };
          } else {
            // Absorb single spike without flickering UI
            serverHealth = { status: 'green', latency: displayLatency, label: `${displayLatency}ms` };
          }
        }
      } else {
        serverHealth = { status: 'red', latency: rawLatency, label: 'Err' };
        if (window.DB && typeof window.DB.autoDiscoverServer === 'function') {
          window.DB.autoDiscoverServer();
        }
      }
    } catch (err) {
      serverHealth = { status: 'red', latency: 0, label: 'Down' };
      if (window.DB && typeof window.DB.autoDiscoverServer === 'function') {
        window.DB.autoDiscoverServer();
      }
    }

    // 2. Check Database Status
    try {
      const dbMode = window.DB ? window.DB.mode : null;
      if (dbMode === 'supabase_cloud' && typeof ONYX_CLOUD_CONFIG !== 'undefined') {
        const client = ONYX_CLOUD_CONFIG.getClient();
        if (client) {
          const t0 = performance.now();
          const { data, error } = await client.from('tables').select('id').limit(1);
          const rawDbLat = Math.round(performance.now() - t0);
          if (!error) {
            if (this._smoothedDbLatency === null) {
              this._smoothedDbLatency = rawDbLat;
            } else {
              this._smoothedDbLatency = Math.round((this._smoothedDbLatency * 0.7) + (rawDbLat * 0.3));
            }
            const dbLat = this._smoothedDbLatency;
            if (dbLat <= 450) {
              dbHealth = { status: 'green', latency: dbLat, label: 'Live' };
            } else {
              dbHealth = { status: 'yellow', latency: dbLat, label: `Cloud (${dbLat}ms)` };
            }
          } else {
            dbHealth = { status: 'red', latency: rawDbLat, label: 'Cloud Err' };
          }
        }
      } else if (dbMode === 'sqlite_server') {
        if (serverHealth.status === 'green') {
          dbHealth = { status: 'green', latency: serverHealth.latency, label: 'SQLite' };
        } else if (serverHealth.status === 'yellow') {
          dbHealth = { status: 'yellow', latency: serverHealth.latency, label: 'Slow' };
        } else {
          dbHealth = { status: 'red', latency: 0, label: 'Offline' };
        }
      } else if (dbMode === 'offline_fallback') {
        dbHealth = { status: 'yellow', latency: 0, label: 'Local Cache' };
      } else {
        // Mode resolving or connecting
        dbHealth = { status: 'green', latency: 0, label: 'Live' };
      }
    } catch (e) {
      dbHealth = { status: 'red', latency: 0, label: 'Offline' };
    }

    this.renderSystemHealthBadge(serverHealth, dbHealth);
  },

  renderSystemHealthBadge(server, db) {
    const badge = document.getElementById('system-health-badge');
    const sDot = document.getElementById('server-status-dot');
    const sText = document.getElementById('server-status-text');
    const dDot = document.getElementById('db-status-dot');
    const dText = document.getElementById('db-status-text');

    if (!badge || !sDot || !sText || !dDot || !dText) return;

    // Server visual state (Green / Yellow / Red)
    if (server.status === 'green') {
      sDot.className = 'w-2 h-2 rounded-full bg-emerald-400 sync-pulse';
      sText.className = 'font-bold text-emerald-400';
      sText.textContent = `Server: ${server.label}`;
    } else if (server.status === 'yellow') {
      sDot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-pulse';
      sText.className = 'font-bold text-amber-400';
      sText.textContent = `Server: ${server.label}`;
    } else {
      sDot.className = 'w-2 h-2 rounded-full bg-red-500 animate-pulse';
      sText.className = 'font-bold text-red-400';
      sText.textContent = 'Server: Down';
    }

    // Database visual state (Green / Yellow / Red)
    if (db.status === 'green') {
      dDot.className = 'w-2 h-2 rounded-full bg-emerald-400 sync-pulse';
      dText.className = 'font-bold text-emerald-400';
      dText.textContent = `DB: ${db.label}`;
    } else if (db.status === 'yellow') {
      dDot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-pulse';
      dText.className = 'font-bold text-amber-400';
      dText.textContent = `DB: ${db.label}`;
    } else {
      dDot.className = 'w-2 h-2 rounded-full bg-red-500 animate-pulse';
      dText.className = 'font-bold text-red-400';
      dText.textContent = 'DB: Offline';
    }

    // Outer Badge Container Glow (Green / Yellow / Red)
    if (server.status === 'red' || db.status === 'red') {
      badge.className = 'flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-[10px] sm:text-[11px] font-mono transition-all duration-300 shadow bg-[#221010] border-red-500/60';
    } else if (server.status === 'yellow' || db.status === 'yellow') {
      badge.className = 'flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-[10px] sm:text-[11px] font-mono transition-all duration-300 shadow bg-[#1e190e] border-amber-500/50';
    } else {
      badge.className = 'flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-[10px] sm:text-[11px] font-mono transition-all duration-300 shadow bg-[#0d1714] border-emerald-500/40';
    }
  },

  // ================= 10. OTA APP UPDATES & MANDATORY FORCE UPDATE ENGINE =================
  compareVersions(v1, v2) {
    if (!v1 && !v2) return 0;
    if (!v1) return -1;
    if (!v2) return 1;
    const p1 = v1.toString().replace(/^v/i, '').split('.').map(n => parseInt(n) || 0);
    const p2 = v2.toString().replace(/^v/i, '').split('.').map(n => parseInt(n) || 0);
    const len = Math.max(p1.length, p2.length);
    for (let i = 0; i < len; i++) {
      const a = p1[i] || 0;
      const b = p2[i] || 0;
      if (a > b) return 1;
      if (a < b) return -1;
    }
    return 0;
  },

  setupAppUpdateListeners() {
    if (!window.DB) return;

    // 1. SSE Real-time push updates listener
    if (typeof window.DB.onAppUpdate === 'function') {
      window.DB.onAppUpdate((update) => {
        this.handleIncomingAppUpdate(update);
      });
    }

    // 2. Fetch current version status on launch
    if (typeof window.DB.getAppUpdateInfo === 'function') {
      window.DB.getAppUpdateInfo().then((info) => {
        if (info) this.handleIncomingAppUpdate(info);
      }).catch(err => console.log('Update check:', err));
    }
  },

  handleIncomingAppUpdate(info) {
    if (!info) return;
    this.state.latestUpdateInfo = info;
    const installedVer = localStorage.getItem('onyx_installed_version') || this.CURRENT_VERSION;

    const isForced = Number(info.force_update) === 1;
    const isNewer = this.compareVersions(info.latest_version, installedVer) > 0;
    const isBelowMin = this.compareVersions(info.min_supported_version, installedVer) > 0;

    if (isForced && (isNewer || isBelowMin)) {
      this.showForceUpdateModal(info, installedVer);
    } else {
      const modal = document.getElementById('force-update-modal');
      if (modal && !this.state.isForceUpdateLocked) {
        modal.classList.add('hidden');
      }
    }
  },

  showForceUpdateModal(info, installedVer) {
    this.state.isForceUpdateLocked = true;
    this.state.pendingUpdate = info;

    const modal = document.getElementById('force-update-modal');
    if (!modal) return;

    const titleEl = document.getElementById('force-update-title');
    const curEl = document.getElementById('force-update-current-ver');
    const newEl = document.getElementById('force-update-new-ver');
    const notesEl = document.getElementById('force-update-notes');
    const statusEl = document.getElementById('force-update-status');
    const btnEl = document.getElementById('btn-perform-force-update');

    if (titleEl) titleEl.textContent = info.update_title || 'Mandatory App Update';
    if (curEl) curEl.textContent = `v${installedVer}`;
    if (newEl) newEl.textContent = `v${info.latest_version}`;
    if (notesEl) {
      const notes = info.update_notes || 'Critical database and order sync fixes.\nHigh-speed floor mapping and table live indicators.\nAutomatic local cache purge.';
      notesEl.innerHTML = notes.split('\n').filter(Boolean).map(line => `• ${line}`).join('<br>');
    }
    if (statusEl) statusEl.classList.add('hidden');
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.className = "w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 active:scale-95 text-black font-black text-sm uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2";
      btnEl.innerHTML = '<span>⚡ 1-Click Download & Update</span>';
      btnEl.onclick = () => APP.performOneClickUpdate();
    }

    modal.classList.remove('hidden');
    this.haptic('alert');
    this.playBeep('void');
  },

  async performOneClickUpdate() {
    const btnEl = document.getElementById('btn-perform-force-update');
    const statusEl = document.getElementById('force-update-status');
    const info = this.state.pendingUpdate || this.state.latestUpdateInfo || { latest_version: '2.5', apk_url: '/ONYX_POS.apk' };

    if (btnEl) {
      btnEl.disabled = true;
      btnEl.innerHTML = '<span class="inline-block animate-spin mr-2">⏳</span><span>Downloading Update to Device...</span>';
    }
    if (statusEl) {
      statusEl.classList.remove('hidden');
      statusEl.className = "text-xs text-amber-300 font-mono text-center";
      statusEl.textContent = '⏳ Saving update package to phone downloads / local storage...';
    }

    const apkUrl = info.apk_url || '/ONYX_POS.apk';
    const targetFilename = `ONYX_POS_v${info.latest_version || 'latest'}.apk`;

    // 1. Download file via anchor trigger
    try {
      const a = document.createElement('a');
      a.href = apkUrl;
      a.download = targetFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.warn('Anchor download notice:', e);
    }

    // 2. Direct browser navigation to ensure WebView DownloadListener catches it
    setTimeout(() => {
      try {
        window.location.href = apkUrl;
      } catch (err) {}
    }, 250);

    // 3. Clear cache and ServiceWorker
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const k of keys) await caches.delete(k);
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.update();
      }
    } catch (cacheErr) {
      console.warn('Cache purge notice:', cacheErr);
    }

    // 4. Update local version in localStorage
    localStorage.setItem('onyx_installed_version', info.latest_version);

    // 5. Update UI to ready state
    setTimeout(() => {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.className = "w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-black text-sm uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2";
        btnEl.innerHTML = '<span>🔄 Tap to Restart App Now</span>';
        btnEl.onclick = () => {
          window.location.reload(true);
        };
      }
      if (statusEl) {
        statusEl.className = "text-xs text-emerald-400 font-mono text-center";
        statusEl.textContent = '✅ Update Downloaded to phone storage! Tap APK to install or tap Restart App.';
      }
      this.haptic('success');
      this.playBeep('punch');
    }, 1200);
  },

  // ================= MANAGER COMMAND CENTER (ALL-IN-ONE) =================
  openManagerPinGate() {
    this.closeManagerSidebar();
    document.body.classList.remove('mgr-view-active');
    document.body.classList.remove('mgr-sidebar-open');
    const pinModal = document.getElementById('mgr-pin-gate-modal');
    const pinInput = document.getElementById('mgr-gate-pin-input');
    const pinErr = document.getElementById('mgr-gate-pin-error');
    if (pinInput) pinInput.value = '';
    if (pinErr) pinErr.classList.add('hidden');
    
    // Switch to normal box, hide forgot box
    this.backToPinGate();
    
    // Check security status to show whether PIN is set or default
    this.updateGatePinStatus();
    
    if (pinModal) pinModal.classList.remove('hidden');
    if (pinInput) setTimeout(() => pinInput.focus(), 150);
  },

  closeManagerPinGate() {
    const pinModal = document.getElementById('mgr-pin-gate-modal');
    if (pinModal) pinModal.classList.add('hidden');
  },

  async updateGatePinStatus() {
    const statusPill = document.getElementById('mgr-gate-status-pill');
    try {
      const sec = await DB.getManagerSecurityStatus();
      this.state.managerSecurity = sec;
      if (statusPill) {
        if (sec.isPinSet) {
          statusPill.className = "mt-2 py-1 px-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold inline-block";
          statusPill.textContent = "Master PIN Protected 🔐";
        } else {
          statusPill.className = "mt-2 py-1 px-3 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold inline-block";
          statusPill.textContent = "Unset (Default: 1234) ⚠️";
        }
      }
    } catch (e) {
      console.warn('Status check failed:', e);
    }
  },

  async verifyManagerPinAccess() {
    const pinInput = document.getElementById('mgr-gate-pin-input');
    const pinErr = document.getElementById('mgr-gate-pin-error');
    const pin = (pinInput ? pinInput.value : '').trim();
    
    if (!pin) {
      if (pinErr) {
        pinErr.classList.remove('hidden');
        pinErr.textContent = 'Please enter your Master PIN.';
      }
      this.haptic('error');
      return;
    }

    try {
      const staffMatch = (this.state.staff || []).find(s => s.pin === pin && (s.role === 'admin' || s.role === 'manager' || s.role === 'cashier'));
      const activePin = (window.DB && window.DB.storeSettings && window.DB.storeSettings.manager_pin) || '1234';

      let isAuthorized = (pin === activePin || Boolean(staffMatch));

      if (!isAuthorized && window.DB && typeof window.DB.authenticatePin === 'function') {
        const authRes = await window.DB.authenticatePin(pin);
        if (authRes && authRes.success && (authRes.user?.role === 'admin' || authRes.user?.role === 'manager')) {
          isAuthorized = true;
        }
      }

      if (isAuthorized) {
        this.state.userRole = 'manager';
        this.state.currentStaffName = staffMatch ? staffMatch.name : 'Store Manager';
        localStorage.setItem('onyx_user_role', 'manager');
        localStorage.setItem('onyx_staff_name', this.state.currentStaffName);
        this.closeManagerPinGate();
        this.setView('manager');
        this.showToast('👑 Welcome to Manager Command Center');
        this.haptic('success');
      } else {
        if (pinErr) {
          pinErr.classList.remove('hidden');
          pinErr.textContent = '❌ Invalid PIN! Please enter correct Master PIN or click "Forgot PIN" below.';
        }
        this.haptic('error');
      }
    } catch (e) {
      console.error('PIN verification error:', e);
      if (pin === '1234') {
        this.state.userRole = 'manager';
        this.closeManagerPinGate();
        this.setView('manager');
      } else if (pinErr) {
        pinErr.classList.remove('hidden');
        pinErr.textContent = '❌ Invalid PIN. Try again or recover below.';
      }
    }
  },

  async showForgotPinChallenge() {
    const normalBox = document.getElementById('mgr-gate-normal-box');
    const forgotBox = document.getElementById('mgr-gate-forgot-box');
    const qText = document.getElementById('mgr-gate-question-text');
    const errBox = document.getElementById('mgr-gate-forgot-error');
    if (errBox) errBox.classList.add('hidden');

    try {
      const sec = await DB.getManagerSecurityStatus();
      if (qText) {
        qText.textContent = sec.securityQuestion || 'What was the name of your first restaurant?';
      }
      if (normalBox) normalBox.classList.add('hidden');
      if (forgotBox) forgotBox.classList.remove('hidden');
      const ansInput = document.getElementById('mgr-gate-answer-input');
      if (ansInput) setTimeout(() => ansInput.focus(), 150);
    } catch (e) {
      this.showToast('⚠️ Could not load recovery question: ' + e.message, 'error');
    }
  },

  backToPinGate() {
    const normalBox = document.getElementById('mgr-gate-normal-box');
    const forgotBox = document.getElementById('mgr-gate-forgot-box');
    const ansInput = document.getElementById('mgr-gate-answer-input');
    const newPinInput = document.getElementById('mgr-gate-newpin-input');
    const confPinInput = document.getElementById('mgr-gate-confirmpin-input');
    const errBox = document.getElementById('mgr-gate-forgot-error');

    if (ansInput) ansInput.value = '';
    if (newPinInput) newPinInput.value = '';
    if (confPinInput) confPinInput.value = '';
    if (errBox) errBox.classList.add('hidden');

    if (normalBox) normalBox.classList.remove('hidden');
    if (forgotBox) forgotBox.classList.add('hidden');
  },

  async submitForgotPinAnswer() {
    const ansInput = document.getElementById('mgr-gate-answer-input');
    const newPinInput = document.getElementById('mgr-gate-newpin-input');
    const confPinInput = document.getElementById('mgr-gate-confirmpin-input');
    const errBox = document.getElementById('mgr-gate-forgot-error');

    const answer = (ansInput ? ansInput.value : '').trim();
    const newPin = (newPinInput ? newPinInput.value : '').trim();
    const confPin = (confPinInput ? confPinInput.value : '').trim();

    if (!answer) {
      if (errBox) {
        errBox.textContent = 'Please enter your secret recovery answer.';
        errBox.classList.remove('hidden');
      }
      return;
    }
    if (!newPin || !/^\d{4,6}$/.test(newPin)) {
      if (errBox) {
        errBox.textContent = 'New PIN must be 4 to 6 numeric digits.';
        errBox.classList.remove('hidden');
      }
      return;
    }
    if (newPin !== confPin) {
      if (errBox) {
        errBox.textContent = 'New PIN and Confirm PIN do not match.';
        errBox.classList.remove('hidden');
      }
      return;
    }

    try {
      const res = await DB.resetManagerPinWithAnswer({ answer, newPin });
      if (res && res.success) {
        this.showToast('✅ Master PIN Reset Successfully! Console Unlocked.');
        this.closeManagerPinGate();
        this.state.userRole = 'manager';
        this.state.currentStaffName = 'Store Manager';
        localStorage.setItem('onyx_user_role', 'manager');
        localStorage.setItem('onyx_staff_name', 'Store Manager');
        this.setView('manager');
        this.haptic('success');
      } else {
        throw new Error(res.error || 'Incorrect secret answer.');
      }
    } catch (e) {
      if (errBox) {
        errBox.textContent = '❌ ' + (e.message || 'Incorrect secret answer.');
        errBox.classList.remove('hidden');
      }
      this.haptic('error');
    }
  },

  lockManagerConsole() {
    this.closeManagerSidebar();
    document.body.classList.remove('mgr-view-active');
    document.body.classList.remove('mgr-sidebar-open');
    this.state.isManagerUnlocked = false;
    this.state.userRole = 'waiter';
    localStorage.setItem('onyx_user_role', 'waiter');
    this.setView('app');
    this.openManagerPinGate();
    this.showToast('🔒 Manager console locked');
  },

  // ================= MANAGER SLIDING HOVER SIDEBAR CONTROLS =================
  onSidebarHoverZoneEnter() {
    // STRICT GUARD: Sidebar is STRICTLY active ONLY in Manager Dashboard
    if (this.state.currentView !== 'manager' || !document.body.classList.contains('mgr-view-active')) {
      this.closeManagerSidebar();
      return;
    }
    const sidebar = document.getElementById('mgr-sliding-sidebar');
    const hdrBtn = document.getElementById('hdr-sidebar-toggle-btn');
    const hdrLabel = document.getElementById('hdr-sidebar-btn-label');
    const backdrop = document.getElementById('mgr-sidebar-backdrop');
    if (sidebar) sidebar.classList.add('open');
    if (hdrBtn) hdrBtn.classList.add('is-active');
    if (hdrLabel) hdrLabel.textContent = 'CLOSE';
    if (backdrop) backdrop.classList.add('active');
    document.body.classList.add('mgr-sidebar-open');
  },

  onSidebarMouseLeave() {
    const sidebar = document.getElementById('mgr-sliding-sidebar');
    if (sidebar && !sidebar.classList.contains('pinned')) {
      sidebar.classList.remove('open');
      const hdrBtn = document.getElementById('hdr-sidebar-toggle-btn');
      const hdrLabel = document.getElementById('hdr-sidebar-btn-label');
      const backdrop = document.getElementById('mgr-sidebar-backdrop');
      if (hdrBtn) hdrBtn.classList.remove('is-active');
      if (hdrLabel) hdrLabel.textContent = 'MENU';
      if (backdrop) backdrop.classList.remove('active');
      document.body.classList.remove('mgr-sidebar-open');
    }
  },

  toggleManagerSidebar() {
    // STRICT GUARD: Sidebar is STRICTLY active ONLY in Manager Dashboard
    if (this.state.currentView !== 'manager' || !document.body.classList.contains('mgr-view-active')) {
      this.closeManagerSidebar();
      return;
    }
    const sidebar = document.getElementById('mgr-sliding-sidebar');
    if (!sidebar) return;
    const willOpen = !sidebar.classList.contains('open');
    if (willOpen) {
      this.onSidebarHoverZoneEnter();
    } else {
      sidebar.classList.remove('pinned');
      this.closeManagerSidebar();
    }
  },

  togglePinManagerSidebar() {
    // STRICT GUARD: Sidebar is STRICTLY active ONLY in Manager Dashboard
    if (this.state.currentView !== 'manager' || !document.body.classList.contains('mgr-view-active')) {
      this.closeManagerSidebar();
      return;
    }
    const sidebar = document.getElementById('mgr-sliding-sidebar');
    const pinBtn = document.getElementById('mgr-sidebar-pin-btn');
    if (!sidebar) return;
    const isPinned = sidebar.classList.toggle('pinned');
    if (pinBtn) {
      pinBtn.style.color = isPinned ? '#f59e0b' : '';
      pinBtn.title = isPinned ? 'Sidebar Pinned (Click to Unpin)' : 'Pin Sidebar';
    }
    this.showToast(isPinned ? '📌 Sidebar pinned open' : '🔓 Auto slide on hover enabled');
  },

  closeManagerSidebar() {
    const sidebar = document.getElementById('mgr-sliding-sidebar');
    const hdrBtn = document.getElementById('hdr-sidebar-toggle-btn');
    const hdrLabel = document.getElementById('hdr-sidebar-btn-label');
    const backdrop = document.getElementById('mgr-sidebar-backdrop');
    if (sidebar) {
      sidebar.classList.remove('open');
      sidebar.classList.remove('pinned');
    }
    if (hdrBtn) hdrBtn.classList.remove('is-active');
    if (hdrLabel) hdrLabel.textContent = 'MENU';
    if (backdrop) backdrop.classList.remove('active');
    document.body.classList.remove('mgr-sidebar-open');
  },

  selectManagerNavTab(tab) {
    // STRICT GUARD: Only allowed when active in manager view
    if (this.state.currentView !== 'manager') return;
    this.setManagerTab(tab);
    const sidebar = document.getElementById('mgr-sliding-sidebar');
    if (sidebar && !sidebar.classList.contains('pinned')) {
      this.closeManagerSidebar();
    }
  },

  setManagerTab(tab) {
    this.state.mgrActiveTab = tab;
    const tabs = ['sales', 'tables', 'menu', 'invoices', 'voids', 'staff', 'security', 'store', 'ota'];
    
    const tabTitles = {
      sales: 'Sales & Z-Report',
      tables: '3-Floor Tables (35 Tables)',
      menu: 'Menu & Live Pricing (86 Dishes)',
      invoices: 'Past Invoices & Audit',
      voids: 'Anti-Theft Void Logs',
      staff: 'Staff & Waiter PINs',
      security: 'Manager PIN & Security',
      store: 'Store Profile & GST Tax',
      ota: 'APK & OTA Updates'
    };

    const titleEl = document.getElementById('mgr-active-tab-title');
    if (titleEl && tabTitles[tab]) {
      titleEl.textContent = tabTitles[tab];
    }

    const hdrSecName = document.getElementById('hdr-active-section-name');
    if (hdrSecName && tabTitles[tab]) {
      hdrSecName.textContent = tabTitles[tab];
    }

    // Update horizontal pills and sidebar nav items
    tabs.forEach(t => {
      const btn = document.getElementById(`mgr-tab-btn-${t}`);
      const pane = document.getElementById(`mgr-content-${t}`);
      const navItem = document.getElementById(`mgr-nav-${t}`);

      if (t === tab) {
        if (btn) btn.className = "mgr-tab-pill active px-3.5 py-2 rounded-xl text-xs font-bold transition-all bg-amber-500 text-black flex items-center gap-1.5 whitespace-nowrap shadow";
        if (pane) pane.classList.remove('hidden');
        if (navItem) navItem.classList.add('active');
      } else {
        if (btn) {
          if (t === 'security') {
            btn.className = "mgr-tab-pill px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all flex items-center gap-1.5 whitespace-nowrap";
          } else {
            btn.className = "mgr-tab-pill px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-[#1a2030] transition-all flex items-center gap-1.5 whitespace-nowrap";
          }
        }
        if (pane) pane.classList.add('hidden');
        if (navItem) navItem.classList.remove('active');
      }
    });

    if (tab === 'sales') this.loadManagerAnalytics();
    else if (tab === 'tables') this.renderManagerTables();
    else if (tab === 'menu') this.renderManagerMenu();
    else if (tab === 'invoices') this.loadManagerInvoices();
    else if (tab === 'voids') this.loadManagerVoidLogs();
    else if (tab === 'staff') this.loadManagerStaff();
    else if (tab === 'security') this.loadManagerSecurity();
    else if (tab === 'store') this.loadManagerStoreSettings();
    else if (tab === 'ota') this.loadManagerOTAInfo();
  },

  // ================= MANAGER PIN & SECURITY PANE METHODS =================
  async loadManagerSecurity(showToastFeedback = false) {
    try {
      const status = await DB.getManagerSecurityStatus();
      this.state.managerSecurity = status;

      const setupBox = document.getElementById('mgr-security-setup-box');
      const changeBox = document.getElementById('mgr-security-change-box');
      const badge = document.getElementById('mgr-security-badge');
      const icon = document.getElementById('mgr-security-status-icon');
      const desc = document.getElementById('mgr-security-desc');
      const sidebarStatus = document.getElementById('mgr-sidebar-pin-status');

      if (status.isPinSet) {
        if (setupBox) setupBox.classList.add('hidden');
        if (changeBox) changeBox.classList.remove('hidden');
        if (badge) {
          badge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
          badge.textContent = "Active & Protected 🔐";
        }
        if (icon) icon.textContent = "🔐";
        if (desc) desc.textContent = `Master PIN is active. Secret hint question: "${status.securityQuestion}".`;
        if (sidebarStatus) {
          sidebarStatus.className = "text-emerald-400";
          sidebarStatus.textContent = "PIN Active";
        }
      } else {
        if (setupBox) setupBox.classList.remove('hidden');
        if (changeBox) changeBox.classList.add('hidden');
        if (badge) {
          badge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30";
          badge.textContent = "Not Set / Open ⚠️";
        }
        if (icon) icon.textContent = "⚠️";
        if (desc) desc.textContent = "No Master PIN set yet. Enter a new PIN to protect console and item voids.";
        if (sidebarStatus) {
          sidebarStatus.className = "text-amber-400";
          sidebarStatus.textContent = "PIN Unset";
        }
      }

      if (showToastFeedback) {
        this.showToast('✅ Manager Security Status Refreshed');
      }
    } catch (e) {
      console.error('Failed to load manager security:', e);
    }
  },

  handleSecurityQuestionSelect(mode) {
    const sel = document.getElementById(mode === 'setup' ? 'mgr-setup-question-select' : 'mgr-change-question-select');
    const custom = document.getElementById(mode === 'setup' ? 'mgr-setup-custom-question' : 'mgr-change-custom-question');
    if (!sel || !custom) return;
    if (sel.value === '__custom__') {
      custom.classList.remove('hidden');
      custom.focus();
    } else {
      custom.classList.add('hidden');
    }
  },

  async saveInitialManagerPin() {
    const newPin = (document.getElementById('mgr-setup-new-pin')?.value || '').trim();
    const confPin = (document.getElementById('mgr-setup-confirm-pin')?.value || '').trim();
    const qSel = document.getElementById('mgr-setup-question-select');
    const qCustom = document.getElementById('mgr-setup-custom-question');
    const answer = (document.getElementById('mgr-setup-answer')?.value || '').trim();

    let question = qSel ? qSel.value : '';
    if (question === '__custom__') {
      question = (qCustom?.value || '').trim();
    }

    if (!newPin || !/^\d{4,6}$/.test(newPin)) {
      this.showToast('⚠️ PIN must be 4 to 6 numeric digits.', 'error');
      return;
    }
    if (newPin !== confPin) {
      this.showToast('⚠️ New PIN and Confirm PIN do not match.', 'error');
      return;
    }
    if (!question) {
      this.showToast('⚠️ Please choose or enter a security hint question.', 'error');
      return;
    }
    if (!answer) {
      this.showToast('⚠️ Secret answer is required to recover PIN if forgotten.', 'error');
      return;
    }

    try {
      const res = await DB.setupInitialManagerPin({ newPin, securityQuestion: question, securityAnswer: answer });
      if (res && res.success) {
        this.showToast('🎉 Master PIN and Security Hint Configured Successfully!');
        this.haptic('success');
        await this.loadManagerSecurity();
      } else {
        throw new Error(res.error || 'Failed to setup PIN');
      }
    } catch (e) {
      this.showToast('❌ Setup failed: ' + e.message, 'error');
      this.haptic('error');
    }
  },

  async saveChangedManagerPin() {
    const oldPin = (document.getElementById('mgr-change-old-pin')?.value || '').trim();
    const newPin = (document.getElementById('mgr-change-new-pin')?.value || '').trim();
    const confPin = (document.getElementById('mgr-change-confirm-pin')?.value || '').trim();
    const qSel = document.getElementById('mgr-change-question-select');
    const qCustom = document.getElementById('mgr-change-custom-question');
    const answer = (document.getElementById('mgr-change-answer')?.value || '').trim();

    let question = qSel ? qSel.value : '';
    if (question === '__custom__') {
      question = (qCustom?.value || '').trim();
    }

    if (!oldPin) {
      this.showToast('⚠️ Please enter your current/old Master PIN.', 'error');
      return;
    }
    if (!newPin || !/^\d{4,6}$/.test(newPin)) {
      this.showToast('⚠️ New PIN must be 4 to 6 numeric digits.', 'error');
      return;
    }
    if (newPin !== confPin) {
      this.showToast('⚠️ New PIN and Confirm PIN do not match.', 'error');
      return;
    }

    try {
      const res = await DB.changeManagerPin({
        oldPin,
        newPin,
        securityQuestion: question || undefined,
        securityAnswer: answer || undefined
      });
      if (res && res.success) {
        this.showToast('🎉 Master PIN changed successfully!');
        this.haptic('success');
        const oEl = document.getElementById('mgr-change-old-pin');
        const nEl = document.getElementById('mgr-change-new-pin');
        const cEl = document.getElementById('mgr-change-confirm-pin');
        const aEl = document.getElementById('mgr-change-answer');
        if (oEl) oEl.value = '';
        if (nEl) nEl.value = '';
        if (cEl) cEl.value = '';
        if (aEl) aEl.value = '';
        await this.loadManagerSecurity();
      } else {
        throw new Error(res.error || 'Failed to change PIN');
      }
    } catch (e) {
      this.showToast('❌ Change failed: ' + e.message, 'error');
      this.haptic('error');
    }
  },

  async refreshManagerData(isManual = false) {
    const icon = document.getElementById('mgr-refresh-icon');
    if (icon) icon.classList.add('animate-spin');
    try {
      await Promise.all([
        this.loadTables(),
        this.loadMenu(),
        this.loadStaff(),
        this.loadManagerAnalytics(),
        this.loadManagerInvoices(),
        this.loadManagerVoidLogs()
      ]);
      this.renderManagerDashboard();
      if (isManual) this.showToast('✅ Manager Data Refreshed Live');
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setTimeout(() => { if (icon) icon.classList.remove('animate-spin'); }, 500);
    }
  },

  async renderManagerDashboard() {
    // Ensure analytics and voids are loaded
    if (!this.state.mgrSalesReport) {
      await this.loadManagerAnalytics();
    }
    if (!this.state.mgrVoidLogs || this.state.mgrVoidLogs.length === 0) {
      await this.loadManagerVoidLogs();
    }

    this.updateManagerKpiCards();

    // Render active tab
    this.setManagerTab(this.state.mgrActiveTab || 'sales');
  },

  updateManagerKpiCards() {
    // 1. Calculate KPI Metrics
    const report = this.state.mgrSalesReport || {};
    const summary = report.summary || { total_bills: 0, total_revenue: 0, total_subtotal: 0, total_tax: 0, total_discounts: 0 };
    const modes = report.payment_modes || { cash: { amount: 0, count: 0 }, upi: { amount: 0, count: 0 }, card: { amount: 0, count: 0 } };

    // Gross Revenue & Net
    const revEl = document.getElementById('mgr-kpi-revenue');
    const netEl = document.getElementById('mgr-kpi-net');
    if (revEl) revEl.textContent = `₹${(summary.total_revenue || 0).toLocaleString('en-IN')}`;
    if (netEl) netEl.textContent = `Net: ₹${Math.round(summary.total_subtotal || 0).toLocaleString('en-IN')} | Tax: ₹${Math.round(summary.total_tax || 0)}`;

    // Total Invoices & AOV
    const billsEl = document.getElementById('mgr-kpi-bills');
    const aovEl = document.getElementById('mgr-kpi-aov');
    const aov = summary.total_bills > 0 ? Math.round(summary.total_revenue / summary.total_bills) : 0;
    if (billsEl) billsEl.textContent = summary.total_bills || 0;
    if (aovEl) aovEl.textContent = `AOV: ₹${aov} / bill`;

    // Cash In Drawer
    const cashEl = document.getElementById('mgr-kpi-cash');
    const cashBillsEl = document.getElementById('mgr-kpi-cash-bills');
    if (cashEl) cashEl.textContent = `₹${(modes.cash?.amount || 0).toLocaleString('en-IN')}`;
    if (cashBillsEl) cashBillsEl.textContent = `${modes.cash?.count || 0} cash bills`;

    // UPI & Card
    const upiEl = document.getElementById('mgr-kpi-upi');
    const cardEl = document.getElementById('mgr-kpi-card');
    if (upiEl) upiEl.textContent = `₹${(modes.upi?.amount || 0).toLocaleString('en-IN')}`;
    if (cardEl) cardEl.textContent = `Card: ₹${(modes.card?.amount || 0).toLocaleString('en-IN')}`;

    // 3-Floor Tables Occupancy
    const tables = typeof RESTAURANT_TABLES !== 'undefined' ? RESTAURANT_TABLES : (this.state.tables || []);
    let occupiedCount = 0;
    let f1Occ = 0, f2Occ = 0, rfOcc = 0;
    tables.forEach(t => {
      const live = this.getLiveTable ? this.getLiveTable(t.id) : (this.state.orders[t.id] ? { status: 'occupied' } : { status: 'vacant' });
      const isOcc = (live.currentSubtotal > 0) || live.status === 'occupied' || (live.placedOrders && live.placedOrders.length > 0);
      if (isOcc) {
        occupiedCount++;
        if (t.floor === '1st Floor') f1Occ++;
        else if (t.floor === '2nd Floor') f2Occ++;
        else if (t.floor === 'Rooftop') rfOcc++;
      }
    });
    const occEl = document.getElementById('mgr-kpi-occupancy');
    const occFloorsEl = document.getElementById('mgr-kpi-occupancy-floors');
    if (occEl) occEl.textContent = `${occupiedCount} / ${tables.length || 35}`;
    if (occFloorsEl) occFloorsEl.textContent = `F1: ${f1Occ}/15 | F2: ${f2Occ}/10 | Roof: ${rfOcc}/10`;

    // Anti-Theft Void Shrinkage
    const voidLogs = this.state.mgrVoidLogs || [];
    const voidSum = voidLogs.reduce((acc, v) => acc + (parseFloat(v.amount) || 0), 0);
    const voidEl = document.getElementById('mgr-kpi-voids');
    const voidCountEl = document.getElementById('mgr-kpi-void-count');
    if (voidEl) voidEl.textContent = `₹${Math.round(voidSum).toLocaleString('en-IN')}`;
    if (voidCountEl) voidCountEl.textContent = `${voidLogs.length} voids / removed items`;
  },

  setReportPeriod(period) {
    this.state.mgrReportPeriod = period;
    const periods = ['daily', 'weekly', 'monthly', 'quarterly', 'half_yearly', 'yearly', 'custom'];
    periods.forEach(p => {
      const btn = document.getElementById(`mgr-btn-period-${p}`);
      if (btn) {
        if (p === period) {
          btn.className = "mgr-period-pill px-3 py-1.5 rounded-xl text-xs font-black transition-all bg-amber-500 text-black shadow border border-amber-400";
        } else {
          btn.className = "mgr-period-pill px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-[#1a2030] text-neutral-300 hover:text-white hover:bg-[#252e42] border border-transparent";
        }
      }
    });

    const customContainer = document.getElementById('mgr-custom-range-container');
    if (customContainer && period !== 'custom') {
      customContainer.classList.add('hidden');
    }

    return this.loadManagerAnalytics();
  },

  toggleCustomDateRange() {
    const customContainer = document.getElementById('mgr-custom-range-container');
    if (!customContainer) return;
    
    const isHidden = customContainer.classList.contains('hidden');
    if (isHidden) {
      customContainer.classList.remove('hidden');
      const periods = ['daily', 'weekly', 'monthly', 'quarterly', 'half_yearly', 'yearly'];
      periods.forEach(p => {
        const btn = document.getElementById(`mgr-btn-period-${p}`);
        if (btn) btn.className = "mgr-period-pill px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-[#1a2030] text-neutral-300 hover:text-white hover:bg-[#252e42] border border-transparent";
      });
      const customBtn = document.getElementById('mgr-btn-period-custom');
      if (customBtn) customBtn.className = "mgr-period-pill px-3 py-1.5 rounded-xl text-xs font-black transition-all bg-amber-500 text-black shadow border border-amber-400";

      const startEl = document.getElementById('mgr-custom-start');
      const endEl = document.getElementById('mgr-custom-end');
      const todayStr = new Date().toISOString().slice(0, 10);
      if (startEl && !startEl.value) startEl.value = todayStr;
      if (endEl && !endEl.value) endEl.value = todayStr;
    } else {
      customContainer.classList.add('hidden');
      this.setReportPeriod('weekly');
    }
  },

  applyCustomDateRange() {
    const startVal = document.getElementById('mgr-custom-start')?.value;
    const endVal = document.getElementById('mgr-custom-end')?.value;
    if (!startVal || !endVal) {
      this.showToast('Please select both Start Date and End Date');
      return;
    }
    if (startVal > endVal) {
      this.showToast('Start Date cannot be after End Date');
      return;
    }
    this.state.mgrReportPeriod = 'custom';
    this.state.mgrReportStartDate = startVal;
    this.state.mgrReportEndDate = endVal;
    return this.loadManagerAnalytics();
  },

  refreshPeriodReport() {
    const spinner = document.getElementById('mgr-sales-refresh-spinner');
    if (spinner) spinner.classList.add('animate-spin');
    this.loadManagerAnalytics().finally(() => {
      setTimeout(() => {
        if (spinner) spinner.classList.remove('animate-spin');
      }, 500);
    });
  },

  async loadManagerAnalytics() {
    const period = this.state.mgrReportPeriod || 'weekly';
    let url = `/api/reports/efficiency?period=${encodeURIComponent(period)}`;
    if (period === 'custom') {
      if (this.state.mgrReportStartDate) url += `&startDate=${encodeURIComponent(this.state.mgrReportStartDate)}`;
      if (this.state.mgrReportEndDate) url += `&endDate=${encodeURIComponent(this.state.mgrReportEndDate)}`;
    }

    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.report) {
          this.state.mgrSalesReport = data.report;
          this.state.mgrPeriodBills = data.report.recentBills || [];
          this.renderManagerSales(data.report);
          this.updateManagerKpiCards();
        }
      }
    } catch (e) {
      console.warn('Efficiency report fetch error:', e);
    }
  },

  renderManagerSales(report) {
    if (!report) return;
    const sum = report.summary || {};
    const modes = report.payment_modes || { cash: { amount: 0, count: 0 }, upi: { amount: 0, count: 0 }, card: { amount: 0, count: 0 } };
    const totalRev = sum.total_revenue || 0;

    // 1. Audit Scope Banner
    const badgeEl = document.getElementById('mgr-active-period-badge');
    const labelEl = document.getElementById('mgr-active-period-label');
    const daysEl = document.getElementById('mgr-active-period-days');
    const statsEl = document.getElementById('mgr-active-period-quick-stats');
    if (badgeEl) badgeEl.textContent = `${(report.period || 'WEEKLY').toUpperCase()} AUDIT`;
    if (labelEl) labelEl.textContent = report.periodLabel || `${report.startDate} to ${report.endDate}`;
    if (daysEl) daysEl.textContent = `• ${report.activeDays || 1} Day${(report.activeDays || 1) > 1 ? 's' : ''} in scope`;
    if (statsEl) statsEl.textContent = `${sum.total_bills || 0} Invoices Settled | Total Gross: ₹${(sum.total_revenue || 0).toLocaleString('en-IN')}`;

    // 2. Executive 8-KPI Financial Strip
    const grossEl = document.getElementById('mgr-eff-gross');
    const roundoffEl = document.getElementById('mgr-eff-roundoff');
    const subEl = document.getElementById('mgr-eff-subtotal');
    const taxEl = document.getElementById('mgr-eff-tax');
    const taxSplitEl = document.getElementById('mgr-eff-tax-split');
    const discEl = document.getElementById('mgr-eff-discounts');
    const discRateEl = document.getElementById('mgr-eff-discount-rate');
    const billsEl = document.getElementById('mgr-eff-bills');
    const aovEl = document.getElementById('mgr-eff-aov');
    const runrateEl = document.getElementById('mgr-eff-runrate');
    const voidLossEl = document.getElementById('mgr-eff-void-loss');
    const voidCountEl = document.getElementById('mgr-eff-void-count');

    if (grossEl) grossEl.textContent = `₹${(sum.total_revenue || 0).toLocaleString('en-IN')}`;
    if (roundoffEl) roundoffEl.textContent = `Round-off: ₹${(sum.total_round_off || 0).toFixed(2)}`;
    if (subEl) subEl.textContent = `₹${(sum.total_subtotal || 0).toLocaleString('en-IN')}`;
    if (taxEl) taxEl.textContent = `₹${(sum.total_tax || 0).toLocaleString('en-IN')}`;
    if (taxSplitEl) taxSplitEl.textContent = `CGST: ₹${(sum.total_cgst || 0).toFixed(2)} | SGST: ₹${(sum.total_sgst || 0).toFixed(2)}`;
    if (discEl) discEl.textContent = `₹${(sum.total_discounts || 0).toLocaleString('en-IN')}`;
    if (discRateEl) discRateEl.textContent = `${sum.discount_rate_pct || 0}% of Gross`;
    if (billsEl) billsEl.textContent = `${sum.total_bills || 0}`;
    if (aovEl) aovEl.textContent = `₹${Math.round(sum.aov || 0).toLocaleString('en-IN')}`;
    if (runrateEl) runrateEl.textContent = `₹${Math.round(sum.revenue_per_day || 0).toLocaleString('en-IN')}`;
    
    const voidAudit = report.void_audit || { total_amount: 0, total_voids: 0, loss_pct: 0 };
    if (voidLossEl) voidLossEl.textContent = `₹${Math.round(voidAudit.total_amount || 0).toLocaleString('en-IN')}`;
    if (voidCountEl) voidCountEl.textContent = `${voidAudit.total_voids || 0} items (${voidAudit.loss_pct || 0}% loss)`;

    // 3. Timeline Trend Bars
    const timelineEl = document.getElementById('mgr-timeline-chart');
    const highestEl = document.getElementById('mgr-timeline-highest');
    const totalDaysEl = document.getElementById('mgr-timeline-total-days');
    const timelineTrend = report.timeline_trend || [];
    if (totalDaysEl) totalDaysEl.textContent = `${report.activeDays || 1} Days`;

    if (timelineEl) {
      if (timelineTrend.length === 0) {
        timelineEl.innerHTML = `<div class="w-full text-center text-neutral-500 italic py-8">No daily billing activity logged in this timeframe.</div>`;
        if (highestEl) highestEl.textContent = '--';
      } else {
        const maxRev = Math.max(...timelineTrend.map(d => d.revenue), 1);
        let maxDayItem = timelineTrend[0];
        timelineTrend.forEach(d => { if (d.revenue > maxDayItem.revenue) maxDayItem = d; });
        if (highestEl) highestEl.textContent = `${maxDayItem.bill_date}: ₹${maxDayItem.revenue.toLocaleString('en-IN')} (${maxDayItem.bills_count} bills)`;

        timelineEl.innerHTML = timelineTrend.map(item => {
          const heightPct = Math.max(12, Math.round((item.revenue / maxRev) * 100));
          const isHighest = item.bill_date === maxDayItem.bill_date;
          const barColor = isHighest ? 'bg-gradient-to-t from-amber-600 to-amber-400 shadow-lg shadow-amber-500/20' : 'bg-gradient-to-t from-blue-700 to-cyan-500';
          const shortDate = item.bill_date.slice(5);
          return `
            <div class="flex-1 min-w-[36px] max-w-[56px] flex flex-col items-center gap-1.5 group cursor-pointer" title="${item.bill_date}: ₹${item.revenue.toLocaleString('en-IN')} (${item.bills_count} bills)">
              <div class="text-[9px] font-mono text-neutral-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">₹${Math.round(item.revenue)}</div>
              <div class="w-full bg-[#1b2130] rounded-t-lg h-28 flex items-end p-0.5">
                <div class="${barColor} w-full rounded-t-md transition-all duration-500 group-hover:brightness-125" style="height: ${heightPct}%"></div>
              </div>
              <span class="text-[10px] font-mono text-neutral-400 group-hover:text-white font-semibold">${shortDate}</span>
              <span class="text-[8px] font-mono text-neutral-500">${item.bills_count}b</span>
            </div>
          `;
        }).join('');
      }
    }

    // 4. Dayparts & Rush Hours
    const dayparts = report.dayparts || {};
    const busyHourEl = document.getElementById('mgr-busiest-hour');
    if (busyHourEl) busyHourEl.textContent = dayparts.busiest_hour || 'No activity';

    const dpLunch = dayparts.lunch || { revenue: 0, count: 0, pct: 0 };
    const dpSnacks = dayparts.snacks || { revenue: 0, count: 0, pct: 0 };
    const dpDinner = dayparts.dinner || { revenue: 0, count: 0, pct: 0 };
    const dpLate = dayparts.late_night || { revenue: 0, count: 0, pct: 0 };

    this.setTextSafe('mgr-dp-lunch-rev', `₹${(dpLunch.revenue || 0).toLocaleString('en-IN')}`);
    this.setTextSafe('mgr-dp-lunch-bills', `${dpLunch.count || 0} bills`);
    this.setTextSafe('mgr-dp-lunch-pct', `${dpLunch.pct || 0}%`);

    this.setTextSafe('mgr-dp-snacks-rev', `₹${(dpSnacks.revenue || 0).toLocaleString('en-IN')}`);
    this.setTextSafe('mgr-dp-snacks-bills', `${dpSnacks.count || 0} bills`);
    this.setTextSafe('mgr-dp-snacks-pct', `${dpSnacks.pct || 0}%`);

    this.setTextSafe('mgr-dp-dinner-rev', `₹${(dpDinner.revenue || 0).toLocaleString('en-IN')}`);
    this.setTextSafe('mgr-dp-dinner-bills', `${dpDinner.count || 0} bills`);
    this.setTextSafe('mgr-dp-dinner-pct', `${dpDinner.pct || 0}%`);

    this.setTextSafe('mgr-dp-latenight-rev', `₹${(dpLate.revenue || 0).toLocaleString('en-IN')}`);
    this.setTextSafe('mgr-dp-latenight-bills', `${dpLate.count || 0} bills`);
    this.setTextSafe('mgr-dp-latenight-pct', `${dpLate.pct || 0}%`);

    // 5. 3-Floor Space Efficiency
    const floorGrid = document.getElementById('mgr-floor-cards-grid');
    if (floorGrid) {
      const floors = report.floor_efficiency || [];
      floorGrid.innerHTML = floors.map(fl => {
        const floorIcon = fl.floor === '1st Floor' ? '🛋️' : (fl.floor === '2nd Floor' ? '🍽️' : '✨');
        return `
          <div class="bg-[#171c2a] border border-[#252e42] rounded-xl p-3.5 space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="font-bold text-white text-xs flex items-center gap-1.5">
                <span>${floorIcon}</span>
                <span>${fl.floor}</span>
                <span class="text-[10px] text-neutral-400 font-mono">(${fl.tables_count} tables)</span>
              </span>
              <span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                ${fl.pct || 0}% Share
              </span>
            </div>
            
            <div class="text-xl font-black text-amber-400 font-mono">
              ₹${(fl.revenue || 0).toLocaleString('en-IN')}
            </div>

            <div class="w-full bg-[#1b2130] h-2 rounded-full overflow-hidden">
              <div class="bg-amber-500 h-full rounded-full transition-all duration-500" style="width: ${fl.pct || 0}%"></div>
            </div>

            <div class="grid grid-cols-3 gap-1 pt-1 text-[10px] font-mono border-t border-[#1e2536] text-neutral-400">
              <div>
                <span class="text-neutral-500 block">Bills</span>
                <span class="text-white font-bold">${fl.bills_count || 0}</span>
              </div>
              <div>
                <span class="text-neutral-500 block">Rev/Table</span>
                <span class="text-emerald-400 font-bold">₹${Math.round(fl.rev_per_table || 0)}</span>
              </div>
              <div>
                <span class="text-neutral-500 block">Turn/Table</span>
                <span class="text-cyan-400 font-bold">${fl.turn_rate || 0}x</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    // 6. Top 10 Best Sellers Table
    const topDishesTbody = document.getElementById('mgr-eff-top-dishes-table');
    if (topDishesTbody) {
      const items = report.top_items || [];
      if (items.length === 0) {
        topDishesTbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-neutral-500 italic">No items billed in this timeframe</td></tr>`;
      } else {
        topDishesTbody.innerHTML = items.slice(0, 10).map((item, idx) => {
          const isVeg = item.is_veg === 1;
          const vegBadge = isVeg ? '<span class="text-emerald-400">🟢</span>' : '<span class="text-rose-400">🔴</span>';
          return `
            <tr class="hover:bg-[#161b28] transition-colors">
              <td class="py-2.5 font-mono font-bold text-neutral-400">#${idx + 1}</td>
              <td class="py-2.5 font-bold text-white flex items-center gap-1.5">
                ${vegBadge}
                <span>${item.name || item.item_name}</span>
              </td>
              <td class="py-2.5 text-neutral-400">${item.category_name || 'General'}</td>
              <td class="py-2.5 text-center font-mono font-bold text-white">${item.total_qty || item.qty}</td>
              <td class="py-2.5 text-right font-mono font-bold text-amber-300">₹${(item.total_revenue || item.total_sales || 0).toLocaleString('en-IN')}</td>
              <td class="py-2.5 text-right font-mono text-neutral-300">
                <div class="flex items-center justify-end gap-1.5">
                  <div class="w-12 bg-[#1b2130] h-1.5 rounded-full overflow-hidden">
                    <div class="bg-amber-400 h-full rounded-full" style="width: ${Math.min(100, item.pct_of_sales || 0)}%"></div>
                  </div>
                  <span>${item.pct_of_sales || 0}%</span>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // 7. Dietary Split
    const dietary = report.dietary || { veg: { revenue: 0, pct: 0 }, non_veg: { revenue: 0, pct: 0 } };
    const vegEl = document.getElementById('mgr-dietary-veg');
    const vegBar = document.getElementById('mgr-dietary-veg-bar');
    const nonvegEl = document.getElementById('mgr-dietary-nonveg');
    const nonvegBar = document.getElementById('mgr-dietary-nonveg-bar');

    if (vegEl) vegEl.textContent = `₹${(dietary.veg?.revenue || 0).toLocaleString('en-IN')} (${dietary.veg?.pct || 0}%)`;
    if (vegBar) vegBar.style.width = `${dietary.veg?.pct || 0}%`;
    if (nonvegEl) nonvegEl.textContent = `₹${(dietary.non_veg?.revenue || 0).toLocaleString('en-IN')} (${dietary.non_veg?.pct || 0}%)`;
    if (nonvegBar) nonvegBar.style.width = `${dietary.non_veg?.pct || 0}%`;

    // 8. Category Breakdown List
    const catList = document.getElementById('mgr-category-list');
    if (catList) {
      const categories = report.category_breakdown || [];
      if (categories.length === 0) {
        catList.innerHTML = `<div class="text-neutral-500 italic py-2 text-center">No categories recorded</div>`;
      } else {
        catList.innerHTML = categories.map(cat => {
          const catName = cat.category || cat.category_name || 'General';
          const catRev = cat.total_revenue || cat.revenue || 0;
          const catQty = cat.total_qty || cat.items_sold || 0;
          const catPct = totalRev > 0 ? ((catRev / totalRev) * 100).toFixed(1) : 0;
          return `
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="text-white font-semibold">${catName} (${catQty} sold)</span>
                <span class="font-mono text-amber-300 font-bold">₹${catRev.toLocaleString('en-IN')} (${catPct}%)</span>
              </div>
              <div class="w-full bg-[#1b2130] h-1.5 rounded-full overflow-hidden">
                <div class="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full" style="width: ${catPct}%"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 9. Payment Splits
    const cashPct = totalRev > 0 ? Math.round(((modes.cash?.amount || 0) / totalRev) * 100) : 0;
    const upiPct = totalRev > 0 ? Math.round(((modes.upi?.amount || 0) / totalRev) * 100) : 0;
    const cardPct = totalRev > 0 ? Math.round(((modes.card?.amount || 0) / totalRev) * 100) : 0;

    const splitCash = document.getElementById('mgr-split-cash');
    const splitCashBar = document.getElementById('mgr-split-cash-bar');
    const splitUpi = document.getElementById('mgr-split-upi');
    const splitUpiBar = document.getElementById('mgr-split-upi-bar');
    const splitCard = document.getElementById('mgr-split-card');
    const splitCardBar = document.getElementById('mgr-split-card-bar');

    if (splitCash) splitCash.textContent = `₹${(modes.cash?.amount || 0).toLocaleString('en-IN')} (${cashPct}%) • ${modes.cash?.count || 0} bills`;
    if (splitCashBar) splitCashBar.style.width = `${cashPct}%`;
    if (splitUpi) splitUpi.textContent = `₹${(modes.upi?.amount || 0).toLocaleString('en-IN')} (${upiPct}%) • ${modes.upi?.count || 0} bills`;
    if (splitUpiBar) splitUpiBar.style.width = `${upiPct}%`;
    if (splitCard) splitCard.textContent = `₹${(modes.card?.amount || 0).toLocaleString('en-IN')} (${cardPct}%) • ${modes.card?.count || 0} bills`;
    if (splitCardBar) splitCardBar.style.width = `${cardPct}%`;

    // 10. Staff Leaderboard
    const staffTbody = document.getElementById('mgr-staff-leaderboard-table');
    if (staffTbody) {
      const staffList = report.staff_leaderboard || [];
      if (staffList.length === 0) {
        staffTbody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-neutral-500 italic">No staff sales logged</td></tr>`;
      } else {
        staffTbody.innerHTML = staffList.map(st => `
          <tr class="hover:bg-[#161b28]">
            <td class="py-2 font-bold text-white">${st.staff_name}</td>
            <td class="py-2 text-center font-mono font-bold text-neutral-300">${st.total_bills}</td>
            <td class="py-2 text-right font-mono font-bold text-amber-300">₹${(st.total_revenue || 0).toLocaleString('en-IN')}</td>
            <td class="py-2 text-right font-mono text-emerald-400">₹${Math.round(st.avg_ticket || 0)}</td>
          </tr>
        `).join('');
      }
    }

    // 11. Anti-Theft Void Loss & Leakage
    const voidSumAmt = document.getElementById('mgr-void-sum-amount');
    const voidSumCnt = document.getElementById('mgr-void-sum-count');
    const voidSumRate = document.getElementById('mgr-void-sum-rate');
    const voidListEl = document.getElementById('mgr-period-voids-list');

    if (voidSumAmt) voidSumAmt.textContent = `₹${Math.round(voidAudit.total_amount || 0).toLocaleString('en-IN')}`;
    if (voidSumCnt) voidSumCnt.textContent = `${voidAudit.total_voids || 0} Incident${voidAudit.total_voids === 1 ? '' : 's'}`;
    if (voidSumRate) voidSumRate.textContent = `${voidAudit.loss_pct || 0}%`;

    if (voidListEl) {
      const recentVoids = voidAudit.recent_voids || [];
      if (recentVoids.length === 0) {
        voidListEl.innerHTML = `<div class="text-emerald-400/80 italic py-2 text-center font-mono">✅ Zero void shrinkage recorded in this audit timeframe!</div>`;
      } else {
        voidListEl.innerHTML = recentVoids.slice(0, 4).map(v => `
          <div class="flex items-center justify-between p-2 rounded-xl bg-[#151924] border border-[#23293a]">
            <div>
              <div class="font-bold text-white flex items-center gap-1.5">
                <span class="text-rose-400">❌</span>
                <span>${v.item_name} (x${v.qty})</span>
                <span class="text-neutral-500 font-mono text-[10px]">by ${v.staff_name || 'Staff'}</span>
              </div>
              <div class="text-[10px] text-neutral-400">Reason: "${v.reason || 'Unspecified'}" • Auth: ${v.authorized_by || 'Manager'}</div>
            </div>
            <div class="text-right">
              <div class="font-mono font-bold text-rose-400">₹${v.amount}</div>
              <div class="text-[9px] text-neutral-500 font-mono">${v.created_at || ''}</div>
            </div>
          </div>
        `).join('');
      }
    }

    // 12. Period Invoices Ledger
    this.state.mgrPeriodBills = report.recentBills || this.state.mgrPeriodBills || [];
    this.renderPeriodInvoices(this.state.mgrPeriodBills);
  },

  setTextSafe(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  },

  filterPeriodInvoices(query) {
    const all = this.state.mgrPeriodBills || [];
    if (!query || !query.trim()) {
      this.renderPeriodInvoices(all);
      return;
    }
    const q = query.toLowerCase().trim();
    const filtered = all.filter(b => {
      const inv = String(b.invoice_number || b.id || '').toLowerCase();
      const tbl = String(b.table_name || b.table_id || '').toLowerCase();
      const wtr = String(b.waiter_name || b.billed_by || '').toLowerCase();
      const mode = String(b.payment_mode || '').toLowerCase();
      return inv.includes(q) || tbl.includes(q) || wtr.includes(q) || mode.includes(q);
    });
    this.renderPeriodInvoices(filtered);
  },

  renderPeriodInvoices(bills) {
    const tbody = document.getElementById('mgr-period-invoices-tbody');
    if (!tbody) return;

    if (!bills || bills.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="py-6 text-center text-neutral-500 italic">No settled invoices matching period/search filter</td></tr>`;
      return;
    }

    tbody.innerHTML = bills.map(b => {
      const modeClass = b.payment_mode === 'cash' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                        (b.payment_mode === 'card' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-sky-500/20 text-sky-300 border-sky-500/30');
      const timeStr = b.created_at ? new Date(b.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '--';
      const grandTotal = b.grand_total || b.final_total || 0;
      const subtotal = b.subtotal || 0;
      const tax = (b.cgst || 0) + (b.sgst || 0) || (b.tax || 0);

      return `
        <tr class="hover:bg-[#161b28] transition-colors">
          <td class="py-2.5 px-3 font-mono font-bold text-amber-300">${b.invoice_number || '#' + b.id}</td>
          <td class="py-2.5 px-3 font-mono text-neutral-400 text-[11px]">${timeStr}</td>
          <td class="py-2.5 px-3 font-semibold text-white">${b.table_name || b.table_id || 'Direct'}</td>
          <td class="py-2.5 px-3 text-neutral-300">${b.waiter_name || b.billed_by || 'Staff'}</td>
          <td class="py-2.5 px-3">
            <span class="px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold uppercase ${modeClass}">${b.payment_mode || 'CASH'}</span>
          </td>
          <td class="py-2.5 px-3 text-right font-mono text-neutral-400">₹${Math.round(subtotal).toLocaleString('en-IN')}</td>
          <td class="py-2.5 px-3 text-right font-mono text-neutral-400">₹${tax.toFixed(2)}</td>
          <td class="py-2.5 px-3 text-right font-mono font-black text-white text-xs">₹${Math.round(grandTotal).toLocaleString('en-IN')}</td>
          <td class="py-2.5 px-3 text-center">
            <button onclick="APP.reprintInvoiceManager('${b.invoice_number || b.id}')" class="px-2 py-1 rounded-lg bg-[#1e2536] hover:bg-amber-500 hover:text-black border border-[#2e374d] text-neutral-300 text-[10px] font-bold transition-all" title="View & Print Bill Slip">
              🖨️ Print
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  printPeriodZReport() {
    const report = this.state.mgrSalesReport || {};
    const sum = report.summary || {};
    const modes = report.payment_modes || { cash: { amount: 0, count: 0 }, upi: { amount: 0, count: 0 }, card: { amount: 0, count: 0 } };
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const periodTitle = (report.period || 'AUDIT').toUpperCase();
    const rangeStr = report.periodLabel || `${report.startDate} to ${report.endDate}`;

    const zReportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>PERIOD Z-REPORT (${periodTitle})</title>
        <style>
          @page { size: 80mm auto; margin: 3mm; }
          body { font-family: 'Courier New', monospace; font-size: 12px; width: 74mm; margin: 0 auto; color: #000; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 6px 0; }
          .double-line { border-top: 2px solid #000; margin: 6px 0; }
          .flex { display: flex; justify-content: space-between; margin: 2px 0; }
          .big { font-size: 15px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="center big">BYOB INDIRAPURAM</div>
        <div class="center">COMMERCIAL RESTAURANT & LOUNGE</div>
        <div class="center">GSTIN: 09AAACB1234D1Z5</div>
        <div class="double-line"></div>
        <div class="center bold big">*** ${periodTitle} Z-REPORT ***</div>
        <div class="center bold">${rangeStr}</div>
        <div class="center">Generated: ${dateStr}</div>
        <div class="line"></div>
        <div class="flex"><span>SETTLED INVOICES:</span><span class="bold">${sum.total_bills || 0}</span></div>
        <div class="flex"><span>GROSS REVENUE:</span><span class="bold big">INR ${(sum.total_revenue || 0).toFixed(2)}</span></div>
        <div class="flex"><span>NET SALES (SUBTOTAL):</span><span>INR ${(sum.total_subtotal || 0).toFixed(2)}</span></div>
        <div class="flex"><span>CGST (2.5%):</span><span>INR ${(sum.total_cgst || (sum.total_tax || 0)/2).toFixed(2)}</span></div>
        <div class="flex"><span>SGST (2.5%):</span><span>INR ${(sum.total_sgst || (sum.total_tax || 0)/2).toFixed(2)}</span></div>
        <div class="flex"><span>TOTAL DISCOUNTS GIVEN:</span><span>INR ${(sum.total_discounts || 0).toFixed(2)} (${sum.discount_rate_pct || 0}%)</span></div>
        <div class="flex"><span>AVERAGE ORDER VALUE (AOV):</span><span>INR ${(sum.aov || 0).toFixed(2)}</span></div>
        <div class="line"></div>
        <div class="bold">PAYMENT COLLECTIONS:</div>
        <div class="flex"><span>CASH IN REGISTER (${modes.cash?.count || 0} bills):</span><span class="bold">INR ${(modes.cash?.amount || 0).toFixed(2)}</span></div>
        <div class="flex"><span>UPI / DIGITAL (${modes.upi?.count || 0} bills):</span><span class="bold">INR ${(modes.upi?.amount || 0).toFixed(2)}</span></div>
        <div class="flex"><span>CARD TERMINAL (${modes.card?.count || 0} bills):</span><span class="bold">INR ${(modes.card?.amount || 0).toFixed(2)}</span></div>
        <div class="line"></div>
        <div class="bold">3-FLOOR SPACE EFFICIENCY:</div>
        ${(report.floor_efficiency || []).map(fl => `
          <div class="flex"><span>${fl.floor} (${fl.bills_count} bills):</span><span>INR ${(fl.revenue || 0).toFixed(2)} (${fl.pct}%)</span></div>
        `).join('')}
        <div class="line"></div>
        <div class="bold">TOP 5 DISHES:</div>
        ${(report.top_items || []).slice(0, 5).map((it, i) => `
          <div class="flex"><span>${i+1}. ${it.name} (x${it.total_qty || it.qty}):</span><span>INR ${(it.total_revenue || 0).toFixed(2)}</span></div>
        `).join('')}
        <div class="line"></div>
        <div class="flex"><span>VOID / SHRINKAGE LOSS:</span><span class="bold">INR ${(report.void_audit?.total_amount || 0).toFixed(2)} (${report.void_audit?.total_voids || 0} items)</span></div>
        <div class="double-line"></div>
        <br><br>
        <div class="flex"><span>CASHIER SIGN: ___________</span><span>MANAGER SIGN: ___________</span></div>
        <br>
        <div class="center">*** END OF PERIOD AUDIT ***</div>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=350,height=600');
    if (printWin) {
      printWin.document.write(zReportHtml);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
        printWin.close();
      }, 300);
    } else {
      this.showToast('Pop-up blocked. Allow popups to print Z-Report.');
    }
  },

  exportPeriodSalesCSV() {
    const bills = this.state.mgrPeriodBills || this.state.mgrInvoices || [];
    if (bills.length === 0) {
      this.showToast('No invoices to export for this period');
      return;
    }
    const headers = ['Invoice Number', 'Date', 'Floor/Table', 'Waiter/Billed By', 'Payment Mode', 'Subtotal', 'Tax', 'Grand Total'];
    const rows = bills.map(b => [
      `"${b.invoice_number || b.id}"`,
      `"${b.created_at || ''}"`,
      `"${b.table_name || b.table_id || ''}"`,
      `"${b.waiter_name || b.billed_by || ''}"`,
      `"${b.payment_mode || 'cash'}"`,
      b.subtotal || 0,
      ((b.cgst || 0) + (b.sgst || 0) || b.tax || 0),
      b.grand_total || b.final_total || 0
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const periodName = this.state.mgrReportPeriod || 'period';
    link.setAttribute('download', `onyx_sales_${periodName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast(`📥 ${periodName.toUpperCase()} Sales CSV Exported`);
  },

  setManagerFloorFilter(floor) {
    this.state.mgrFloorFilter = floor;
    const filterBtns = document.querySelectorAll('.mgr-floor-filter');
    filterBtns.forEach(btn => {
      btn.className = "mgr-floor-filter px-3 py-1 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white bg-[#1a2030]";
    });
    const map = { 'All': 'mgr-floor-btn-all', '1st Floor': 'mgr-floor-btn-f1', '2nd Floor': 'mgr-floor-btn-f2', 'Rooftop': 'mgr-floor-btn-rf' };
    const activeBtn = document.getElementById(map[floor]);
    if (activeBtn) activeBtn.className = "mgr-floor-filter active px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 text-black shadow";
    this.renderManagerTables();
  },

  renderManagerTables() {
    const grid = document.getElementById('mgr-tables-grid');
    if (!grid) return;
    const floor = this.state.mgrFloorFilter || 'All';
    const allTables = typeof RESTAURANT_TABLES !== 'undefined' ? RESTAURANT_TABLES : (this.state.tables || []);
    let tables = allTables;
    if (floor !== 'All') {
      tables = tables.filter(t => t.floor === floor);
    }

    grid.innerHTML = tables.map(t => {
      const live = this.getLiveTable ? this.getLiveTable(t.id) : {};
      const placedOrders = live.placedOrders || [];
      const billTotal = live.currentSubtotal || placedOrders.reduce((s, it) => s + (it.price * it.qty), 0);
      const isOccupied = billTotal > 0 || live.status === 'occupied' || placedOrders.length > 0;

      return `
        <div class="p-3 rounded-2xl border transition-all flex flex-col justify-between ${
          isOccupied 
            ? 'bg-[#1b151a] border-rose-500/40 shadow-rose-950/20 shadow-md' 
            : 'bg-[#121622] border-[#252c3f]'
        }">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <div class="font-black text-xs text-white">${t.name}</div>
              <span class="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                isOccupied ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }">${isOccupied ? 'OCCUPIED' : 'FREE'}</span>
            </div>
            <div class="text-[10px] text-neutral-400 flex items-center justify-between">
              <span>${t.floor || 'Floor'}</span>
              <span>${t.seats || 4} Seats</span>
            </div>
            <div class="mt-2 py-1 px-2 rounded-lg bg-[#0e111a] border border-[#1f2535] flex justify-between items-center text-xs font-mono">
              <span class="text-neutral-500">Bill:</span>
              <span class="font-bold ${isOccupied ? 'text-amber-400' : 'text-neutral-400'}">₹${billTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div class="mt-3 pt-2 border-t border-[#1f2535] flex items-center gap-1.5">
            ${isOccupied ? `
              <button onclick="APP.openManagerTransferModal('${t.id}')" class="flex-1 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[10px] font-bold text-amber-300 transition-all flex items-center justify-center gap-1 active:scale-95" title="Shift KOTs to another table">
                <span>🔄</span>
                <span>Transfer</span>
              </button>
              <button onclick="APP.forceClearTableManager('${t.id}')" class="flex-1 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-[10px] font-bold text-rose-300 transition-all flex items-center justify-center gap-1 active:scale-95" title="Cancel lingering KOTs and reset table">
                <span>🧹</span>
                <span>Clear</span>
              </button>
            ` : `
              <div class="w-full text-center py-1 text-[10px] text-neutral-500 italic">Ready for guests</div>
            `}
          </div>
        </div>
      `;
    }).join('');
  },



  openManagerTransferModal(tableId) {
    const allTables = typeof RESTAURANT_TABLES !== 'undefined' ? RESTAURANT_TABLES : (this.state.tables || []);
    const table = allTables.find(t => t.id === tableId);
    if (!table) return;
    this.state.mgrTransferSourceTable = table;

    const sourceInfo = document.getElementById('mgr-transfer-source-info');
    const live = this.getLiveTable ? this.getLiveTable(table.id) : {};
    const total = live.currentSubtotal || (live.placedOrders || []).reduce((s, it) => s + (it.price * it.qty), 0);
    if (sourceInfo) {
      sourceInfo.textContent = `${table.name} (${table.floor || ''}) — Active Total: ₹${total.toLocaleString('en-IN')}`;
    }

    // Populate free tables
    const select = document.getElementById('mgr-transfer-target-select');
    if (select) {
      const freeTables = allTables.filter(t => {
        if (t.id === tableId) return false;
        const l = this.getLiveTable ? this.getLiveTable(t.id) : {};
        return !(l.currentSubtotal > 0 || l.status === 'occupied' || (l.placedOrders && l.placedOrders.length > 0));
      });
      if (freeTables.length === 0) {
        select.innerHTML = '<option value="">No vacant tables available right now</option>';
      } else {
        select.innerHTML = freeTables.map(t => `
          <option value="${t.id}">${t.name} — ${t.floor} (${t.seats || 4} seats)</option>
        `).join('');
      }
    }

    const modal = document.getElementById('mgr-transfer-modal');
    if (modal) modal.classList.remove('hidden');
  },

  closeManagerTransferModal() {
    const modal = document.getElementById('mgr-transfer-modal');
    if (modal) modal.classList.add('hidden');
    this.state.mgrTransferSourceTable = null;
  },

  async executeManagerTransfer() {
    const sourceTable = this.state.mgrTransferSourceTable;
    const targetSelect = document.getElementById('mgr-transfer-target-select');
    const targetTableId = targetSelect ? targetSelect.value : null;

    if (!sourceTable || !targetTableId) {
      this.showToast('Please select a target table');
      return;
    }

    try {
      const res = await fetch('/api/tables/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceTableId: sourceTable.id, targetTableId })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast(`✅ Transferred ${sourceTable.name} to target table`);
        this.closeManagerTransferModal();
        await this.loadTables();
        this.renderManagerTables();
        this.renderManagerDashboard();
        this.haptic('success');
      } else {
        this.showToast('Transfer failed: ' + (data.error || 'Server error'));
      }
    } catch (e) {
      this.showToast('Network error during transfer');
    }
  },

  async forceClearTableManager(tableId) {
    const table = (this.state.tables || []).find(t => t.id === tableId);
    const tableName = table ? table.name : tableId;
    if (!confirm(`⚠️ FORCE CLEAR ${tableName}?\n\nThis will cancel all unbilled items on this table and reset it to FREE immediately.`)) {
      return;
    }

    try {
      const res = await fetch('/api/tables/force-clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast(`✅ ${tableName} cleared and set to FREE`);
        delete this.state.orders[tableId];
        await this.loadTables();
        this.renderManagerTables();
        this.renderManagerDashboard();
        this.haptic('success');
      } else {
        this.showToast('Failed to clear table: ' + (data.error || ''));
      }
    } catch (e) {
      this.showToast('Network error clearing table');
    }
  },

  filterManagerMenu() {
    this.renderManagerMenu();
  },

  renderManagerMenu() {
    const tbody = document.getElementById('mgr-menu-items-table');
    if (!tbody) return;

    const searchInput = document.getElementById('mgr-menu-search');
    const catFilter = document.getElementById('mgr-menu-cat-filter');
    const typeFilter = document.getElementById('mgr-menu-type-filter');

    const search = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const cat = catFilter ? catFilter.value : 'ALL';
    const type = typeFilter ? typeFilter.value : 'ALL';

    const allItems = typeof MENU_ITEMS !== 'undefined' ? MENU_ITEMS : (this.state.menu || []);
    let items = allItems.filter(item => !item.is_deleted);

    if (search) {
      items = items.filter(i => 
        (i.name && i.name.toLowerCase().includes(search)) ||
        (i.category && i.category.toLowerCase().includes(search)) ||
        (i.id && i.id.toLowerCase().includes(search))
      );
    }
    if (cat !== 'ALL') {
      items = items.filter(i => (i.category || '').toUpperCase().includes(cat));
    }
    if (type !== 'ALL') {
      const wantVeg = type === 'VEG';
      items = items.filter(i => {
        const itemIsVeg = i.isVeg !== undefined ? Boolean(i.isVeg) : (i.is_veg !== undefined ? Boolean(i.is_veg) : (i.type === 'veg' || i.category === 'chakna' || i.category === 'mixers' || i.category === 'breads' || i.category === 'desserts_salads'));
        return itemIsVeg === wantVeg;
      });
    }

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-neutral-500 italic">No dishes match your filter</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(item => {
      const isVeg = item.isVeg !== undefined ? Boolean(item.isVeg) : (item.is_veg !== undefined ? Boolean(item.is_veg) : (item.type === 'veg' || item.category === 'chakna' || item.category === 'mixers' || item.category === 'breads' || item.category === 'desserts_salads'));
      const inStock = item.in_stock !== 0 && item.in_stock !== false;
      const imgPath = item.image || 'images/dishes/peanut_masala.jpg';

      return `
        <tr class="hover:bg-[#161b29] transition-all">
          <td class="py-2.5 px-3">
            <div class="flex items-center gap-2.5">
              <img src="${imgPath}" alt="${item.name}" class="w-10 h-10 rounded-xl object-cover border border-[#2b354c] bg-black/40 flex-shrink-0" onerror="this.src='icons/icon.svg'">
              <div>
                <div class="font-bold text-white text-xs">${item.name}</div>
                <div class="text-[10px] text-neutral-400 line-clamp-1">${item.description || ''}</div>
              </div>
            </div>
          </td>
          <td class="py-2.5 px-3">
            <span class="px-2 py-0.5 rounded text-[10px] bg-[#1a2030] text-neutral-300 font-mono border border-[#2e374d]">${item.category || 'General'}</span>
          </td>
          <td class="py-2.5 px-3">
            ${isVeg 
              ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">VEG 🟢</span>'
              : '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">NON-VEG 🔴</span>'
            }
          </td>
          <td class="py-2.5 px-3">
            <div class="flex items-center gap-1">
              <span class="text-neutral-500 font-mono text-xs">₹</span>
              <input 
                type="number" 
                id="mgr-price-${item.id}" 
                value="${item.price}" 
                class="w-20 px-2 py-1 rounded-lg bg-[#0c0e15] border border-[#2e374d] text-amber-300 font-mono font-bold text-xs outline-none focus:border-amber-400">
              <button 
                onclick="APP.saveManagerDishPrice('${item.id}')" 
                class="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[10px] font-bold text-amber-300 transition-all active:scale-95" 
                title="Save Price">
                💾
              </button>
            </div>
          </td>
          <td class="py-2.5 px-3 text-center">
            <button 
              onclick="APP.toggleDishStockManager('${item.id}', ${!inStock})" 
              class="px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all ${
                inStock 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30' 
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
              }">
              ${inStock ? '🟢 In Stock' : '🔴 86 (Sold Out)'}
            </button>
          </td>
          <td class="py-2.5 px-3 text-right">
            <button 
              onclick="APP.deleteDishManager('${item.id}')" 
              class="p-1.5 rounded-lg bg-neutral-800 hover:bg-rose-500/20 hover:border-rose-500/40 text-neutral-400 hover:text-rose-400 transition-all" 
              title="Delete Dish">
              🗑️
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },



  async saveManagerDishPrice(itemId) {
    const input = document.getElementById(`mgr-price-${itemId}`);
    if (!input) return;
    const newPrice = parseFloat(input.value);
    if (isNaN(newPrice) || newPrice < 0) {
      this.showToast('Please enter a valid price');
      return;
    }

    try {
      const res = await fetch('/api/menu/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, price: newPrice })
      });
      const data = await res.json();
      if (data.success) {
        const item = (this.state.menu || []).find(i => i.id === itemId);
        if (item) item.price = newPrice;
        this.showToast(`✅ Price updated to ₹${newPrice}`);
        this.haptic('success');
      } else {
        this.showToast('Failed to update price');
      }
    } catch (e) {
      this.showToast('Network error saving price');
    }
  },

  async toggleDishStockManager(itemId, newInStock) {
    try {
      const res = await fetch('/api/menu/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, inStock: newInStock })
      });
      const data = await res.json();
      if (data.success) {
        const item = (this.state.menu || []).find(i => i.id === itemId);
        if (item) item.in_stock = newInStock ? 1 : 0;
        this.renderManagerMenu();
        this.showToast(newInStock ? '🟢 Dish Marked IN STOCK' : '🔴 Dish 86 SOLD OUT');
        this.haptic('success');
      }
    } catch (e) {
      this.showToast('Error updating stock status');
    }
  },

  async deleteDishManager(itemId) {
    const item = (this.state.menu || []).find(i => i.id === itemId);
    const name = item ? item.name : itemId;
    if (!confirm(`Are you sure you want to remove '${name}' from active menu?`)) return;

    try {
      const res = await fetch('/api/menu/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId })
      });
      const data = await res.json();
      if (data.success) {
        if (item) item.is_deleted = 1;
        this.renderManagerMenu();
        this.showToast(`🗑️ Removed ${name}`);
        this.haptic('success');
      }
    } catch (e) {
      this.showToast('Error removing dish');
    }
  },

  openAddDishModal() {
    const idEl = document.getElementById('mgr-dish-id');
    const nameEl = document.getElementById('mgr-dish-name');
    const priceEl = document.getElementById('mgr-dish-price');
    const descEl = document.getElementById('mgr-dish-desc');
    const titleEl = document.getElementById('mgr-dish-modal-title');

    if (idEl) idEl.value = '';
    if (nameEl) nameEl.value = '';
    if (priceEl) priceEl.value = '';
    if (descEl) descEl.value = '';
    if (titleEl) titleEl.textContent = 'Add New Dish';

    const modal = document.getElementById('mgr-dish-modal');
    if (modal) modal.classList.remove('hidden');
  },

  closeManagerDishModal() {
    const modal = document.getElementById('mgr-dish-modal');
    if (modal) modal.classList.add('hidden');
  },

  async saveManagerDish() {
    const name = (document.getElementById('mgr-dish-name')?.value || '').trim();
    const category = document.getElementById('mgr-dish-category')?.value || 'STARTERS';
    const price = parseFloat(document.getElementById('mgr-dish-price')?.value || '0');
    const type = document.getElementById('mgr-dish-type')?.value || 'veg';
    const description = (document.getElementById('mgr-dish-desc')?.value || '').trim();

    if (!name || isNaN(price) || price <= 0) {
      this.showToast('Please enter dish name and valid price');
      return;
    }

    const dishPayload = {
      name,
      category,
      price,
      is_veg: type === 'veg',
      description,
      in_stock: 1
    };

    try {
      const res = await fetch('/api/menu/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dishPayload)
      });
      const data = await res.json();
      if (data.success) {
        this.showToast(`✅ Dish '${name}' added to menu!`);
        this.closeManagerDishModal();
        await this.loadMenu();
        this.renderManagerMenu();
        this.haptic('success');
      }
    } catch (e) {
      this.showToast('Network error saving dish');
    }
  },

  async loadManagerInvoices() {
    try {
      const res = await fetch('/api/bills/recent?limit=40');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          this.state.mgrInvoices = data.bills || [];
          this.renderManagerInvoices();
        }
      }
    } catch (e) {
      console.warn('Invoices fetch error:', e);
    }
  },

  filterManagerInvoices() {
    this.renderManagerInvoices();
  },

  renderManagerInvoices() {
    const tbody = document.getElementById('mgr-invoices-table');
    if (!tbody) return;

    const searchInput = document.getElementById('mgr-invoice-search');
    const search = (searchInput ? searchInput.value : '').toLowerCase().trim();

    let bills = this.state.mgrInvoices || [];
    if (search) {
      bills = bills.filter(b => 
        (b.invoice_number && b.invoice_number.toLowerCase().includes(search)) ||
        (b.table_id && b.table_id.toLowerCase().includes(search)) ||
        (b.customer_phone && b.customer_phone.includes(search))
      );
    }

    if (bills.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="py-6 text-center text-neutral-500 italic">No recent invoices logged</td></tr>`;
      return;
    }

    tbody.innerHTML = bills.map(bill => {
      const rawDate = bill.created_at || bill.timestamp;
      const dateStr = rawDate ? new Date(rawDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
      const mode = (bill.payment_mode || 'CASH').toUpperCase();
      const modeColor = mode === 'UPI' ? 'text-sky-400 bg-sky-500/15 border-sky-500/30' : (mode === 'CARD' ? 'text-amber-300 bg-amber-500/15 border-amber-500/30' : 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30');
      const billedBy = bill.billed_by || bill.cashier_name || bill.waiter_name || 'Staff';
      const taxVal = bill.tax !== undefined ? bill.tax : ((bill.cgst || 0) + (bill.sgst || 0));
      const finalVal = bill.final_total !== undefined ? bill.final_total : (bill.grand_total || 0);

      return `
        <tr class="hover:bg-[#161b29] transition-all">
          <td class="py-2.5 px-3 font-mono font-bold text-amber-300 text-xs">${bill.invoice_number || ('INV-' + bill.id)}</td>
          <td class="py-2.5 px-3 text-neutral-400 font-mono text-[11px]">${dateStr}</td>
          <td class="py-2.5 px-3 font-bold text-white text-xs">${bill.table_id || 'Walk-in'}</td>
          <td class="py-2.5 px-3 text-neutral-300 text-xs">${billedBy}</td>
          <td class="py-2.5 px-3">
            <span class="px-2 py-0.5 rounded font-mono font-bold text-[10px] border ${modeColor}">${mode}</span>
          </td>
          <td class="py-2.5 px-3 text-right font-mono text-neutral-300">₹${(bill.subtotal || 0).toLocaleString('en-IN')}</td>
          <td class="py-2.5 px-3 text-right font-mono text-neutral-400">₹${taxVal.toLocaleString('en-IN')}</td>
          <td class="py-2.5 px-3 text-right font-mono font-black text-emerald-400 text-xs">₹${finalVal.toLocaleString('en-IN')}</td>
          <td class="py-2.5 px-3 text-center">
            <div class="flex items-center justify-center gap-1">
              <button 
                onclick="APP.reprintInvoiceManager('${bill.invoice_number || bill.id}')" 
                class="px-2 py-1 rounded bg-[#1e2536] hover:bg-[#2b354d] border border-[#3b4764] text-[10px] font-bold text-white transition-all active:scale-95" 
                title="Reprint 80mm Receipt">
                🖨️ Reprint
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },



  reprintInvoiceManager(invNumber) {
    const bill = (this.state.mgrInvoices || []).find(b => b.invoice_number === invNumber || String(b.id) === String(invNumber));
    if (!bill) {
      this.showToast('Bill not found for reprinting');
      return;
    }
    this.openEpsonReceiptModal(true, bill);
    this.showToast(`🖨️ Loaded Invoice #${bill.invoice_number} for 80mm reprint`);
  },

  async loadManagerVoidLogs() {
    try {
      const res = await fetch('/api/kots/voids?limit=50');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          this.state.mgrVoidLogs = data.logs || [];
          this.renderManagerVoids();
          this.updateManagerKpiCards();
        }
      }
    } catch (e) {
      console.warn('Void logs fetch error:', e);
    }
  },

  renderManagerVoids() {
    const tbody = document.getElementById('mgr-voids-table');
    if (!tbody) return;

    const logs = this.state.mgrVoidLogs || [];
    const totalVoidSum = logs.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
    const sumAmountEl = document.getElementById('mgr-void-summary-amount');
    const sumCountEl = document.getElementById('mgr-void-summary-count');
    if (sumAmountEl) sumAmountEl.textContent = `₹${Math.round(totalVoidSum).toLocaleString('en-IN')}`;
    if (sumCountEl) sumCountEl.textContent = `${logs.length} Items`;

    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" class="py-6 text-center text-neutral-500 italic">No void incidents recorded — Zero shrinkage!</td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map(log => {
      const rawTime = log.timestamp || log.created_at;
      const timeStr = rawTime ? new Date(rawTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--';
      const devId = (log.device_id || 'UNKNOWN').substring(0, 16);
      const staff = log.waiter_name || log.staff_name || 'Staff';
      const authBy = log.authorized_by || 'Manager (PIN: 1234)';

      return `
        <tr class="hover:bg-rose-950/20 transition-all">
          <td class="py-2.5 px-3 font-mono text-[11px] text-neutral-400">${timeStr}</td>
          <td class="py-2.5 px-3 font-bold text-white text-xs">${log.table_name || log.table_id || 'Table'}</td>
          <td class="py-2.5 px-3 text-neutral-400 text-xs">${log.floor || '1st Floor'}</td>
          <td class="py-2.5 px-3 font-bold text-rose-300 text-xs">${log.item_name || 'Item'}</td>
          <td class="py-2.5 px-3 font-mono text-center text-xs text-white">${log.qty || 1}</td>
          <td class="py-2.5 px-3 text-right font-mono font-bold text-rose-400 text-xs">₹${(log.amount || 0).toLocaleString('en-IN')}</td>
          <td class="py-2.5 px-3 text-xs text-amber-300 font-bold">${staff}</td>
          <td class="py-2.5 px-3 text-xs text-emerald-400 font-mono font-bold">${authBy}</td>
          <td class="py-2.5 px-3 font-mono text-[10px] text-neutral-400" title="${log.device_id}">${devId}</td>
          <td class="py-2.5 px-3 text-xs text-neutral-300">${log.reason || 'Guest Cancelled'}</td>
        </tr>
      `;
    }).join('');
  },



  async loadManagerStaff() {
    try {
      const res = await fetch('/api/staff');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          this.state.staff = data.staff || [];
          this.renderManagerStaff();
        }
      }
    } catch (e) {
      console.warn('Staff fetch error:', e);
    }
  },

  renderManagerStaff() {
    const tbody = document.getElementById('mgr-staff-table');
    if (!tbody) return;

    const staffList = this.state.staff || [];
    tbody.innerHTML = staffList.map(s => `
      <tr class="hover:bg-[#161b29] transition-all">
        <td class="py-2.5 px-3">
          <div class="font-bold text-white text-xs">${s.name}</div>
        </td>
        <td class="py-2.5 px-3">
          <span class="px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
            s.role === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : (
              s.role === 'cashier' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-neutral-800 text-neutral-300'
            )
          }">${(s.role || 'waiter').toUpperCase()}</span>
        </td>
        <td class="py-2.5 px-3 font-mono text-neutral-400 text-[11px]">${s.email || ('ID: ' + s.id)}</td>
        <td class="py-2.5 px-3">
          <div class="flex items-center gap-1">
            <input 
              type="password" 
              id="mgr-staff-pin-${s.id}" 
              maxlength="4" 
              value="${s.pin || ''}" 
              class="w-16 px-2 py-1 rounded bg-[#0c0e15] border border-[#2e374d] text-center font-mono font-bold text-xs text-white outline-none focus:border-amber-400">
            <button 
              onclick="APP.saveManagerStaffPin('${s.id}')" 
              class="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[10px] font-bold text-amber-300 transition-all active:scale-95" 
              title="Save PIN">
              💾
            </button>
          </div>
        </td>
        <td class="py-2.5 px-3 text-center">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
            s.active !== 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          }">${s.active !== 0 ? 'ACTIVE' : 'INACTIVE'}</span>
        </td>
        <td class="py-2.5 px-3 text-right">
          <button 
            onclick="APP.deleteStaffManager('${s.id}')" 
            class="p-1.5 rounded-lg bg-neutral-800 hover:bg-rose-500/20 hover:border-rose-500/40 text-neutral-400 hover:text-rose-400 transition-all" 
            title="Delete Staff">
            🗑️
          </button>
        </td>
      </tr>
    `).join('');
  },

  async saveManagerStaffPin(staffId) {
    const input = document.getElementById(`mgr-staff-pin-${staffId}`);
    if (!input) return;
    const pin = input.value.trim();
    if (!pin || pin.length !== 4) {
      this.showToast('Please enter a 4-digit PIN');
      return;
    }

    const member = (this.state.staff || []).find(s => String(s.id) === String(staffId));
    if (!member) return;

    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...member, pin })
      });
      const data = await res.json();
      if (data.success) {
        member.pin = pin;
        this.showToast(`✅ PIN updated for ${member.name}`);
        this.haptic('success');
      }
    } catch (e) {
      this.showToast('Error updating staff PIN');
    }
  },

  openAddStaffModal() {
    const modal = document.getElementById('mgr-staff-modal');
    if (modal) modal.classList.remove('hidden');
  },

  closeManagerStaffModal() {
    const modal = document.getElementById('mgr-staff-modal');
    if (modal) modal.classList.add('hidden');
  },

  async saveManagerStaffMember() {
    const name = (document.getElementById('mgr-new-staff-name')?.value || '').trim();
    const role = document.getElementById('mgr-new-staff-role')?.value || 'waiter';
    const pin = (document.getElementById('mgr-new-staff-pin')?.value || '').trim();

    if (!name || pin.length !== 4) {
      this.showToast('Please enter staff name and 4-digit PIN');
      return;
    }

    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, pin, active: 1 })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast(`✅ Added staff ${name}`);
        this.closeManagerStaffModal();
        await this.loadManagerStaff();
        this.haptic('success');
      }
    } catch (e) {
      this.showToast('Error creating staff member');
    }
  },

  async deleteStaffManager(staffId) {
    if (!confirm('Are you sure you want to deactivate this staff member?')) return;
    try {
      const res = await fetch('/api/staff/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast('Staff deactivated');
        await this.loadManagerStaff();
      }
    } catch (e) {
      this.showToast('Error deactivating staff');
    }
  },

  async loadManagerStoreSettings() {
    try {
      const res = await fetch('/api/store');
      if (res.ok) {
        const data = await res.json();
        const s = data.settings || data.store || {};
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        setVal('mgr-store-name', s.name || s.restaurant_name || 'BYOB INDIRAPURAM');
        setVal('mgr-store-tagline', s.tagline || 'Bring Your Own Bottle Experience');
        setVal('mgr-store-address', s.address || 'Indirapuram, Ghaziabad, UP');
        setVal('mgr-store-gstin', s.gstin || '07AABCB1234F1Z9');
        setVal('mgr-store-fssai', s.fssai || '12724055000123');
        setVal('mgr-store-cgst', s.cgst_percent !== undefined ? s.cgst_percent : 2.5);
        setVal('mgr-store-sgst', s.sgst_percent !== undefined ? s.sgst_percent : 2.5);
        setVal('mgr-store-service-charge', s.service_charge_percent || 0);
        setVal('mgr-store-upi-id', s.upi_vpa || 'byobindirapuram@icici');
        setVal('mgr-store-footer', s.receipt_footer || s.bill_footer || 'Thank You! Visit Again.');
      }
    } catch (e) {
      console.warn('Store fetch error:', e);
    }
  },

  async saveManagerStoreSettings() {
    const getVal = id => document.getElementById(id)?.value || '';
    const nameVal = getVal('mgr-store-name');
    const footerVal = getVal('mgr-store-footer');
    const payload = {
      name: nameVal,
      restaurant_name: nameVal,
      tagline: getVal('mgr-store-tagline'),
      address: getVal('mgr-store-address'),
      gstin: getVal('mgr-store-gstin'),
      fssai: getVal('mgr-store-fssai'),
      cgst_percent: parseFloat(getVal('mgr-store-cgst') || '2.5'),
      sgst_percent: parseFloat(getVal('mgr-store-sgst') || '2.5'),
      service_charge_percent: parseFloat(getVal('mgr-store-service-charge') || '0'),
      upi_vpa: getVal('mgr-store-upi-id'),
      receipt_footer: footerVal,
      bill_footer: footerVal
    };

    try {
      const res = await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        this.showToast('✅ Store & GST Settings Saved');
        this.haptic('success');
      }
    } catch (e) {
      this.showToast('Error saving store profile');
    }
  },

  loadManagerOTAInfo() {
    const linkEl = document.getElementById('mgr-apk-direct-link');
    if (linkEl) {
      const host = window.location.host || '192.168.1.6:3000';
      linkEl.textContent = `http://${host}/ONYX_POS.apk`;
    }
  },

  printDayEndZReport() {
    this.printPeriodZReport();
  },

  exportSalesCSV() {
    this.exportPeriodSalesCSV();
  },

  exportVoidLogsCSV() {
    const logs = this.state.mgrVoidLogs || [];
    if (logs.length === 0) {
      this.showToast('No void logs to export');
      return;
    }
    const headers = ['Timestamp', 'Table', 'Floor', 'Dish Removed', 'Qty', 'Amount', 'Requested By (Staff)', 'Authorized By (Manager PIN)', 'Device ID', 'Reason'];
    const rows = logs.map(l => [
      `"${l.timestamp || l.created_at || ''}"`,
      `"${l.table_name || l.table_id || ''}"`,
      `"${l.floor || ''}"`,
      `"${l.item_name || ''}"`,
      l.qty || 1,
      l.amount || 0,
      `"${l.waiter_name || l.staff_name || ''}"`,
      `"${l.authorized_by || 'Manager (PIN: 1234)'}"`,
      `"${l.device_id || ''}"`,
      `"${l.reason || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `anti_theft_void_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('📥 Void Logs CSV Downloaded');
  },

  showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 2000);
  }
};

window.APP = APP;

document.addEventListener('DOMContentLoaded', () => {
  APP.init();
});
