/* ==========================================================================
   GARASIN — ui.js
   Kumpulan fungsi bantu UI yang dipakai di banyak halaman:
   format mata uang & tanggal, badge status, toast, modal, konfirmasi, baca file.
   ========================================================================== */

window.G = window.G || {};

(function () {
  // --- Format mata uang Rupiah ---
  function rupiah(n) {
    return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
  }
  function rupiahSingkat(n) {
    n = Number(n || 0);
    if (n >= 1000000) return 'Rp ' + (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + ' jt';
    if (n >= 1000) return 'Rp ' + Math.round(n / 1000) + ' rb';
    return rupiah(n);
  }

  // --- Format tanggal Indonesia (YYYY-MM-DD -> 26 Jun 2026) ---
  const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  function tanggal(str) {
    if (!str) return '-';
    const d = new Date(str);
    if (isNaN(d)) return str;
    return d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear();
  }
  function hariIni() { return new Date().toISOString().slice(0, 10); }

  // Sisa hari menuju sebuah tanggal (bisa negatif kalau lewat)
  function sisaHari(tglSelesai) {
    const a = new Date(hariIni()), b = new Date(tglSelesai);
    return Math.round((b - a) / 86400000);
  }

  // --- Badge status booking/pembayaran ---
  function badgeStatus(status) {
    const map = {
      aktif:   ['b-hijau', 'Aktif'],
      pending: ['b-kuning', 'Menunggu'],
      selesai: ['b-biru', 'Selesai'],
      ditolak: ['b-merah', 'Ditolak'],
      lunas:   ['b-hijau', 'Lunas'],
      belum:   ['b-merah', 'Belum bayar'],
    };
    const [cls, label] = map[status] || ['b-abu', status];
    return `<span class="badge ${cls}">${label}</span>`;
  }

  // --- Pill kondisi komponen motor (aki/ban/mesin) ---
  function kondisiPill(label, status) {
    const teks = { baik: 'Baik', perhatian: 'Perlu cek', buruk: 'Buruk' }[status] || status;
    return `<span class="kondisi-pill ${status}"><span class="dot"></span>${label}: ${teks}</span>`;
  }

  // --- Inisial untuk avatar ---
  function inisial(nama) {
    return (nama || '?').split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase();
  }

  // --- Baca file gambar -> Data URL (untuk fitur unggah foto/bukti) ---
  function fileToDataURL(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(new Error('Gagal membaca file'));
      r.readAsDataURL(file);
    });
  }

  // ====================== TOAST ======================
  function ensureToastArea() {
    let a = document.querySelector('.toast-area');
    if (!a) { a = document.createElement('div'); a.className = 'toast-area'; document.body.appendChild(a); }
    return a;
  }
  function toast(pesan, tipe = 'ok') {
    const area = ensureToastArea();
    const t = document.createElement('div');
    const ikon = { ok: '✓', err: '✕', info: 'ℹ' }[tipe] || '✓';
    t.className = 'toast ' + tipe;
    t.innerHTML = `<span>${ikon}</span><span>${pesan}</span>`;
    area.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .25s'; setTimeout(() => t.remove(), 250); }, 2600);
  }

  // ====================== MODAL ======================
  // opsi: { judul, isiHTML, lebar, onMount(modalBodyEl) }
  function modal({ judul, isiHTML, lebar, onMount }) {
    tutupModal(); // hanya satu modal aktif
    const scrim = document.createElement('div');
    scrim.className = 'modal-scrim';
    scrim.innerHTML = `
      <div class="modal" style="${lebar ? 'max-width:' + lebar + 'px' : ''}">
        <div class="modal-head"><h3>${judul}</h3><button class="modal-x" aria-label="Tutup">&times;</button></div>
        <div class="modal-body">${isiHTML}</div>
      </div>`;
    document.body.appendChild(scrim);
    document.body.style.overflow = 'hidden';

    const tutup = () => tutupModal();
    scrim.querySelector('.modal-x').addEventListener('click', tutup);
    scrim.addEventListener('mousedown', e => { if (e.target === scrim) tutup(); });
    document.addEventListener('keydown', escTutup);

    if (onMount) onMount(scrim.querySelector('.modal-body'), tutup);
    return tutup;
  }
  function escTutup(e) { if (e.key === 'Escape') tutupModal(); }
  function tutupModal() {
    const s = document.querySelector('.modal-scrim');
    if (s) s.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', escTutup);
  }

  // Konfirmasi sederhana -> Promise<boolean>
  function konfirmasi({ judul = 'Konfirmasi', pesan, tombol = 'Ya, lanjut', bahaya = false }) {
    return new Promise(res => {
      modal({
        judul, lebar: 420,
        isiHTML: `
          <p class="muted" style="margin-bottom:18px">${pesan}</p>
          <div class="modal-foot">
            <button class="btn btn-ghost" data-batal>Batal</button>
            <button class="btn ${bahaya ? 'btn-primary' : 'btn-dark'}" data-ok>${tombol}</button>
          </div>`,
        onMount(body, tutup) {
          body.querySelector('[data-batal]').addEventListener('click', () => { tutup(); res(false); });
          body.querySelector('[data-ok]').addEventListener('click', () => { tutup(); res(true); });
        },
      });
    });
  }

  // Empty state HTML
  function empty(ikon, judul, pesan) {
    return `<div class="empty"><div class="em-ico">${ikon}</div><h4>${judul}</h4><p>${pesan || ''}</p></div>`;
  }

  // Bangun tautan WhatsApp (wa.me) dengan pesan terisi
  function waLink(nomor, pesan) {
    const no = String(nomor || '').replace(/[^0-9]/g, '');
    return 'https://wa.me/' + no + (pesan ? '?text=' + encodeURIComponent(pesan) : '');
  }

  // Hitung rincian harga dari konfigurasi (persen -> nilai rupiah)
  function hitungRincian(config) {
    const harga = config.harga_periode || 0;
    const r = (config.rincian || []).map(x => ({ label: x.label, nilai: Math.round(harga * x.persen / 100) }));
    // Koreksi pembulatan agar total persis = harga
    const total = r.reduce((s, x) => s + x.nilai, 0);
    if (r.length && total !== harga) r[r.length - 1].nilai += (harga - total);
    return r;
  }

  // Format nomor rekening lengkap dari config
  function rekening(config) {
    return `${config.rekening_bank} — ${config.rekening_no} a.n. ${config.rekening_nama}`;
  }

  G.ui = {
    rupiah, rupiahSingkat, tanggal, hariIni, sisaHari,
    badgeStatus, kondisiPill, inisial, fileToDataURL,
    toast, modal, tutupModal, konfirmasi, empty,
    waLink, hitungRincian, rekening,
  };
})();
