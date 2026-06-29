/* ==========================================================================
   GARASIN — router.js
   Router berbasis hash (#/...) ala SPA. Menggambar kerangka (sidebar + topbar)
   sesuai peran, menjaga akses (guard), lalu memanggil halaman yang sesuai.
   ========================================================================== */

window.G = window.G || {};

(function () {
  const root = () => document.getElementById('app');

  // Menu navigasi per peran
  const NAV = {
    pelanggan: [
      { path: '#/pelanggan',         ico: '🏠', label: 'Beranda' },
      { path: '#/pelanggan/motor',   ico: '🛵', label: 'Motor saya' },
      { path: '#/pelanggan/booking', ico: '📅', label: 'Booking' },
      { path: '#/pelanggan/bayar',   ico: '💳', label: 'Pembayaran' },
      { path: '#/pelanggan/notif',   ico: '🔔', label: 'Notifikasi' },
      { path: '#/pelanggan/bantuan', ico: '💬', label: 'Hubungi admin' },
    ],
    admin: [
      { path: '#/admin',           ico: '🏠', label: 'Dashboard' },
      { path: '#/admin/booking',   ico: '📥', label: 'Booking masuk' },
      { path: '#/admin/motor',     ico: '🛵', label: 'Motor tersimpan' },
      { path: '#/admin/perawatan', ico: '🔧', label: 'Perawatan' },
      { path: '#/admin/pelanggan', ico: '👥', label: 'Data pelanggan' },
      { path: '#/admin/bayar',     ico: '💳', label: 'Pembayaran' },
    ],
    owner: [
      { path: '#/owner',           ico: '📊', label: 'Dashboard KPI' },
      { path: '#/owner/pengaturan', ico: '⚙️', label: 'Pengaturan' },
    ],
  };

  // Judul + sub-judul topbar per rute
  const META = {
    '#/pelanggan':          ['Beranda', 'Ringkasan motor & kondisi terbaru'],
    '#/pelanggan/motor':    ['Motor Saya', 'Kelola data motormu'],
    '#/pelanggan/booking':  ['Booking', 'Pesan & kelola penyimpanan'],
    '#/pelanggan/bayar':    ['Pembayaran', 'Tagihan, rincian & bukti transfer'],
    '#/pelanggan/notif':    ['Notifikasi', 'Kabar terbaru untukmu'],
    '#/pelanggan/bantuan':  ['Hubungi Admin', 'Butuh bantuan? Chat admin di sini'],
    '#/admin':              ['Dashboard Operasional', 'Pantau & kelola garasi'],
    '#/admin/booking':      ['Konfirmasi Booking', 'Terima/tolak permintaan'],
    '#/admin/motor':        ['Motor Tersimpan', 'Daftar motor aktif & perawatan'],
    '#/admin/perawatan':    ['Perawatan Harian', 'Catat kondisi motor'],
    '#/admin/pelanggan':    ['Data Pelanggan', 'Daftar pelanggan terdaftar'],
    '#/admin/bayar':        ['Verifikasi Pembayaran', 'Cek bukti transfer'],
    '#/owner':              ['Dashboard KPI', 'Ukuran keberhasilan bisnis'],
    '#/owner/pengaturan':   ['Pengaturan', 'Harga, kapasitas, rekening & kontak'],
  };

  function navigasi() {
    const user = G.auth.userAktif();
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    const role = parts[0] || '';
    const sub = parts[1] || '';

    if (role === 'login' || role === '') {
      if (user) { location.hash = G.auth.berandaPeran(user.role); return; }
      G.pages.login(root());
      return;
    }
    if (!user) { location.hash = '#/login'; return; }
    if (role !== user.role) { location.hash = G.auth.berandaPeran(user.role); return; }

    const activePath = '#/' + role + (sub ? '/' + sub : '');
    gambarKerangka(user, activePath);
    const content = document.getElementById('content');
    G.pages[role](content, sub);
  }

  function gambarKerangka(user, activePath) {
    const esc = G.ui.escapeHTML;
    const [judul, subjudul] = META[activePath] || ['GARASIN', ''];
    const menu = NAV[user.role].map(it => `
      <a class="nav-item ${it.path === activePath ? 'active' : ''}" href="${it.path}">
        <span class="ico">${it.ico}</span>${it.label}</a>`).join('');

    root().innerHTML = `
      <div class="app">
        <aside class="sidebar" id="sidebar">
          <div class="brand">
            <img src="public/img/logo-mark.png" alt="" class="mark">
            <div><img src="public/img/logo-word.png" alt="GARASIN" class="word">
              <div class="brand-sub">${esc(user.role)}</div></div>
          </div>
          <div class="nav-label">Menu</div>
          ${menu}
          <div class="sidebar-foot">
            <a class="nav-item" id="resetDemo"><span class="ico">↺</span>Reset data</a>
            <a class="nav-item" id="logout"><span class="ico">⏻</span>Keluar</a>
          </div>
        </aside>

        <div class="main">
          <header class="topbar">
            <div class="center gap-2">
              <button class="burger" id="burger" aria-label="Menu">☰</button>
              <div class="topbar-title"><h2>${esc(judul)}</h2><p>${esc(subjudul)}</p></div>
            </div>
            <div class="topbar-user">
              <div class="user-meta"><div class="nm">${esc(user.nama)}</div><div class="rl">${esc(user.role)}</div></div>
              <div class="avatar">${G.ui.inisial(user.nama)}</div>
            </div>
          </header>
          <main class="content" id="content"></main>
        </div>
      </div>`;

    document.getElementById('logout').addEventListener('click', () => G.auth.logout());
    document.getElementById('resetDemo').addEventListener('click', async () => {
      if (await G.ui.konfirmasi({ judul: 'Reset data', pesan: 'Kosongkan semua data & kembali ke kondisi awal? Akun owner & admin tetap ada.', tombol: 'Ya, reset', bahaya: true })) {
        G.store.reset(); G.ui.toast('Data dikembalikan ke kondisi awal.'); location.hash = '#/login';
      }
    });

    const sb = document.getElementById('sidebar');
    document.getElementById('burger').addEventListener('click', () => {
      sb.classList.add('open');
      const scrim = document.createElement('div');
      scrim.className = 'scrim';
      scrim.addEventListener('click', () => { sb.classList.remove('open'); scrim.remove(); });
      document.querySelector('.app').appendChild(scrim);
    });
    sb.querySelectorAll('.nav-item').forEach(a => a.addEventListener('click', () => {
      sb.classList.remove('open'); const s = document.querySelector('.scrim'); if (s) s.remove();
    }));
  }

  G.router = { navigasi };
  window.addEventListener('hashchange', navigasi);
})();
