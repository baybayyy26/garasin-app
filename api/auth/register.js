const { sql } = require('../_lib/db');
const { signToken, hashPassword } = require('../_lib/auth');
const { cors, parseBody, ok, fail } = require('../_lib/middleware');

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return fail(res, 'Method tidak diizinkan.', 405);

  try {
    const { nama, email, password, no_hp, asal } = await parseBody(req);
    if (!nama || !email || !password) return fail(res, 'Nama, email, dan sandi wajib diisi.');
    if (password.length < 6) return fail(res, 'Sandi minimal 6 karakter.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 'Format email tidak valid.');

    const emailClean = email.toLowerCase().trim();

    const { rows: existing } = await sql`
      SELECT id FROM users WHERE LOWER(email) = ${emailClean} LIMIT 1
    `;
    if (existing.length) return fail(res, 'Email sudah dipakai.', 409);

    const hash = await hashPassword(password);
    const { rows } = await sql`
      INSERT INTO users (nama, email, password, role, no_hp, asal)
      VALUES (${nama.trim()}, ${emailClean}, ${hash}, 'pelanggan',
              ${(no_hp || '-').trim()}, ${(asal || '-').trim()})
      RETURNING id, nama, email, role, no_hp, asal
    `;
    const user = rows[0];
    const payload = { id: user.id, email: user.email, role: user.role, nama: user.nama };
    const token = signToken(payload);

    ok(res, { token, user }, 201);
  } catch (err) {
    console.error('[register]', err);
    fail(res, 'Terjadi kesalahan server.', 500);
  }
};
