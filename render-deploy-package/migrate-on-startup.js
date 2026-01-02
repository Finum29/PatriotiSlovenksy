const db = require('./db');
const fs = require('fs');
const path = require('path');

async function migrateData() {
  console.log('🚀 Starting automatic data migration...');
  
  const dataFiles = {
    users: 'users.json',
    teams: 'teams.json',
    events: 'events.json',
    tickets: 'tickets.json',
    chat: 'chat.json',
    tournamentChat: 'tournament-chat.json',
    resetTokens: 'reset-tokens.json',
    pushSubscriptions: 'push-subscriptions.json'
  };
  
  try {
    // Check if data already exists
    const userCheck = await db.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCheck.rows[0].count) > 0) {
      console.log('✅ Data already migrated, skipping...');
      return;
    }
    
    // Migrate users
    if (fs.existsSync(dataFiles.users)) {
      const users = JSON.parse(fs.readFileSync(dataFiles.users, 'utf8'));
      for (const user of users) {
        await db.query(
          'INSERT INTO users (id, username, email, password, wallet_balance, role, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
          [user.id, user.username, user.email, user.password, user.walletBalance || 0, user.role || 'user', user.createdAt || new Date()]
        );
      }
      console.log(`✅ Migrated ${users.length} users`);
    }
    
    // Migrate teams
    if (fs.existsSync(dataFiles.teams)) {
      const teams = JSON.parse(fs.readFileSync(dataFiles.teams, 'utf8'));
      for (const team of teams) {
        await db.query(
          'INSERT INTO teams (id, name, tag, leader_id, members, tournament_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
          [team.id, team.name, team.tag, team.leaderId, JSON.stringify(team.members || []), team.tournamentId, team.createdAt || new Date()]
        );
      }
      console.log(`✅ Migrated ${teams.length} teams`);
    }
    
    // Migrate events
    if (fs.existsSync(dataFiles.events)) {
      const events = JSON.parse(fs.readFileSync(dataFiles.events, 'utf8'));
      for (const event of events) {
        await db.query(
          'INSERT INTO events (id, title, description, game, date, max_teams, entry_fee, prize_pool, status, registered_teams, brackets, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (id) DO NOTHING',
          [event.id, event.title, event.description, event.game, event.date, event.maxTeams, event.entryFee || 0, event.prizePool || 0, event.status || 'upcoming', JSON.stringify(event.registeredTeams || []), JSON.stringify(event.brackets || {}), event.createdAt || new Date()]
        );
      }
      console.log(`✅ Migrated ${events.length} events`);
    }
    
    // Migrate tickets
    if (fs.existsSync(dataFiles.tickets)) {
      const tickets = JSON.parse(fs.readFileSync(dataFiles.tickets, 'utf8'));
      for (const ticket of tickets) {
        await db.query(
          'INSERT INTO tickets (id, user_id, subject, message, status, priority, responses, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING',
          [ticket.id, ticket.userId, ticket.subject, ticket.message, ticket.status || 'open', ticket.priority || 'normal', JSON.stringify(ticket.responses || []), ticket.createdAt || new Date()]
        );
      }
      console.log(`✅ Migrated ${tickets.length} tickets`);
    }
    
    console.log('🎉 Data migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    // Don't throw - allow server to start even if migration fails
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateData().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = migrateData;