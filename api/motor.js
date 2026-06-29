// GET    /api/motor          → daftar motor (pelanggan: milik sendiri; admin/owner: semua)
// GET    /api/motor?id=X     → detail satu motor
// POST   /api/motor          → tambah motor (pelanggan only)
// PUT    /api/motor?id=X     → update motor
// DELETE /api/motor?id=X     → hapus motor

const { sql } = require('./_lib/db');
const { cors, parseBody, requireAuth, ok, fail } = require('./_lib/middleware');

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    const user = requireAuth(req);
    const id = req.query.id ? Number(req.query.id) : null;

    // ── GET ──────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      if (id) {
        const { rows } = await sql`SELECT * FROM motor WHERE id = ${id} LIMIT 1`;
        if (!rows.length) return fail(res, 'Motor tidak ditemukan.', 404);
        if (user.role === 'pelanggan' && rows[0].user_id !== user.id) return fail(res, 'Akses ditolak.', 403);
        return ok(res, rows[0]);
      }
      // list
      if (user.role === 'pelanggan') {
        const { rows } = await sql`SELECT * FROM motor WHERE user_id = ${user.id} ORDER BY id`;
        return ok(res, rows);
      }
      const { rows } = await sql`
        SELECT m.*, u.nama AS pemilik_nama FROM motor m
        JOIN users u ON u.id = m.user_id ORDER BY m.id
      `;
      return ok(res, rows);
    }

    // ── POST ─────────────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      if (user.role !== 'pelanggan') return fail(res, 'Hanya pelanggan yang bisa menambah motor.', 403);
      const { plat, tipe, cc, warna, foto } = await parseBody(req);
      if (!plat || !tipe) return fail(res, 'Plat dan tipe wajib diisi.');
      const { rows } = await sql`
        INSERT INTO motor (user_id, plat, tipe, cc, warna, foto)
        VALUES (${user.id}, ${plat.trim().toUpperCase()}, ${tipe.trim()},
                ${cc ? Number(cc) : null}, ${(warna || '-').trim()}, ${foto || null})
        RETURNING *
      `;
      return ok(res, rows[0], 201);
    }

    // ── PUT ──────────────────────────────────────────────────────────────────
    if (req.method === 'PUT') {
      if (!id) return fail(res, 'Parameter id wajib ada.');
      const { rows: m } = await sql`SELECT * FROM motor WHERE id = ${id} LIMIT 1`;
      if (!m.length) return fail(res, 'Motor tidak ditemukan.', 404);
      if (user.role === 'pelanggan' && m[0].user_id !== user.id) return fail(res, 'Akses ditolak.', 403);
      const { plat, tipe, cc, warna, foto } = await parseBody(req);
      const { rows } = await sql`
        UPDATE motor SET
          plat  = COALESCE(${plat ? plat.trim().toUpperCase() : null}, plat),
          tipe  = COALESCE(${tipe ? tipe.trim() : null}, tipe),
          cc    = COALESCE(${cc != null ? Number(cc) : null}, cc),
          warna = COALESCE(${warna ? warna.trim() : null}, warna),
          foto  = COALESCE(${foto || null}, foto)
        WHERE id = ${id} RETURNING *
      `;
      return ok(res, rows[0]);
    }

    // ── DELETE ───────────────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      if (!id) return fail(res, 'Parameter id wajib ada.');
      const { rows: m } = await sql`SELECT * FROM motor WHERE id = ${id} LIMIT 1`;
      if (!m.length) return fail(res, 'Motor tidak ditemukan.', 404);
      if (user.role === 'pelanggan' && m[0].user_id !== user.id) return fail(res, 'Akses ditolak.', 403);
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
    console.error('[motor]', err);
    fail(res, 'Terjadi kesalahan server.', 500);
  }
};
