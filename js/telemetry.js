// ONYX COMMERCIAL RESTAURANT ENGINE - Remote Telemetry & Bug Hunting System
// Silently records device metrics, hardware fingerprint, touch/click coordinates,
// screen navigation, active orders, and all runtime errors for remote diagnostics.
// Strict Zero Data Loss & Non-Intrusive Background Execution.

(function () {
  'use strict';

  // 1. Persistent Unique Device ID & Session ID
  function getOrCreateDeviceId() {
    let devId = localStorage.getItem('onyx_device_id');
    if (!devId) {
      const randHex = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
      devId = 'DEV-' + randHex() + randHex() + '-' + randHex() + '-' + randHex();
      localStorage.setItem('onyx_device_id', devId);
    }
    return devId;
  }

  function getOrCreateSessionId() {
    let sessId = sessionStorage.getItem('onyx_session_id');
    if (!sessId) {
      sessId = 'SES-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);
      sessionStorage.setItem('onyx_session_id', sessId);
    }
    return sessId;
  }

  // 2. Deterministic Hardware Fingerprint & Pseudo-MAC Address
  // Browser sandboxes prohibit raw physical IEEE MAC addresses for security.
  // We compute a persistent hardware fingerprint and format it as a MAC address.
  function computeHardwareFingerprint() {
    let canvasHash = '00';
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 40;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = "14px 'Arial', sans-serif";
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('ONYX-POS,BYOB', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('DEBUG-TRC', 4, 17);
        const dataUrl = canvas.toDataURL();
        let hash = 0;
        for (let i = 0; i < dataUrl.length; i++) {
          hash = ((hash << 5) - hash) + dataUrl.charCodeAt(i);
          hash |= 0;
        }
        canvasHash = Math.abs(hash).toString(16).padStart(8, '0');
      }
    } catch (e) {}

    const seed = [
      navigator.userAgent,
      navigator.platform || '',
      screen.width + 'x' + screen.height + 'x' + screen.colorDepth,
      navigator.hardwareConcurrency || 4,
      navigator.deviceMemory || 4,
      navigator.maxTouchPoints || 0,
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      canvasHash
    ].join('###');

    // Simple FNV-1a 64-bit style hash
    let h1 = 0x811c9dc5, h2 = 0x27d4eb2f;
    for (let i = 0; i < seed.length; i++) {
      const code = seed.charCodeAt(i);
      h1 ^= code;
      h1 = Math.imul(h1, 16777619);
      h2 ^= code;
      h2 = Math.imul(h2, 1099511628211);
    }
    const hex1 = ('00000000' + (h1 >>> 0).toString(16)).slice(-8);
    const hex2 = ('00000000' + (h2 >>> 0).toString(16)).slice(-8);
    const combined = (hex1 + hex2).toUpperCase();

    // Format as 6-byte standard MAC address (e.g. C4:B3:01:8A:2F:90)
    const mac = `${combined.substr(0,2)}:${combined.substr(2,2)}:${combined.substr(4,2)}:${combined.substr(6,2)}:${combined.substr(8,2)}:${combined.substr(10,2)}`;
    return { mac, fingerprint: combined };
  }

  const DEVICE_ID = getOrCreateDeviceId();
  const SESSION_ID = getOrCreateSessionId();
  const HW_INFO = computeHardwareFingerprint();

  function getDeviceSpecs() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return {
      deviceId: DEVICE_ID,
      mac_pseudo_address: HW_INFO.mac,
      hardware_fingerprint: HW_INFO.fingerprint,
      userAgent: navigator.userAgent,
      platform: navigator.platform || (navigator.userAgentData && navigator.userAgentData.platform) || 'Unknown',
      language: navigator.language || 'en',
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1,
      touchPoints: navigator.maxTouchPoints || 0,
      cpuCores: navigator.hardwareConcurrency || 'N/A',
      deviceMemory: navigator.deviceMemory || 'N/A',
      connectionType: conn ? conn.effectiveType : 'unknown',
      online: navigator.onLine,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  // 3. Application State Sniffer
  function getCurrentAppContext() {
    let screenName = 'tables_grid';
    const activeModals = [];
    document.querySelectorAll('.modal.active, .modal.show, .overlay.active').forEach(m => {
      if (m.id) activeModals.push(m.id);
    });

    if (activeModals.length > 0) {
      screenName = 'modal:' + activeModals.join('+');
    } else {
      const posScreen = document.getElementById('pos-screen');
      const tablesScreen = document.getElementById('tables-screen');
      const analyticsScreen = document.getElementById('analytics-screen');
      if (posScreen && !posScreen.classList.contains('hidden') && posScreen.style.display !== 'none') {
        screenName = 'pos_punch';
      } else if (analyticsScreen && !analyticsScreen.classList.contains('hidden')) {
        screenName = 'analytics_dashboard';
      } else if (tablesScreen && !tablesScreen.classList.contains('hidden')) {
        screenName = 'tables_grid';
      }
    }

    let activeTableId = null;
    if (window.currentTable && window.currentTable.id) {
      activeTableId = window.currentTable.id;
    } else if (window.selectedTableId) {
      activeTableId = window.selectedTableId;
    } else {
      const tblHeader = document.querySelector('[data-active-table]');
      if (tblHeader) activeTableId = tblHeader.getAttribute('data-active-table');
    }

    let userRole = 'waiter';
    let userEmail = null;
    if (window.APP && window.APP.state && window.APP.state.userRole) {
      userRole = window.APP.state.userRole;
      userEmail = window.APP.state.userEmail || null;
    } else if (window.currentUser) {
      userRole = window.currentUser.role || 'waiter';
      userEmail = window.currentUser.email || null;
    } else if (localStorage.getItem('onyx_user_role')) {
      userRole = localStorage.getItem('onyx_user_role');
      userEmail = localStorage.getItem('onyx_user_email');
    } else if (localStorage.getItem('onyx_staff_role')) {
      userRole = localStorage.getItem('onyx_staff_role');
      userEmail = localStorage.getItem('onyx_staff_email');
    }

    return { screenName, activeTableId, userRole, userEmail };
  }

  // 4. Element Selector & Text Sanitizer
  function getElementDescriptor(el) {
    if (!el || el === document || el === window) return 'window';
    let desc = el.tagName ? el.tagName.toLowerCase() : 'el';
    if (el.id) {
      desc += '#' + el.id;
    } else if (el.classList && el.classList.length > 0) {
      const classes = Array.from(el.classList).filter(c => !c.startsWith('ng-') && c.length < 25).slice(0, 2);
      if (classes.length > 0) desc += '.' + classes.join('.');
    }
    const dataId = el.getAttribute && (el.getAttribute('data-id') || el.getAttribute('data-action') || el.getAttribute('data-table'));
    if (dataId) desc += `[data="${dataId}"]`;
    return desc;
  }

  function getElementTextPreview(el) {
    if (!el) return '';
    if (el.tagName === 'INPUT') {
      if (el.type === 'password') return '[PASSWORD_MASKED]';
      return (el.placeholder || el.value || '').substring(0, 30);
    }
    const txt = (el.innerText || el.textContent || el.title || el.getAttribute('aria-label') || '').trim();
    return txt.replace(/\s+/g, ' ').substring(0, 50);
  }

  // 5. In-Memory Batch Queue
  const telemetryQueue = [];
  let flushTimer = null;
  let isFlushing = false;

  function enqueueEvent(eventData) {
    const ctx = getCurrentAppContext();
    const event = {
      id: 'TEL-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      device_id: DEVICE_ID,
      mac_pseudo_address: HW_INFO.mac,
      session_id: SESSION_ID,
      event_type: eventData.event_type || 'interaction',
      event_name: eventData.event_name || 'user_event',
      target_element: eventData.target_element || null,
      target_text: eventData.target_text || null,
      touch_x: eventData.touch_x !== undefined ? eventData.touch_x : null,
      touch_y: eventData.touch_y !== undefined ? eventData.touch_y : null,
      current_screen: eventData.current_screen || ctx.screenName,
      active_table_id: eventData.active_table_id || ctx.activeTableId,
      user_role: eventData.user_role || ctx.userRole,
      user_email: eventData.user_email || ctx.userEmail,
      device_info: getDeviceSpecs(),
      event_payload: eventData.payload || null,
      created_at: new Date().toISOString()
    };

    telemetryQueue.push(event);

    // Prevent unbounded memory growth during prolonged offline periods: cap queue at 80
    if (telemetryQueue.length > 80) {
      telemetryQueue.splice(0, telemetryQueue.length - 80);
    }

    // If an error occurred or queue is getting full, flush immediately
    if (event.event_type === 'error' || telemetryQueue.length >= 10) {
      flushTelemetry();
    }
  }

  // 6. Silent Dispatcher (SQLite Server + Supabase Cloud)
  async function flushTelemetry() {
    if (telemetryQueue.length === 0 || isFlushing) return;
    isFlushing = true;

    const batch = telemetryQueue.splice(0, 20); // Flush in slices of up to 20
    const payload = JSON.stringify({ events: batch });

    // A. Sync to Supabase Cloud if connected
    try {
      if (window.ONYX_CLOUD_CONFIG && typeof window.ONYX_CLOUD_CONFIG.getClient === 'function') {
        const client = window.ONYX_CLOUD_CONFIG.getClient();
        if (client) {
          client.from('device_telemetry_logs').insert(batch.map(ev => ({
            id: ev.id,
            device_id: ev.device_id,
            mac_pseudo_address: ev.mac_pseudo_address,
            session_id: ev.session_id,
            event_type: ev.event_type,
            event_name: ev.event_name,
            target_element: ev.target_element,
            target_text: ev.target_text,
            touch_x: ev.touch_x,
            touch_y: ev.touch_y,
            current_screen: ev.current_screen,
            active_table_id: ev.active_table_id,
            user_role: ev.user_role,
            user_email: ev.user_email,
            device_info: ev.device_info,
            event_payload: ev.event_payload,
            created_at: ev.created_at
          }))).then(() => {}).catch(err => {
            // Silently fallback without disrupting the app
          });
        }
      }
    } catch (e) {}

    // B. Send to local Node/SQLite server with keepalive
    try {
      await fetch('/api/telemetry/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      });
    } catch (err) {
      // Re-queue items if transmission failed and queue isn't overflowed
      if (telemetryQueue.length < 50) {
        telemetryQueue.unshift(...batch);
      }
    } finally {
      isFlushing = false;
    }
  }

  // Start periodic background flusher (every 4 seconds)
  setInterval(() => {
    if (telemetryQueue.length > 0) flushTelemetry();
  }, 4000);

  // Send any remaining events on page exit or phone screen lock
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && telemetryQueue.length > 0) {
      const batch = telemetryQueue.splice(0, 20);
      const blob = new Blob([JSON.stringify({ events: batch })], { type: 'application/json' });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/telemetry/batch', blob);
      } else {
        flushTelemetry();
      }
    }
  });

  window.addEventListener('pagehide', () => {
    if (telemetryQueue.length > 0) {
      const batch = telemetryQueue.splice(0, 20);
      const blob = new Blob([JSON.stringify({ events: batch })], { type: 'application/json' });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/telemetry/batch', blob);
      }
    }
  });

  // 7. Global Touch / Click Coordinates Listener
  let lastTouchTime = 0;
  let lastX = 0, lastY = 0;

  function handleInteraction(e) {
    const now = Date.now();
    const x = Math.round(e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0));
    const y = Math.round(e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0));

    // Debounce rapid tap jitter (within 120ms and 5px)
    if (now - lastTouchTime < 120 && Math.abs(x - lastX) < 6 && Math.abs(y - lastY) < 6) {
      return;
    }
    lastTouchTime = now;
    lastX = x;
    lastY = y;

    const target = e.target;
    const targetElement = getElementDescriptor(target);
    const targetText = getElementTextPreview(target);

    // Determine semantic event name
    let eventName = 'screen_tap';
    if (target.closest('button')) eventName = 'button_click';
    else if (target.closest('.table-card')) eventName = 'table_select';
    else if (target.closest('.menu-item-card')) eventName = 'menu_item_select';
    else if (target.closest('input, textarea, select')) eventName = 'input_focus';
    else if (target.closest('.modal-close, .btn-close')) eventName = 'modal_close';

    enqueueEvent({
      event_type: e.pointerType === 'touch' ? 'touch' : 'click',
      event_name: eventName,
      target_element: targetElement,
      target_text: targetText,
      touch_x: x,
      touch_y: y
    });
  }

  window.addEventListener('pointerdown', handleInteraction, { capture: true, passive: true });

  // 8. Remote Bug Hunting & Crash Logger
  // Catches all uncaught JavaScript exceptions and stack traces
  window.addEventListener('error', function (e) {
    enqueueEvent({
      event_type: 'error',
      event_name: 'uncaught_exception',
      target_element: e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : 'unknown_script',
      target_text: (e.message || 'JavaScript Error').substring(0, 100),
      payload: {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error ? (e.error.stack || e.error.toString()) : null
      }
    });
  });

  window.addEventListener('unhandledrejection', function (e) {
    const reason = e.reason;
    enqueueEvent({
      event_type: 'error',
      event_name: 'unhandled_promise_rejection',
      target_element: 'Promise',
      target_text: typeof reason === 'string' ? reason.substring(0, 100) : (reason && reason.message ? reason.message.substring(0, 100) : 'Rejected'),
      payload: {
        message: reason && reason.message ? reason.message : String(reason),
        stack: reason && reason.stack ? reason.stack : null
      }
    });
  });

  // 9. Public Telemetry API for custom audit events
  window.OnyxTelemetry = {
    getDeviceId: () => DEVICE_ID,
    getMacAddress: () => HW_INFO.mac,
    getSessionId: () => SESSION_ID,
    getSpecs: getDeviceSpecs,
    log: function (eventName, eventType = 'action', payload = null) {
      enqueueEvent({
        event_name: eventName,
        event_type: eventType,
        payload: payload
      });
    },
    flush: flushTelemetry
  };

  // Log initial session start
  enqueueEvent({
    event_type: 'lifecycle',
    event_name: 'app_session_started',
    payload: {
      url: window.location.href,
      referrer: document.referrer,
      mac_pseudo_address: HW_INFO.mac
    }
  });

})();

