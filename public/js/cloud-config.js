// ==============================================================================
// 💎 ONYX COMMERCIAL RESTAURANT POS — IN-BUILT PERMANENT CLOUD ADAPTER
// 100% Inbuilt, Secure & Managed (Zero Client Tampering)
// ==============================================================================

window.ONYX_CLOUD_CONFIG = {
  // Location & Branch Configuration (Multi-Branch Isolation)
  branchId: 'gyan_khand_2',
  branchCode: 'GK2',
  branchName: 'BYOB Gyan Khand 2 (Indirapuram)',
  branchLocation: 'Plot 14, Dr. Sushila Naiyyar Marg, Gyan Khand 2, Indirapuram, Ghaziabad',

  // Permanently in-built Supabase 24/7 Cloud Credentials
  supabaseUrl: 'https://wxsabwhabitqmzkplhyk.supabase.co',
  supabaseAnonKey: 'sb_publishable_mcrWV1LngJD6FwDPBI1qjg_lcl8SLsa',
  mode: 'cloud',

  _clientInstance: null,

  isConfigured() {
    return Boolean(this.supabaseUrl && this.supabaseAnonKey && this.supabaseUrl.startsWith('http'));
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
