// ONYX RESTAURANT OS — Vercel Serverless Function Entry Point
// Bridges Vercel serverless HTTP invocations to ONYX Core Engine (server.js)

const handleRequest = require('../server.js');

module.exports = (req, res) => {
  return handleRequest(req, res);
};
