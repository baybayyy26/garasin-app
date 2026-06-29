const { sql } = require('../_lib/db');
const { cors, parseBody, requireAuth, ok, fail } = require('../_lib/middleware');

function hariIni() { return new Date().toISOString().slice(0, 10); }

const NOTIF = {
  aktif:     'Booking kamu DITERIMA. Motor siap kami simpan & rawat 🎉',
  ditolak:   'Maaf, booking kamu ditolak (kapasitas penuh/jadwal bentrok). Hubungi admin ya.',
  selesai:   'Penyimpanan selesai. Terima kasih sudah percaya ke GARASIN! 🙏',
  dibatalkan:'Booking kamu telah dibatalkan.',
};

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    const user = requireAuth(req);
    const id = Number(req.query.id);
    if (!id) return fail(res, 'ID tidak valid.');

    const { rows: bkRows } = await sql`SELECT * FROM booking WHERE id = ${id} LIMIT 1`;
    const booking = bkRows[0];
    if (!booking) return fail(res, 'Booking tidak ditemukan.', 404);

    if (req.method === 'GET') {
      // Pelanggan hanya boleh lihat booking sendiri
      if (user.role === 'pelanggan' && booking.user_id !== user.id) return fail(res, 'Akses ditolak.', 403);
      return ok(res, booking);
    }

    if (req.method === 'PUT') {
      const { status } = await parseBody(req);
      if (!status) return fail(res, 'Status wajib diisi.');

      const now = hariIni();

      // Pelanggan hanya boleh batalkan booking pending milik sendiri
      if (user.role === 'pelanggan') {
        if (booking.user_id !== user.id) return fail(res, 'Akses ditolak.', 403);
        if (status !== 'dibatalkan') return fail(res, 'Pelanggan hanya bisa membatalkan booking.', 403);
        if (booking.status !== 'pending') return fail(res, 'Hanya booking pending yang bisa dibatalkan.');

        await sql`UPDATE booking SET status = 'dibatalkan' WHERE id = ${id}`;
        await sql`DELETE FROM pembayaran WHERE booking_id = ${id}`;
        await sql`
          INSERT INTO notifikasi (user_id, pesan, tanggal, dibaca)
          VALUES (${booking.user_id}, ${NOTIF.dibatalkan}, ${now}, false)
        `;
        return ok(res, { status: 'dibatalkan' });
      }

      // Admin / owner
      if (!['admin', 'owner'].includes(user.role)) return fail(res, 'Akses ditolak.', 403);

      if (status === 'aktif') {
        if (booking.status !== 'pending') return fail(res, 'Hanya booking pending yang bisa diterima.');
        // Cek kapasitas
        const { rows: cfgRows } = await sql`SELECT kapasitas_total FROM config WHERE id = 1 LIMIT 1`;
        const kapasitas = cfgRows[0]?.kapasitas_total || 6;
        const { rows: aktifRows } = await sql`SELECT COUNT(*) AS cnt FROM booking WHERE status = 'aktif'`;
        if (Number(aktifRows[0].cnt) >= kapasitas)
          return fail(res, `Kapasitas penuh (${kapasitas} slot). Selesaikan booking lain dulu.`);

        await sql`UPDATE booking SET status = 'aktif' WHERE id = ${id}`;
        await sql`
          INSERT INTO notifikasi (user_id, pesan, tanggal, dibaca)
          VALUES (${booking.user_id}, ${NOTIF.aktif}, ${now}, false)
        `;
        return ok(res, { status: 'aktif' });
      }

      if (status === 'ditolak') {
        if (booking.status !== 'pending') return fail(res, 'Hanya booking pending yang bisa ditolak.');
        await sql`UPDATE booking SET status = 'ditolak' WHERE id = ${id}`;
        await sql`
          INSERT INTO notifikasi (user_id, pesan, tanggal, dibaca)
          VALUES (${booking.user_id}, ${NOTIF.ditolak}, ${now}, false)
        `;
        return ok(res, { status: 'ditolak' });
      }

      if (status === 'selesai') {
        if (booking.status !== 'aktif') return fail(res, 'Hanya booking aktif yang bisa diselesaikan.');
        await sql`UPDATE booking SET status = 'selesai' WHERE id = ${id}`;
        await sql`
          INSERT INTO notifikasi (user_id, pesan, tanggal, dibaca)
          VALUES (${booking.user_id}, ${NOTIF.selesai}, ${now}, false)
        `;
        return ok(res, { status: 'selesai' });
      }

      return fail(res, 'Status tidak dikenali.');
    }

    fail(res, 'Method tidak diizinkan.', 405);
  } catch (err) {
    if (err.status) return fail(res, err.message, err.status);
    console.error('[booking/[id]]', err);
    fail(res, 'Terjadi kesalahan server.', 500);
  }
};
