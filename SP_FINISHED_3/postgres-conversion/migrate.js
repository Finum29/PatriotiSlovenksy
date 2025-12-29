// migrate.js - Import JSON data to PostgreSQL
const fs = require('fs');
const path = require('path');
const db = require('./db');

// Path to your JSON files
const DATA_DIR = path.join(__dirname, '../uploads/SP_FINISHED_3/uploads/slovak-patriot');

function readJSON(filename) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${filename} not found, skipping...`);
      return [];
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (error) {
    console.error(`Error reading ${filename}:`, error.message);
    return [];
  }
}

async function migrateUsers() {
  console.log('\n📤 Migrating users...');
  const users = readJSON('users.json');
  
  for (const user of users) {
    try {
      await db.createUser({
        id: user.id,
        username: user.username,
        email: user.email,
        passwordHash: user.passwordHash,
        isAdmin: user.isAdmin || false,
        teamId: user.teamId || null,
        status: user.status || 'active',
        wallet: user.wallet || 0,
        transactions: user.transactions || [],
        registeredEvents: user.registeredEvents || [],
        createdAt: user.createdAt || new Date()
      });
      console.log(`  ✓ Imported user: ${user.username}`);
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        console.log(`  ⚠️  User ${user.username} already exists, skipping...`);
      } else {
        console.error(`  ✗ Failed to import user ${user.username}:`, error.message);
      }
    }
  }
  
  console.log(`✓ Users migration complete (${users.length} records)`);
}

async function migrateEvents() {
  console.log('\n📤 Migrating events...');
  const events = readJSON('events.json');
  
  for (const event of events) {
    try {
      await db.createEvent({
        id: event.id,
        name: event.name,
        description: event.description || '',
        date: event.date,
        time: event.time,
        mode: event.mode,
        eliminationType: event.eliminationType || 'single',
        iconUrl: event.iconUrl || '',
        streamUrl: event.streamUrl || '',
        lobbyUrl: event.lobbyUrl || '',
        teamSize: event.teamSize || null,
        entryFee: event.entryFee || 0,
        prizePool: event.prizePool || {},
        prizes: event.prizes || {},
        status: event.status || 'upcoming',
        registrations: event.registrations || [],
        matches: event.matches || [],
        bracket: event.bracket || null,
        loserBracket: event.loserBracket || null,
        winner: event.winner || null,
        createdAt: event.createdAt || new Date()
      });
      console.log(`  ✓ Imported event: ${event.name}`);
    } catch (error) {
      if (error.code === '23505') {
        console.log(`  ⚠️  Event ${event.name} already exists, skipping...`);
      } else {
        console.error(`  ✗ Failed to import event ${event.name}:`, error.message);
      }
    }
  }
  
  console.log(`✓ Events migration complete (${events.length} records)`);
}

async function migrateTeams() {
  console.log('\n📤 Migrating teams...');
  const teams = readJSON('teams.json');
  
  for (const team of teams) {
    try {
      await db.createTeam({
        id: team.id,
        name: team.name,
        description: team.description || '',
        motto: team.motto || '',
        captainId: team.captainId,
        members: team.members || [],
        inviteCode: team.inviteCode,
        createdAt: team.createdAt || new Date()
      });
      console.log(`  ✓ Imported team: ${team.name}`);
    } catch (error) {
      if (error.code === '23505') {
        console.log(`  ⚠️  Team ${team.name} already exists, skipping...`);
      } else {
        console.error(`  ✗ Failed to import team ${team.name}:`, error.message);
      }
    }
  }
  
  console.log(`✓ Teams migration complete (${teams.length} records)`);
}

async function migrateTickets() {
  console.log('\n📤 Migrating tickets...');
  const tickets = readJSON('tickets.json');
  
  for (const ticket of tickets) {
    try {
      await db.createTicket({
        id: ticket.id,
        userId: ticket.userId,
        username: ticket.username,
        subject: ticket.subject,
        message: ticket.message,
        status: ticket.status || 'open',
        responses: ticket.responses || [],
        messages: ticket.messages || [],
        hasUnreadResponse: ticket.hasUnreadResponse || false,
        createdAt: ticket.createdAt || new Date()
      });
      console.log(`  ✓ Imported ticket: ${ticket.subject}`);
    } catch (error) {
      if (error.code === '23505') {
        console.log(`  ⚠️  Ticket already exists, skipping...`);
      } else {
        console.error(`  ✗ Failed to import ticket:`, error.message);
      }
    }
  }
  
  console.log(`✓ Tickets migration complete (${tickets.length} records)`);
}

async function migrateChatMessages() {
  console.log('\n📤 Migrating chat messages...');
  const messages = readJSON('chat.json');
  
  for (const msg of messages) {
    try {
      await db.createChatMessage({
        id: msg.id || Date.now().toString() + Math.random().toString(36).substring(2, 9),
        userId: msg.userId,
        username: msg.username,
        message: msg.message,
        isAdmin: msg.isAdmin || false,
        room: msg.room || 'global',
        timestamp: msg.timestamp || new Date()
      });
    } catch (error) {
      console.error(`  ✗ Failed to import chat message:`, error.message);
    }
  }
  
  console.log(`✓ Chat messages migration complete (${messages.length} records)`);
}

async function migrateTournamentChat() {
  console.log('\n📤 Migrating tournament chat...');
  const messages = readJSON('tournament-chat.json');
  
  for (const msg of messages) {
    try {
      await db.createTournamentChatMessage({
        id: msg.id || Date.now().toString() + Math.random().toString(36).substring(2, 9),
        userId: msg.userId,
        username: msg.username,
        message: msg.message,
        isAdmin: msg.isAdmin || false,
        isCaptain: msg.isCaptain || false,
        teamId: msg.teamId || null,
        room: msg.room,
        timestamp: msg.timestamp || new Date()
      });
    } catch (error) {
      console.error(`  ✗ Failed to import tournament chat message:`, error.message);
    }
  }
  
  console.log(`✓ Tournament chat migration complete (${messages.length} records)`);
}

async function migrateResetTokens() {
  console.log('\n📤 Migrating reset tokens...');
  const tokens = readJSON('reset-tokens.json');
  
  for (const token of tokens) {
    try {
      await db.createResetToken({
        token: token.token,
        userId: token.userId,
        email: token.email,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt || new Date()
      });
    } catch (error) {
      if (error.code === '23505') {
        console.log(`  ⚠️  Token already exists, skipping...`);
      } else {
        console.error(`  ✗ Failed to import reset token:`, error.message);
      }
    }
  }
  
  console.log(`✓ Reset tokens migration complete (${tokens.length} records)`);
}

async function migratePushSubscriptions() {
  console.log('\n📤 Migrating push subscriptions...');
  const subscriptions = readJSON('push-subscriptions.json');
  
  for (const sub of subscriptions) {
    try {
      await db.createPushSubscription({
        userId: sub.userId,
        subscription: sub.subscription,
        createdAt: sub.createdAt || new Date()
      });
    } catch (error) {
      console.error(`  ✗ Failed to import push subscription:`, error.message);
    }
  }
  
  console.log(`✓ Push subscriptions migration complete (${subscriptions.length} records)`);
}

async function runMigration() {
  console.log('🚀 Starting data migration from JSON to PostgreSQL...\n');
  console.log(`📁 Reading from: ${DATA_DIR}\n`);
  
  try {
    // Test database connection
    await db.query('SELECT NOW()');
    console.log('✓ Database connection successful\n');
    
    // Run migrations in order
    await migrateUsers();
    await migrateTeams();
    await migrateEvents();
    await migrateTickets();
    await migrateChatMessages();
    await migrateTournamentChat();
    await migrateResetTokens();
    await migratePushSubscriptions();
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify data in your PostgreSQL database');
    console.log('2. Update server.js to use the new database');
    console.log('3. Test all features thoroughly');
    console.log('4. Deploy to Render.com\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
  } finally {
    // Close database connection
    await db.pool.end();
    process.exit(0);
  }
}

// Run migration
runMigration();