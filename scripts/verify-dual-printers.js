// scripts/verify-dual-printers.js
const http = require('http');

function postJson(url, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const bodyStr = JSON.stringify(data);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    }, res => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(resData)); } catch(e) { resolve(resData); }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve(data); }
      });
    }).on('error', reject);
  });
}

async function testDualPrinters() {
  console.log('🚀 Testing Dual Printers Separation & Configuration Engine...');

  // Test 1: Check Printer Status API
  console.log('\n--- TEST 1: PRINTER STATUS API CHECK ---');
  const status = await getJson('http://localhost:3000/api/printer/status');
  console.log('Printer Status:', JSON.stringify(status, null, 2));

  if (!status.success) throw new Error('FAIL: /api/printer/status did not return success!');
  if (!status.kitchen || !status.bill) throw new Error('FAIL: /api/printer/status missing kitchen or bill object!');
  console.log('✅ PASS: /api/printer/status accurately reports both Kitchen (KOT) & Bill printers.');

  // Test 2: Update Printer Configuration Live
  console.log('\n--- TEST 2: RUNTIME PRINTER CONFIGURATION UPDATE ---');
  const newConfig = {
    kitchen_printer_ip: '192.168.1.252',
    kitchen_printer_port: '9100',
    kitchen_printer_enabled: '1',
    bill_printer_mode: 'browser',
    bill_printer_ip: '192.168.1.250',
    bill_printer_port: '9100'
  };
  const configRes = await postJson('http://localhost:3000/api/printer/config', newConfig);
  console.log('Config Update Response:', configRes);
  if (!configRes.success) throw new Error('FAIL: /api/printer/config failed!');
  console.log('✅ PASS: Dual printer configuration saved and activated live!');

  // Test 3: Test KOT Printer Diagnostics
  console.log('\n--- TEST 3: TEST KOT PRINTER DIAGNOSTIC ROUTE ---');
  const testKotRes = await postJson('http://localhost:3000/api/printer/test-kot', {});
  console.log('Test KOT Result:', testKotRes);
  if (!testKotRes.success) throw new Error('FAIL: /api/printer/test-kot did not execute cleanly!');
  console.log('✅ PASS: /api/printer/test-kot dispatched diagnostic order to Kitchen printer socket.');

  // Test 4: Test Bill Printer Diagnostics
  console.log('\n--- TEST 4: TEST BILL PRINTER DIAGNOSTIC ROUTE ---');
  const testBillRes = await postJson('http://localhost:3000/api/printer/test-bill', {});
  console.log('Test Bill Result:', testBillRes);
  if (!testBillRes.success) throw new Error('FAIL: /api/printer/test-bill did not execute cleanly!');
  console.log('✅ PASS: /api/printer/test-bill dispatched diagnostic receipt to Bill printer.');

  console.log('\n======================================================');
  console.log('🎉 ALL DUAL PRINTER TESTS PASSED 100%!');
  console.log('======================================================\n');
}

testDualPrinters().catch(err => {
  console.error('❌ Dual printer test error:', err);
  process.exit(1);
});
