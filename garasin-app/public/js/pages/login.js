/* ==========================================================================
   GARASIN — pages/login.js
   Halaman masuk & daftar. Tampilan bersih: tanpa kotak akun demo.
   Akun owner/admin dikelola terpisah; pelanggan mendaftar sendiri.
   ========================================================================== */

window.G = window.G || {};
G.pages = G.pages || {};

G.pages.login = function (root) {
  const ui = G.ui, auth = G.auth;
  let mode = 'login'; // 'login' | 'daftar'

  function render() {
    root.innerHTML = `
      <div class="auth-wrap">
        <!-- Panel branding -->
        <div class="auth-hero">
          <div class="center gap-2">
            <img src="public/img/logo-mark.png" alt="GARASIN" style="height:46px">
            <img src="public/img/logo-word.png" alt="GARASIN" style="height:26px">
          </div>
          <div class="auth-hero-mid">
            <div class="eyebrow" style="color:#fff;opacity:.7">Garasi digital motor perantau</div>
            <div class="tag">Pulang tenang,<br>motor aman & sehat.<br><span class="beres">Garasin, beres!</span></div>
            <p>Bukan sekadar dititip — area terpantau CCTV 24 jam, dirawat rutin, dan kondisinya kamu terima lewat foto/video via WhatsApp.</p>
            <div class="auth-values">
              <span class="value-chip">🛡️ Aman</span>
              <span class="value-chip">🔍 Transparan</span>
              <span class="value-chip">🔧 Terawat</span>
              <span class="value-chip">🤝 Terpercaya</span>
              <span class="value-chip">🎥 CCTV 24 jam</span>
            </div>
          </div>
          <div class="kecil" style="color:#6B7280">© 2026 GARASIN · for perantau, by perantau</div>
          <img src="public/img/logo-mark.png" alt="" class="auth-shield">
        </div>

        <!-- Panel form -->
        <div class="auth-form-side">
          <div class="auth-card" id="authCard"></div>
        </div>
      </div>`;
    renderCard();
  }

  function renderCard() {
    const card = root.querySelector('#authCard');
    card.innerHTML = mode === 'login' ? formLogin() : formDaftar();
    if (mode === 'login') wireLogin(card); else wireDaftar(card);
  }

  function formLogin() {
    return `
      <div class="auth-mark"><img src="public/img/logo-mark.png" alt="" style="height:54px"></div>
      <h2>Masuk</h2>
      <p class="sub">Kelola penyimpanan motormu di GARASIN.</p>
      <div class="field">
        <label>Email</label>
        <input class="input" id="lEmail" type="email" placeholder="nama@email.com" autocomplete="username">
      </div>
      <div class="field">
        <label>Kata sandi</label>
        <input class="input" id="lPass" type="password" placeholder="••••••••" autocomplete="current-password">
      </div>
      <button class="btn btn-primary btn-block" id="btnLogin">Masuk</button>
      <div class="auth-toggle">Belum punya akun? <b id="toDaftar">Daftar di sini</b></div>`;
  }

  function formDaftar() {
    return `
      <div class="auth-mark"><img src="public/img/logo-mark.png" alt="" style="height:54px"></div>
      <h2>Daftar</h2>
      <p class="sub">Buat akun pelanggan baru.</p>
      <div class="field"><label>Nama lengkap</label><input class="input" id="dNama" placeholder="Nama kamu"></div>
      <div class="row-2">
        <div class="field"><label>Email</label><input class="input" id="dEmail" type="email" placeholder="nama@email.com"></div>
        <div class="field"><label>No. WhatsApp</label><input class="input" id="dHp" placeholder="0812-xxxx-xxxx"></div>
      </div>
      <div class="row-2">
        <div class="field"><label>Asal daerah</label><input class="input" id="dAsal" placeholder="mis. Lamongan"></div>
        <div class="field"><label>Kata sandi</label><input class="input" id="dPass" type="password" placeholder="Min. 6 karakter"></div>
      </div>
      <button class="btn btn-primary btn-block" id="btnDaftar">Buat akun</button>
      <div class="auth-toggle">Sudah punya akun? <b id="toLogin">Masuk di sini</b></div>`;
  }

  function wireLogin(card) {
    const masuk = () => {
      const email = card.querySelector('#lEmail').value;
      const pass = card.querySelector('#lPass').value;
      if (!email || !pass) return ui.toast('Email & sandi wajib diisi.', 'err');
      const r = auth.login(email, pass);
      if (!r.ok) return ui.toast(r.pesan, 'err');
      ui.toast('Berhasil masuk. Selamat datang, ' + r.user.nama.split(' ')[0] + '!');
      location.hash = auth.berandaPeran(r.user.role);
    };
    card.querySelector('#btnLogin').addEventListener('click', masuk);
    card.querySelector('#lPass').addEventListener('keydown', e => { if (e.key === 'Enter') masuk(); });
    card.querySelector('#toDaftar').addEventListener('click', () => { mode = 'daftar'; renderCard(); });
  }

  function wireDaftar(card) {
    card.querySelector('#btnDaftar').addEventListener('click', () => {
      const data = {
        nama: card.querySelector('#dNama').value.trim(),
        email: card.querySelector('#dEmail').value.trim(),
        no_hp: card.querySelector('#dHp').value.trim(),
        asal: card.querySelector('#dAsal').value.trim(),
        password: card.querySelector('#dPass').value,
      };
      if (!data.nama || !data.email || !data.password) return ui.toast('Nama, email & sandi wajib diisi.', 'err');
      if (data.password.length < 6) return ui.toast('Sandi minimal 6 karakter.', 'err');
      const r = auth.daftar(data);
      if (!r.ok) return ui.toast(r.pesan, 'err');
      ui.toast('Akun dibuat. Selamat datang di GARASIN!');
      location.hash = '#/pelanggan';
    });
    card.querySelector('#toLogin').addEventListener('click', () => { mode = 'login'; renderCard(); });
  }

  render();
};
