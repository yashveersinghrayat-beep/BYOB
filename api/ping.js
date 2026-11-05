// High-Speed Standalone Ping Probe for Vercel Edge / Serverless
// Sub-15ms zero-cold-start latency health check

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    success: true,
    ok: true,
    mode: 'edge_serverless',
    timestamp: Date.now()
  });
};
