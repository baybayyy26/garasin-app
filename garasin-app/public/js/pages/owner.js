/* ==========================================================================
   GARASIN — pages/owner.js
   Area pemilik. Sub: dashboard KPI ('') & pengaturan.
   Dirancang tetap rapi saat data masih kosong (siap diisi data asli).
   ========================================================================== */

window.G = window.G || {};
G.pages = G.pages || {};

G.pages.owner = function (content, sub) {
  const ui = G.ui, store = G.store;
  if (sub === 'pengaturan') return pengaturan();
  dashboard();

  // ====================================================== DASHBOARD KPI
  function dashboard() {
    const cfg = store.config();
    const aktif = store.find('booking', b => b.status === 'aktif').length;
    const pakaiPersen = cfg.kapasitas_total ? Math.round((aktif / cfg.kapasitas_total) * 100) : 0;
    const pendapatan = store.find('pembayaran', p => p.status === 'lunas').reduce((s, p) => s + p.jumlah, 0);
    const targetTh1 = cfg.target_pendapatan_th1 || 0;
    const progresTh1 = targetTh1 ? Math.min(100, Math.round((pendapatan / targetTh1) * 100)) : 0;

    const pelanggan = store.find('users', u => u.role === 'pelanggan');
    const pernahSelesai = new Set(store.find('booking', b => b.status === 'selesai').map(b => b.user_id));
    const kembali = [...pernahSelesai].filter(uid =>
      store.find('booking', b => b.user_id === uid && b.status !== 'selesai').length > 0).length;
    const retensi = pernahSelesai.size ? Math.round((kembali / pernahSelesai.size) * 100) : 0;
    const cnt = s => store.find('booking', b => b.status === s).length;

    // Grafik pendapatan per bulan (dari pembayaran lunas nyata)
    const lunas = store.find('pembayaran', p => p.status === 'lunas' && p.tanggal);
    const perBulan = {};
    lunas.forEach(p => { const k = p.tanggal.slice(0, 7); perBulan[k] = (perBulan[k] || 0) + p.jumlah; });
    const periode = Object.keys(perBulan).sort().slice(-6).map(k => ({ label: labelBulan(k), nilai: perBulan[k] }));
    const maxP = Math.max(1, ...periode.map(p => p.nilai));
    const chart = periode.map(p => `
      <div class="col-bar"><div class="v">${ui.rupiahSingkat(p.nilai)}</div>
        <div class="b" style="height:${Math.round((p.nilai / maxP) * 100)}%"></div>
        <div class="l">${p.label}</div></div>`).join('');

    content.innerHTML = `
      <div class="page-head between">
        <div><div class="eyebrow">Owner</div><h1>Dashboard KPI</h1>
          <p>Ukuran keberhasilan GARASIN dalam satu layar.</p></div>
        <a class="btn btn-ghost" href="#/owner/pengaturan">⚙️ Pengaturan</a>
      </div>

      <div class="grid grid-4 mb-3">
        <div class="stat north">
          <div class="stat-ico">⭐</div>
          <div class="stat-val">${aktif}</div>
          <div class="stat-lbl">${cfg.north_star_label}</div>
          <div class="stat-sub">Metrik bintang utara — cerminan kepercayaan, kapasitas & pendapatan</div>
        </div>
        ${stat('💰', ui.rupiahSingkat(pendapatan), 'Pendapatan terkumpul', `target th-1: ${ui.rupiahSingkat(targetTh1)}`,
          `<div class="bar hijau"><span style="width:${progresTh1}%"></span></div><div class="stat-sub">${progresTh1}% dari target</div>`)}
        ${stat('📊', pakaiPersen + '%', 'Kapasitas terpakai', `${aktif} dari ${cfg.kapasitas_total} slot`,
          `<div class="bar"><span style="width:${pakaiPersen}%"></span></div>`)}
        ${stat('🔁', retensi + '%', 'Retensi pelanggan', `target: ${cfg.target_retensi}%`,
          `<div class="bar ${retensi >= cfg.target_retensi ? 'hijau' : ''}"><span style="width:${Math.min(100, retensi)}%"></span></div>`)}
      </div>

      <div class="grid grid-2 mb-3">
        <div class="card">
          <div class="card-head"><h3>Pendapatan per bulan</h3></div>
          ${periode.length ? `<div class="barchart">${chart}</div>` : ui.empty('📈', 'Belum ada pendapatan', 'Grafik terisi saat ada pembayaran lunas.')}
        </div>
        <div class="card">
          <div class="card-head"><h3>Ringkasan operasional</h3></div>
          <div class="grid grid-2" style="gap:12px">
            ${miniStat('👥', pelanggan.length, 'Total pelanggan')}
            ${miniStat('🛵', store.all('motor').length, 'Motor terdaftar')}
            ${miniStat('✅', cnt('aktif'), 'Booking aktif')}
            ${miniStat('⏳', cnt('pending'), 'Booking pending')}
            ${miniStat('🏁', cnt('selesai'), 'Booking selesai')}
            ${miniStat('💸', ui.rupiahSingkat(cfg.cac), 'CAC / pelanggan')}
          </div>
          <div class="card tight mt-2" style="background:var(--bg)">
            <div class="kecil"><b>CAC ${ui.rupiah(cfg.cac)}</b> — ${cfg.cac < 30000
              ? '✅ di bawah target Rp 30 rb. Efisien.' : '⚠️ di atas target Rp 30 rb.'}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>Catatan posisi pasar</h3></div>
        <p class="kecil muted">Parkir motor biasa di pasaran ±Rp 100 rb/bln. GARASIN dihargai ${ui.rupiah(cfg.harga_periode)}/periode
        karena bukan cuma tempat parkir: ada perawatan rutin, foto kondisi via WhatsApp, dan pemantauan via aplikasi.
        Selisih harga = nilai "rasa tenang" yang dijual ke pelanggan.</p>
      </div>`;
  }

  // ====================================================== PENGATURAN
  function pengaturan() {
    const c = store.config();
    content.innerHTML = `
      <div class="page-head"><div class="eyebrow">Pengaturan</div><h1>Pengaturan Bisnis</h1>
        <p>Atur harga, kapasitas, rekening, dan kontak. Semua langsung dipakai aplikasi.</p></div>

      <div class="grid grid-2">
        <div class="card">
          <h3 class="mb-2">Harga & kapasitas</h3>
          <div class="row-2">
            <div class="field"><label>Harga / periode (Rp)</label><input class="input" id="cHarga" type="number" value="${c.harga_periode}"></div>
            <div class="field"><label>Kapasitas (slot)</label><input class="input" id="cKap" type="number" value="${c.kapasitas_total}"></div>
          </div>
          <div class="row-2">
            <div class="field"><label>Target pendapatan th-1 (Rp)</label><input class="input" id="cTgtRp" type="number" value="${c.target_pendapatan_th1}"></div>
            <div class="field"><label>Target retensi (%)</label><input class="input" id="cRet" type="number" value="${c.target_retensi}"></div>
          </div>
          <div class="field"><label>CAC / pelanggan (Rp)</label><input class="input" id="cCac" type="number" value="${c.cac}"></div>
        </div>

        <div class="card">
          <h3 class="mb-2">Rekening & kontak</h3>
          <div class="row-2">
            <div class="field"><label>Bank</label><input class="input" id="cBank" value="${c.rekening_bank}"></div>
            <div class="field"><label>No. rekening</label><input class="input" id="cNo" value="${c.rekening_no}"></div>
          </div>
          <div class="field"><label>Atas nama</label><input class="input" id="cNama" value="${c.rekening_nama}"></div>
          <div class="field"><label>No. WhatsApp admin</label>
            <input class="input" id="cWa" value="${c.wa_admin}" placeholder="62812xxxxxxxx">
            <div class="hint">Format internasional tanpa "+" (contoh: 6281234567890).</div></div>
          <button class="btn btn-primary btn-block mt-2" id="simpan">Simpan pengaturan</button>
        </div>
      </div>`;

    content.querySelector('#simpan').addEventListener('click', () => {
      const num = id => Number(content.querySelector(id).value) || 0;
      const txt = id => content.querySelector(id).value.trim();
      if (num('#cKap') < 1) return ui.toast('Kapasitas minimal 1 slot.', 'err');
      store.updateConfig({
        harga_periode: num('#cHarga'),
        kapasitas_total: num('#cKap'),
        target_pendapatan_th1: num('#cTgtRp'),
        target_retensi: num('#cRet'),
        cac: num('#cCac'),
        rekening_bank: txt('#cBank'),
        rekening_no: txt('#cNo'),
        rekening_nama: txt('#cNama'),
        wa_admin: txt('#cWa').replace(/[^0-9]/g, ''),
      });
      ui.toast('Pengaturan tersimpan.');
    });
  }

  // ---- Helper ----
  function labelBulan(ym) {
    const B = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    const [y, m] = ym.split('-');
    return B[Number(m) - 1] + " '" + y.slice(2);
  }
  function stat(ico, val, lbl, sub, extra = '') {
    return `<div class="stat"><div class="stat-ico">${ico}</div>
      <div class="stat-val">${val}</div><div class="stat-lbl">${lbl}</div>
      ${sub ? `<div class="stat-sub">${sub}</div>` : ''}${extra}</div>`;
  }
  function miniStat(ico, val, lbl) {
    return `<div class="center gap-2" style="padding:8px 0">
      <div class="stat-ico" style="width:38px;height:38px;margin:0">${ico}</div>
      <div><div style="font-weight:800;font-size:1.2rem;line-height:1">${val}</div>
        <div class="kecil muted">${lbl}</div></div></div>`;
  }
};
