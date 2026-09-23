const handleRequest = require('../server/server');

/**
 * Vercel catch-all serverless function for all /api/* routes.
 * Maps /api/health, /api/data, /api/collection/..., etc. to the shared Node handler.
 */
module.exports = async function handler(req, res) {
  // Normalize URL so the shared router always sees /api/...
  if (req.url && !req.url.startsWith('/api')) {
    const qsIndex = req.url.indexOf('?');
    const pathOnly = (qsIndex >= 0 ? req.url.slice(0, qsIndex) : req.url).replace(/^\//, '');
    const qs = qsIndex >= 0 ? req.url.slice(qsIndex) : '';
    req.url = `/api/${pathOnly}${qs}`;
  }
  return handleRequest(req, res);
};
