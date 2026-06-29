const { sql } = require('../_lib/db');
const { cors, requireRole, ok, fail } = require('../_lib/middleware');

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return fail(res, 'Method tidak diizinkan.', 405);

  try {
    requireRole(req, ['admin', 'owner']);

    const { rows } = await sql`
      SELECT
        u.id, u.nama, u.email, u.no_hp, u.asal,
        COUNT(DISTINCT m.id)                                           AS jumlah_motor,
        COUNT(DISTINCT CASE WHEN b.status = 'aktif' THEN b.id END)   AS jumlah_aktif
      FROM users u
      LEFT JOIN motor m ON m.user_id = u.id
      LEFT JOIN booking b ON b.user_id = u.id
      WHERE u.role = 'pelanggan'
      GROUP BY u.id, u.nama, u.email, u.no_hp, u.asal
      ORDER BY u.nama
    `;
    ok(res, rows);
  } catch (err) {
    if (err.status) return fail(res, err.message, err.status);
    console.error('[users/index]', err);
    fail(res, 'Terjadi kesalahan server.', 500);
  }
};
