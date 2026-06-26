/* ==========================================================================
   GARASIN — auth.js
   Autentikasi sederhana berbasis data lokal: login, daftar, sesi, logout.
   CATATAN: sandi disimpan apa adanya — ini PROTOTIPE untuk demo/tugas,
   bukan untuk produksi. Di versi nyata, sandi wajib di-hash di server.
   ========================================================================== */

window.G = window.G || {};

(function () {
  // User yang sedang login (atau null)
  function userAktif() {
    const id = G.store.sessionUserId();
    return id ? G.store.get('users', id) : null;
  }

  // Coba login -> { ok, pesan }
  function login(email, password) {
    const u = G.store.find('users', x => x.email.toLowerCase() === String(email).toLowerCase().trim())[0];
    if (!u) return { ok: false, pesan: 'Email tidak terdaftar.' };
    if (u.password !== password) return { ok: false, pesan: 'Kata sandi salah.' };
    G.store.setSession(u.id);
    return { ok: true, user: u };
  }

  // Daftar pelanggan baru -> { ok, pesan }
  function daftar({ nama, email, no_hp, asal, password }) {
    email = String(email).toLowerCase().trim();
    if (G.store.find('users', x => x.email.toLowerCase() === email).length)
      return { ok: false, pesan: 'Email sudah dipakai.' };
    const u = G.store.insert('users', {
      nama: nama.trim(), email, no_hp: no_hp || '-', asal: asal || '-',
      password, role: 'pelanggan',
    });
    G.store.setSession(u.id);
    return { ok: true, user: u };
  }

  function logout() { G.store.clearSession(); location.hash = '#/login'; }

  // Halaman beranda sesuai peran
  function berandaPeran(role) {
    return { owner: '#/owner', admin: '#/admin', pelanggan: '#/pelanggan' }[role] || '#/login';
  }

  G.auth = { userAktif, login, daftar, logout, berandaPeran };
})();
