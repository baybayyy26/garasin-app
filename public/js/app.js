/* ==========================================================================
   GARASIN — app.js
   Titik mula aplikasi. Dijalankan paling akhir setelah semua modul dimuat.
   Tugas: siapkan data, tentukan rute awal, lalu jalankan router.
   ========================================================================== */

(function () {
  // 1) Siapkan data (akun owner & admin bila penyimpanan masih kosong)
  G.store.init();

  // 2) Tentukan rute awal bila belum ada hash di URL
  if (!location.hash) {
    const user = G.auth.userAktif();
    location.hash = user ? G.auth.berandaPeran(user.role) : '#/login';
  }

  // 3) Gambar halaman pertama
  G.router.navigasi();
})();
