# 💎 ONYX COMMERCIAL RESTAURANT POS — MASTER HANDOVER MANUAL
### *Operational Network for Yield & eXperience*
**Client Edition:** BYOB INDIRAPURAM / BAITHAK (*Bring Your Own Bottle Experience*)  
**System Version:** ONYX Pro Commercial Release v2.4 (Production Certified)  

---

## 🌟 Executive Overview
**ONYX POS** is a dual-tier commercial restaurant operating suite engineered for high-volume dining, craft bars, and BYOB lounges. It runs simultaneously across:
1. **📱 Handheld Waiter Phones (Wi-Fi):** Ultra-fast 1-tap dish punching, instant KOT generation, physical vibration & audio chime confirmation, Screen Wake Lock (never sleeps).
2. **💻 Billing Counter & Cashier Desk (PC/Mac):** Full-screen POS, past invoice reprint, live table status, UPI QR generator, split-bill math, and Epson 80mm thermal receipts.
3. **👑 Protected Manager Dashboard:** Strict credentialed access (`admin@google.in`), past bill modification with full audit trails, tax/store profile re-configuration, item voiding with PIN protection, and secret remote telemetry for remote bug hunting.

---

## 🔐 Credentials & Role Permissions Reference

### 👑 1. Manager Access (Confidential)
- **Portal:** Click **👑 Manager** in header or select **Login as Manager** in Welcome Gateway.
- **Email:** `admin@google.in`
- **Password:** `Admin@#1234`
- **Manager Authorization PIN:** `1234`
- **Exclusive Authorities:**
  - 🔒 **Last Orders & Past Bills:** Only manager can view settled bills, reprint old receipts, or inspect shift revenue. Waiters are blocked from viewing this data.
  - ✏️ **Edit Settled Bills:** Manager can adjust customer details, discounts, GST, service charge, round-off, and add/edit bill line items. Every single edit is permanently recorded in `bill_edit_logs`.
  - 🏢 **Store Bill Profile:** Change restaurant name, GSTIN, FSSAI, tax rates (CGST/SGST), UPI VPA, and receipt footer.
  - ❌ **Item Voiding:** Cancel/void individual dishes from running tables with mandatory reason & manager PIN.

### 👤 2. Waiter Staff Access (Fast Floor Mode)
- **Portal:** Click **🚀 Get Started (Waiter Staff)**.
- **Permissions:** Select tables, browse categories, punch KOTs to kitchen, view live running totals.
- **Restrictions:** Waiters CANNOT see past orders, CANNOT edit bills, CANNOT alter store tax profiles, and CANNOT void items without manager PIN.

---

## 📱 Mobile POS & Handheld Phone Permissions

The application includes deep mobile-native hardware integrations:
1. **💡 Screen Wake Lock (No Sleep Mode):** Automatically keeps the phone screen awake on duty. The display will never dim or lock while taking orders or viewing table occupancy.
2. **⛶ Fullscreen Kiosk Mode:** 1-tap kiosk mode removes the browser address bar and navigation buttons, giving a native Android/iOS app feel.
3. **🔊 Web Audio Synthesizer:** Real-time tactile audio chimes for item additions, kitchen order punch, cash register settlement, and alert chimes.
4. **📳 Physical Haptic Vibration:** Subtle millisecond vibrations on table selection, quantity changes, and order execution.
5. **📲 PWA 1-Tap Home Screen Installation:** Native Web App Manifest with custom luxury ONYX gold icons (`192x192` and `512x512`). Waiters can tap **"Install App"** to install directly on their phone home screen.

---

## 🚀 How to Launch in the Restaurant

### Option A: 1-Click Launch (Windows PC / Billing Counter)
Double-click:
```cmd
START_ONYX_SERVER.bat
```
The server will start on port `3000`.

### Option B: Command Line Launch
```bash
node server.js
```

### 🌐 Accessing the System:
- **Billing Counter PC:** Open `http://localhost:3000`
- **Waiter Phones (Connected to Restaurant Wi-Fi):** Open the local IP displayed on server start (e.g. `http://192.168.1.35:3000`).

---

## 🗄️ Database & Zero-Permanent-Deletion Guarantee

### Local Engine: Native SQLite WAL (`onyx_restaurant.db`)
- High-concurrency Write-Ahead Logging (WAL) mode.
- 100% offline-resilient: if internet goes down, restaurant billing continues uninterrupted.

### Cloud Engine: Supabase Master PostgreSQL (`supabase-schema.sql`)
- Multi-device real-time sync across distant locations and phones.
- Realtime replication on tables: `tables`, `kots`, `kot_items`, `bills`, `void_logs`, `bill_edit_logs`, `device_telemetry_logs`.

### 🛡️ Strict Zero Permanent Deletion:
- No data is ever deleted.
- Cancelled dishes are soft-voided (`is_void = 1`) and logged to `void_logs`.
- Modified bills soft-archive replaced line items (`is_archived = 1`) and record diffs to `bill_edit_logs`.
- Telemetry logs all device clicks, touches, and errors to `device_telemetry_logs`.

---

## 💾 Daily Database Backups
Double-click:
```cmd
BACKUP_DATABASE.bat
```
A timestamped snapshot of `onyx_restaurant.db` is immediately saved to the `backups/` folder.
