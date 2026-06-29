-- ============================================================================
-- GARASIN — schema.sql (PostgreSQL / Vercel Postgres)
-- Konversi dari MySQL: AUTO_INCREMENT → SERIAL, LONGTEXT → TEXT,
-- ENUM → VARCHAR + CHECK constraint, BOOLEAN tetap sama.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  nama       VARCHAR(100)  NOT NULL,
  email      VARCHAR(120)  NOT NULL UNIQUE,
  password   VARCHAR(255)  NOT NULL,
  role       VARCHAR(20)   NOT NULL DEFAULT 'pelanggan'
               CHECK (role IN ('owner','admin','pelanggan')),
  no_hp      VARCHAR(25),
  asal       VARCHAR(80),
  created_at TIMESTAMPTZ   DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- motor
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS motor (
  id      SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plat    VARCHAR(15) NOT NULL,
  tipe    VARCHAR(60) NOT NULL,
  cc      INTEGER,
  warna   VARCHAR(30),
  foto    TEXT
);

-- ---------------------------------------------------------------------------
-- booking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking (
  id              SERIAL PRIMARY KEY,
  motor_id        INTEGER NOT NULL REFERENCES motor(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tanggal_mulai   DATE NOT NULL,
  tanggal_selesai DATE NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','aktif','selesai','ditolak','dibatalkan')),
  harga           INTEGER NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- perawatan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS perawatan (
  id           SERIAL PRIMARY KEY,
  motor_id     INTEGER NOT NULL REFERENCES motor(id) ON DELETE CASCADE,
  tanggal      DATE NOT NULL,
  status_aki   VARCHAR(15) NOT NULL CHECK (status_aki   IN ('baik','perhatian','buruk')),
  status_ban   VARCHAR(15) NOT NULL CHECK (status_ban   IN ('baik','perhatian','buruk')),
  status_mesin VARCHAR(15) NOT NULL CHECK (status_mesin IN ('baik','perhatian','buruk')),
  catatan      TEXT,
  petugas      VARCHAR(100),
  foto         TEXT
);

-- ---------------------------------------------------------------------------
-- pembayaran
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pembayaran (
  id         SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
  jumlah     INTEGER NOT NULL,
  status     VARCHAR(10) NOT NULL DEFAULT 'belum'
               CHECK (status IN ('belum','lunas')),
  bukti      TEXT,
  tanggal    DATE
);

-- ---------------------------------------------------------------------------
-- notifikasi
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifikasi (
  id      SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pesan   VARCHAR(255) NOT NULL,
  tanggal DATE NOT NULL,
  dibaca  BOOLEAN NOT NULL DEFAULT FALSE
);

-- ---------------------------------------------------------------------------
-- config (satu baris, id = 1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS config (
  id                    INTEGER PRIMARY KEY DEFAULT 1,
  harga_periode         INTEGER NOT NULL DEFAULT 200000,
  kapasitas_total       INTEGER NOT NULL DEFAULT 6,
  target_retensi        INTEGER NOT NULL DEFAULT 65,
  cac                   INTEGER NOT NULL DEFAULT 28000,
  target_pendapatan_th1 INTEGER NOT NULL DEFAULT 12000000,
  rekening_bank         VARCHAR(40)  NOT NULL DEFAULT 'SeaBank',
  rekening_no           VARCHAR(40)  NOT NULL DEFAULT '9012 3456 7890',
  rekening_nama         VARCHAR(80)  NOT NULL DEFAULT 'GARASIN',
  wa_admin              VARCHAR(25)  NOT NULL DEFAULT '6281200000002',
  north_star_label      VARCHAR(100) NOT NULL DEFAULT 'Motor tersimpan / periode liburan',
  rincian               JSONB        NOT NULL DEFAULT '[
    {"label": "Slot penyimpanan + keamanan 24 jam (CCTV)", "persen": 50},
    {"label": "Perawatan rutin (pemanasan mesin, cek aki & ban)", "persen": 35},
    {"label": "Laporan kondisi berkala (foto/video via WhatsApp)", "persen": 15}
  ]'
);
