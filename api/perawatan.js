// GET  /api/perawatan             → semua perawatan (admin/owner) atau per motor (pelanggan via ?motor_id=)
// GET  /api/perawatan?id=X        → detail satu perawatan
// POST /api/perawatan             → catat perawatan baru (admin/owner only)
// PUT  /api/perawatan?id=X        → update catatan/foto (admin/owner only)

const { sql } = require('./_lib/db');
const { cors, parseBody, requireAuth, requireRole, ok, fail } = require('./_lib/middleware');

function hariIni() { return new Date().toISOString().slice(0, 10); }

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    const user = requireAuth(req);
    const id = req.query.id ? Number(req.query.id) : null;

    // ── GET ──────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      if (id) {
        if (!['admin', 'owner'].includes(user.role)) return fail(res, 'Akses ditolak.', 403);
        const { rows } = await sql`
          SELECT p.*, m.plat, m.tipe FROM perawatan p
          JOIN motor m ON m.id = p.motor_id WHERE p.id = ${id} LIMIT 1
        `;
        if (!rows.length) return fail(res, 'Perawatan tidak ditemukan.', 404);
        return ok(res, rows[0]);
      }

      const motorId = req.query.motor_id ? Number(req.query.motor_id) : null;

      // Pelanggan hanya bisa lihat perawatan motor miliknya (via ?motor_id=)
      if (user.role === 'pelanggan') {
        if (!motorId) return fail(res, 'Akses ditolak. Gunakan ?motor_id=X', 403);
        const { rows: mRows } = await sql`SELECT user_id FROM motor WHERE id = ${motorId} LIMIT 1`;
        if (!mRows.length || mRows[0].user_id !== user.id) return fail(res, 'Akses ditolak.', 403);
        const { rows } = await sql`
          SELECT p.*, m.plat, m.tipe FROM perawatan p
          JOIN motor m ON m.id = p.motor_id
          WHERE p.motor_id = ${motorId} ORDER BY p.tanggal DESC
        `;
        return ok(res, rows);
      }

      // Admin / owner: semua, atau filter ?motor_id=
      if (motorId) {
        const { rows } = await sql`
          SELECT p.*, m.plat, m.tipe, m.user_id FROM perawatan p
          JOIN motor m ON m.id = p.motor_id
          WHERE p.motor_id = ${motorId} ORDER BY p.tanggal DESC
        `;
        return ok(res, rows);
      }
      const { rows } = await sql`
        SELECT p.*, m.plat, m.tipe, m.user_id FROM perawatan p
        JOIN motor m ON m.id = p.motor_id ORDER BY p.tanggal DESC
      `;
      return ok(res, rows);
    }

    // ── POST ─────────────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      if (!['admin', 'owner'].includes(user.role)) return fail(res, 'Akses ditolak.', 403);
      const { motor_id, tanggal, status_aki, status_ban, status_mesin, catatan, petugas, foto } = await parseBody(req);
      if (!motor_id || !tanggal || !status_aki || !status_ban || !status_mesin)
        return fail(res, 'Motor, tanggal, dan kondisi aki/ban/mesin wajib diisi.');

      const valid = ['baik', 'perhatian', 'buruk'];
      if (![status_aki, status_ban, status_mesin].every(s => valid.includes(s)))
        return fail(res, 'Nilai kondisi tidak valid. Gunakan: baik, perhatian, buruk.');

      // Pastikan motor aktif disimpan
      const { rows: aktif } = await sql`
        SELECT b.user_id FROM booking b
        WHERE b.motor_id = ${Number(motor_id)} AND b.status = 'aktif' LIMIT 1
      `;
      if (!aktif.length) return fail(res, 'Motor tidak sedang aktif disimpan.');
      const pemilikId = aktif[0].user_id;

      const { rows: mRows } = await sql`SELECT tipe FROM motor WHERE id = ${Number(motor_id)} LIMIT 1`;
      const motorTipe = mRows[0]?.tipe || 'Motor';

      const { rows } = await sql`
        INSERT INTO perawatan (motor_id, tanggal, status_aki, status_ban, status_mesin, catatan, petugas, foto)
        VALUES (${Number(motor_id)}, ${tanggal}, ${status_aki}, ${status_ban}, ${status_mesin},
                ${catatan || null}, ${(petugas || user.nama).trim()}, ${foto || null})
        RETURNING *
      `;
      await sql`
        INSERT INTO notifikasi (user_id, pesan, tanggal, dibaca)
        VALUES (${pemilikId}, ${`Laporan kondisi ${motorTipe} (${tanggal}) sudah tersedia.`}, ${hariIni()}, false)
      `;
      return ok(res, rows[0], 201);
    }

    // ── PUT ──────────────────────────────────────────────────────────────────
    if (req.method === 'PUT') {
      if (!['admin', 'owner'].includes(user.role)) return fail(res, 'Akses ditolak.', 403);
      if (!id) return fail(res, 'Parameter id wajib ada.');
      const { rows: p } = await sql`SELECT * FROM perawatan WHERE id = ${id} LIMIT 1`;
      if (!p.length) return fail(res, 'Perawatan tidak ditemukan.', 404);
      const { catatan, petugas, foto } = await parseBody(req);
      const { rows } = await sql`
        UPDATE perawatan SET
          catatan = COALESCE(${catatan || null}, catatan),
          petugas = COALESCE(${petugas ? petugas.trim() : null}, petugas),
          foto    = COALESCE(${foto || null}, foto)
        WHERE id = ${id} RETURNING *
      `;
      return ok(res, rows[0]);
    }

    fail(res, 'Method tidak diizinkan.', 405);
  } catch (err) {
    if (err.status) return fail(res, err.message, err.status);
    console.error('[perawatan]', err);
    fail(res, 'Terjadi kesalahan server.', 500);
  }
};
