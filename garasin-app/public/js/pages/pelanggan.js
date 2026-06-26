/* ==========================================================================
   GARASIN — pages/pelanggan.js
   Area pelanggan. Sub: beranda, motor, booking, bayar, notif, bantuan.
   ========================================================================== */

window.G = window.G || {};
G.pages = G.pages || {};

G.pages.pelanggan = function (content, sub) {
  const ui = G.ui, store = G.store, kom = G.komponen;
  const user = G.auth.userAktif();
  const cfg = store.config();

  const motorSaya = () => store.find('motor', m => m.user_id === user.id);
  const bookingSaya = () => store.find('booking', b => b.user_id === user.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const notifSaya = () => store.find('notifikasi', n => n.user_id === user.id)
    .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  // Tautan WA minta update untuk satu motor
  const waUpdate = m => ui.waLink(cfg.wa_admin,
    `Halo admin GARASIN, saya ${user.nama} (plat ${m.plat}). Boleh minta update foto/video kondisi motor saya?`);

  const views = { '': beranda, motor: halMotor, booking: halBooking, bayar: halBayar, notif: halNotif, bantuan: halBantuan };
  (views[sub] || beranda)();

  // ---------------------------------------------------------------- BERANDA
  function beranda() {
    const aktif = bookingSaya().filter(b => b.status === 'aktif');
    const tagihanBelum = bookingSaya().filter(b => {
      const p = store.find('pembayaran', x => x.booking_id === b.id)[0];
      return p && p.status === 'belum';
    }).length;
    const notifBaru = notifSaya().filter(n => !n.dibaca).length;
    let sisa = '–';
    if (aktif.length) sisa = Math.max(0, Math.min(...aktif.map(b => ui.sisaHari(b.tanggal_selesai)))) + ' hari';

    content.innerHTML = `
      <div class="page-head">
        <div class="eyebrow">Beranda</div>
        <h1>Halo, ${user.nama.split(' ')[0]} 👋</h1>
        <p>Pulang tenang, motor aman & sehat. Berikut kondisi terbaru motormu.</p>
      </div>

      <div class="grid grid-4 mb-3">
        ${stat('🛵', aktif.length, 'Motor disimpan', 'periode aktif')}
        ${stat('📅', sisa, 'Sisa periode', 'menuju pengambilan')}
        ${stat('💳', tagihanBelum, 'Tagihan belum bayar', tagihanBelum ? 'segera selesaikan' : 'semua lunas')}
        ${stat('🔔', notifBaru, 'Notifikasi baru', 'belum dibaca')}
      </div>

      <div class="card-head"><h3>Motor saya yang sedang disimpan</h3>
        <a class="btn btn-ghost btn-sm" href="#/pelanggan/motor">Kelola motor →</a></div>
      <div class="grid grid-2" id="grMotor"></div>

      <div class="card mt-3">
        <div class="card-head"><h3>Notifikasi terbaru</h3>
          <a class="btn btn-ghost btn-sm" href="#/pelanggan/notif">Lihat semua</a></div>
        <div id="grNotif"></div>
      </div>`;

    const gr = content.querySelector('#grMotor');
    const motorAktif = aktif.map(b => ({ b, m: store.get('motor', b.motor_id) })).filter(x => x.m);
    if (!motorAktif.length) {
      gr.outerHTML = ui.empty('🛵', 'Belum ada motor yang disimpan',
        'Buat booking untuk mulai menyimpan motormu di GARASIN.') +
        `<div style="margin-top:-8px"><a class="btn btn-primary btn-sm" href="#/pelanggan/booking">+ Buat booking</a></div>`;
    } else {
      gr.innerHTML = motorAktif.map(({ b, m }) => kartuMotorAktif(m, b)).join('');
      wireKartu(gr);
    }

    const grN = content.querySelector('#grNotif');
    const list = notifSaya().slice(0, 3);
    grN.innerHTML = list.length ? list.map(notifHTML).join('')
      : ui.empty('🔔', 'Belum ada notifikasi', 'Kabar tentang motormu akan tampil di sini.');
  }

  function kartuMotorAktif(m, b) {
    const p = kom.perawatanTerbaru(m.id);
    return `<div class="card">
      <div class="between mb-2">
        <div><span class="plat" style="font-size:1.05rem">${m.plat}</span>
          <div class="muted kecil">${m.tipe} · ${m.warna}</div></div>
        ${kom.badgeKesehatan(m.id)}
      </div>
      ${kom.fotoKondisi(p || { tanggal: ui.hariIni(), foto: null })}
      <div class="cctv-note mt-2">🎥 Area terpantau CCTV 24 jam · update foto/video dikirim via WhatsApp</div>
      <div class="mt-2">${p ? kom.ringkasanKondisi(p) : '<span class="muted kecil">Belum ada laporan perawatan.</span>'}</div>
      <div class="between mt-2 wrap gap-1">
        <span class="kecil muted">Selesai ${ui.tanggal(b.tanggal_selesai)} · sisa ${Math.max(0, ui.sisaHari(b.tanggal_selesai))} hari</span>
        <div class="flex gap-1">
          <a class="btn btn-hijau btn-sm" href="${waUpdate(m)}" target="_blank" rel="noopener">Minta update WA</a>
          <button class="btn btn-ghost btn-sm" data-riwayat="${m.id}">Riwayat</button>
        </div>
      </div>
    </div>`;
  }
  function wireKartu(scope) {
    scope.querySelectorAll('[data-riwayat]').forEach(el =>
      el.addEventListener('click', () => kom.bukaRiwayatKondisi(store.get('motor', el.dataset.riwayat))));
  }

  // ---------------------------------------------------------------- MOTOR
  function halMotor() {
    content.innerHTML = `
      <div class="page-head between">
        <div><div class="eyebrow">Motor saya</div><h1>Daftar Motor</h1>
          <p>Kelola data motor yang kamu titipkan.</p></div>
        <button class="btn btn-primary" id="btnTambah">+ Tambah motor</button>
      </div>
      <div class="grid grid-3" id="grid"></div>`;
    content.querySelector('#btnTambah').addEventListener('click', formMotor);
    gambarGrid();

    function gambarGrid() {
      const grid = content.querySelector('#grid');
      const list = motorSaya();
      if (!list.length) { grid.innerHTML = ui.empty('🛵', 'Belum ada motor', 'Tambahkan motor pertamamu lalu buat booking.'); return; }
      grid.innerHTML = list.map(m => {
        const bk = store.find('booking', b => b.motor_id === m.id && b.status === 'aktif')[0];
        const p = kom.perawatanTerbaru(m.id);
        return `<div class="card tight">
          <div class="between mb-2">
            <span class="plat" style="font-size:1.05rem">${m.plat}</span>
            ${bk ? ui.badgeStatus('aktif') : '<span class="badge b-abu">Tidak disimpan</span>'}
          </div>
          <div style="font-weight:700">${m.tipe}</div>
          <div class="muted kecil mb-2">${m.warna} · ${m.cc} cc</div>
          ${p ? kom.ringkasanKondisi(p) : '<span class="muted kecil">Belum ada perawatan.</span>'}
          <div class="flex gap-1 mt-2">
            <button class="btn btn-ghost btn-sm grow" data-riwayat="${m.id}">Riwayat kondisi</button>
            ${bk ? `<a class="btn btn-hijau btn-sm" href="${waUpdate(m)}" target="_blank" rel="noopener">WA</a>` : ''}
          </div>
        </div>`;
      }).join('');
      wireKartu(grid);
    }

    function formMotor() {
      ui.modal({
        judul: 'Tambah Motor', lebar: 460,
        isiHTML: `
          <div class="field"><label>Plat nomor</label><input class="input" id="fPlat" placeholder="N 1234 ABC"></div>
          <div class="row-2">
            <div class="field"><label>Tipe / model</label><input class="input" id="fTipe" placeholder="Honda BeAT"></div>
            <div class="field"><label>CC</label><input class="input" id="fCc" type="number" placeholder="110"></div>
          </div>
          <div class="field"><label>Warna</label><input class="input" id="fWarna" placeholder="Hitam"></div>
          <div class="modal-foot">
            <button class="btn btn-ghost" data-batal>Batal</button>
            <button class="btn btn-primary" data-simpan>Simpan motor</button>
          </div>`,
        onMount(body, tutup) {
          body.querySelector('[data-batal]').addEventListener('click', tutup);
          body.querySelector('[data-simpan]').addEventListener('click', () => {
            const plat = body.querySelector('#fPlat').value.trim();
            const tipe = body.querySelector('#fTipe').value.trim();
            if (!plat || !tipe) return ui.toast('Plat & tipe wajib diisi.', 'err');
            store.insert('motor', {
              user_id: user.id, plat: plat.toUpperCase(), tipe,
              cc: Number(body.querySelector('#fCc').value) || 0,
              warna: body.querySelector('#fWarna').value.trim() || '-', foto: null,
            });
            tutup(); ui.toast('Motor ditambahkan.'); gambarGrid();
          });
        },
      });
    }
  }

  // ---------------------------------------------------------------- BOOKING
  function halBooking() {
    content.innerHTML = `
      <div class="page-head between">
        <div><div class="eyebrow">Booking</div><h1>Penyimpanan Motor</h1>
          <p>Pesan slot penyimpanan untuk periode liburan.</p></div>
        <button class="btn btn-primary" id="btnBooking">+ Buat booking</button>
      </div>
      <div class="table-wrap"><table class="tbl"><thead><tr>
        <th>Motor</th><th>Periode</th><th>Status</th><th>Biaya</th><th></th>
      </tr></thead><tbody id="tb"></tbody></table></div>`;
    content.querySelector('#btnBooking').addEventListener('click', formBooking);
    gambar();

    function gambar() {
      const tb = content.querySelector('#tb');
      const list = bookingSaya();
      if (!list.length) { tb.innerHTML = `<tr><td colspan="5">${ui.empty('📅', 'Belum ada booking', 'Buat booking pertamamu.')}</td></tr>`; return; }
      tb.innerHTML = list.map(b => {
        const m = store.get('motor', b.motor_id);
        return `<tr>
          <td><div class="cell-strong">${m ? m.tipe : '-'}</div><div class="plat kecil muted">${m ? m.plat : ''}</div></td>
          <td>${ui.tanggal(b.tanggal_mulai)} – ${ui.tanggal(b.tanggal_selesai)}</td>
          <td>${ui.badgeStatus(b.status)}</td>
          <td class="cell-strong">${ui.rupiah(b.harga)}</td>
          <td style="text-align:right">${b.status === 'pending'
            ? `<button class="btn btn-ghost btn-sm" data-batal="${b.id}">Batalkan</button>` : ''}</td>
        </tr>`;
      }).join('');
      tb.querySelectorAll('[data-batal]').forEach(el => el.addEventListener('click', async () => {
        if (await ui.konfirmasi({ pesan: 'Batalkan booking ini?', tombol: 'Ya, batalkan', bahaya: true })) {
          store.remove('booking', el.dataset.batal);
          store.find('pembayaran', p => p.booking_id === Number(el.dataset.batal)).forEach(p => store.remove('pembayaran', p.id));
          ui.toast('Booking dibatalkan.'); gambar();
        }
      }));
    }

    function formBooking() {
      const list = motorSaya();
      if (!list.length) return ui.toast('Tambahkan motor dulu di menu "Motor saya".', 'err');
      const harga = cfg.harga_periode;
      const opsi = list.map(m => `<option value="${m.id}">${m.tipe} — ${m.plat}</option>`).join('');
      const rincian = ui.hitungRincian(cfg);
      ui.modal({
        judul: 'Buat Booking', lebar: 480,
        isiHTML: `
          <div class="field"><label>Pilih motor</label><select class="select" id="bMotor">${opsi}</select></div>
          <div class="row-2">
            <div class="field"><label>Tanggal mulai</label><input class="input" id="bMulai" type="date" value="${ui.hariIni()}"></div>
            <div class="field"><label>Tanggal selesai</label><input class="input" id="bSelesai" type="date"></div>
          </div>
          ${kartuRincian(rincian, harga)}
          <div class="modal-foot mt-2">
            <button class="btn btn-ghost" data-batal>Batal</button>
            <button class="btn btn-primary" data-simpan>Pesan slot</button>
          </div>`,
        onMount(body, tutup) {
          body.querySelector('[data-batal]').addEventListener('click', tutup);
          body.querySelector('[data-simpan]').addEventListener('click', () => {
            const motor_id = Number(body.querySelector('#bMotor').value);
            const mulai = body.querySelector('#bMulai').value;
            const selesai = body.querySelector('#bSelesai').value;
            if (!mulai || !selesai) return ui.toast('Tanggal mulai & selesai wajib diisi.', 'err');
            if (new Date(selesai) <= new Date(mulai)) return ui.toast('Tanggal selesai harus setelah mulai.', 'err');
            const bk = store.insert('booking', {
              motor_id, user_id: user.id, tanggal_mulai: mulai, tanggal_selesai: selesai,
              status: 'pending', harga, created_at: ui.hariIni(),
            });
            store.insert('pembayaran', { booking_id: bk.id, jumlah: harga, status: 'belum', bukti: null, tanggal: null });
            store.insert('notifikasi', { user_id: user.id, pesan: 'Booking dibuat & menunggu konfirmasi admin.', tanggal: ui.hariIni(), dibaca: false });
            tutup(); ui.toast('Booking dibuat — menunggu konfirmasi admin.'); gambar();
          });
        },
      });
    }
  }

  // ---------------------------------------------------------------- PEMBAYARAN
  function halBayar() {
    content.innerHTML = `
      <div class="page-head"><div class="eyebrow">Pembayaran</div><h1>Tagihan & Pembayaran</h1>
        <p>Lihat rincian biaya, unggah bukti transfer, lalu admin memverifikasi.</p></div>
      <div class="table-wrap"><table class="tbl"><thead><tr>
        <th>Motor</th><th>Periode</th><th>Jumlah</th><th>Status</th><th></th>
      </tr></thead><tbody id="tb"></tbody></table></div>`;
    gambar();

    function gambar() {
      const tb = content.querySelector('#tb');
      const rows = bookingSaya().map(b => ({ b, m: store.get('motor', b.motor_id), p: store.find('pembayaran', x => x.booking_id === b.id)[0] }))
        .filter(x => x.p);
      if (!rows.length) { tb.innerHTML = `<tr><td colspan="5">${ui.empty('💳', 'Belum ada tagihan', 'Tagihan muncul setelah kamu membuat booking.')}</td></tr>`; return; }
      tb.innerHTML = rows.map(({ b, m, p }) => {
        const menunggu = p.status === 'belum' && p.bukti;
        const statusHTML = menunggu ? '<span class="badge b-kuning">Verifikasi</span>' : ui.badgeStatus(p.status);
        return `<tr>
          <td><div class="cell-strong">${m ? m.tipe : '-'}</div><div class="plat kecil muted">${m ? m.plat : ''}</div></td>
          <td class="kecil">${ui.tanggal(b.tanggal_mulai)} – ${ui.tanggal(b.tanggal_selesai)}</td>
          <td class="cell-strong">${ui.rupiah(p.jumlah)}</td>
          <td>${statusHTML}</td>
          <td style="text-align:right;white-space:nowrap">
            <button class="btn btn-ghost btn-sm" data-rincian="${p.jumlah}">Rincian</button>
            ${p.status === 'belum'
              ? `<button class="btn ${p.bukti ? 'btn-ghost' : 'btn-primary'} btn-sm" data-bukti="${p.id}">${p.bukti ? 'Ganti bukti' : 'Bayar'}</button>` : '✓'}
          </td>
        </tr>`;
      }).join('');
      tb.querySelectorAll('[data-rincian]').forEach(el => el.addEventListener('click', () => {
        ui.modal({ judul: 'Rincian Biaya', lebar: 440, isiHTML: kartuRincian(ui.hitungRincian(cfg), Number(el.dataset.rincian)) +
          `<p class="kecil muted mt-2">Belum ada pilihan paket — harga ini sudah termasuk semua layanan di atas.</p>` });
      }));
      tb.querySelectorAll('[data-bukti]').forEach(el => el.addEventListener('click', () => uploadBukti(Number(el.dataset.bukti))));
    }

    function uploadBukti(idBayar) {
      const bayar = store.get('pembayaran', idBayar);
      ui.modal({
        judul: 'Bayar & Upload Bukti', lebar: 460,
        isiHTML: `
          ${kartuRincian(ui.hitungRincian(cfg), bayar.jumlah)}
          <div class="card tight mb-2 mt-2" style="background:var(--bg)">
            <div class="kecil muted">Transfer ke rekening GARASIN:</div>
            <div class="cell-strong">${ui.rekening(cfg)}</div>
          </div>
          <label class="filepick" id="pick">
            <div class="big">📤</div>
            <div id="pickLbl">Klik untuk pilih foto bukti transfer</div>
            <input type="file" accept="image/*" id="file">
          </label>
          <div id="prev" class="mt-2"></div>
          <div class="modal-foot mt-2">
            <button class="btn btn-ghost" data-batal>Batal</button>
            <button class="btn btn-primary" data-kirim disabled>Kirim bukti</button>
          </div>`,
        onMount(body, tutup) {
          let dataURL = null;
          const file = body.querySelector('#file');
          body.querySelector('#pick').addEventListener('click', () => file.click());
          file.addEventListener('change', async () => {
            if (!file.files[0]) return;
            dataURL = await ui.fileToDataURL(file.files[0]);
            body.querySelector('#pickLbl').textContent = file.files[0].name;
            body.querySelector('#prev').innerHTML = `<img src="${dataURL}" style="border-radius:10px;max-height:180px;margin:auto">`;
            body.querySelector('[data-kirim]').disabled = false;
          });
          body.querySelector('[data-batal]').addEventListener('click', tutup);
          body.querySelector('[data-kirim]').addEventListener('click', () => {
            store.update('pembayaran', idBayar, { bukti: dataURL, tanggal: ui.hariIni() });
            tutup(); ui.toast('Bukti terkirim. Menunggu verifikasi admin.', 'info'); gambar();
          });
        },
      });
    }
  }

  // ---------------------------------------------------------------- NOTIFIKASI
  function halNotif() {
    content.innerHTML = `
      <div class="page-head"><div class="eyebrow">Notifikasi</div><h1>Notifikasi</h1>
        <p>Kabar terbaru tentang motor & bookingmu.</p></div>
      <div class="card" id="box"></div>`;
    const list = notifSaya();
    content.querySelector('#box').innerHTML = list.length ? list.map(notifHTML).join('')
      : ui.empty('🔔', 'Belum ada notifikasi', '');
    list.forEach(n => { if (!n.dibaca) store.update('notifikasi', n.id, { dibaca: true }); });
  }

  // ---------------------------------------------------------------- BANTUAN
  function halBantuan() {
    const waUmum = ui.waLink(cfg.wa_admin, `Halo admin GARASIN, saya ${user.nama}. Saya mau bertanya tentang layanan.`);
    content.innerHTML = `
      <div class="page-head"><div class="eyebrow">Bantuan</div><h1>Hubungi Admin</h1>
        <p>Ada kendala atau pertanyaan? Tim GARASIN siap bantu.</p></div>

      <div class="grid grid-2 mb-3">
        <div class="card center gap-3" style="align-items:center">
          <div class="nf-ico" style="width:56px;height:56px;font-size:1.6rem">💬</div>
          <div class="grow">
            <h3>Chat admin via WhatsApp</h3>
            <p class="muted kecil">Respon cepat di jam operasional (08.00–20.00 WIB).</p>
            <a class="btn btn-hijau mt-1" href="${waUmum}" target="_blank" rel="noopener">Buka WhatsApp</a>
          </div>
        </div>
        <div class="card">
          <h3>Cara kerja singkat</h3>
          <ol class="langkah mt-1">
            <li>Tambah motor & buat booking</li>
            <li>Transfer ke ${cfg.rekening_bank} lalu upload bukti</li>
            <li>Admin konfirmasi — motor mulai dijaga & dirawat</li>
            <li>Terima update foto/video kondisi via WhatsApp</li>
          </ol>
        </div>
      </div>

      <div class="card">
        <h3 class="mb-2">Pertanyaan umum</h3>
        ${faq('Apakah motor saya aman?', 'Area penyimpanan terpantau CCTV 24 jam dan dijaga. Demi keamanan, akses CCTV tidak dibagikan langsung — sebagai gantinya kamu menerima foto/video kondisi motor lewat WhatsApp.')}
        ${faq('Bagaimana saya tahu kondisi motor?', 'Admin mencatat perawatan harian (aki, ban, mesin). Ringkasan & riwayatnya bisa kamu lihat di menu "Motor saya", dan update foto/video dikirim via WhatsApp.')}
        ${faq('Bagaimana cara membayar?', `Transfer ke ${ui.rekening(cfg)}, lalu upload bukti di menu Pembayaran. Admin akan memverifikasi.`)}
        ${faq('Apakah ada pilihan paket?', 'Saat ini satu harga sudah termasuk semua layanan (penyimpanan, keamanan, perawatan, & laporan). Rincian biaya bisa dilihat di menu Pembayaran.')}
      </div>`;
  }
  function faq(q, a) {
    return `<details class="faq"><summary>${q}</summary><p>${a}</p></details>`;
  }

  // ---- Helper ----
  function stat(ico, val, lbl, sub) {
    return `<div class="stat"><div class="stat-ico">${ico}</div>
      <div class="stat-val">${val}</div><div class="stat-lbl">${lbl}</div>
      ${sub ? `<div class="stat-sub">${sub}</div>` : ''}</div>`;
  }
  function notifHTML(n) {
    return `<div class="notif ${n.dibaca ? '' : 'baru'}">
      <div class="nf-ico">🔔</div>
      <div class="grow"><div>${n.pesan}</div><div class="nf-time">${ui.tanggal(n.tanggal)}</div></div>
    </div>`;
  }
  // Kartu rincian harga (dipakai di booking & pembayaran)
  function kartuRincian(rincian, total) {
    return `<div class="rincian-box">
      ${rincian.map(r => `<div class="rincian-row"><span>${r.label}</span><b>${ui.rupiah(r.nilai)}</b></div>`).join('')}
      <div class="rincian-row total"><span>Total per periode</span><b>${ui.rupiah(total)}</b></div>
    </div>`;
  }
};
