/* ==========================================================================
   GARASIN — store.js (API Client)
   Menggantikan implementasi localStorage. Interface G.store.* dipertahankan
   agar halaman (pelanggan.js, admin.js, owner.js) tidak perlu banyak berubah.
   Semua method sekarang async (return Promise).
   ========================================================================== */

window.G = window.G || {};

(function () {
  const BASE = '/api';
  const TOKEN_KEY = 'garasin_token';
  const USER_KEY  = 'garasin_user';

  // ========================= TOKEN / SESSION =========================
  function getToken()       { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t)      { localStorage.setItem(TOKEN_KEY, t); }
  function clearToken()     { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }
  function getCachedUser()  { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } }
  function setCachedUser(u) { localStorage.setItem(USER_KEY, JSON.stringify(u)); }

  // ========================= HTTP HELPER =========================
  async function req(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const res = await fetch(BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();

    // Token kedaluwarsa → paksa logout
    if (res.status === 401) {
      clearToken();
      location.hash = '#/login';
      throw Object.assign(new Error(data.error || 'Sesi habis. Silakan login ulang.'), { status: 401 });
    }

    if (!res.ok) {
      throw Object.assign(new Error(data.error || 'Request gagal'), { status: res.status });
    }

    return data.data;
  }

  const get_  = (path)        => req('GET',    path);
  const post_ = (path, body)  => req('POST',   path, body);
  const put_  = (path, body)  => req('PUT',    path, body);
  const del_  = (path)        => req('DELETE', path);

  // req_ di-expose agar auth.js bisa memanggil /auth/login & /auth/register
  // tanpa token (belum login)
  async function req_(method, path, body) {
    const res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data.error || 'Request gagal'), { status: res.status });
    return data.data;
  }

  // ========================= STORE API =========================
  // Catatan: interface sengaja mirip store lama agar halaman mudah dimigrasi.
  // Perbedaan utama: semua method sekarang async.

  const store = {
    // ----- Token / session -----
    setSession:    (token, user) => { setToken(token); if (user) setCachedUser(user); },
    clearSession:  clearToken,
    sessionToken:  getToken,
    cachedUser:    getCachedUser,

    // ----- CRUD generik (dipetakan ke endpoint REST) -----
    all:    (table)           => get_(`/${table}`),
    get:    (table, id)       => get_(`/${table}/${id}`),
    insert: (table, data)     => post_(`/${table}`, data),
    update: (table, id, patch)=> put_(`/${table}/${id}`, patch),
    remove: (table, id)       => del_(`/${table}/${id}`),

    // find tidak bisa langsung jadi API call karena predicatenya JS function.
    // Solusi: ambil semua lalu filter di client. Untuk dataset kecil ini OK.
    find: async (table, pred) => {
      const rows = await get_(`/${table}`);
      return Array.isArray(rows) ? rows.filter(pred) : [];
    },

    // ----- Config -----
    config:       ()      => get_('/config'),
    updateConfig: (patch) => put_('/config', patch),

    // ----- Shorthand khusus -----
    tandaiNotifDibaca: () => put_('/notifikasi', {}),

    // ----- Raw request (tanpa token, untuk auth endpoints) -----
    req_,

    // ----- Lifecycle -----
    init:  () => Promise.resolve(), // database sudah di cloud
    reset: () => Promise.resolve(), // disabled di production
  };

  G.store = store;
})();
