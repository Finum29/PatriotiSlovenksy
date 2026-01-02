const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Create audit log table on startup
pool.query(`
  CREATE TABLE IF NOT EXISTS admin_audit_log (
    id SERIAL PRIMARY KEY,
    admin_id VARCHAR(255) NOT NULL,
    admin_username VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    target_type VARCHAR(100),
    target_id VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(45),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_log(admin_id);
  CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON admin_audit_log(timestamp DESC);
`).catch(err => console.error('Audit table creation error:', err));

module.exports = {
  query: (text, params) => pool.query(text, params),
  
  // Audit log - APPEND ONLY, no edit/delete functions
  logAdminAction: async (adminId, adminUsername, action, targetType, targetId, details, ipAddress) => {
    await pool.query(
      'INSERT INTO admin_audit_log (admin_id, admin_username, action, target_type, target_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [adminId, adminUsername, action, targetType, targetId, JSON.stringify(details), ipAddress]
    );
  },
  
  getAuditLogs: async (limit = 100, offset = 0) => {
    const res = await pool.query(
      'SELECT * FROM admin_audit_log ORDER BY timestamp DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return res.rows;
  },
  
  getAuditLogsByAdmin: async (adminId) => {
    const res = await pool.query(
      'SELECT * FROM admin_audit_log WHERE admin_id = $1 ORDER BY timestamp DESC',
      [adminId]
    );
    return res.rows;
  },

  findUserById: async (id) => {
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0];
  },
  
  updateUser: async (id, updates) => {
    const fields = Object.keys(updates).map((key, i) => `${key} = $${i + 2}`).join(', ');
    await pool.query(`UPDATE users SET ${fields} WHERE id = $1`, [id, ...Object.values(updates)]);
  }
};