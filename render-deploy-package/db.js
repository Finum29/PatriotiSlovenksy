const { Pool } = require('pg');

// Auto-configure from DATABASE_URL environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Auto-create tables on startup
async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log('🔧 Initializing database tables...');
    
    await client.query(`
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        wallet_balance DECIMAL(10,2) DEFAULT 0,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      -- Teams table
      CREATE TABLE IF NOT EXISTS teams (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        tag VARCHAR(50),
        leader_id UUID REFERENCES users(id),
        members JSONB DEFAULT '[]',
        tournament_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_teams_leader ON teams(leader_id);
      CREATE INDEX IF NOT EXISTS idx_teams_tournament ON teams(tournament_id);

      -- Events table
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        game VARCHAR(100),
        date TIMESTAMP,
        max_teams INTEGER,
        entry_fee DECIMAL(10,2) DEFAULT 0,
        prize_pool DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'upcoming',
        registered_teams JSONB DEFAULT '[]',
        brackets JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
      CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);

      -- Tickets table
      CREATE TABLE IF NOT EXISTS tickets (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'open',
        priority VARCHAR(50) DEFAULT 'normal',
        responses JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

      -- Chat messages table
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        username VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_chat_timestamp ON chat_messages(timestamp DESC);

      -- Tournament chat table
      CREATE TABLE IF NOT EXISTS tournament_chat (
        id UUID PRIMARY KEY,
        tournament_id UUID NOT NULL,
        user_id UUID REFERENCES users(id),
        username VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_tournament_chat ON tournament_chat(tournament_id, timestamp DESC);

      -- Reset tokens table
      CREATE TABLE IF NOT EXISTS reset_tokens (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_reset_tokens ON reset_tokens(token);

      -- Push subscriptions table
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        subscription JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);
    `);
    
    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Helper functions
const db = {
  query: (text, params) => pool.query(text, params),
  
  async getUser(username) {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0];
  },
  
  async getUserById(id) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  },
  
  async createUser(user) {
    const { id, username, email, password, role = 'user' } = user;
    await pool.query(
      'INSERT INTO users (id, username, email, password, role) VALUES ($1, $2, $3, $4, $5)',
      [id, username, email, password, role]
    );
  },
  
  async updateUserWallet(userId, amount) {
    await pool.query(
      'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2',
      [amount, userId]
    );
  },
  
  async getAllEvents() {
    const result = await pool.query('SELECT * FROM events ORDER BY date DESC');
    return result.rows;
  },
  
  async getEventById(id) {
    const result = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    return result.rows[0];
  },
  
  async createEvent(event) {
    const { id, title, description, game, date, max_teams, entry_fee, prize_pool } = event;
    await pool.query(
      `INSERT INTO events (id, title, description, game, date, max_teams, entry_fee, prize_pool, registered_teams, brackets)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, title, description, game, date, max_teams, entry_fee, prize_pool, JSON.stringify([]), JSON.stringify({})]
    );
  },
  
  async updateEvent(id, updates) {
    const fields = Object.keys(updates).map((key, i) => `${key} = $${i + 2}`).join(', ');
    const values = Object.values(updates);
    await pool.query(`UPDATE events SET ${fields} WHERE id = $1`, [id, ...values]);
  },
  
  async deleteEvent(id) {
    await pool.query('DELETE FROM events WHERE id = $1', [id]);
  },

  initDatabase
};

module.exports = db;