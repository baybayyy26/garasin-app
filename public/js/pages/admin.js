/* ==========================================================================
   GARASIN — pages/admin.js  (async/await, API backend)
   Area admin/operator. Sub: beranda, booking, motor, perawatan, pelanggan, bayar.
   ========================================================================== */

window.G = window.G || {};
G.pages = G.pages || {};

G.pages.admin = function (content, sub) {
  const ui = G.ui, store = G.store, kom = G.komponen;

  function handleErr(err) { ui.toast(err.message || 'Terjadi kesalahan.', 'err'); }

  const views = { '': beranda, booking: halBooking, motor: halMotor, perawatan: halPerawatan, pelanggan: halPelanggan, bayar: halBayar };
  (views[sub] || beranda)();

  // ---------------------------------------------------------------- BERANDA
  async function beranda() {
    ui.loading(content, 'Memuat dashboard...');
    try {
      const [bookings, cfg] = await Promise.all([store.all('booking'), store.config()]);
      const aktif = bookings.filter(b => b.status === 'aktif');
      const pending = bookings.filter(b => b.status === 'pending');
      const pakai = Math.round((aktif.length / cfg.kapasitas_total) * 100);

      // Motor aktif yang belum dirawat hari ini
      const hari = ui.hariIni();
      const perawatan = await store.find('perawatan', p => p.tanggal === hari);
      const dirawatHariIni = new Set(perawatan.map(p => p.motor_id));
      const belumRawat = aktif.filter(b => !dirawatHariIni.has(b.motor_id));

      content.innerHTML = `
        <div class="page-head"><div class="eyebrow">Operator</div><h1>Dashboard Operasional</h1>
          <p>Pantau kapasitas, konfirmasi booking, dan catat perawatan harian.</p></div>
        <div class="grid grid-4 mb-3">
          ${stat('🛵', aktif.length, 'Motor disimpan', `dari ${cfg.kapasitas_total} slot`)}
          ${stat('⏳', pending.length, 'Booking masuk', 'perlu konfirmasi')}
          ${stat('🔧', belumRawat.length, 'Perlu dirawat', 'hari ini')}
          ${stat('📊', pakai + '%', 'Kapasitas terpakai', `${aktif.length}/${cfg.kapasitas_total} slot`)}
        </div>
        <div class="grid grid-2">
          <div class="card">
            <div class="card-head"><h3>Checklist perawatan hari ini</h3>
              <a class="btn btn-primary btn-sm" href="#/admin/perawatan">+ Catat</a></div>
            <div id="checklist"></div>
          </div>
          <div class="card">
            <div class="card-head"><h3>Booking menunggu konfirmasi</h3>
              <a class="btn btn-ghost btn-sm" href="#/admin/booking">Kelola</a></div>
            <div id="pending"></div>
          </div>
        </div>`;

      const cl = content.querySelector('#checklist');
      cl.innerHTML = belumRawat.length
        ? belumRawat.map(b => `<div class="notif">
            <div class="nf-ico">🛵</div>
            <div class="grow"><div class="cell-strong">${ui.escapeHTML(b.tipe || '-')}</div>
              <div class="plat kecil muted">${ui.escapeHTML(b.plat || '')} · ${ui.escapeHTML(b.pelanggan_nama || '')}</div></div>
            <button class="btn btn-hijau btn-sm" data-rawat="${b.motor_id}">Catat</button>
          </div>`).join('')
        : (aktif.length ? ui.empty('✓', 'Semua motor sudah dirawat hari ini', 'Kerja bagus!')
                       : ui.empty('🛵', 'Belum ada motor disimpan', 'Konfirmasi booking dulu agar motor masuk garasi.'));
      cl.querySelectorAll('[data-rawat]').forEach(el =>
        el.addEventListener('click', () => formPerawatan(Number(el.dataset.rawat), beranda)));

      const pd = content.querySelector('#pending');
      pd.innerHTML = pending.length
        ? pending.map(b => `<div class="notif">
            <div class="nf-ico" style="background:var(--kuning-bg);color:var(--kuning)">⏳</div>
            <div class="grow"><div class="cell-strong">${ui.escapeHTML(b.tipe || '-')} <span class="plat kecil muted">${ui.escapeHTML(b.plat || '')}</span></div>
              <div class="kecil muted">${ui.escapeHTML(b.pelanggan_nama || '')} · ${ui.tanggal(b.tanggal_mulai)} – ${ui.tanggal(b.tanggal_selesai)}</div></div>
            <div class="center gap-1">
              <button class="btn btn-hijau btn-sm" data-acc="${b.id}">Terima</button>
              <button class="btn btn-ghost btn-sm" data-tolak="${b.id}">Tolak</button>
            </div>
          </div>`).join('')
        : ui.empty('📭', 'Tidak ada booking baru', '');
      wireKonfirmasi(pd, beranda, cfg);
    } catch (err) { handleErr(err); }
  }

  // ---------------------------------------------------------------- BOOKING MASUK
  async function halBooking() {
    content.innerHTML = `
      <div class="page-head"><div class="eyebrow">Booking masuk</div><h1>Konfirmasi Booking</h1>
        <p>Terima atau tolak permintaan penyimpanan motor.</p></div>
      <div class="table-wrap"><table class="tbl"><thead><tr>
        <th>Pelanggan</th><th>Motor</th><th>Periode</th><th>Biaya</th><th>Status</th><th></th>
      </tr></thead><tbody id="tb"></tbody></table></div>`;
    await gambar();

    async function gambar() {
      const tb = content.querySelector('#tb');
      ui.loading(tb, '');
      try {
        const [list, cfg] = await Promise.all([store.all('booking'), store.config()]);
        if (!list.length) { tb.innerHTML = `<tr><td colspan="6">${ui.empty('📥', 'Belum ada booking masuk', 'Booking dari pelanggan akan tampil di sini.')}</td></tr>`; return; }
        tb.innerHTML = list.map(b => {
          const aksi = b.status === 'pending'
            ? `<button class="btn btn-hijau btn-sm" data-acc="${b.id}">Terima</button>
               <button class="btn btn-ghost btn-sm" data-tolak="${b.id}">Tolak</button>`
            : '<span class="muted kecil">—</span>';
          return `<tr>
            <td class="cell-strong">${ui.escapeHTML(b.pelanggan_nama || '-')}</td>
            <td>${ui.escapeHTML(b.tipe || '-')} <div class="plat kecil muted">${ui.escapeHTML(b.plat || '')}</div></td>
            <td class="kecil">${ui.tanggal(b.tanggal_mulai)} – ${ui.tanggal(b.tanggal_selesai)}</td>
            <td>${ui.rupiah(b.harga)}</td>
            <td>${ui.badgeStatus(b.status)}</td>
            <td style="text-align:right;white-space:nowrap">${aksi}</td>
          </tr>`;
        }).join('');
        wireKonfirmasi(tb, gambar, cfg);
      } catch (err) { handleErr(err); }
    }
  }

  function wireKonfirmasi(scope, refresh, cfg) {
    scope.querySelectorAll('[data-acc]').forEach(el => el.addEventListener('click', async () => {
      try {
        await store.update('booking', el.dataset.acc, { status: 'aktif' });
        ui.toast('Booking diterima.'); refresh();
      } catch (err) { ui.toast(err.message, 'err'); }
    }));
    scope.querySelectorAll('[data-tolak]').forEach(el => el.addEventListener('click', async () => {
      if (!(await ui.konfirmasi({ pesan: 'Tolak booking ini?', tombol: 'Ya, tolak', bahaya: true }))) return;
      try {
        await store.update('booking', el.dataset.tolak, { status: 'ditolak' });
        ui.toast('Booking ditolak.', 'info'); refresh();
      } catch (err) { ui.toast(err.message, 'err'); }
    }));
  }

  // ---------------------------------------------------------------- MOTOR TERSIMPAN
  async function halMotor() {
    content.innerHTML = `
      <div class="page-head"><div class="eyebrow">Motor tersimpan</div><h1>Motor di Garasi</h1>
        <p>Status <b>booking</b> (aktif/selesai) dan <b>kondisi</b> (kesehatan) dilacak terpisah.</p></div>
      <div class="grid grid-3" id="grid"></div>`;
    await gambar();

    async function gambar() {
      const grid = content.querySelector('#grid');
      ui.loading(grid, 'Memuat motor...');
      try {
        const [bookings, perawatan] = await Promise.all([
          store.all('booking'),
          store.find('perawatan', () => true),
        ]);
        const aktif = bookings.filter(b => b.status === 'aktif');
        if (!aktif.length) { grid.innerHTML = ui.empty('🛵', 'Belum ada motor disimpan', 'Motor masuk ke sini setelah booking diterima.'); return; }
        const hari = ui.hariIni();
        grid.innerHTML = aktif.map(b => {
          const dirawatHariIni = perawatan.some(p => p.motor_id === b.motor_id && p.tanggal === hari);
          const p = perawatan.filter(x => x.motor_id === b.motor_id)
            .sort((a, z) => new Date(z.tanggal) - new Date(a.tanggal))[0] || null;
          return `<div class="card tight">
            <div class="between mb-2"><span class="plat" style="font-size:1.05rem">${ui.escapeHTML(b.plat || '')}</span>
              ${kom.badgeKesehatanDariP(p)}</div>
            <div style="font-weight:700">${ui.escapeHTML(b.tipe || '-')}</div>
            <div class="muted kecil mb-1">${ui.escapeHTML(b.pelanggan_nama || '')} · ${ui.escapeHTML(b.pelanggan_hp || '')}</div>
            <div class="kecil mb-2">${dirawatHariIni ? '<span class="text-merah">●</span> sudah dirawat hari ini' : '<span class="muted">○ belum dirawat hari ini</span>'}</div>
            <div class="flex gap-1">
              <button class="btn btn-hijau btn-sm grow" data-rawat="${b.motor_id}">Catat perawatan</button>
              <button class="btn btn-ghost btn-sm" data-riwayat="${b.motor_id}" data-tipe="${ui.escapeHTML(b.tipe || '')}" data-plat="${ui.escapeHTML(b.plat || '')}">Riwayat</button>
            </div>
            <button class="btn btn-ghost btn-sm btn-block mt-1" data-selesai="${b.id}">Tandai motor diambil (selesai)</button>
          </div>`;
        }).join('');
        grid.querySelectorAll('[data-rawat]').forEach(el => el.addEventListener('click', () => formPerawatan(Number(el.dataset.rawat), gambar)));
        grid.querySelectorAll('[data-riwayat]').forEach(el => el.addEventListener('click', () =>
          kom.bukaRiwayatKondisi({ id: Number(el.dataset.riwayat), tipe: el.dataset.tipe, plat: el.dataset.plat, warna: '', cc: '' })));
        grid.querySelectorAll('[data-selesai]').forEach(el => el.addEventListener('click', async () => {
          if (!(await ui.konfirmasi({ judul: 'Selesaikan penyimpanan', pesan: 'Tandai motor sudah diambil pemilik? Slot akan kembali kosong.', tombol: 'Ya, selesai' }))) return;
          try {
            await store.update('booking', el.dataset.selesai, { status: 'selesai' });
            ui.toast('Booking ditandai selesai. Slot kembali kosong.'); gambar();
          } catch (err) { ui.toast(err.message, 'err'); }
        }));
      } catch (err) { handleErr(err); }
    }
  }

  // ---------------------------------------------------------------- PERAWATAN
  async function halPerawatan() {
    content.innerHTML = `
      <div class="page-head between">
        <div><div class="eyebrow">Perawatan</div><h1>Catat Perawatan Harian</h1>
          <p>Inti layanan GARASIN — bukti motor benar-benar dijaga.</p></div>
        <button class="btn btn-primary" id="btnBaru">+ Perawatan baru</button>
      </div>
      <div class="table-wrap"><table class="tbl"><thead><tr>
        <th>Tanggal</th><th>Motor</th><th>Aki</th><th>Ban</th><th>Mesin</th><th>Petugas</th>
      </tr></thead><tbody id="tb"></tbody></table></div>`;
    content.querySelector('#btnBaru').addEventListener('click', () => formPerawatan(null, halPerawatan));
    const tb = content.querySelector('#tb');
    ui.loading(tb, '');
    try {
      const list = await store.find('perawatan', () => true);
      const sorted = list.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
      tb.innerHTML = sorted.length ? sorted.map(p => `<tr>
        <td class="cell-strong">${ui.tanggal(p.tanggal)}</td>
        <td>${ui.escapeHTML(p.tipe || '-')} <div class="plat kecil muted">${ui.escapeHTML(p.plat || '')}</div></td>
        <td>${ui.kondisiPill('', p.status_aki)}</td>
        <td>${ui.kondisiPill('', p.status_ban)}</td>
        <td>${ui.kondisiPill('', p.status_mesin)}</td>
        <td class="kecil">${ui.escapeHTML(p.petugas || '')}</td>
      </tr>`).join('')
      : `<tr><td colspan="6">${ui.empty('🔧', 'Belum ada laporan', 'Catat perawatan pertama setelah ada motor aktif.')}</td></tr>`;
    } catch (err) { handleErr(err); }
  }

  async function formPerawatan(motorId, refresh) {
    let aktifMotor;
    try {
      const bookings = await store.all('booking');
      aktifMotor = bookings.filter(b => b.status === 'aktif');
    } catch (err) { return ui.toast(err.message, 'err'); }
    if (!aktifMotor.length) return ui.toast('Belum ada motor aktif untuk dirawat.', 'err');

    const opsi = aktifMotor.map(b =>
      `<option value="${b.motor_id}" ${b.motor_id === motorId ? 'selected' : ''}>${ui.escapeHTML(b.tipe || '')} — ${ui.escapeHTML(b.plat || '')}</option>`).join('');
    const petugasDefault = G.auth.userAktif()?.nama || 'Admin';

    ui.modal({
      judul: 'Catat Perawatan Harian', lebar: 480,
      isiHTML: `
        <div class="row-2">
          <div class="field"><label>Motor</label><select class="select" id="pMotor">${opsi}</select></div>
          <div class="field"><label>Tanggal</label><input class="input" id="pTgl" type="date" value="${ui.hariIni()}"></div>
        </div>
        <div class="field"><label>Nama petugas</label>
          <input class="input" id="pPetugas" value="${ui.escapeHTML(petugasDefault)}" placeholder="Nama yang merawat">
          <div class="hint">Bisa diganti sesuai siapa yang bertugas.</div></div>
        ${segKondisi('Aki', 'aki')}
        ${segKondisi('Ban', 'ban')}
        ${segKondisi('Mesin', 'mesin')}
        <div class="field"><label>Catatan</label><textarea class="textarea" id="pCatatan" placeholder="mis. Mesin dipanaskan 10 menit, ban dipompa."></textarea></div>
        <div class="field"><label>Foto kondisi (opsional)</label>
          <label class="filepick" id="pick"><div class="big">📷</div><div id="pickLbl">Ambil/pilih foto motor</div>
            <input type="file" accept="image/*" id="pFile"></label>
          <div id="prev" class="mt-2"></div>
          <div class="hint">Foto/video juga dikirim ke pelanggan via WhatsApp.</div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" data-batal>Batal</button>
          <button class="btn btn-hijau" data-simpan>Simpan laporan</button>
        </div>`,
      onMount(body, tutup) {
        let foto = null;
        const file = body.querySelector('#pFile');
        body.querySelector('#pick').addEventListener('click', () => file.click());
        file.addEventListener('change', async () => {
          if (!file.files[0]) return;
          foto = await ui.fileToDataURL(file.files[0]);
          body.querySelector('#pickLbl').textContent = file.files[0].name;
          body.querySelector('#prev').innerHTML = `<img src="${foto}" style="border-radius:10px;max-height:170px;margin:auto">`;
        });
        body.querySelector('[data-batal]').addEventListener('click', tutup);
        body.querySelector('[data-simpan]').addEventListener('click', async () => {
          const motor_id = Number(body.querySelector('#pMotor').value);
          const tanggal = body.querySelector('#pTgl').value;
          const petugas = body.querySelector('#pPetugas').value.trim() || petugasDefault;
          const get = n => (body.querySelector(`input[name="k_${n}"]:checked`) || {}).value;
          const status_aki = get('aki'), status_ban = get('ban'), status_mesin = get('mesin');
          if (!status_aki || !status_ban || !status_mesin) return ui.toast('Pilih kondisi aki, ban, & mesin.', 'err');
          try {
            await store.insert('perawatan', { motor_id, tanggal, status_aki, status_ban, status_mesin,
              catatan: body.querySelector('#pCatatan').value.trim(), petugas, foto });
            tutup(); ui.toast('Laporan perawatan tersimpan & pelanggan diberi tahu.'); refresh();
          } catch (err) { ui.toast(err.message, 'err'); }
        });
      },
    });
  }

  function segKondisi(label, name) {
    const opt = (v, cls, txt) => `<label><input type="radio" name="k_${name}" value="${v}"><span class="opt ${cls}">${txt}</span></label>`;
    return `<div class="field"><label>${label}</label><div class="seg">
      ${opt('baik', 'baik', 'Baik')}${opt('perhatian', 'perhatian', 'Perlu cek')}${opt('buruk', 'buruk', 'Buruk')}
    </div></div>`;
  }

  // ---------------------------------------------------------------- DATA PELANGGAN
  async function halPelanggan() {
    content.innerHTML = `
      <div class="page-head"><div class="eyebrow">Data pelanggan</div><h1>Pelanggan Terdaftar</h1>
        <p>Semua pelanggan yang mendaftar di GARASIN.</p></div>
      <div class="table-wrap"><table class="tbl"><thead><tr>
        <th>Nama</th><th>Kontak</th><th>Asal</th><th>Motor</th><th>Booking aktif</th><th></th>
      </tr></thead><tbody id="tb"></tbody></table></div>`;
    const tb = content.querySelector('#tb');
    ui.loading(tb, '');
    try {
      const list = await store.all('users');
      if (!list.length) { tb.innerHTML = `<tr><td colspan="6">${ui.empty('👥', 'Belum ada pelanggan', 'Pelanggan akan muncul di sini setelah mendaftar.')}</td></tr>`; return; }
      tb.innerHTML = list.map(u => {
        const wa = ui.waLink(u.no_hp, `Halo ${ui.escapeHTML(u.nama)}, ini admin GARASIN.`);
        return `<tr>
          <td><div class="cell-strong">${ui.escapeHTML(u.nama)}</div><div class="kecil muted">${ui.escapeHTML(u.email)}</div></td>
          <td class="kecil">${ui.escapeHTML(u.no_hp || '-')}</td>
          <td class="kecil">${ui.escapeHTML(u.asal || '-')}</td>
          <td>${u.jumlah_motor || 0}</td>
          <td>${u.jumlah_aktif || 0}</td>
          <td style="text-align:right">${u.no_hp ? `<a class="btn btn-ghost btn-sm" href="${wa}" target="_blank" rel="noopener">Chat WA</a>` : ''}</td>
        </tr>`;
      }).join('');
    } catch (err) { handleErr(err); }
  }

  // ---------------------------------------------------------------- VERIFIKASI BAYAR
  async function halBayar() {
    content.innerHTML = `
      <div class="page-head"><div class="eyebrow">Pembayaran</div><h1>Verifikasi Pembayaran</h1>
        <p>Cek bukti transfer pelanggan lalu tandai lunas.</p></div>
      <div class="table-wrap"><table class="tbl"><thead><tr>
        <th>Pelanggan</th><th>Motor</th><th>Jumlah</th><th>Bukti</th><th>Status</th><th></th>
      </tr></thead><tbody id="tb"></tbody></table></div>`;
    await gambar();

    async function gambar() {
      const tb = content.querySelector('#tb');
      ui.loading(tb, '');
      try {
        const rows = await store.all('pembayaran');
        if (!rows.length) { tb.innerHTML = `<tr><td colspan="6">${ui.empty('💳', 'Belum ada pembayaran', 'Tagihan muncul setelah pelanggan membuat booking.')}</td></tr>`; return; }
        tb.innerHTML = rows.map(p => {
          const menunggu = p.status === 'belum' && p.bukti;
          const statusHTML = menunggu ? '<span class="badge b-kuning">Perlu verifikasi</span>' : ui.badgeStatus(p.status);
          return `<tr>
            <td class="cell-strong">${ui.escapeHTML(p.pelanggan_nama || '-')}</td>
            <td>${ui.escapeHTML(p.motor_tipe || '-')} <div class="plat kecil muted">${ui.escapeHTML(p.motor_plat || '')}</div></td>
            <td>${ui.rupiah(p.jumlah)}</td>
            <td>${p.bukti ? `<button class="btn btn-ghost btn-sm" data-lihat="${p.id}">Lihat</button>` : '<span class="muted kecil">belum ada</span>'}</td>
            <td>${statusHTML}</td>
            <td style="text-align:right">${p.status === 'belum'
              ? `<button class="btn btn-hijau btn-sm" data-lunas="${p.id}" ${p.bukti ? '' : 'disabled'}>Tandai lunas</button>` : '✓'}</td>
          </tr>`;
        }).join('');
        tb.querySelectorAll('[data-lihat]').forEach(el => el.addEventListener('click', () => {
          const p = rows.find(x => x.id === Number(el.dataset.lihat));
          ui.modal({ judul: 'Bukti Transfer', lebar: 460, isiHTML: `<img src="${p.bukti}" style="border-radius:12px;width:100%">` });
        }));
        tb.querySelectorAll('[data-lunas]').forEach(el => el.addEventListener('click', async () => {
          try {
            await store.update('pembayaran', el.dataset.lunas, { status: 'lunas' });
            ui.toast('Pembayaran ditandai lunas.'); gambar();
          } catch (err) { ui.toast(err.message, 'err'); }
        }));
      } catch (err) { handleErr(err); }
    }
  }

  function stat(ico, val, lbl, sub) {
    return `<div class="stat"><div class="stat-ico">${ico}</div>
      <div class="stat-val">${val}</div><div class="stat-lbl">${lbl}</div>
      ${sub ? `<div class="stat-sub">${sub}</div>` : ''}</div>`;
  }
};
