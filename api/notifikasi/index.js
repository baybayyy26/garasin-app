const { sql } = require('../_lib/db');
const { cors, requireAuth, ok, fail } = require('../_lib/middleware');

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    const user = requireAuth(req);

    // GET — notifikasi milik user yang login, urut terbaru
    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT * FROM notifikasi
        WHERE user_id = ${user.id}
        ORDER BY tanggal DESC, id DESC
      `;
      return ok(res, rows);
    }

    // PUT — tandai semua notifikasi user ini sebagai dibaca
    if (req.method === 'PUT') {
      await sql`
        UPDATE notifikasi SET dibaca = true
        WHERE user_id = ${user.id} AND dibaca = false
      `;
      return ok(res, { updated: true });
    }

    fail(res, 'Method tidak diizinkan.', 405);
  } catch (err) {
    if (err.status) return fail(res, err.message, err.status);
    console.error('[notifikasi/index]', err);
    fail(res, 'Terjadi kesalahan server.', 500);
  }
};
