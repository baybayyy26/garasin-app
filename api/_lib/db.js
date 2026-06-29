const { sql } = require('@vercel/postgres');

// Tagged-template helper — pakai langsung: sql`SELECT ...`
// Fungsi query untuk string dinamis (lebih jarang dipakai)
async function query(text, params = []) {
  try {
    const result = await sql.query(text, params);
    return result;
  } catch (err) {
    console.error('[DB Error]', err.message);
    throw err;
  }
}

module.exports = { sql, query };
