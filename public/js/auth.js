/* ==========================================================================
   GARASIN — auth.js
   Autentikasi berbasis JWT. Token disimpan di localStorage (bukan data user).
   login() & daftar() memanggil backend API dan menyimpan JWT yang dikembalikan.
   userAktif() membaca data user dari cache localStorage (di-set saat login).
   ========================================================================== */

window.G = window.G || {};

(function () {
  // User yang sedang login — baca dari cache (set saat login/daftar)
  function userAktif() {
    return G.store.cachedUser();
  }

  // Coba login → { ok, pesan } | { ok, user }
  async function login(email, password) {
    try {
      const data = await G.store.req_('POST', '/auth?action=login', { email, password });
      G.store.setSession(data.token, data.user);
      return { ok: true, user: data.user };
    } catch (err) {
      return { ok: false, pesan: err.message };
    }
  }

  // Daftar pelanggan baru → { ok, pesan } | { ok, user }
  async function daftar({ nama, email, no_hp, asal, password }) {
    try {
      const data = await G.store.req_('POST', '/auth?action=register', { nama, email, no_hp, asal, password });
      G.store.setSession(data.token, data.user);
      return { ok: true, user: data.user };
    } catch (err) {
      return { ok: false, pesan: err.message };
    }
  }

  function logout() { G.store.clearSession(); location.hash = '#/login'; }

  function berandaPeran(role) {
    return { owner: '#/owner', admin: '#/admin', pelanggan: '#/pelanggan' }[role] || '#/login';
  }

  G.auth = { userAktif, login, daftar, logout, berandaPeran };
})();
