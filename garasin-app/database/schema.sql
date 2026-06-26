-- ============================================================================
-- GARASIN — schema.sql
-- Rancangan basis data (MySQL) yang MENCERMINKAN model data aplikasi.
--
-- Catatan: aplikasi prototipe ini menyimpan data di browser (localStorage),
-- jadi skema ini TIDAK wajib dijalankan untuk menjalankan aplikasi.
-- Gunakan berkas ini sebagai:
--   1) Referensi ERD untuk laporan, dan
--   2) Titik awal bila nanti dibangun backend nyata (mis. PHP/Node + MySQL).
-- ============================================================================

CREATE DATABASE IF NOT EXISTS garasin
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE garasin;

-- ---------------------------------------------------------------------------
-- Tabel: users (pemilik, admin/operator, pelanggan)
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nama       VARCHAR(100)  NOT NULL,
  email      VARCHAR(120)  NOT NULL UNIQUE,
  password   VARCHAR(255)  NOT NULL,           -- di produksi: simpan HASH, bukan teks asli
  role       ENUM('owner','admin','pelanggan') NOT NULL DEFAULT 'pelanggan',
  no_hp      VARCHAR(25),
  asal       VARCHAR(80),                      -- asal daerah perantau
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- Tabel: motor (milik pelanggan)
-- ---------------------------------------------------------------------------
CREATE TABLE motor (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plat    VARCHAR(15) NOT NULL,
  tipe    VARCHAR(60) NOT NULL,
  cc      INT,
  warna   VARCHAR(30),
  foto    LONGTEXT,                            -- data URL / path foto motor
  CONSTRAINT fk_motor_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Tabel: booking (penyimpanan motor per periode)
-- ---------------------------------------------------------------------------
CREATE TABLE booking (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  motor_id        INT NOT NULL,
  user_id         INT NOT NULL,
  tanggal_mulai   DATE NOT NULL,
  tanggal_selesai DATE NOT NULL,
  status          ENUM('pending','aktif','selesai','ditolak') NOT NULL DEFAULT 'pending',
  harga           INT NOT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_motor FOREIGN KEY (motor_id) REFERENCES motor(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_user  FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Tabel: perawatan (laporan kondisi harian — inti layanan GARASIN)
-- ---------------------------------------------------------------------------
CREATE TABLE perawatan (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  motor_id     INT NOT NULL,
  tanggal      DATE NOT NULL,
  status_aki   ENUM('baik','perhatian','buruk') NOT NULL,
  status_ban   ENUM('baik','perhatian','buruk') NOT NULL,
  status_mesin ENUM('baik','perhatian','buruk') NOT NULL,
  catatan      TEXT,
  petugas      VARCHAR(100),
  foto         LONGTEXT,                        -- data URL / path foto kondisi
  CONSTRAINT fk_perawatan_motor FOREIGN KEY (motor_id) REFERENCES motor(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Tabel: pembayaran (terkait satu booking)
-- ---------------------------------------------------------------------------
CREATE TABLE pembayaran (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  jumlah     INT NOT NULL,
  status     ENUM('belum','lunas') NOT NULL DEFAULT 'belum',
  bukti      LONGTEXT,                          -- data URL / path bukti transfer
  tanggal    DATE,
  CONSTRAINT fk_bayar_booking FOREIGN KEY (booking_id) REFERENCES booking(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Tabel: notifikasi (kabar untuk pelanggan)
-- ---------------------------------------------------------------------------
CREATE TABLE notifikasi (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  pesan   VARCHAR(255) NOT NULL,
  tanggal DATE NOT NULL,
  dibaca  BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Tabel: pengaturan (konfigurasi bisnis — harga, kapasitas, rekening, kontak)
-- Disimpan satu baris (id=1).
-- ---------------------------------------------------------------------------
CREATE TABLE pengaturan (
  id                    INT PRIMARY KEY DEFAULT 1,
  harga_periode         INT NOT NULL DEFAULT 200000,
  kapasitas_total       INT NOT NULL DEFAULT 6,        -- kapasitas garasi: 6 slot
  target_retensi        INT NOT NULL DEFAULT 65,
  cac                   INT NOT NULL DEFAULT 28000,
  target_pendapatan_th1 INT NOT NULL DEFAULT 12000000,
  rekening_bank         VARCHAR(40)  NOT NULL DEFAULT 'SeaBank',
  rekening_no           VARCHAR(40)  NOT NULL DEFAULT '9012 3456 7890',
  rekening_nama         VARCHAR(80)  NOT NULL DEFAULT 'GARASIN',
  wa_admin              VARCHAR(25)  NOT NULL DEFAULT '6281200000002'
);

-- ============================================================================
-- DATA AWAL — aplikasi MULAI KOSONG (siap diisi data asli).
-- Hanya akun pengelola yang disiapkan; pelanggan mendaftar sendiri.
-- Sandi awal: garasin123 (di produksi simpan HASH, bukan teks asli).
-- ============================================================================
INSERT INTO users (id, nama, email, password, role, no_hp, asal) VALUES
  (1,'Owner GARASIN','owner@garasin.id','garasin123','owner','0812-0000-0001','Malang'),
  (2,'Admin GARASIN','admin@garasin.id','garasin123','admin','0812-0000-0002','Malang');

INSERT INTO pengaturan (id) VALUES (1);   -- pakai nilai default (kapasitas 6, SeaBank, dst.)

-- Tabel motor, booking, perawatan, pembayaran, notifikasi sengaja DIBIARKAN KOSONG.
-- Data terisi saat aplikasi dipakai (pelanggan daftar → booking → bayar → dirawat).
