const fs = require('fs');
const path = require('path');
const https = require('https');

const fixes = {
  m_water: "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=400&q=80",
  v_kala_chana: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80",
  v_potato_veggies: "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=400&q=80",
  v_peri_peri_fries: "https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=400&q=80",
  nv_chicken_wings: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=400&q=80",
  p_veg_arrabbiata: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=400&q=80",
  p_veg_alfredo: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=400&q=80"
};

const OUT_DIR = path.join(__dirname, '..', 'images', 'dishes');

function downloadUrl(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 OnyxPOS/2.4' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadUrl(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error('Status ' + res.statusCode));
      const stream = fs.createWriteStream(dest);
      res.pipe(stream);
      stream.on('finish', () => { stream.close(); resolve(); });
      stream.on('error', reject);
    }).on('error', reject);
  });
}

(async () => {
  for (const [id, url] of Object.entries(fixes)) {
    const dest = path.join(OUT_DIR, `${id}.jpg`);
    try {
      await downloadUrl(url, dest);
      const stat = fs.statSync(dest);
      console.log(`✅ Downloaded ${id}: ${(stat.size / 1024).toFixed(1)} KB`);
    } catch(e) {
      console.log(`❌ Failed ${id}:`, e.message);
    }
  }
})();

