/* ==========================================================================
   GARASIN — pages/admin.js
   Area admin/operator. Sub: beranda, booking, motor, perawatan, pelanggan, bayar.
   ========================================================================== */

window.G = window.G || {};
G.pages = G.pages || {};

G.pages.admin = function (content, sub) {
  const ui = G.ui, store = G.store, kom = G.komponen;
  const cfg = store.config();

  const bookingAktif = () => store.find('booking', b => b.status === 'aktif');
  const bookingPending = () => store.find('booking', b => b.status === 'pending');
  const pemilik = uid => store.get('users', uid) || { nama: '-', asal: '-' };
  const motorAktifBelumDirawatHariIni = () => bookingAktif()
    .map(b => store.get('motor', b.motor_id)).filter(Boolean)
    .filter(m => !store.find('perawatan', p => p.motor_id === m.id && p.tanggal === ui.hariIni()).length);

  const views = { '': beranda, booking: halBooking, motor: halMotor, perawatan: halPerawatan, pelanggan: halPelanggan, bayar: halBayar };
  (views[sub] || beranda)();

  // ---------------------------------------------------------------- BERANDA
  function beranda() {
    const aktif = bookingAktif().length;
    const pakai = Math.round((aktif / cfg.kapasitas_total) * 100);
    const belumRawat = motorAktifBelumDirawatHariIni();

    content.innerHTML = `
      <div class="page-head"><div class="eyebrow">Operator</div><h1>Dashboard Operasional</h1>
        <p>Pantau kapasitas, konfirmasi booking, dan catat perawatan harian.</p></div>

      <div class="grid grid-4 mb-3">
        ${stat('🛵', aktif, 'Motor disimpan', `dari ${cfg.kapasitas_total} slot`)}
        ${stat('⏳', bookingPending().length, 'Booking masuk', 'perlu konfirmasi')}
        ${stat('🔧', belumRawat.length, 'Perlu dirawat', 'hari ini')}
        ${stat('📊', pakai + '%', 'Kapasitas terpakai', `${aktif}/${cfg.kapasitas_total} slot`)}
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
    cl.innerHTML = belumRawat.length ? belumRawat.map(m => {
      const bk = store.find('booking', b => b.motor_id === m.id && b.status === 'aktif')[0];
      return `<div class="notif">
        <div class="nf-ico">🛵</div>
        <div class="grow"><div class="cell-strong">${m.tipe}</div>
          <div class="plat kecil muted">${m.plat} · ${pemilik(bk.user_id).nama}</div></div>
        <button class="btn btn-hijau btn-sm" data-rawat="${m.id}">Catat</button>
      </div>`;
    }).join('')
      : (aktif ? ui.empty('✓', 'Semua motor sudah dirawat hari ini', 'Kerja bagus!')
               : ui.empty('🛵', 'Belum ada motor disimpan', 'Konfirmasi booking dulu agar motor masuk garasi.'));
    cl.querySelectorAll('[data-rawat]').forEach(el =>
      el.addEventListener('click', () => formPerawatan(Number(el.dataset.rawat), beranda)));

    const pd = content.querySelector('#pending');
    const list = bookingPending();
    pd.innerHTML = list.length ? list.map(b => {
      const m = store.get('motor', b.motor_id);
      return `<div class="notif">
        <div class="nf-ico" style="background:var(--kuning-bg);color:var(--kuning)">⏳</div>
        <div class="grow"><div class="cell-strong">${m ? m.tipe : '-'} <span class="plat kecil muted">${m ? m.plat : ''}</span></div>
          <div class="kecil muted">${pemilik(b.user_id).nama} · ${ui.tanggal(b.tanggal_mulai)} – ${ui.tanggal(b.tanggal_selesai)}</div></div>
        <div class="center gap-1">
          <button class="btn btn-hijau btn-sm" data-acc="${b.id}">Terima</button>
          <button class="btn btn-ghost btn-sm" data-tolak="${b.id}">Tolak</button>
        </div>
      </div>`;
    }).join('') : ui.empty('📭', 'Tidak ada booking baru', '');
    wireKonfirmasi(pd, beranda);
  }

  // ---------------------------------------------------------------- BOOKING MASUK
  function halBooking() {
    content.innerHTML = `
      <div class="page-head"><div class="eyebrow">Booking masuk</div><h1>Konfirmasi Booking</h1>
        <p>Terima atau tolak permintaan penyimpanan motor.</p></div>
      <div class="table-wrap"><table class="tbl"><thead><tr>
        <th>Pelanggan</th><th>Motor</th><th>Periode</th><th>Biaya</th><th>Status</th><th></th>
      </tr></thead><tbody id="tb"></tbody></table></div>`;
    gambar();

    function gambar() {
      const tb = content.querySelector('#tb');
      const list = store.all('booking').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      if (!list.length) { tb.innerHTML = `<tr><td colspan="6">${ui.empty('📥', 'Belum ada booking masuk', 'Booking dari pelanggan akan tampil di sini.')}</td></tr>`; return; }
      tb.innerHTML = list.map(b => {
        const m = store.get('motor', b.motor_id);
        const aksi = b.status === 'pending'
          ? `<button class="btn btn-hijau btn-sm" data-acc="${b.id}">Terima</button>
             <button class="btn btn-ghost btn-sm" data-tolak="${b.id}">Tolak</button>`
          : '<span class="muted kecil">—</span>';
        return `<tr>
          <td class="cell-strong">${pemilik(b.user_id).nama}</td>
          <td>${m ? m.tipe : '-'} <div class="plat kecil muted">${m ? m.plat : ''}</div></td>
          <td class="kecil">${ui.tanggal(b.tanggal_mulai)} – ${ui.tanggal(b.tanggal_selesai)}</td>
          <td>${ui.rupiah(b.harga)}</td>
          <td>${ui.badgeStatus(b.status)}</td>
          <td style="text-align:right;white-space:nowrap">${aksi}</td>
        </tr>`;
      }).join('');
      wireKonfirmasi(tb, gambar);
    }
  }

  function wireKonfirmasi(scope, refresh) {
    scope.querySelectorAll('[data-acc]').forEach(el => el.addEventListener('click', () => {
      const b = store.get('booking', el.dataset.acc);
      // Jaga kapasitas 6 slot
      if (bookingAktif().length >= cfg.kapasitas_total)
        return ui.toast(`Kapasitas penuh (${cfg.kapasitas_total} slot). Selesaikan booking lain dulu.`, 'err');
      store.update('booking', b.id, { status: 'aktif' });
      store.insert('notifikasi', { user_id: b.user_id, pesan: 'Booking kamu DITERIMA. Motor siap kami simpan & rawat 🎉', tanggal: ui.hariIni(), dibaca: false });
      ui.toast('Booking diterima.'); refresh();
    }));
    scope.querySelectorAll('[data-tolak]').forEach(el => el.addEventListener('click', async () => {
      if (!(await ui.konfirmasi({ pesan: 'Tolak booking ini?', tombol: 'Ya, tolak', bahaya: true }))) return;
      const b = store.get('booking', el.dataset.tolak);
      store.update('booking', b.id, { status: 'ditolak' });
      store.insert('notifikasi', { user_id: b.user_id, pesan: 'Maaf, booking kamu ditolak (kapasitas penuh/jadwal bentrok). Hubungi admin ya.', tanggal: ui.hariIni(), dibaca: false });
      ui.toast('Booking ditolak.', 'info'); refresh();
    }));
  }

  // ---------------------------------------------------------------- MOTOR TERSIMPAN
  function halMotor() {
    content.innerHTML = `
      <div class="page-head"><div class="eyebrow">Motor tersimpan</div><h1>Motor di Garasi</h1>
        <p>Status <b>booking</b> (aktif/selesai) dan <b>kondisi</b> (kesehatan) dilacak terpisah —
        mencatat perawatan hanya memperbarui kondisi, bukan status booking.</p></div>
      <div class="grid grid-3" id="grid"></div>`;
    gambar();

    function gambar() {
      const grid = content.querySelector('#grid');
      const rows = bookingAktif().map(b => ({ b, m: store.get('motor', b.motor_id) })).filter(x => x.m);
      if (!rows.length) { grid.innerHTML = ui.empty('🛵', 'Belum ada motor disimpan', 'Motor masuk ke sini setelah booking diterima.'); return; }
      grid.innerHTML = rows.map(({ b, m }) => {
        const dirawatHariIni = store.find('perawatan', x => x.motor_id === m.id && x.tanggal === ui.hariIni()).length > 0;
        return `<div class="card tight">
          <div class="between mb-2"><span class="plat" style="font-size:1.05rem">${m.plat}</span>
            ${kom.badgeKesehatan(m.id)}</div>
          <div style="font-weight:700">${m.tipe}</div>
          <div class="muted kecil mb-1">${pemilik(b.user_id).nama} · ${pemilik(b.user_id).asal}</div>
          <div class="kecil mb-2">${dirawatHariIni ? '<span class="text-merah">●</span> sudah dirawat hari ini' : '<span class="muted">○ belum dirawat hari ini</span>'}</div>
          <div class="flex gap-1">
            <button class="btn btn-hijau btn-sm grow" data-rawat="${m.id}">Catat perawatan</button>
            <button class="btn btn-ghost btn-sm" data-riwayat="${m.id}">Riwayat</button>
          </div>
          <button class="btn btn-ghost btn-sm btn-block mt-1" data-selesai="${b.id}">Tandai motor diambil (selesai)</button>
        </div>`;
      }).join('');
      grid.querySelectorAll('[data-rawat]').forEach(el => el.addEventListener('click', () => formPerawatan(Number(el.dataset.rawat), gambar)));
      grid.querySelectorAll('[data-riwayat]').forEach(el => el.addEventListener('click', () => kom.bukaRiwayatKondisi(store.get('motor', el.dataset.riwayat))));
      grid.querySelectorAll('[data-selesai]').forEach(el => el.addEventListener('click', async () => {
        if (!(await ui.konfirmasi({ judul: 'Selesaikan penyimpanan', pesan: 'Tandai motor sudah diambil pemilik? Slot akan kembali kosong.', tombol: 'Ya, selesai' }))) return;
        const b = store.get('booking', el.dataset.selesai);
        store.update('booking', b.id, { status: 'selesai' });
        store.insert('notifikasi', { user_id: b.user_id, pesan: 'Penyimpanan selesai. Terima kasih sudah percaya ke GARASIN! 🙏', tanggal: ui.hariIni(), dibaca: false });
        ui.toast('Booking ditandai selesai. Slot kembali kosong.'); gambar();
      }));
    }
  }

  // ---------------------------------------------------------------- INPUT PERAWATAN
  function halPerawatan() {
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
    const list = store.all('perawatan').sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    tb.innerHTML = list.length ? list.map(p => {
      const m = store.get('motor', p.motor_id);
      return `<tr>
        <td class="cell-strong">${ui.tanggal(p.tanggal)}</td>
        <td>${m ? m.tipe : '-'} <div class="plat kecil muted">${m ? m.plat : ''}</div></td>
        <td>${ui.kondisiPill('', p.status_aki)}</td>
        <td>${ui.kondisiPill('', p.status_ban)}</td>
        <td>${ui.kondisiPill('', p.status_mesin)}</td>
        <td class="kecil">${p.petugas}</td>
      </tr>`;
    }).join('') : `<tr><td colspan="6">${ui.empty('🔧', 'Belum ada laporan', 'Catat perawatan pertama setelah ada motor aktif.')}</td></tr>`;
  }

  function formPerawatan(motorId, refresh) {
    const aktifMotor = bookingAktif().map(b => store.get('motor', b.motor_id)).filter(Boolean);
    if (!aktifMotor.length) return ui.toast('Belum ada motor aktif untuk dirawat.', 'err');
    const opsi = aktifMotor.map(m => `<option value="${m.id}" ${m.id === motorId ? 'selected' : ''}>${m.tipe} — ${m.plat}</option>`).join('');
    const petugasDefault = G.auth.userAktif().nama;

    ui.modal({
      judul: 'Catat Perawatan Harian', lebar: 480,
      isiHTML: `
        <div class="row-2">
          <div class="field"><label>Motor</label><select class="select" id="pMotor">${opsi}</select></div>
          <div class="field"><label>Tanggal</label><input class="input" id="pTgl" type="date" value="${ui.hariIni()}"></div>
        </div>
        <div class="field"><label>Nama petugas</label>
          <input class="input" id="pPetugas" value="${petugasDefault}" placeholder="Nama yang merawat">
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
        body.querySelector('[data-simpan]').addEventListener('click', () => {
          const motor_id = Number(body.querySelector('#pMotor').value);
          const tanggal = body.querySelector('#pTgl').value;
          const petugas = body.querySelector('#pPetugas').value.trim() || petugasDefault;
          const get = n => (body.querySelector(`input[name="k_${n}"]:checked`) || {}).value;
          const status_aki = get('aki'), status_ban = get('ban'), status_mesin = get('mesin');
          if (!status_aki || !status_ban || !status_mesin) return ui.toast('Pilih kondisi aki, ban, & mesin.', 'err');
          const m = store.get('motor', motor_id);
          store.insert('perawatan', {
            motor_id, tanggal, status_aki, status_ban, status_mesin,
            catatan: body.querySelector('#pCatatan').value.trim(), petugas, foto,
          });
          store.insert('notifikasi', { user_id: m.user_id, pesan: `Laporan kondisi ${m.tipe} (${ui.tanggal(tanggal)}) sudah tersedia.`, tanggal: ui.hariIni(), dibaca: false });
          tutup(); ui.toast('Laporan perawatan tersimpan & pelanggan diberi tahu.'); refresh();
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
  function halPelanggan() {
    content.innerHTML = `
      <div class="page-head"><div class="eyebrow">Data pelanggan</div><h1>Pelanggan Terdaftar</h1>
        <p>Semua pelanggan yang mendaftar di GARASIN.</p></div>
      <div class="table-wrap"><table class="tbl"><thead><tr>
        <th>Nama</th><th>Kontak</th><th>Asal</th><th>Motor</th><th>Booking aktif</th><th></th>
      </tr></thead><tbody id="tb"></tbody></table></div>`;
    const tb = content.querySelector('#tb');
    const list = store.find('users', u => u.role === 'pelanggan');
    if (!list.length) { tb.innerHTML = `<tr><td colspan="6">${ui.empty('👥', 'Belum ada pelanggan', 'Pelanggan akan muncul di sini setelah mendaftar lewat halaman login.')}</td></tr>`; return; }
    tb.innerHTML = list.map(u => {
      const jmlMotor = store.find('motor', m => m.user_id === u.id).length;
      const jmlAktif = store.find('booking', b => b.user_id === u.id && b.status === 'aktif').length;
      const wa = ui.waLink(u.no_hp, `Halo ${u.nama}, ini admin GARASIN.`);
      return `<tr>
        <td><div class="cell-strong">${u.nama}</div><div class="kecil muted">${u.email}</div></td>
        <td class="kecil">${u.no_hp || '-'}</td>
        <td class="kecil">${u.asal || '-'}</td>
        <td>${jmlMotor}</td>
        <td>${jmlAktif}</td>
        <td style="text-align:right">${u.no_hp ? `<a class="btn btn-ghost btn-sm" href="${wa}" target="_blank" rel="noopener">Chat WA</a>` : ''}</td>
      </tr>`;
    }).join('');
  }

  // ---------------------------------------------------------------- VERIFIKASI BAYAR
  function halBayar() {
    content.innerHTML = `
      <div class="page-head"><div class="eyebrow">Pembayaran</div><h1>Verifikasi Pembayaran</h1>
        <p>Cek bukti transfer pelanggan lalu tandai lunas.</p></div>
      <div class="table-wrap"><table class="tbl"><thead><tr>
        <th>Pelanggan</th><th>Motor</th><th>Jumlah</th><th>Bukti</th><th>Status</th><th></th>
      </tr></thead><tbody id="tb"></tbody></table></div>`;
    gambar();

    function gambar() {
      const tb = content.querySelector('#tb');
      const rows = store.all('pembayaran').map(p => {
        const b = store.get('booking', p.booking_id); if (!b) return null;
        return { p, b, m: store.get('motor', b.motor_id) };
      }).filter(Boolean);
      if (!rows.length) { tb.innerHTML = `<tr><td colspan="6">${ui.empty('💳', 'Belum ada pembayaran', 'Tagihan muncul setelah pelanggan membuat booking.')}</td></tr>`; return; }
      tb.innerHTML = rows.map(({ p, b, m }) => {
        const menunggu = p.status === 'belum' && p.bukti;
        const statusHTML = menunggu ? '<span class="badge b-kuning">Perlu verifikasi</span>' : ui.badgeStatus(p.status);
        return `<tr>
          <td class="cell-strong">${pemilik(b.user_id).nama}</td>
          <td>${m ? m.tipe : '-'} <div class="plat kecil muted">${m ? m.plat : ''}</div></td>
          <td>${ui.rupiah(p.jumlah)}</td>
          <td>${p.bukti ? `<button class="btn btn-ghost btn-sm" data-lihat="${p.id}">Lihat</button>` : '<span class="muted kecil">belum ada</span>'}</td>
          <td>${statusHTML}</td>
          <td style="text-align:right">${p.status === 'belum'
            ? `<button class="btn btn-hijau btn-sm" data-lunas="${p.id}" ${p.bukti ? '' : 'disabled'}>Tandai lunas</button>` : '✓'}</td>
        </tr>`;
      }).join('');
      tb.querySelectorAll('[data-lihat]').forEach(el => el.addEventListener('click', () => {
        const p = store.get('pembayaran', el.dataset.lihat);
        ui.modal({ judul: 'Bukti Transfer', lebar: 460, isiHTML: `<img src="${p.bukti}" style="border-radius:12px;width:100%">` });
      }));
      tb.querySelectorAll('[data-lunas]').forEach(el => el.addEventListener('click', () => {
        const p = store.get('pembayaran', el.dataset.lunas);
        store.update('pembayaran', p.id, { status: 'lunas', tanggal: ui.hariIni() });
        const b = store.get('booking', p.booking_id);
        store.insert('notifikasi', { user_id: b.user_id, pesan: 'Pembayaran kamu sudah diverifikasi. Terima kasih! ✅', tanggal: ui.hariIni(), dibaca: false });
        ui.toast('Pembayaran ditandai lunas.'); gambar();
      }));
    }
  }

  function stat(ico, val, lbl, sub) {
    return `<div class="stat"><div class="stat-ico">${ico}</div>
      <div class="stat-val">${val}</div><div class="stat-lbl">${lbl}</div>
      ${sub ? `<div class="stat-sub">${sub}</div>` : ''}</div>`;
  }
};
