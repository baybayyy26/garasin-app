// POST /api/auth?action=login    → { email, password }
// POST /api/auth?action=register → { nama, email, password, no_hp, asal }

const { sql } = require('./_lib/db');
const { signToken, checkPassword, hashPassword } = require('./_lib/auth');
const { cors, parseBody, ok, fail } = require('./_lib/middleware');

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return fail(res, 'Method tidak diizinkan.', 405);

  const action = req.query.action;

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  if (action === 'login') {
    try {
      const { email, password } = await parseBody(req);
      if (!email || !password) return fail(res, 'Email dan sandi wajib diisi.');

      const { rows } = await sql`
        SELECT id, nama, email, password, role, no_hp, asal
        FROM users WHERE LOWER(email) = LOWER(${String(email).trim()}) LIMIT 1
      `;
      const user = rows[0];
      if (!user) return fail(res, 'Email tidak terdaftar.', 401);

      const valid = await checkPassword(password, user.password);
      if (!valid) return fail(res, 'Kata sandi salah.', 401);

      const token = signToken({ id: user.id, email: user.email, role: user.role, nama: user.nama });
      return ok(res, {
        token,
        user: { id: user.id, nama: user.nama, email: user.email, role: user.role, no_hp: user.no_hp, asal: user.asal },
      });
    } catch (err) {
      console.error('[auth/login]', err);
      return fail(res, 'Terjadi kesalahan server.', 500);
    }
  }

  // ── REGISTER ───────────────────────────────────────────────────────────────
  if (action === 'register') {
    try {
      const { nama, email, password, no_hp, asal } = await parseBody(req);
      if (!nama || !email || !password) return fail(res, 'Nama, email, dan sandi wajib diisi.');
      if (password.length < 6) return fail(res, 'Sandi minimal 6 karakter.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 'Format email tidak valid.');

      const emailClean = email.toLowerCase().trim();
      const { rows: ex } = await sql`SELECT id FROM users WHERE LOWER(email) = ${emailClean} LIMIT 1`;
      if (ex.length) return fail(res, 'Email sudah dipakai.', 409);

      const hash = await hashPassword(password);
      const { rows } = await sql`
        INSERT INTO users (nama, email, password, role, no_hp, asal)
        VALUES (${nama.trim()}, ${emailClean}, ${hash}, 'pelanggan',
                ${(no_hp || '-').trim()}, ${(asal || '-').trim()})
        RETURNING id, nama, email, role, no_hp, asal
      `;
      const user = rows[0];
      const token = signToken({ id: user.id, email: user.email, role: user.role, nama: user.nama });
      return ok(res, { token, user }, 201);
    } catch (err) {
      console.error('[auth/register]', err);
      return fail(res, 'Terjadi kesalahan server.', 500);
    }
  }

  fail(res, 'Parameter action tidak valid. Gunakan ?action=login atau ?action=register.');
};
