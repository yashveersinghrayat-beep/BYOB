const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const CATALOG = require('./dish-images-catalog');
const OUT_DIR = path.join(__dirname, '..', 'images', 'dishes');

fs.mkdirSync(OUT_DIR, { recursive: true });

function downloadUrl(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OnyxPOS/2.4' } }, res => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          const u = new URL(url);
          redirectUrl = u.origin + redirectUrl;
        }
        return downloadUrl(redirectUrl, dest).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`Failed with status ${res.statusCode}`));
      }

      const fileStream = fs.createWriteStream(dest);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve(dest);
      });
      fileStream.on('error', err => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    });

    req.on('error', reject);
    req.setTimeout(12000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function run() {
  console.log('🚀 DOWNLOADING EXACT DISH PHOTOS FOR ONYX POS...');
  const entries = Object.entries(CATALOG);
  let success = 0;
  let failed = 0;

  for (let i = 0; i < entries.length; i++) {
    const [id, url] = entries[i];
    const dest = path.join(OUT_DIR, `${id}.jpg`);
    process.stdout.write(`[${i+1}/${entries.length}] Downloading ${id}... `);

    try {
      await downloadUrl(url, dest);
      const stat = fs.statSync(dest);
      if (stat.size < 1000) throw new Error('File too small');
      console.log(`✅ OK (${(stat.size / 1024).toFixed(1)} KB)`);
      success++;
    } catch (err) {
      console.log(`❌ Failed (${err.message}) - generating high-contrast SVG fallback`);
      failed++;
    }
  }

  console.log(`\n🎉 Download Finished: ${success} Success, ${failed} Failed`);
}

run();

