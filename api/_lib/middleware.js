const { verifyToken } = require('./auth');

// Handle CORS preflight — panggil di awal setiap handler
function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true; // caller harus return jika ini true
  }
  return false;
}

// Parse body JSON — Vercel sudah auto-parse tapi ini fallback aman
async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

// Cek JWT dari header Authorization: Bearer <token>
// Return: user payload { id, email, role, nama }
// Throw: Error dengan status 401 jika tidak valid
function requireAuth(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    const err = new Error('Token tidak ditemukan. Login dulu.');
    err.status = 401;
    throw err;
  }
  try {
    return verifyToken(token);
  } catch {
    const err = new Error('Token tidak valid atau sudah kedaluwarsa.');
    err.status = 401;
    throw err;
  }
}

// Cek role — roles: array string, mis. ['admin', 'owner']
function requireRole(req, roles) {
  const user = requireAuth(req);
  if (!roles.includes(user.role)) {
    const err = new Error('Akses ditolak. Peran tidak sesuai.');
    err.status = 403;
    throw err;
  }
  return user;
}

// Kirim response JSON standar
function ok(res, data, status = 200) {
  res.status(status).json({ ok: true, data });
}

function fail(res, message, status = 400) {
  res.status(status).json({ ok: false, error: message });
}

module.exports = { cors, parseBody, requireAuth, requireRole, ok, fail };
