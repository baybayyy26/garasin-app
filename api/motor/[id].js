const { sql } = require('../_lib/db');
const { cors, parseBody, requireAuth, ok, fail } = require('../_lib/middleware');

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    const user = requireAuth(req);
    const id = Number(req.query.id);
    if (!id) return fail(res, 'ID tidak valid.');

    const { rows: motors } = await sql`SELECT * FROM motor WHERE id = ${id} LIMIT 1`;
    const motor = motors[0];
    if (!motor) return fail(res, 'Motor tidak ditemukan.', 404);

    // Pelanggan hanya boleh akses motor milik sendiri
    if (user.role === 'pelanggan' && motor.user_id !== user.id)
      return fail(res, 'Akses ditolak.', 403);

    if (req.method === 'GET') return ok(res, motor);

    if (req.method === 'PUT') {
      const { plat, tipe, cc, warna, foto } = await parseBody(req);
      const { rows } = await sql`
        UPDATE motor SET
          plat  = COALESCE(${plat ? plat.trim().toUpperCase() : null}, plat),
          tipe  = COALESCE(${tipe ? tipe.trim() : null}, tipe),
          cc    = COALESCE(${cc != null ? Number(cc) : null}, cc),
          warna = COALESCE(${warna ? warna.trim() : null}, warna),
          foto  = COALESCE(${foto || null}, foto)
        WHERE id = ${id}
        RETURNING *
      `;
      return ok(res, rows[0]);
    }

    if (req.method === 'DELETE') {
      // Cek tidak ada booking aktif
      const { rows: aktif } = await sql`
        SELECT id FROM booking WHERE motor_id = ${id} AND status = 'aktif' LIMIT 1
      `;
      if (aktif.length) return fail(res, 'Tidak bisa hapus motor yang sedang aktif disimpan.');
      await sql`DELETE FROM motor WHERE id = ${id}`;
      return ok(res, { deleted: true });
    }

    fail(res, 'Method tidak diizinkan.', 405);
  } catch (err) {
    if (err.status) return fail(res, err.message, err.status);
    console.error('[motor/[id]]', err);
    fail(res, 'Terjadi kesalahan server.', 500);
  }
};
