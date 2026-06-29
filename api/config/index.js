const { sql } = require('../_lib/db');
const { cors, parseBody, requireAuth, requireRole, ok, fail } = require('../_lib/middleware');

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    // GET — publik untuk harga & rincian; rekening/WA hanya untuk admin+
    if (req.method === 'GET') {
      const { rows } = await sql`SELECT * FROM config WHERE id = 1 LIMIT 1`;
      const cfg = rows[0];
      if (!cfg) return fail(res, 'Konfigurasi belum disiapkan.', 404);

      // Cek apakah request dari authenticated user
      let userRole = null;
      try {
        const u = requireAuth(req);
        userRole = u.role;
      } catch { /* tidak login — kembalikan data publik saja */ }

      // Data publik: harga, rincian, north_star_label
      const pub = {
        harga_periode: cfg.harga_periode,
        kapasitas_total: cfg.kapasitas_total,
        rincian: cfg.rincian,
        north_star_label: cfg.north_star_label,
        rekening_bank: cfg.rekening_bank,
        rekening_no: cfg.rekening_no,
        rekening_nama: cfg.rekening_nama,
      };

      // Data sensitif: hanya admin & owner
      if (['admin', 'owner'].includes(userRole)) {
        pub.wa_admin = cfg.wa_admin;
        pub.target_retensi = cfg.target_retensi;
        pub.cac = cfg.cac;
        pub.target_pendapatan_th1 = cfg.target_pendapatan_th1;
      }

      return ok(res, pub);
    }

    // PUT — owner only
    if (req.method === 'PUT') {
      requireRole(req, ['owner']);
      const body = await parseBody(req);

      const fields = [
        'harga_periode', 'kapasitas_total', 'target_retensi', 'cac',
        'target_pendapatan_th1', 'rekening_bank', 'rekening_no',
        'rekening_nama', 'wa_admin',
      ];

      // Bangun SET clause dinamis hanya dari field yang dikirim
      const updates = [];
      const vals = [];
      let idx = 1;
      for (const f of fields) {
        if (body[f] !== undefined) {
          updates.push(`${f} = $${idx}`);
          vals.push(f === 'wa_admin' ? String(body[f]).replace(/[^0-9]/g, '') : body[f]);
          idx++;
        }
      }
      if (!updates.length) return fail(res, 'Tidak ada field yang diupdate.');
      if (body.kapasitas_total != null && Number(body.kapasitas_total) < 1)
        return fail(res, 'Kapasitas minimal 1 slot.');

      vals.push(1); // WHERE id = 1
      const { rows } = await sql.query(
        `UPDATE config SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        vals,
      );
      return ok(res, rows[0]);
    }

    fail(res, 'Method tidak diizinkan.', 405);
  } catch (err) {
    if (err.status) return fail(res, err.message, err.status);
    console.error('[config/index]', err);
    fail(res, 'Terjadi kesalahan server.', 500);
  }
};
