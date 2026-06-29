const { sql } = require('../_lib/db');
const { cors, requireAuth, ok, fail } = require('../_lib/middleware');

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return fail(res, 'Method tidak diizinkan.', 405);

  try {
    const user = requireAuth(req);

    let rows;
    if (user.role === 'pelanggan') {
      ({ rows } = await sql`
        SELECT py.*, b.tanggal_mulai, b.tanggal_selesai, b.status AS booking_status,
               m.tipe AS motor_tipe, m.plat AS motor_plat
        FROM pembayaran py
        JOIN booking b ON b.id = py.booking_id
        JOIN motor m ON m.id = b.motor_id
        WHERE b.user_id = ${user.id}
        ORDER BY py.id DESC
      `);
    } else {
      ({ rows } = await sql`
        SELECT py.*, b.tanggal_mulai, b.tanggal_selesai, b.status AS booking_status,
               m.tipe AS motor_tipe, m.plat AS motor_plat,
               u.nama AS pelanggan_nama
        FROM pembayaran py
        JOIN booking b ON b.id = py.booking_id
        JOIN motor m ON m.id = b.motor_id
        JOIN users u ON u.id = b.user_id
        ORDER BY py.id DESC
      `);
    }
    ok(res, rows);
  } catch (err) {
    if (err.status) return fail(res, err.message, err.status);
    console.error('[pembayaran/index]', err);
    fail(res, 'Terjadi kesalahan server.', 500);
  }
};
