// GET  /api/booking          → daftar booking
// GET  /api/booking?id=X     → detail satu booking
// POST /api/booking          → buat booking baru (pelanggan)
// PUT  /api/booking?id=X     → update status (admin: aktif/ditolak/selesai; pelanggan: dibatalkan)

const { sql } = require('./_lib/db');
const { cors, parseBody, requireAuth, ok, fail } = require('./_lib/middleware');

function hariIni() { return new Date().toISOString().slice(0, 10); }

const NOTIF = {
  aktif:      'Booking kamu DITERIMA. Motor siap kami simpan & rawat 🎉',
  ditolak:    'Maaf, booking kamu ditolak (kapasitas penuh/jadwal bentrok). Hubungi admin ya.',
  selesai:    'Penyimpanan selesai. Terima kasih sudah percaya ke GARASIN! 🙏',
  dibatalkan: 'Booking kamu telah dibatalkan.',
};

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    const user = requireAuth(req);
    const id = req.query.id ? Number(req.query.id) : null;

    // ── GET ──────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      if (id) {
        const { rows } = await sql`SELECT * FROM booking WHERE id = ${id} LIMIT 1`;
        if (!rows.length) return fail(res, 'Booking tidak ditemukan.', 404);
        if (user.role === 'pelanggan' && rows[0].user_id !== user.id) return fail(res, 'Akses ditolak.', 403);
        return ok(res, rows[0]);
      }
      if (user.role === 'pelanggan') {
        const { rows } = await sql`
          SELECT b.*, m.plat, m.tipe, m.warna, m.cc
          FROM booking b JOIN motor m ON m.id = b.motor_id
          WHERE b.user_id = ${user.id} ORDER BY b.created_at DESC
        `;
        return ok(res, rows);
      }
      const { rows } = await sql`
        SELECT b.*, m.plat, m.tipe, m.warna, m.cc,
               u.nama AS pelanggan_nama, u.no_hp AS pelanggan_hp
        FROM booking b
        JOIN motor m ON m.id = b.motor_id
        JOIN users u ON u.id = b.user_id
        ORDER BY b.created_at DESC
      `;
      return ok(res, rows);
    }

    // ── POST ─────────────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      if (user.role !== 'pelanggan') return fail(res, 'Hanya pelanggan yang bisa membuat booking.', 403);
      const { motor_id, tanggal_mulai, tanggal_selesai } = await parseBody(req);
      if (!motor_id || !tanggal_mulai || !tanggal_selesai)
        return fail(res, 'Motor, tanggal mulai, dan selesai wajib diisi.');
      if (new Date(tanggal_selesai) <= new Date(tanggal_mulai))
        return fail(res, 'Tanggal selesai harus setelah tanggal mulai.');

      const { rows: motors } = await sql`
        SELECT id FROM motor WHERE id = ${Number(motor_id)} AND user_id = ${user.id} LIMIT 1
      `;
      if (!motors.length) return fail(res, 'Motor tidak ditemukan atau bukan milik kamu.', 403);

      const { rows: cfg } = await sql`SELECT harga_periode FROM config WHERE id = 1 LIMIT 1`;
      const harga = cfg[0]?.harga_periode || 200000;

      const { rows: bk } = await sql`
        INSERT INTO booking (motor_id, user_id, tanggal_mulai, tanggal_selesai, status, harga)
        VALUES (${Number(motor_id)}, ${user.id}, ${tanggal_mulai}, ${tanggal_selesai}, 'pending', ${harga})
        RETURNING *
      `;
      await sql`INSERT INTO pembayaran (booking_id, jumlah, status) VALUES (${bk[0].id}, ${harga}, 'belum')`;
      await sql`
        INSERT INTO notifikasi (user_id, pesan, tanggal, dibaca)
        VALUES (${user.id}, 'Booking dibuat & menunggu konfirmasi admin.', ${hariIni()}, false)
      `;
      return ok(res, bk[0], 201);
    }

    // ── PUT ──────────────────────────────────────────────────────────────────
    if (req.method === 'PUT') {
      if (!id) return fail(res, 'Parameter id wajib ada.');
      const { rows: bk } = await sql`SELECT * FROM booking WHERE id = ${id} LIMIT 1`;
      if (!bk.length) return fail(res, 'Booking tidak ditemukan.', 404);
      const booking = bk[0];
      const { status } = await parseBody(req);
      if (!status) return fail(res, 'Status wajib diisi.');
      const now = hariIni();

      // Pelanggan: hanya bisa batalkan booking pending milik sendiri
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
        const { rows: cfg } = await sql`SELECT kapasitas_total FROM config WHERE id = 1 LIMIT 1`;
        const kapasitas = cfg[0]?.kapasitas_total || 6;
        const { rows: aktifCount } = await sql`SELECT COUNT(*) AS cnt FROM booking WHERE status = 'aktif'`;
        if (Number(aktifCount[0].cnt) >= kapasitas)
          return fail(res, `Kapasitas penuh (${kapasitas} slot). Selesaikan booking lain dulu.`);
        await sql`UPDATE booking SET status = 'aktif' WHERE id = ${id}`;
        await sql`INSERT INTO notifikasi (user_id, pesan, tanggal, dibaca) VALUES (${booking.user_id}, ${NOTIF.aktif}, ${now}, false)`;
        return ok(res, { status: 'aktif' });
      }

      if (status === 'ditolak') {
        if (booking.status !== 'pending') return fail(res, 'Hanya booking pending yang bisa ditolak.');
        await sql`UPDATE booking SET status = 'ditolak' WHERE id = ${id}`;
        await sql`INSERT INTO notifikasi (user_id, pesan, tanggal, dibaca) VALUES (${booking.user_id}, ${NOTIF.ditolak}, ${now}, false)`;
        return ok(res, { status: 'ditolak' });
      }

      if (status === 'selesai') {
        if (booking.status !== 'aktif') return fail(res, 'Hanya booking aktif yang bisa diselesaikan.');
        await sql`UPDATE booking SET status = 'selesai' WHERE id = ${id}`;
        await sql`INSERT INTO notifikasi (user_id, pesan, tanggal, dibaca) VALUES (${booking.user_id}, ${NOTIF.selesai}, ${now}, false)`;
        return ok(res, { status: 'selesai' });
      }

      return fail(res, 'Status tidak dikenali.');
    }

    fail(res, 'Method tidak diizinkan.', 405);
  } catch (err) {
    if (err.status) return fail(res, err.message, err.status);
    console.error('[booking]', err);
    fail(res, 'Terjadi kesalahan server.', 500);
  }
};
