/* ==========================================================================
   GARASIN — pages/pelanggan.js  (async/await, API backend)
   Area pelanggan. Sub: beranda, motor, booking, bayar, notif, bantuan.
   ========================================================================== */

window.G = window.G || {};
G.pages = G.pages || {};

G.pages.pelanggan = function (content, sub) {
  const ui = G.ui, store = G.store, kom = G.komponen;
  const user = G.auth.userAktif();

  // Helper fungsi data — semua async
  const motorSaya = () => store.all('motor'); // API sudah filter by user
  const bookingSaya = () => store.all('booking');
  const notifSaya = () => store.all('notifikasi');

  // Tautan WA minta update untuk satu motor — config diambil dari cache terpisah
  const waUpdate = (m, cfg) => ui.waLink(cfg.wa_admin,
    `Halo admin GARASIN, saya ${ui.escapeHTML(user.nama)} (plat ${m.plat}). Boleh minta update foto/video kondisi motor saya?`);

  const views = { '': beranda, motor: halMotor, booking: halBooking, bayar: halBayar, notif: halNotif, bantuan: halBantuan };
  (views[sub] || beranda)();

  // Error handler umum
  function handleErr(err) {
    ui.toast(err.message || 'Terjadi kesalahan.', 'err');
  }

  // ---------------------------------------------------------------- BERANDA
  async function beranda() {
    ui.loading(content, 'Memuat beranda...');
    try {
      const [bookings, notifs, cfg] = await Promise.all([bookingSaya(), notifSaya(), store.config()]);
      const aktif = bookings.filter(b => b.status === 'aktif');
      const tagihanBelum = bookings.filter(b => b.booking_status !== 'lunas' && b.status !== 'selesai' && b.status !== 'dibatalkan').length;
      const notifBaru = notifs.filter(n => !n.dibaca).length;
      let sisa = '–';
      if (aktif.length) sisa = Math.max(0, Math.min(...aktif.map(b => ui.sisaHari(b.tanggal_selesai)))) + ' hari';

      content.innerHTML = `
        <div class="page-head">
          <div class="eyebrow">Beranda</div>
          <h1>Halo, ${ui.escapeHTML(user.nama.split(' ')[0])} 👋</h1>
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

      // Motor aktif — ambil perawatan terbaru per motor
      const gr = content.querySelector('#grMotor');
      if (!aktif.length) {
        gr.innerHTML = ui.empty('🛵', 'Belum ada motor yang disimpan',
          'Buat booking untuk mulai menyimpan motormu di GARASIN.') +
          `<div style="margin-top:-8px"><a class="btn btn-primary btn-sm" href="#/pelanggan/booking">+ Buat booking</a></div>`;
      } else {
        // Ambil perawatan untuk semua motor aktif sekaligus
        const motorIds = aktif.map(b => b.motor_id);
        const perawatanAll = await store.find('perawatan', p => motorIds.includes(p.motor_id));
        gr.innerHTML = aktif.map(b => {
          const p = perawatanAll.filter(x => x.motor_id === b.motor_id)
            .sort((a, z) => new Date(z.tanggal) - new Date(a.tanggal))[0] || null;
          return kartuMotorAktif(b, p, cfg);
        }).join('');
        wireKartu(gr);
      }

      const grN = content.querySelector('#grNotif');
      grN.innerHTML = notifs.slice(0, 3).length
        ? notifs.slice(0, 3).map(notifHTML).join('')
        : ui.empty('🔔', 'Belum ada notifikasi', 'Kabar tentang motormu akan tampil di sini.');

    } catch (err) { handleErr(err); }
  }

  function kartuMotorAktif(b, p, cfg) {
    return `<div class="card">
      <div class="between mb-2">
        <div><span class="plat" style="font-size:1.05rem">${ui.escapeHTML(b.plat)}</span>
          <div class="muted kecil">${ui.escapeHTML(b.tipe)} · ${ui.escapeHTML(b.warna || '')}</div></div>
        ${p ? kom.badgeKesehatanDariP(p) : '<span class="badge b-abu">Belum dicek</span>'}
      </div>
      ${kom.fotoKondisi(p || { tanggal: ui.hariIni(), foto: null })}
      <div class="cctv-note mt-2">🎥 Area terpantau CCTV 24 jam · update foto/video dikirim via WhatsApp</div>
      <div class="mt-2">${p ? kom.ringkasanKondisi(p) : '<span class="muted kecil">Belum ada laporan perawatan.</span>'}</div>
      <div class="between mt-2 wrap gap-1">
        <span class="kecil muted">Selesai ${ui.tanggal(b.tanggal_selesai)} · sisa ${Math.max(0, ui.sisaHari(b.tanggal_selesai))} hari</span>
        <div class="flex gap-1">
          <a class="btn btn-hijau btn-sm" href="${waUpdate(b, cfg)}" target="_blank" rel="noopener">Minta update WA</a>
          <button class="btn btn-ghost btn-sm" data-riwayat="${b.motor_id}">Riwayat</button>
        </div>
      </div>
    </div>`;
  }

  function wireKartu(scope) {
    scope.querySelectorAll('[data-riwayat]').forEach(el =>
      el.addEventListener('click', () => kom.bukaRiwayatKondisi({ id: Number(el.dataset.riwayat), tipe: '', plat: '', warna: '', cc: '' })));
  }

  // ---------------------------------------------------------------- MOTOR
  async function halMotor() {
    content.innerHTML = `
      <div class="page-head between">
        <div><div class="eyebrow">Motor saya</div><h1>Daftar Motor</h1>
          <p>Kelola data motor yang kamu titipkan.</p></div>
        <button class="btn btn-primary" id="btnTambah">+ Tambah motor</button>
      </div>
      <div class="grid grid-3" id="grid"></div>`;
    content.querySelector('#btnTambah').addEventListener('click', formMotor);
    await gambarGrid();

    async function gambarGrid() {
      const grid = content.querySelector('#grid');
      ui.loading(grid, 'Memuat motor...');
      try {
        const [list, bookings, perawatanAll] = await Promise.all([
          motorSaya(),
          bookingSaya(),
          store.find('perawatan', () => true),
        ]);
        const cfg = await store.config();
        if (!list.length) { grid.innerHTML = ui.empty('🛵', 'Belum ada motor', 'Tambahkan motor pertamamu lalu buat booking.'); return; }
        grid.innerHTML = list.map(m => {
          const bk = bookings.find(b => b.motor_id === m.id && b.status === 'aktif');
          const perawatan = perawatanAll.filter(p => p.motor_id === m.id)
            .sort((a, z) => new Date(z.tanggal) - new Date(a.tanggal));
          const p = perawatan[0] || null;
          return `<div class="card tight">
            <div class="between mb-2">
              <span class="plat" style="font-size:1.05rem">${ui.escapeHTML(m.plat)}</span>
              ${bk ? ui.badgeStatus('aktif') : '<span class="badge b-abu">Tidak disimpan</span>'}
            </div>
            <div style="font-weight:700">${ui.escapeHTML(m.tipe)}</div>
            <div class="muted kecil mb-2">${ui.escapeHTML(m.warna || '')} · ${m.cc || 0} cc</div>
            ${p ? kom.ringkasanKondisi(p) : '<span class="muted kecil">Belum ada perawatan.</span>'}
            <div class="flex gap-1 mt-2">
              <button class="btn btn-ghost btn-sm grow" data-riwayat="${m.id}">Riwayat kondisi</button>
              ${bk ? `<a class="btn btn-hijau btn-sm" href="${waUpdate(m, cfg)}" target="_blank" rel="noopener">WA</a>` : ''}
            </div>
          </div>`;
        }).join('');
        wireKartu(grid);
      } catch (err) { handleErr(err); }
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
          body.querySelector('[data-simpan]').addEventListener('click', async () => {
            const plat = body.querySelector('#fPlat').value.trim();
            const tipe = body.querySelector('#fTipe').value.trim();
            if (!plat || !tipe) return ui.toast('Plat & tipe wajib diisi.', 'err');
            try {
              await store.insert('motor', {
                plat: plat.toUpperCase(), tipe,
                cc: Number(body.querySelector('#fCc').value) || 0,
                warna: body.querySelector('#fWarna').value.trim() || '-',
              });
              tutup(); ui.toast('Motor ditambahkan.'); gambarGrid();
            } catch (err) { ui.toast(err.message, 'err'); }
          });
        },
      });
    }
  }

  // ---------------------------------------------------------------- BOOKING
  async function halBooking() {
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
    await gambar();

    async function gambar() {
      const tb = content.querySelector('#tb');
      ui.loading(tb, '');
      try {
        const list = await bookingSaya();
        if (!list.length) { tb.innerHTML = `<tr><td colspan="5">${ui.empty('📅', 'Belum ada booking', 'Buat booking pertamamu.')}</td></tr>`; return; }
        tb.innerHTML = list.map(b => `<tr>
          <td><div class="cell-strong">${ui.escapeHTML(b.tipe || '-')}</div><div class="plat kecil muted">${ui.escapeHTML(b.plat || '')}</div></td>
          <td>${ui.tanggal(b.tanggal_mulai)} – ${ui.tanggal(b.tanggal_selesai)}</td>
          <td>${ui.badgeStatus(b.status)}</td>
          <td class="cell-strong">${ui.rupiah(b.harga)}</td>
          <td style="text-align:right">${b.status === 'pending'
            ? `<button class="btn btn-ghost btn-sm" data-batal="${b.id}">Batalkan</button>` : ''}</td>
        </tr>`).join('');
        tb.querySelectorAll('[data-batal]').forEach(el => el.addEventListener('click', async () => {
          if (await ui.konfirmasi({ pesan: 'Batalkan booking ini?', tombol: 'Ya, batalkan', bahaya: true })) {
            try {
              await store.update('booking', el.dataset.batal, { status: 'dibatalkan' });
              ui.toast('Booking dibatalkan.'); gambar();
            } catch (err) { ui.toast(err.message, 'err'); }
          }
        }));
      } catch (err) { handleErr(err); }
    }

    async function formBooking() {
      let list, cfg;
      try { [list, cfg] = await Promise.all([motorSaya(), store.config()]); }
      catch (err) { return ui.toast(err.message, 'err'); }

      if (!list.length) return ui.toast('Tambahkan motor dulu di menu "Motor saya".', 'err');
      const harga = cfg.harga_periode;
      const opsi = list.map(m => `<option value="${m.id}">${ui.escapeHTML(m.tipe)} — ${ui.escapeHTML(m.plat)}</option>`).join('');
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
          body.querySelector('[data-simpan]').addEventListener('click', async () => {
            const motor_id = Number(body.querySelector('#bMotor').value);
            const mulai = body.querySelector('#bMulai').value;
            const selesai = body.querySelector('#bSelesai').value;
            if (!mulai || !selesai) return ui.toast('Tanggal mulai & selesai wajib diisi.', 'err');
            if (new Date(selesai) <= new Date(mulai)) return ui.toast('Tanggal selesai harus setelah mulai.', 'err');
            try {
              await store.insert('booking', { motor_id, tanggal_mulai: mulai, tanggal_selesai: selesai });
              tutup(); ui.toast('Booking dibuat — menunggu konfirmasi admin.'); gambar();
            } catch (err) { ui.toast(err.message, 'err'); }
          });
        },
      });
    }
  }

  // ---------------------------------------------------------------- PEMBAYARAN
  async function halBayar() {
    content.innerHTML = `
      <div class="page-head"><div class="eyebrow">Pembayaran</div><h1>Tagihan & Pembayaran</h1>
        <p>Lihat rincian biaya, unggah bukti transfer, lalu admin memverifikasi.</p></div>
      <div class="table-wrap"><table class="tbl"><thead><tr>
        <th>Motor</th><th>Periode</th><th>Jumlah</th><th>Status</th><th></th>
      </tr></thead><tbody id="tb"></tbody></table></div>`;
    await gambar();

    async function gambar() {
      const tb = content.querySelector('#tb');
      ui.loading(tb, '');
      try {
        const [rows, cfg] = await Promise.all([store.all('pembayaran'), store.config()]);
        if (!rows.length) { tb.innerHTML = `<tr><td colspan="5">${ui.empty('💳', 'Belum ada tagihan', 'Tagihan muncul setelah kamu membuat booking.')}</td></tr>`; return; }
        tb.innerHTML = rows.map(p => {
          const menunggu = p.status === 'belum' && p.bukti;
          const statusHTML = menunggu ? '<span class="badge b-kuning">Verifikasi</span>' : ui.badgeStatus(p.status);
          return `<tr>
            <td><div class="cell-strong">${ui.escapeHTML(p.motor_tipe || '-')}</div><div class="plat kecil muted">${ui.escapeHTML(p.motor_plat || '')}</div></td>
            <td class="kecil">${ui.tanggal(p.tanggal_mulai)} – ${ui.tanggal(p.tanggal_selesai)}</td>
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
        tb.querySelectorAll('[data-bukti]').forEach(el => el.addEventListener('click', () => uploadBukti(Number(el.dataset.bukti), cfg, rows)));
      } catch (err) { handleErr(err); }
    }

    function uploadBukti(idBayar, cfg, rows) {
      const bayar = rows.find(p => p.id === idBayar);
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
          body.querySelector('[data-kirim]').addEventListener('click', async () => {
            try {
              await store.update('pembayaran', idBayar, { bukti: dataURL });
              tutup(); ui.toast('Bukti terkirim. Menunggu verifikasi admin.', 'info'); gambar();
            } catch (err) { ui.toast(err.message, 'err'); }
          });
        },
      });
    }
  }

  // ---------------------------------------------------------------- NOTIFIKASI
  async function halNotif() {
    content.innerHTML = `
      <div class="page-head"><div class="eyebrow">Notifikasi</div><h1>Notifikasi</h1>
        <p>Kabar terbaru tentang motor & bookingmu.</p></div>
      <div class="card" id="box"></div>`;
    ui.loading(content.querySelector('#box'), 'Memuat notifikasi...');
    try {
      const list = await notifSaya();
      content.querySelector('#box').innerHTML = list.length ? list.map(notifHTML).join('')
        : ui.empty('🔔', 'Belum ada notifikasi', '');
      // Tandai semua dibaca
      if (list.some(n => !n.dibaca)) store.tandaiNotifDibaca().catch(() => {});
    } catch (err) { handleErr(err); }
  }

  // ---------------------------------------------------------------- BANTUAN
  async function halBantuan() {
    let cfg;
    try { cfg = await store.config(); } catch { cfg = {}; }
    const waUmum = ui.waLink(cfg.wa_admin, `Halo admin GARASIN, saya ${ui.escapeHTML(user.nama)}. Saya mau bertanya tentang layanan.`);
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
            <li>Transfer ke ${ui.escapeHTML(cfg.rekening_bank || 'SeaBank')} lalu upload bukti</li>
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
    return `<details class="faq"><summary>${ui.escapeHTML(q)}</summary><p>${a}</p></details>`;
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
      <div class="grow"><div>${ui.escapeHTML(n.pesan)}</div><div class="nf-time">${ui.tanggal(n.tanggal)}</div></div>
    </div>`;
  }
  function kartuRincian(rincian, total) {
    return `<div class="rincian-box">
      ${rincian.map(r => `<div class="rincian-row"><span>${ui.escapeHTML(r.label)}</span><b>${ui.rupiah(r.nilai)}</b></div>`).join('')}
      <div class="rincian-row total"><span>Total per periode</span><b>${ui.rupiah(total)}</b></div>
    </div>`;
  }
};
