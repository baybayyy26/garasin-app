/* ==========================================================================
   GARASIN — store.js
   Lapisan data berbasis localStorage (dengan cadangan memori bila localStorage
   tidak tersedia, mis. saat dibuka via file://).
   Data dimulai KOSONG (siap diisi data asli). Hanya akun owner & admin yang
   disiapkan agar bisa langsung login; pelanggan mendaftar sendiri.
   ========================================================================== */

window.G = window.G || {};

(function () {
  const DB_KEY = 'garasin_db';
  const SESSION_KEY = 'garasin_session';
  const mem = {};

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return (k in mem) ? mem[k] : null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } }

  // ====================== DATA AWAL ======================
  // Hanya akun pengelola. Semua data operasional kosong → diisi saat dipakai.
  function seed() {
    return {
      users: [
        { id: 1, nama: 'Owner GARASIN', email: 'owner@garasin.id', password: 'garasin123', role: 'owner', no_hp: '0812-0000-0001', asal: 'Malang' },
        { id: 2, nama: 'Admin GARASIN', email: 'admin@garasin.id', password: 'garasin123', role: 'admin', no_hp: '0812-0000-0002', asal: 'Malang' },
      ],
      motor: [],
      booking: [],
      perawatan: [],
      pembayaran: [],
      notifikasi: [],
      config: {
        harga_periode: 200000,        // harga per periode (bisa diubah owner)
        kapasitas_total: 6,           // kapasitas garasi: 6 slot
        target_retensi: 65,           // persen
        cac: 28000,                   // biaya akuisisi / pelanggan
        target_pendapatan_th1: 12000000,
        north_star_label: 'Motor tersimpan / periode liburan',
        rekening_bank: 'SeaBank',
        rekening_no: '9012 3456 7890',
        rekening_nama: 'GARASIN',
        wa_admin: '6281200000002',    // nomor WhatsApp admin (format 62...)
        // Rincian harga (karena belum ada pilihan paket) — dalam persen dari harga
        rincian: [
          { label: 'Slot penyimpanan + keamanan 24 jam (CCTV)', persen: 50 },
          { label: 'Perawatan rutin (pemanasan mesin, cek aki & ban)', persen: 35 },
          { label: 'Laporan kondisi berkala (foto/video via WhatsApp)', persen: 15 },
        ],
      },
    };
  }

  function init() { if (!lsGet(DB_KEY)) lsSet(DB_KEY, JSON.stringify(seed())); }
  function reset() { lsSet(DB_KEY, JSON.stringify(seed())); lsDel(SESSION_KEY); }

  function getDB() { return JSON.parse(lsGet(DB_KEY) || '{}'); }
  function saveDB(db) { lsSet(DB_KEY, JSON.stringify(db)); }

  function all(table) { return getDB()[table] || []; }
  function get(table, id) { return all(table).find(r => r.id === Number(id)) || null; }
  function find(table, pred) { return all(table).filter(pred); }
  function nextId(table) { const r = all(table); return r.length ? Math.max(...r.map(x => x.id)) + 1 : 1; }

  function insert(table, obj) {
    const db = getDB();
    obj.id = obj.id || (db[table].length ? Math.max(...db[table].map(x => x.id)) + 1 : 1);
    db[table].push(obj); saveDB(db); return obj;
  }
  function update(table, id, patch) {
    const db = getDB();
    const i = db[table].findIndex(r => r.id === Number(id));
    if (i > -1) { db[table][i] = Object.assign({}, db[table][i], patch); saveDB(db); return db[table][i]; }
    return null;
  }
  function remove(table, id) {
    const db = getDB();
    db[table] = db[table].filter(r => r.id !== Number(id)); saveDB(db);
  }

  function config() { return getDB().config || {}; }
  function updateConfig(patch) {
    const db = getDB();
    db.config = Object.assign({}, db.config, patch); saveDB(db); return db.config;
  }

  function setSession(userId) { lsSet(SESSION_KEY, JSON.stringify({ userId })); }
  function clearSession() { lsDel(SESSION_KEY); }
  function sessionUserId() { const s = JSON.parse(lsGet(SESSION_KEY) || 'null'); return s ? s.userId : null; }

  G.store = {
    init, reset, getDB, saveDB, all, get, find, insert, update, remove,
    nextId, config, updateConfig, setSession, clearSession, sessionUserId,
  };
})();
