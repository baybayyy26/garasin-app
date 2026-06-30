// GET    /api/users       → semua pelanggan terdaftar + agregasi (admin/owner only)
// DELETE /api/users?id=X  → hapus pelanggan beserta seluruh datanya (admin/owner only)

const { sql } = require('./_lib/db');
const { cors, requireRole, ok, fail } = require('./_lib/middleware');

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    requireRole(req, ['admin', 'owner']);

    // ── GET ──────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT
          u.id, u.nama, u.email, u.no_hp, u.asal,
          COUNT(DISTINCT m.id)                                          AS jumlah_motor,
          COUNT(DISTINCT CASE WHEN b.status = 'aktif' THEN b.id END)  AS jumlah_aktif
        FROM users u
        LEFT JOIN motor m   ON m.user_id = u.id
        LEFT JOIN booking b ON b.user_id = u.id
        WHERE u.role = 'pelanggan'
        GROUP BY u.id, u.nama, u.email, u.no_hp, u.asal
        ORDER BY u.nama
      `;
      return ok(res, rows);
    }

    // ── DELETE ───────────────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      const id = req.query.id ? Number(req.query.id) : null;
      if (!id) return fail(res, 'Parameter id wajib ada.');

      // Cek user ada dan rolenya pelanggan
      const { rows: userRows } = await sql`SELECT id, role FROM users WHERE id = ${id} LIMIT 1`;
      if (!userRows.length) return fail(res, 'Pengguna tidak ditemukan.', 404);
      if (userRows[0].role !== 'pelanggan')
        return fail(res, 'Tidak bisa menghapus akun admin atau owner.', 403);

      // Cek apakah ada booking aktif (motor masih tersimpan fisik di garasi)
      const { rows: aktifRows } = await sql`
        SELECT COUNT(*) AS cnt FROM booking WHERE user_id = ${id} AND status = 'aktif'
      `;
      const adaAktif = Number(aktifRows[0].cnt) > 0;

      // Hitung semua baris terkait sebelum dihapus (untuk summary response)
      const [rMotor, rBooking, rPerawatan, rPembayaran, rNotif] = await Promise.all([
        sql`SELECT COUNT(*) AS cnt FROM motor WHERE user_id = ${id}`,
        sql`SELECT COUNT(*) AS cnt FROM booking WHERE user_id = ${id}`,
        sql`SELECT COUNT(*) AS cnt FROM perawatan
            WHERE motor_id IN (SELECT id FROM motor WHERE user_id = ${id})`,
        sql`SELECT COUNT(*) AS cnt FROM pembayaran
            WHERE booking_id IN (SELECT id FROM booking WHERE user_id = ${id})`,
        sql`SELECT COUNT(*) AS cnt FROM notifikasi WHERE user_id = ${id}`,
      ]);

      // Hapus user — ON DELETE CASCADE di schema menghapus semua tabel terkait secara otomatis:
      // users → motor → perawatan; users → booking → pembayaran; users → notifikasi
      await sql`DELETE FROM users WHERE id = ${id}`;

      const result = {
        deleted: {
          motor:      Number(rMotor.rows[0].cnt),
          booking:    Number(rBooking.rows[0].cnt),
          perawatan:  Number(rPerawatan.rows[0].cnt),
          pembayaran: Number(rPembayaran.rows[0].cnt),
          notifikasi: Number(rNotif.rows[0].cnt),
        },
      };
      if (adaAktif) result.warning = 'Pelanggan memiliki motor aktif tersimpan saat dihapus. Tangani motor fisik secara manual.';
      return ok(res, result);
    }

    fail(res, 'Method tidak diizinkan.', 405);
  } catch (err) {
    if (err.status) return fail(res, err.message, err.status);
    console.error('[users]', err);
    fail(res, 'Terjadi kesalahan server.', 500);
  }
};
