-- ============================================================================
-- GARASIN — seed.sql
-- Data awal: hanya owner & admin. Password di-hash oleh setup.js.
-- Jalankan via: node database/setup.js (BUKAN langsung di psql)
-- ============================================================================

-- Akun owner & admin (password placeholder — di-replace oleh setup.js)
INSERT INTO users (nama, email, password, role, no_hp, asal) VALUES
  ('Owner GARASIN', 'owner@garasin.id', '__OWNER_HASH__', 'owner', '0812-0000-0001', 'Malang'),
  ('Admin GARASIN', 'admin@garasin.id', '__ADMIN_HASH__', 'admin', '0812-0000-0002', 'Malang')
ON CONFLICT (email) DO NOTHING;

-- Konfigurasi default (satu baris)
INSERT INTO config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
