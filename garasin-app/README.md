# 🛡️ GARASIN — Garasi Digital Motor Perantau

> **Pulang tenang, motor aman & sehat. Garasin, beres!**

Aplikasi prototipe untuk layanan **penyimpanan + perawatan motor** mahasiswa perantau di Malang. Bukan sekadar tempat parkir: area terpantau **CCTV 24 jam**, motor **dirawat rutin**, dan kondisinya dikabarkan lewat **foto/video via WhatsApp** serta bisa dipantau di aplikasi.

Dibuat dengan **HTML + CSS + JavaScript murni** (tanpa framework, tanpa npm). Data tersimpan di `localStorage` browser.

---

## 🚀 Cara Menjalankan

**Wajib di-extract dulu** (jangan dibuka dari dalam .zip).

**Cara 1 — VS Code + Live Server (disarankan)**
1. Extract folder `garasin-app`.
2. Buka **folder**-nya di VS Code (`File → Open Folder`).
3. Install ekstensi **Live Server** (Ritwick Dey) — cukup sekali.
4. Klik kanan `index.html` → **Open with Live Server**.

**Cara 2 — Langsung**
- Klik dua kali `index.html` → terbuka di browser. (Live Server lebih disarankan agar data tersimpan normal.)

---

## 🔑 Akun Masuk

Aplikasi **mulai dalam keadaan kosong** (siap diisi data asli). Hanya dua akun pengelola yang sudah disiapkan:

| Peran      | Email                | Kata sandi   |
|------------|----------------------|--------------|
| **Owner**  | `owner@garasin.id`   | `garasin123` |
| **Admin**  | `admin@garasin.id`   | `garasin123` |

> ⚠️ Catat & ganti sandi ini untuk penggunaan nyata. Akun owner/admin tidak ditampilkan di layar login (tampilan bersih).

**Pelanggan mendaftar sendiri** lewat tombol **Daftar** di halaman login.

---

## 👥 Tiga Peran

**Pelanggan**
- Beranda ringkasan motor + kondisi terbaru
- Kelola motor & buat **booking** penyimpanan
- **Pembayaran** dengan **rincian harga** yang jelas (transfer **SeaBank** → upload bukti)
- Notifikasi
- **Hubungi Admin** (bantuan via WhatsApp + FAQ)

**Admin / Operator**
- Dashboard operasional (kapasitas, checklist)
- Konfirmasi **booking masuk** (jaga kapasitas **6 slot**)
- **Motor tersimpan** — catat perawatan & **tandai motor diambil (selesai)**
- **Perawatan harian** (nama petugas **bisa diganti**)
- **Data pelanggan** terdaftar
- Verifikasi pembayaran

**Owner**
- **Dashboard KPI** (north star, pendapatan, kapasitas 6 slot, retensi, grafik pendapatan per bulan)
- **Pengaturan** — atur harga/periode, kapasitas, target, **rekening SeaBank**, & nomor **WhatsApp admin**

---

## ⚙️ Catatan Teknis

- **Status booking** (aktif/selesai/pending/ditolak) dan **kondisi motor** (kesehatan dari perawatan) dilacak **terpisah** — mencatat perawatan hanya memperbarui kondisi, bukan status booking.
- Pelanggan **tidak mengakses CCTV langsung**; update foto/video dikirim via WhatsApp.
- Harga belum berbasis paket → satu harga sudah termasuk semua layanan, ditampilkan sebagai **rincian** agar pelanggan tidak bingung.
- Reset data: menu **Reset data** di sidebar mengembalikan ke kondisi awal (kosong, hanya owner + admin).

---

## 📁 Struktur

```
garasin-app/
├── index.html
├── public/
│   ├── css/        (base, layout, components)
│   ├── img/        (logo-mark, logo-word, logo-full)
│   └── js/
│       ├── store.js, ui.js, auth.js, komponen.js, router.js, app.js
│       └── pages/  (login, pelanggan, admin, owner)
└── database/schema.sql   (referensi desain basis data)
```
