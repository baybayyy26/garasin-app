const { sql } = require('../_lib/db');
const { cors, parseBody, requireAuth, ok, fail } = require('../_lib/middleware');

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    const user = requireAuth(req);

    // GET — pelanggan: motor milik sendiri; admin/owner: semua motor
    if (req.method === 'GET') {
      let rows;
      if (user.role === 'pelanggan') {
        ({ rows } = await sql`
          SELECT m.*, u.nama AS pemilik_nama
          FROM motor m
          JOIN users u ON u.id = m.user_id
          WHERE m.user_id = ${user.id}
          ORDER BY m.id
        `);
      } else {
        ({ rows } = await sql`
          SELECT m.*, u.nama AS pemilik_nama
          FROM motor m
          JOIN users u ON u.id = m.user_id
          ORDER BY m.id
        `);
      }
      return ok(res, rows);
    }

    // POST — hanya pelanggan yang boleh tambah motor
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

    fail(res, 'Method tidak diizinkan.', 405);
  } catch (err) {
    if (err.status) return fail(res, err.message, err.status);
    console.error('[motor/index]', err);
    fail(res, 'Terjadi kesalahan server.', 500);
  }
};
