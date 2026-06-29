const { sql } = require('../_lib/db');
const { cors, parseBody, requireAuth, ok, fail } = require('../_lib/middleware');

function hariIni() { return new Date().toISOString().slice(0, 10); }

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'PUT') return fail(res, 'Method tidak diizinkan.', 405);

  try {
    const user = requireAuth(req);
    const id = Number(req.query.id);
    if (!id) return fail(res, 'ID tidak valid.');

    const { rows: pyRows } = await sql`
      SELECT py.*, b.user_id AS pelanggan_id
      FROM pembayaran py
      JOIN booking b ON b.id = py.booking_id
      WHERE py.id = ${id}
      LIMIT 1
    `;
    const bayar = pyRows[0];
    if (!bayar) return fail(res, 'Pembayaran tidak ditemukan.', 404);

    const body = await parseBody(req);

    // Pelanggan: upload bukti transfer
    if (user.role === 'pelanggan') {
      if (bayar.pelanggan_id !== user.id) return fail(res, 'Akses ditolak.', 403);
      if (bayar.status !== 'belum') return fail(res, 'Pembayaran sudah lunas.');
      const { bukti } = body;
      if (!bukti) return fail(res, 'Bukti transfer wajib dikirim.');

      const { rows } = await sql`
        UPDATE pembayaran SET bukti = ${bukti}, tanggal = ${hariIni()} WHERE id = ${id} RETURNING *
      `;
      return ok(res, rows[0]);
    }

    // Admin/owner: tandai lunas
    if (['admin', 'owner'].includes(user.role)) {
      if (bayar.status === 'lunas') return fail(res, 'Pembayaran sudah lunas.');
      if (!bayar.bukti) return fail(res, 'Belum ada bukti transfer dari pelanggan.');

      const { rows } = await sql`
        UPDATE pembayaran SET status = 'lunas', tanggal = ${hariIni()} WHERE id = ${id} RETURNING *
      `;

      // Notifikasi ke pelanggan
      await sql`
        INSERT INTO notifikasi (user_id, pesan, tanggal, dibaca)
        VALUES (${bayar.pelanggan_id}, 'Pembayaran kamu sudah diverifikasi. Terima kasih! ✅', ${hariIni()}, false)
      `;
      return ok(res, rows[0]);
    }

    fail(res, 'Akses ditolak.', 403);
  } catch (err) {
    if (err.status) return fail(res, err.message, err.status);
    console.error('[pembayaran/[id]]', err);
    fail(res, 'Terjadi kesalahan server.', 500);
  }
};
