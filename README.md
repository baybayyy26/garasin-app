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
├── vercel.json           ← routing & security headers
├── package.json          ← dependencies backend (bcryptjs, jsonwebtoken, @vercel/postgres)
├── .env.example          ← template environment variables
├── api/                  ← Vercel Serverless Functions (Node.js)
│   ├── _lib/             (db.js, auth.js, middleware.js)
│   ├── auth/             (login.js, register.js)
│   ├── motor/            (index.js, [id].js)
│   ├── booking/          (index.js, [id].js)
│   ├── perawatan/        (index.js, [id].js)
│   ├── pembayaran/       (index.js, [id].js)
│   ├── notifikasi/       (index.js)
│   ├── users/            (index.js)
│   └── config/           (index.js)
├── public/
│   ├── css/              (base, layout, components)
│   ├── img/              (logo-mark, logo-word, logo-full)
│   └── js/
│       ├── store.js      ← API client (menggantikan localStorage)
│       ├── ui.js, auth.js, komponen.js, router.js, app.js
│       └── pages/        (login, pelanggan, admin, owner)
└── database/
    ├── schema.sql        ← PostgreSQL schema
    ├── seed.sql          ← referensi seed (pakai setup.js)
    └── setup.js          ← script inisialisasi database
```

---

## 🚀 Deploy ke Vercel (Fullstack)

### Prasyarat
- Akun [Vercel](https://vercel.com) (gratis, daftar dengan GitHub)
- Repo sudah di-push ke GitHub

### Langkah-langkah

**1. Push ke GitHub**
```bash
git add .
git commit -m "fullstack migration: Vercel + Postgres"
git push origin main
```

**2. Import ke Vercel**
- Buka [vercel.com/new](https://vercel.com/new)
- Klik **"Import Git Repository"** → pilih repo `garasin-app`
- Framework Preset: **Other** (bukan Next.js)
- Root Directory: `.` (biarkan default)
- Build Command: *(kosongkan)*
- Output Directory: *(kosongkan)*
- Klik **Deploy**

**3. Buat database Postgres**
- Di Vercel Dashboard → tab **Storage** → **Create Database** → pilih **Postgres**
- Nama database: `garasin-db` (bebas)
- Klik **Connect to Project** → pilih project GARASIN

**4. Copy environment variables**
- Di Storage → database terpilih → tab **`.env.local`**
- Klik **Copy Snippet** → paste ke Vercel Dashboard → **Settings → Environment Variables**
- Tambahkan juga: `JWT_SECRET` = string random panjang (mis. generate di [random.org](https://www.random.org/strings/))

**5. Inisialisasi database**
```bash
# Di komputer lokal (bukan di server)
cp .env.example .env.local
# Isi POSTGRES_URL dan JWT_SECRET di .env.local

npm install
node database/setup.js
```
Output yang diharapkan:
```
✅ Tabel berhasil dibuat.
✅ Seed selesai.
🎉 Database GARASIN siap digunakan!
```

**6. Redeploy (opsional)**
- Setelah env vars ditambahkan, klik **Redeploy** di Vercel dashboard
- Atau push commit baru → deploy otomatis

**7. Buka URL Vercel**
- Buka URL project (mis. `garasin-app.vercel.app`)
- Login dengan: `owner@garasin.id` / `garasin123`

### Environment Variables yang Dibutuhkan

| Variable | Sumber | Keterangan |
|----------|--------|------------|
| `POSTGRES_URL` | Vercel Storage | Connection string pooled |
| `POSTGRES_URL_NON_POOLING` | Vercel Storage | Untuk migrations |
| `POSTGRES_USER` | Vercel Storage | Username database |
| `POSTGRES_HOST` | Vercel Storage | Host database |
| `POSTGRES_PASSWORD` | Vercel Storage | Password database |
| `POSTGRES_DATABASE` | Vercel Storage | Nama database |
| `JWT_SECRET` | Manual | String random min. 32 karakter |

### Catatan Penting
- **Foto & bukti bayar**: saat ini masih disimpan sebagai Base64 di database. Untuk produksi nyata, integrasikan dengan Cloudinary atau Vercel Blob untuk upload file.
- **Password**: sudah di-hash dengan bcrypt (production-safe).
- **JWT**: expire 7 hari. User perlu login ulang setelah 7 hari.
- **CORS**: sudah dikonfigurasi di `vercel.json` untuk semua origin (`*`). Batasi ke domain spesifik di production.

---

## 🔑 Akun Masuk

Aplikasi **mulai dalam keadaan kosong** (siap diisi data asli). Hanya dua akun pengelola yang sudah disiapkan:

| Peran      | Email                | Kata sandi   |
|------------|----------------------|--------------|
| **Owner**  | `owner@garasin.id`   | `garasin123` |
| **Admin**  | `admin@garasin.id`   | `garasin123` |

> ⚠️ Ganti password ini setelah pertama kali login di production.
