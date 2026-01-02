// db.js - PostgreSQL Connection Pool Manager
const { Pool } = require('pg');

// Create connection pool using DATABASE_URL from environment
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('✓ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Helper function to execute queries
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Helper function to get a client from the pool (for transactions)
async function getClient() {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);
  
  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
  }, 5000);
  
  // Monkey patch the query method to keep track of the last query executed
  client.query = (...args) => {
    client.lastQuery = args;
    return query(...args);
  };
  
  client.release = () => {
    clearTimeout(timeout);
    // Set the methods back to their old un-monkey-patched version
    client.query = query;
    client.release = release;
    return release();
  };
  
  return client;
}

// Helper functions for common operations
const db = {
  query,
  getClient,
  pool,
  
  // User operations
  async findUserById(id) {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  },
  
  async findUserByUsername(username) {
    const result = await query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    return result.rows[0];
  },
  
  async findUserByEmail(email) {
    const result = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    return result.rows[0];
  },
  
  async createUser(userData) {
    const { id, username, email, passwordHash, isAdmin, teamId, status, wallet, transactions, registeredEvents, createdAt } = userData;
    const result = await query(
      `INSERT INTO users (id, username, email, password_hash, is_admin, team_id, status, wallet, transactions, registered_events, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [id, username, email, passwordHash, isAdmin || false, teamId || null, status || 'active', wallet || 0, JSON.stringify(transactions || []), JSON.stringify(registeredEvents || []), createdAt || new Date()]
    );
    return result.rows[0];
  },
  
  async updateUser(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    Object.keys(updates).forEach(key => {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (typeof updates[key] === 'object' && updates[key] !== null) {
        fields.push(`${dbKey} = $${paramCount}`);
        values.push(JSON.stringify(updates[key]));
      } else {
        fields.push(`${dbKey} = $${paramCount}`);
        values.push(updates[key]);
      }
      paramCount++;
    });
    
    values.push(id);
    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  },
  
  async getAllUsers() {
    const result = await query('SELECT * FROM users ORDER BY created_at DESC');
    return result.rows;
  },
  
  async deleteUser(id) {
    await query('DELETE FROM users WHERE id = $1', [id]);
  },
  
  // Event operations
  async getAllEvents() {
    const result = await query('SELECT * FROM events ORDER BY created_at DESC');
    return result.rows;
  },
  
  async findEventById(id) {
    const result = await query('SELECT * FROM events WHERE id = $1', [id]);
    return result.rows[0];
  },
  
  async createEvent(eventData) {
    const { id, name, description, date, time, mode, eliminationType, iconUrl, streamUrl, lobbyUrl, teamSize, entryFee, prizePool, prizes, status, registrations, matches, bracket, loserBracket, winner, createdAt } = eventData;
    const result = await query(
      `INSERT INTO events (id, name, description, date, time, mode, elimination_type, icon_url, stream_url, lobby_url, team_size, entry_fee, prize_pool, prizes, status, registrations, matches, bracket, loser_bracket, winner, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       RETURNING *`,
      [id, name, description || '', date, time, mode, eliminationType || 'single', iconUrl || '', streamUrl || '', lobbyUrl || '', teamSize || null, entryFee || 0, JSON.stringify(prizePool || {}), JSON.stringify(prizes || {}), status || 'upcoming', JSON.stringify(registrations || []), JSON.stringify(matches || []), JSON.stringify(bracket || null), JSON.stringify(loserBracket || null), JSON.stringify(winner || null), createdAt || new Date()]
    );
    return result.rows[0];
  },
  
  async updateEvent(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    Object.keys(updates).forEach(key => {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (typeof updates[key] === 'object' && updates[key] !== null) {
        fields.push(`${dbKey} = $${paramCount}`);
        values.push(JSON.stringify(updates[key]));
      } else {
        fields.push(`${dbKey} = $${paramCount}`);
        values.push(updates[key]);
      }
      paramCount++;
    });
    
    values.push(id);
    const result = await query(
      `UPDATE events SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  },
  
  async deleteEvent(id) {
    await query('DELETE FROM events WHERE id = $1', [id]);
  },
  
  // Team operations
  async getAllTeams() {
    const result = await query('SELECT * FROM teams ORDER BY created_at DESC');
    return result.rows;
  },
  
  async findTeamById(id) {
    const result = await query('SELECT * FROM teams WHERE id = $1', [id]);
    return result.rows[0];
  },
  
  async findTeamByInviteCode(inviteCode) {
    const result = await query('SELECT * FROM teams WHERE UPPER(invite_code) = UPPER($1)', [inviteCode]);
    return result.rows[0];
  },
  
  async createTeam(teamData) {
    const { id, name, description, motto, captainId, members, inviteCode, createdAt } = teamData;
    const result = await query(
      `INSERT INTO teams (id, name, description, motto, captain_id, members, invite_code, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, name, description || '', motto || '', captainId, JSON.stringify(members || []), inviteCode, createdAt || new Date()]
    );
    return result.rows[0];
  },
  
  async updateTeam(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    Object.keys(updates).forEach(key => {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (typeof updates[key] === 'object' && updates[key] !== null) {
        fields.push(`${dbKey} = $${paramCount}`);
        values.push(JSON.stringify(updates[key]));
      } else {
        fields.push(`${dbKey} = $${paramCount}`);
        values.push(updates[key]);
      }
      paramCount++;
    });
    
    values.push(id);
    const result = await query(
      `UPDATE teams SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  },
  
  async deleteTeam(id) {
    await query('DELETE FROM teams WHERE id = $1', [id]);
  },
  
  // Ticket operations
  async getAllTickets() {
    const result = await query('SELECT * FROM tickets ORDER BY created_at DESC');
    return result.rows;
  },
  
  async findTicketById(id) {
    const result = await query('SELECT * FROM tickets WHERE id = $1', [id]);
    return result.rows[0];
  },
  
  async findTicketsByUserId(userId) {
    const result = await query('SELECT * FROM tickets WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return result.rows;
  },
  
  async createTicket(ticketData) {
    const { id, userId, username, subject, message, status, responses, messages, hasUnreadResponse, createdAt } = ticketData;
    const result = await query(
      `INSERT INTO tickets (id, user_id, username, subject, message, status, responses, messages, has_unread_response, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [id, userId, username, subject, message, status || 'open', JSON.stringify(responses || []), JSON.stringify(messages || []), hasUnreadResponse || false, createdAt || new Date()]
    );
    return result.rows[0];
  },
  
  async updateTicket(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    Object.keys(updates).forEach(key => {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (typeof updates[key] === 'object' && updates[key] !== null) {
        fields.push(`${dbKey} = $${paramCount}`);
        values.push(JSON.stringify(updates[key]));
      } else {
        fields.push(`${dbKey} = $${paramCount}`);
        values.push(updates[key]);
      }
      paramCount++;
    });
    
    values.push(id);
    const result = await query(
      `UPDATE tickets SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  },
  
  // Chat operations
  async getChatMessages(room = 'global', limit = 100) {
    const result = await query(
      'SELECT * FROM chat_messages WHERE room = $1 ORDER BY timestamp DESC LIMIT $2',
      [room, limit]
    );
    return result.rows.reverse();
  },
  
  async createChatMessage(messageData) {
    const { id, userId, username, message, isAdmin, room, timestamp } = messageData;
    const result = await query(
      `INSERT INTO chat_messages (id, user_id, username, message, is_admin, room, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, userId, username, message, isAdmin || false, room || 'global', timestamp || new Date()]
    );
    return result.rows[0];
  },
  
  async getTournamentChatMessages(room, limit = 100) {
    const result = await query(
      'SELECT * FROM tournament_chat WHERE room = $1 OR room = $2 ORDER BY timestamp DESC LIMIT $3',
      [room, 'tournament-admin', limit]
    );
    return result.rows.reverse();
  },
  
  async createTournamentChatMessage(messageData) {
    const { id, userId, username, message, isAdmin, isCaptain, teamId, room, timestamp } = messageData;
    const result = await query(
      `INSERT INTO tournament_chat (id, user_id, username, message, is_admin, is_captain, team_id, room, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, userId, username, message, isAdmin || false, isCaptain || false, teamId || null, room, timestamp || new Date()]
    );
    return result.rows[0];
  },
  
  // Reset token operations
  async createResetToken(tokenData) {
    const { token, userId, email, expiresAt, createdAt } = tokenData;
    const result = await query(
      `INSERT INTO reset_tokens (token, user_id, email, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [token, userId, email, expiresAt, createdAt || new Date()]
    );
    return result.rows[0];
  },
  
  async findResetToken(token) {
    const result = await query('SELECT * FROM reset_tokens WHERE token = $1', [token]);
    return result.rows[0];
  },
  
  async deleteResetToken(token) {
    await query('DELETE FROM reset_tokens WHERE token = $1', [token]);
  },
  
  // Push subscription operations
  async createPushSubscription(subscriptionData) {
    const { userId, subscription, createdAt } = subscriptionData;
    const result = await query(
      `INSERT INTO push_subscriptions (user_id, subscription, created_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, JSON.stringify(subscription), createdAt || new Date()]
    );
    return result.rows[0];
  }
};

module.exports = db;