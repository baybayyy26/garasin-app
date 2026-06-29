// GET /api/config       → ambil konfigurasi (publik: harga/rincian; privat: rekening/WA untuk admin+)
// PUT /api/config       → update konfigurasi (owner only)

const { sql, query } = require('./_lib/db');
const { cors, parseBody, requireAuth, requireRole, ok, fail } = require('./_lib/middleware');

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    // ── GET ──────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const { rows } = await sql`SELECT * FROM config WHERE id = 1 LIMIT 1`;
      if (!rows.length) return fail(res, 'Konfigurasi belum disiapkan.', 404);
      const cfg = rows[0];

      // Cek apakah request dari user ter-autentikasi
      let userRole = null;
      try { userRole = requireAuth(req).role; } catch { /* tidak login */ }

      const pub = {
        harga_periode:    cfg.harga_periode,
        kapasitas_total:  cfg.kapasitas_total,
        rincian:          cfg.rincian,
        north_star_label: cfg.north_star_label,
        rekening_bank:    cfg.rekening_bank,
        rekening_no:      cfg.rekening_no,
        rekening_nama:    cfg.rekening_nama,
      };

      if (['admin', 'owner'].includes(userRole)) {
        pub.wa_admin              = cfg.wa_admin;
        pub.target_retensi        = cfg.target_retensi;
        pub.cac                   = cfg.cac;
        pub.target_pendapatan_th1 = cfg.target_pendapatan_th1;
      }
      return ok(res, pub);
    }

    // ── PUT ──────────────────────────────────────────────────────────────────
    if (req.method === 'PUT') {
      requireRole(req, ['owner']);
      const body = await parseBody(req);

      if (body.kapasitas_total != null && Number(body.kapasitas_total) < 1)
        return fail(res, 'Kapasitas minimal 1 slot.');

      const fields = [
        'harga_periode', 'kapasitas_total', 'target_retensi', 'cac',
        'target_pendapatan_th1', 'rekening_bank', 'rekening_no', 'rekening_nama', 'wa_admin',
      ];

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

      vals.push(1); // WHERE id = 1
      const { rows } = await query(
        `UPDATE config SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        vals,
      );
      return ok(res, rows[0]);
    }

    fail(res, 'Method tidak diizinkan.', 405);
  } catch (err) {
    if (err.status) return fail(res, err.message, err.status);
    console.error('[config]', err);
    fail(res, 'Terjadi kesalahan server.', 500);
  }
};
