const { sql } = require('../_lib/db');
const { cors, parseBody, requireAuth, ok, fail } = require('../_lib/middleware');

function hariIni() { return new Date().toISOString().slice(0, 10); }

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    const user = requireAuth(req);

    // GET
    if (req.method === 'GET') {
      let rows;
      if (user.role === 'pelanggan') {
        ({ rows } = await sql`
          SELECT b.*, m.plat, m.tipe, m.warna, m.cc
          FROM booking b
          JOIN motor m ON m.id = b.motor_id
          WHERE b.user_id = ${user.id}
          ORDER BY b.created_at DESC
        `);
      } else {
        ({ rows } = await sql`
          SELECT b.*, m.plat, m.tipe, m.warna, m.cc,
                 u.nama AS pelanggan_nama, u.no_hp AS pelanggan_hp
          FROM booking b
          JOIN motor m ON m.id = b.motor_id
          JOIN users u ON u.id = b.user_id
          ORDER BY b.created_at DESC
        `);
      }
      return ok(res, rows);
    }

    // POST — buat booking baru (pelanggan only)
    if (req.method === 'POST') {
      if (user.role !== 'pelanggan') return fail(res, 'Hanya pelanggan yang bisa membuat booking.', 403);

      const { motor_id, tanggal_mulai, tanggal_selesai } = await parseBody(req);
      if (!motor_id || !tanggal_mulai || !tanggal_selesai)
        return fail(res, 'Motor, tanggal mulai, dan selesai wajib diisi.');
      if (new Date(tanggal_selesai) <= new Date(tanggal_mulai))
        return fail(res, 'Tanggal selesai harus setelah tanggal mulai.');

      // Cek motor milik user ini
      const { rows: motors } = await sql`
        SELECT id FROM motor WHERE id = ${Number(motor_id)} AND user_id = ${user.id} LIMIT 1
      `;
      if (!motors.length) return fail(res, 'Motor tidak ditemukan atau bukan milik kamu.', 403);

      // Ambil harga dari config
      const { rows: cfgRows } = await sql`SELECT harga_periode FROM config WHERE id = 1 LIMIT 1`;
      const harga = cfgRows[0]?.harga_periode || 200000;

      // Insert booking
      const { rows: bkRows } = await sql`
        INSERT INTO booking (motor_id, user_id, tanggal_mulai, tanggal_selesai, status, harga)
        VALUES (${Number(motor_id)}, ${user.id}, ${tanggal_mulai}, ${tanggal_selesai}, 'pending', ${harga})
        RETURNING *
      `;
      const booking = bkRows[0];

      // Insert pembayaran terkait
      await sql`
        INSERT INTO pembayaran (booking_id, jumlah, status) VALUES (${booking.id}, ${harga}, 'belum')
      `;

      // Notifikasi ke pelanggan
      await sql`
        INSERT INTO notifikasi (user_id, pesan, tanggal, dibaca)
        VALUES (${user.id}, 'Booking dibuat & menunggu konfirmasi admin.', ${hariIni()}, false)
      `;

      return ok(res, booking, 201);
    }

    fail(res, 'Method tidak diizinkan.', 405);
  } catch (err) {
    if (err.status) return fail(res, err.message, err.status);
    console.error('[booking/index]', err);
    fail(res, 'Terjadi kesalahan server.', 500);
  }
};
