/**
 * GARASIN — database/setup.js
 * Inisialisasi database Vercel Postgres:
 *   1) Buat semua tabel (schema.sql)
 *   2) Seed owner + admin dengan password yang sudah di-hash bcrypt
 *
 * Jalankan: node database/setup.js
 * Pastikan file .env.local ada dengan POSTGRES_URL yang benar.
 */

require('dotenv').config({ path: '.env.local' });

const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const SALT_ROUNDS = 10;
const PLAIN_PASSWORD = 'garasin123';

async function run() {
  console.log('🔧 Menghubungkan ke Vercel Postgres...');

  // 1) Jalankan schema
  console.log('📋 Membuat tabel...');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  // Pisah per statement (sederhana: split by ';')
  const statements = schema.split(';').map(s => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    await sql.query(stmt);
  }
  console.log('✅ Tabel berhasil dibuat.');

  // 2) Hash password
  console.log('🔐 Meng-hash password...');
  const hash = await bcrypt.hash(PLAIN_PASSWORD, SALT_ROUNDS);
  console.log('Hash untuk "garasin123":', hash);

  // 3) Seed owner & admin
  console.log('🌱 Menyemai data awal...');

  await sql`
    INSERT INTO users (nama, email, password, role, no_hp, asal)
    VALUES ('Owner GARASIN', 'owner@garasin.id', ${hash}, 'owner', '0812-0000-0001', 'Malang')
    ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password
  `;

  await sql`
    INSERT INTO users (nama, email, password, role, no_hp, asal)
    VALUES ('Admin GARASIN', 'admin@garasin.id', ${hash}, 'admin', '0812-0000-0002', 'Malang')
    ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password
  `;

  await sql`INSERT INTO config (id) VALUES (1) ON CONFLICT (id) DO NOTHING`;

  console.log('✅ Seed selesai.');
  console.log('');
  console.log('🎉 Database GARASIN siap digunakan!');
  console.log('   Login: owner@garasin.id / garasin123');
  console.log('   Login: admin@garasin.id / garasin123');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Setup gagal:', err.message);
  process.exit(1);
});
