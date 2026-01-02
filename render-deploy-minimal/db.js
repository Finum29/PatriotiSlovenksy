const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  findUserById: async (id) => {
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0];
  },
  updateUser: async (id, updates) => {
    const fields = Object.keys(updates).map((key, i) => `${key} = $${i + 2}`).join(', ');
    await pool.query(`UPDATE users SET ${fields} WHERE id = $1`, [id, ...Object.values(updates)]);
  }
};