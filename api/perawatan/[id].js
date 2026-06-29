const { sql } = require('../_lib/db');
const { cors, parseBody, requireRole, ok, fail } = require('../_lib/middleware');

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    const user = requireRole(req, ['admin', 'owner']);
    const id = Number(req.query.id);
    if (!id) return fail(res, 'ID tidak valid.');

    const { rows } = await sql`SELECT * FROM perawatan WHERE id = ${id} LIMIT 1`;
    if (!rows.length) return fail(res, 'Perawatan tidak ditemukan.', 404);

    if (req.method === 'GET') return ok(res, rows[0]);

    if (req.method === 'PUT') {
      const { catatan, petugas, foto } = await parseBody(req);
      const { rows: updated } = await sql`
        UPDATE perawatan SET
          catatan = COALESCE(${catatan || null}, catatan),
          petugas = COALESCE(${petugas ? petugas.trim() : null}, petugas),
          foto    = COALESCE(${foto || null}, foto)
        WHERE id = ${id}
        RETURNING *
      `;
      return ok(res, updated[0]);
    }

    fail(res, 'Method tidak diizinkan.', 405);
  } catch (err) {
    if (err.status) return fail(res, err.message, err.status);
    console.error('[perawatan/[id]]', err);
    fail(res, 'Terjadi kesalahan server.', 500);
  }
};
