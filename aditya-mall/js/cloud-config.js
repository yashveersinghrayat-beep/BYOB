// ==============================================================================
// 💎 ONYX COMMERCIAL RESTAURANT POS — ADITYA MALL CLOUD ADAPTER
// 100% Inbuilt, Secure & Managed (Zero Client Tampering)
// ==============================================================================

window.ONYX_CLOUD_CONFIG = {
  // Location & Branch Configuration (Multi-Branch Isolation)
  branchId: 'aditya_mall',
  branchCode: 'AM',
  branchName: 'BYOB Aditya Mall (Indirapuram)',
  branchLocation: 'Aditya Mega Mall, CBD Ground, Indirapuram, Ghaziabad',

  // Supabase 24/7 Cloud Credentials for Aditya Mall
  supabaseUrl: 'https://PENDING_ADITYA_SUPABASE.supabase.co',
  supabaseAnonKey: 'PENDING_ADITYA_ANON_KEY',
  mode: 'cloud',

  _clientInstance: null,

  isConfigured() {
    return Boolean(this.supabaseUrl && this.supabaseAnonKey && this.supabaseUrl.startsWith('http') && !this.supabaseUrl.includes('PENDING'));
  },

  getClient() {
    if (!this.isConfigured()) return null;
    if (this._clientInstance) return this._clientInstance;

    if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
      try {
        this._clientInstance = window.supabase.createClient(this.supabaseUrl, this.supabaseAnonKey, {
          auth: { persistSession: false },
          realtime: { params: { eventsPerSecond: 10 } }
        });
        return this._clientInstance;
      } catch (err) {
        console.error('Failed to initialize Supabase client:', err);
        return null;
      }
    }
    return null;
  }
};
