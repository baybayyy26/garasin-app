// GET /api/pembayaran        → daftar pembayaran (pelanggan: milik sendiri; admin/owner: semua)
// PUT /api/pembayaran?id=X  → update pembayaran:
//                              pelanggan: upload bukti ({ bukti })
//                              admin/owner: tandai lunas

const { sql } = require('./_lib/db');
const { cors, parseBody, requireAuth, ok, fail } = require('./_lib/middleware');

function hariIni() { return new Date().toISOString().slice(0, 10); }

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    const user = requireAuth(req);
    const id = req.query.id ? Number(req.query.id) : null;

    // ── GET ──────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      if (user.role === 'pelanggan') {
        const { rows } = await sql`
          SELECT py.*, b.tanggal_mulai, b.tanggal_selesai, b.status AS booking_status,
                 m.tipe AS motor_tipe, m.plat AS motor_plat
          FROM pembayaran py
          JOIN booking b ON b.id = py.booking_id
          JOIN motor m ON m.id = b.motor_id
          WHERE b.user_id = ${user.id} ORDER BY py.id DESC
        `;
        return ok(res, rows);
      }
      const { rows } = await sql`
        SELECT py.*, b.tanggal_mulai, b.tanggal_selesai, b.status AS booking_status,
               m.tipe AS motor_tipe, m.plat AS motor_plat, u.nama AS pelanggan_nama
        FROM pembayaran py
        JOIN booking b ON b.id = py.booking_id
        JOIN motor m ON m.id = b.motor_id
        JOIN users u ON u.id = b.user_id
        ORDER BY py.id DESC
      `;
      return ok(res, rows);
    }

    // ── PUT ──────────────────────────────────────────────────────────────────
    if (req.method === 'PUT') {
      if (!id) return fail(res, 'Parameter id wajib ada.');
      const { rows: pyRows } = await sql`
        SELECT py.*, b.user_id AS pelanggan_id FROM pembayaran py
        JOIN booking b ON b.id = py.booking_id WHERE py.id = ${id} LIMIT 1
      `;
      if (!pyRows.length) return fail(res, 'Pembayaran tidak ditemukan.', 404);
      const bayar = pyRows[0];
      const body = await parseBody(req);

      // Pelanggan: upload bukti transfer
      if (user.role === 'pelanggan') {
        if (bayar.pelanggan_id !== user.id) return fail(res, 'Akses ditolak.', 403);
        if (bayar.status !== 'belum') return fail(res, 'Pembayaran sudah lunas.');
        if (!body.bukti) return fail(res, 'Bukti transfer wajib dikirim.');
        const { rows } = await sql`
          UPDATE pembayaran SET bukti = ${body.bukti}, tanggal = ${hariIni()} WHERE id = ${id} RETURNING *
        `;
        return ok(res, rows[0]);
      }

      // Admin / owner: tandai lunas
      if (['admin', 'owner'].includes(user.role)) {
        if (bayar.status === 'lunas') return fail(res, 'Pembayaran sudah lunas.');
        if (!bayar.bukti) return fail(res, 'Belum ada bukti transfer dari pelanggan.');
        const { rows } = await sql`
          UPDATE pembayaran SET status = 'lunas', tanggal = ${hariIni()} WHERE id = ${id} RETURNING *
        `;
        await sql`
          INSERT INTO notifikasi (user_id, pesan, tanggal, dibaca)
          VALUES (${bayar.pelanggan_id}, 'Pembayaran kamu sudah diverifikasi. Terima kasih! ✅', ${hariIni()}, false)
        `;
        return ok(res, rows[0]);
      }

      return fail(res, 'Akses ditolak.', 403);
    }

    fail(res, 'Method tidak diizinkan.', 405);
  } catch (err) {
    if (err.status) return fail(res, err.message, err.status);
    console.error('[pembayaran]', err);
    fail(res, 'Terjadi kesalahan server.', 500);
  }
};
