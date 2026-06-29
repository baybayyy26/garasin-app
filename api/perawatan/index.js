const { sql } = require('../_lib/db');
const { cors, parseBody, requireRole, ok, fail } = require('../_lib/middleware');

function hariIni() { return new Date().toISOString().slice(0, 10); }

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    // GET boleh admin & owner (pelanggan lihat via komponen riwayat)
    if (req.method === 'GET') {
      const { requireAuth } = require('../_lib/middleware');
      const user = requireAuth(req);
      const motorId = req.query.motor_id ? Number(req.query.motor_id) : null;

      let rows;
      if (motorId) {
        ({ rows } = await sql`
          SELECT p.*, m.plat, m.tipe, m.user_id
          FROM perawatan p
          JOIN motor m ON m.id = p.motor_id
          WHERE p.motor_id = ${motorId}
          ORDER BY p.tanggal DESC
        `);
        // Pelanggan hanya boleh lihat perawatan motor miliknya
        if (user.role === 'pelanggan') {
          const { rows: motors } = await sql`SELECT user_id FROM motor WHERE id = ${motorId} LIMIT 1`;
          if (!motors.length || motors[0].user_id !== user.id) return fail(res, 'Akses ditolak.', 403);
        }
      } else {
        if (user.role === 'pelanggan') return fail(res, 'Akses ditolak.', 403);
        ({ rows } = await sql`
          SELECT p.*, m.plat, m.tipe, m.user_id
          FROM perawatan p
          JOIN motor m ON m.id = p.motor_id
          ORDER BY p.tanggal DESC
        `);
      }
      return ok(res, rows);
    }

    // POST — admin only
    if (req.method === 'POST') {
      const user = requireRole(req, ['admin', 'owner']);
      const { motor_id, tanggal, status_aki, status_ban, status_mesin, catatan, petugas, foto } = await parseBody(req);

      if (!motor_id || !tanggal || !status_aki || !status_ban || !status_mesin)
        return fail(res, 'Motor, tanggal, dan kondisi aki/ban/mesin wajib diisi.');

      const validStatus = ['baik', 'perhatian', 'buruk'];
      if (![status_aki, status_ban, status_mesin].every(s => validStatus.includes(s)))
        return fail(res, 'Nilai kondisi tidak valid. Gunakan: baik, perhatian, buruk.');

      // Cek motor ada & sedang aktif
      const { rows: aktifRows } = await sql`
        SELECT b.user_id FROM booking b
        WHERE b.motor_id = ${Number(motor_id)} AND b.status = 'aktif'
        LIMIT 1
      `;
      if (!aktifRows.length) return fail(res, 'Motor tidak sedang aktif disimpan.');
      const pemilikId = aktifRows[0].user_id;

      const { rows: motorRows } = await sql`SELECT tipe FROM motor WHERE id = ${Number(motor_id)} LIMIT 1`;
      const motorTipe = motorRows[0]?.tipe || 'Motor';

      const { rows } = await sql`
        INSERT INTO perawatan (motor_id, tanggal, status_aki, status_ban, status_mesin, catatan, petugas, foto)
        VALUES (${Number(motor_id)}, ${tanggal}, ${status_aki}, ${status_ban}, ${status_mesin},
                ${catatan || null}, ${(petugas || user.nama).trim()}, ${foto || null})
        RETURNING *
      `;

      // Notifikasi ke pelanggan pemilik motor
      const pesan = `Laporan kondisi ${motorTipe} (${tanggal}) sudah tersedia.`;
      await sql`
        INSERT INTO notifikasi (user_id, pesan, tanggal, dibaca)
        VALUES (${pemilikId}, ${pesan}, ${hariIni()}, false)
      `;

      return ok(res, rows[0], 201);
    }

    fail(res, 'Method tidak diizinkan.', 405);
  } catch (err) {
    if (err.status) return fail(res, err.message, err.status);
    console.error('[perawatan/index]', err);
    fail(res, 'Terjadi kesalahan server.', 500);
  }
};
