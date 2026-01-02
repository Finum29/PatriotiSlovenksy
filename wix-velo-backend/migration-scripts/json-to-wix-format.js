// json-to-wix-format.js - Convert JSON files to Wix-compatible format
const fs = require('fs');
const path = require('path');

// Configuration
const INPUT_DIR = '../../uploads/SP_FINISHED_3/uploads/slovak-patriot';
const OUTPUT_DIR = './wix-formatted';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Convert date strings to ISO format
 */
function convertDate(dateString) {
  if (!dateString) return null;
  return new Date(dateString).toISOString();
}

/**
 * Generate new UUID (Wix-style)
 */
function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 15);
}

/**
 * Convert Users JSON to Wix format
 */
function convertUsers(inputFile, outputFile) {
  console.log('Converting users.json...');
  
  const users = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  
  const wixUsers = users.map(user => ({
    _id: user.id || generateId(),
    username: user.username,
    email: user.email,
    passwordHash: user.passwordHash,
    isAdmin: user.isAdmin || false,
    teamId: user.teamId || null,
    status: user.status || 'active',
    wallet: user.wallet || 0,
    transactions: user.transactions || [],
    registeredEvents: user.registeredEvents || [],
    createdAt: convertDate(user.createdAt) || new Date().toISOString()
  }));
  
  fs.writeFileSync(outputFile, JSON.stringify(wixUsers, null, 2));
  console.log(`✓ Converted ${wixUsers.length} users`);
  
  return wixUsers;
}

/**
 * Convert Events JSON to Wix format
 */
function convertEvents(inputFile, outputFile) {
  console.log('Converting events.json...');
  
  const events = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  
  const wixEvents = events.map(event => ({
    _id: event.id || generateId(),
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
    prizePool: event.prizePool || { first: 0, second: 0, third: 0 },
    prizes: event.prizes || {},
    status: event.status || 'upcoming',
    registrations: event.registrations || [],
    bracket: event.bracket || null,
    loserBracket: event.loserBracket || null,
    winner: event.winner || null,
    disqualified: event.disqualified || [],
    finishedAt: convertDate(event.finishedAt),
    createdAt: convertDate(event.createdAt) || new Date().toISOString()
  }));
  
  fs.writeFileSync(outputFile, JSON.stringify(wixEvents, null, 2));
  console.log(`✓ Converted ${wixEvents.length} events`);
  
  return wixEvents;
}

/**
 * Convert Teams JSON to Wix format
 */
function convertTeams(inputFile, outputFile) {
  console.log('Converting teams.json...');
  
  const teams = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  
  const wixTeams = teams.map(team => ({
    _id: team.id || generateId(),
    name: team.name,
    description: team.description || '',
    motto: team.motto || '',
    captainId: team.captainId,
    members: team.members || [],
    inviteCode: team.inviteCode,
    createdAt: convertDate(team.createdAt) || new Date().toISOString()
  }));
  
  fs.writeFileSync(outputFile, JSON.stringify(wixTeams, null, 2));
  console.log(`✓ Converted ${wixTeams.length} teams`);
  
  return wixTeams;
}

/**
 * Convert Tickets JSON to Wix format
 */
function convertTickets(inputFile, outputFile) {
  console.log('Converting tickets.json...');
  
  const tickets = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  
  const wixTickets = tickets.map(ticket => ({
    _id: ticket.id || generateId(),
    userId: ticket.userId,
    username: ticket.username,
    subject: ticket.subject,
    message: ticket.message,
    status: ticket.status || 'open',
    responses: ticket.responses || [],
    messages: ticket.messages || [],
    hasUnreadResponse: ticket.hasUnreadResponse || false,
    closedAt: convertDate(ticket.closedAt),
    createdAt: convertDate(ticket.createdAt) || new Date().toISOString()
  }));
  
  fs.writeFileSync(outputFile, JSON.stringify(wixTickets, null, 2));
  console.log(`✓ Converted ${wixTickets.length} tickets`);
  
  return wixTickets;
}

/**
 * Convert Chat JSON to Wix format
 */
function convertChat(inputFile, outputFile) {
  console.log('Converting chat.json...');
  
  const messages = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  
  const wixMessages = messages.map(msg => ({
    _id: msg.id || generateId(),
    userId: msg.userId,
    username: msg.username,
    message: msg.message,
    isAdmin: msg.isAdmin || false,
    room: msg.room || 'global',
    timestamp: convertDate(msg.timestamp) || new Date().toISOString()
  }));
  
  fs.writeFileSync(outputFile, JSON.stringify(wixMessages, null, 2));
  console.log(`✓ Converted ${wixMessages.length} chat messages`);
  
  return wixMessages;
}

/**
 * Convert Tournament Chat JSON to Wix format
 */
function convertTournamentChat(inputFile, outputFile) {
  console.log('Converting tournament-chat.json...');
  
  const messages = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  
  const wixMessages = messages.map(msg => ({
    _id: msg.id || generateId(),
    userId: msg.userId,
    username: msg.username,
    message: msg.message,
    isAdmin: msg.isAdmin || false,
    isCaptain: msg.isCaptain || false,
    teamId: msg.teamId || null,
    room: msg.room,
    timestamp: convertDate(msg.timestamp) || new Date().toISOString()
  }));
  
  fs.writeFileSync(outputFile, JSON.stringify(wixMessages, null, 2));
  console.log(`✓ Converted ${wixMessages.length} tournament chat messages`);
  
  return wixMessages;
}

/**
 * Convert Reset Tokens JSON to Wix format
 */
function convertResetTokens(inputFile, outputFile) {
  console.log('Converting reset-tokens.json...');
  
  const tokens = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  
  const wixTokens = tokens.map(token => ({
    _id: generateId(),
    token: token.token,
    userId: token.userId,
    email: token.email,
    expiresAt: convertDate(token.expiresAt),
    createdAt: convertDate(token.createdAt) || new Date().toISOString()
  }));
  
  fs.writeFileSync(outputFile, JSON.stringify(wixTokens, null, 2));
  console.log(`✓ Converted ${wixTokens.length} reset tokens`);
  
  return wixTokens;
}

/**
 * Convert Push Subscriptions JSON to Wix format
 */
function convertPushSubscriptions(inputFile, outputFile) {
  console.log('Converting push-subscriptions.json...');
  
  const subscriptions = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  
  const wixSubscriptions = subscriptions.map(sub => ({
    _id: generateId(),
    userId: sub.userId,
    subscription: sub.subscription,
    createdAt: convertDate(sub.createdAt) || new Date().toISOString()
  }));
  
  fs.writeFileSync(outputFile, JSON.stringify(wixSubscriptions, null, 2));
  console.log(`✓ Converted ${wixSubscriptions.length} push subscriptions`);
  
  return wixSubscriptions;
}

/**
 * Main conversion function
 */
function convertAll() {
  console.log('=== Starting JSON to Wix Format Conversion ===\n');
  
  try {
    // Convert each collection
    convertUsers(
      path.join(INPUT_DIR, 'users.json'),
      path.join(OUTPUT_DIR, 'Users.json')
    );
    
    convertEvents(
      path.join(INPUT_DIR, 'events.json'),
      path.join(OUTPUT_DIR, 'Events.json')
    );
    
    convertTeams(
      path.join(INPUT_DIR, 'teams.json'),
      path.join(OUTPUT_DIR, 'Teams.json')
    );
    
    convertTickets(
      path.join(INPUT_DIR, 'tickets.json'),
      path.join(OUTPUT_DIR, 'Tickets.json')
    );
    
    convertChat(
      path.join(INPUT_DIR, 'chat.json'),
      path.join(OUTPUT_DIR, 'ChatMessages.json')
    );
    
    convertTournamentChat(
      path.join(INPUT_DIR, 'tournament-chat.json'),
      path.join(OUTPUT_DIR, 'TournamentChat.json')
    );
    
    convertResetTokens(
      path.join(INPUT_DIR, 'reset-tokens.json'),
      path.join(OUTPUT_DIR, 'ResetTokens.json')
    );
    
    convertPushSubscriptions(
      path.join(INPUT_DIR, 'push-subscriptions.json'),
      path.join(OUTPUT_DIR, 'PushSubscriptions.json')
    );
    
    console.log('\n=== Conversion Complete! ===');
    console.log(`\nFormatted files saved to: ${OUTPUT_DIR}`);
    console.log('\nNext steps:');
    console.log('1. Review the converted files');
    console.log('2. Create collections in Wix Database');
    console.log('3. Import data using Wix Data API or CSV import');
    
  } catch (error) {
    console.error('\n❌ Conversion failed:', error.message);
    console.error('\nPlease check:');
    console.error('- Input files exist and are valid JSON');
    console.error('- You have read/write permissions');
    console.error('- File paths are correct');
  }
}

// Run conversion
convertAll();