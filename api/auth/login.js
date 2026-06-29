const { sql } = require('../_lib/db');
const { signToken, checkPassword } = require('../_lib/auth');
const { cors, parseBody, ok, fail } = require('../_lib/middleware');

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return fail(res, 'Method tidak diizinkan.', 405);

  try {
    const { email, password } = await parseBody(req);
    if (!email || !password) return fail(res, 'Email dan sandi wajib diisi.');

    const { rows } = await sql`
      SELECT id, nama, email, password, role, no_hp, asal
      FROM users
      WHERE LOWER(email) = LOWER(${email.trim()})
      LIMIT 1
    `;
    const user = rows[0];
    if (!user) return fail(res, 'Email tidak terdaftar.', 401);

    const valid = await checkPassword(password, user.password);
    if (!valid) return fail(res, 'Kata sandi salah.', 401);

    const payload = { id: user.id, email: user.email, role: user.role, nama: user.nama };
    const token = signToken(payload);

    ok(res, {
      token,
      user: { id: user.id, nama: user.nama, email: user.email, role: user.role, no_hp: user.no_hp, asal: user.asal },
    });
  } catch (err) {
    console.error('[login]', err);
    fail(res, 'Terjadi kesalahan server.', 500);
  }
};
