const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const cron = require('node-cron');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'slovak_patriot_secret_2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

// Middleware to check if user is admin
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ ok: false, message: 'Admin access required' });
  }
}

// --- WEBSOCKET CHAT ---
const chatClients = new Map();

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'auth') {
        chatClients.set(data.userId, { 
          ws, 
          username: data.username, 
          isAdmin: data.isAdmin,
          isCaptain: data.isCaptain || false,
          teamId: data.teamId || null,
          currentRoom: data.room || 'global'
        });
        
        if (data.room && data.room.startsWith('ticket-')) {
          const ticketId = data.room.split('-')[1];
          const ticket = await db.findTicketById(ticketId);
          if (ticket) {
            ws.send(JSON.stringify({ type: 'history', messages: ticket.messages || [] }));
          }
        } else if (data.room && data.room.startsWith('tournament-')) {
          const messages = await db.getTournamentChatMessages(data.room);
          ws.send(JSON.stringify({ type: 'history', messages }));
        } else if (data.room && data.room.startsWith('team-')) {
          const messages = await db.getTournamentChatMessages(data.room);
          ws.send(JSON.stringify({ type: 'history', messages }));
        } else if (data.room && data.room.startsWith('match-')) {
          const messages = await db.getTournamentChatMessages(data.room);
          ws.send(JSON.stringify({ type: 'history', messages }));
        } else {
          const messages = await db.getChatMessages('global');
          ws.send(JSON.stringify({ type: 'history', messages }));
        }

      } else if (data.type === 'message') {
        const chatMessage = {
          id: Date.now().toString(),
          userId: data.userId,
          username: data.username,
          message: data.message,
          isAdmin: data.isAdmin || false,
          isCaptain: data.isCaptain || false,
          teamId: data.teamId || null,
          room: data.room || 'global',
          timestamp: new Date().toISOString()
        };

        const room = data.room || 'global';

        if (room.startsWith('ticket-')) {
          const ticketId = room.split('-')[1];
          const ticket = await db.findTicketById(ticketId);
          
          if (ticket) {
            ticket.messages = ticket.messages || [];
            ticket.messages.push(chatMessage);
            
            if (data.isAdmin) {
              ticket.hasUnreadResponse = true;
              ticket.responses = ticket.responses || [];
              ticket.responses.push({
                message: data.message,
                respondedBy: data.username,
                respondedAt: new Date().toISOString()
              });
            }
            
            await db.updateTicket(ticketId, {
              messages: ticket.messages,
              responses: ticket.responses,
              hasUnreadResponse: ticket.hasUnreadResponse
            });

            broadcastToRoom(room, { type: 'message', message: chatMessage });
          }

        } else if (room.startsWith('tournament-') || room.startsWith('team-') || room.startsWith('match-')) {
          await db.createTournamentChatMessage(chatMessage);
          
          if (room === 'tournament-admin') {
            broadcastToRoom('tournament-admin', { type: 'message', message: chatMessage });
            broadcastToCaptains({ type: 'message', message: chatMessage });
          } else if (room.startsWith('team-')) {
            broadcastToRoom(room, { type: 'message', message: chatMessage });
          } else if (room.startsWith('match-')) {
            broadcastToRoom(room, { type: 'message', message: chatMessage });
            broadcastToAdmins({ type: 'message', message: chatMessage });
          }

        } else {
          await db.createChatMessage(chatMessage);
          broadcastToRoom('global', { type: 'message', message: chatMessage });
          broadcastNotification({ type: 'new_message', message: chatMessage });
        }
      } else if (data.type === 'checkin_status') {
        broadcastToAll({ type: 'checkin_update', eventId: data.eventId, userId: data.userId, checkedIn: data.checkedIn });
      }
    } catch (error) {
      console.error('WebSocket error:', error);
    }
  });

  ws.on('close', () => {
    for (const [userId, client] of chatClients.entries()) {
      if (client.ws === ws) {
        chatClients.delete(userId);
        break;
      }
    }
  });
});

function broadcastToRoom(room, data) {
  wss.clients.forEach(client => {
    let clientInfo = null;
    for (const [uid, info] of chatClients.entries()) {
      if (info.ws === client) {
        clientInfo = info;
        break;
      }
    }
    
    if (client.readyState === WebSocket.OPEN && clientInfo && clientInfo.currentRoom === room) {
      client.send(JSON.stringify(data));
    }
  });
}

function broadcastToCaptains(data) {
  wss.clients.forEach(client => {
    let clientInfo = null;
    for (const [uid, info] of chatClients.entries()) {
      if (info.ws === client) {
        clientInfo = info;
        break;
      }
    }
    
    if (client.readyState === WebSocket.OPEN && clientInfo && clientInfo.isCaptain) {
      client.send(JSON.stringify(data));
    }
  });
}

function broadcastToAdmins(data) {
  wss.clients.forEach(client => {
    let clientInfo = null;
    for (const [uid, info] of chatClients.entries()) {
      if (info.ws === client) {
        clientInfo = info;
        break;
      }
    }
    
    if (client.readyState === WebSocket.OPEN && clientInfo && clientInfo.isAdmin) {
      client.send(JSON.stringify(data));
    }
  });
}

function broadcastToAll(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

function broadcastNotification(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// --- SCHEDULED TASKS ---
cron.schedule('0 * * * *', async () => {
  console.log('Running event cleanup job...');
  try {
    const events = await db.getAllEvents();
    const now = new Date();
    
    for (const event of events) {
      if (event.status === 'finished' && event.finished_at) {
        const finishedTime = new Date(event.finished_at);
        const hoursDiff = (now - finishedTime) / (1000 * 60 * 60);
        if (hoursDiff >= 24) {
          await db.deleteEvent(event.id);
          console.log(`Deleted old event: ${event.name}`);
        }
      }
    }
  } catch (error) {
    console.error('Event cleanup error:', error);
  }
});

cron.schedule('0 * * * *', async () => {
  console.log('Running ticket cleanup job...');
  try {
    const tickets = await db.getAllTickets();
    const now = new Date();
    
    for (const ticket of tickets) {
      if (ticket.status === 'closed' && ticket.closed_at) {
        const closedTime = new Date(ticket.closed_at);
        const hoursDiff = (now - closedTime) / (1000 * 60 * 60);
        if (hoursDiff >= 48) {
          await db.query('DELETE FROM tickets WHERE id = $1', [ticket.id]);
          console.log(`Deleted old ticket: ${ticket.subject}`);
        }
      }
    }
  } catch (error) {
    console.error('Ticket cleanup error:', error);
  }
});

// --- AUTHENTICATION ROUTES ---

app.get('/session', async (req, res) => {
  if (req.session.user) {
    try {
      const user = await db.findUserById(req.session.user.id);
      
      return res.json({
        loggedIn: true,
        user: {
          id: req.session.user.id,
          username: req.session.user.username,
          email: req.session.user.email,
          isAdmin: req.session.user.isAdmin || false,
          teamId: req.session.user.teamId || null,
          status: req.session.user.status || 'active',
          wallet: user ? (user.wallet || 0) : 0
        }
      });
    } catch (error) {
      console.error('Session error:', error);
      return res.json({ loggedIn: false });
    }
  }
  res.json({ loggedIn: false });
});

app.post('/signup', async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  if (!username || !email || !password || !confirmPassword) {
    return res.status(400).json({ ok: false, message: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ ok: false, message: 'Passwords do not match' });
  }

  if (password.length < 4) {
    return res.status(400).json({ ok: false, message: 'Password must be at least 4 characters' });
  }

  try {
    const existingUsername = await db.findUserByUsername(username);
    if (existingUsername) {
      return res.status(400).json({ ok: false, message: 'Username already exists' });
    }

    const existingEmail = await db.findUserByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ ok: false, message: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await db.createUser({
      id: Date.now().toString(),
      username,
      email,
      passwordHash,
      isAdmin: false,
      teamId: null,
      status: 'active',
      wallet: 0,
      transactions: [],
      registeredEvents: [],
      createdAt: new Date()
    });

    res.json({ ok: true, message: 'Registration successful' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ ok: false, message: 'Registration failed' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ ok: false, message: 'Username and password required' });
  }

  try {
    let user = await db.findUserByUsername(username);
    if (!user) {
      user = await db.findUserByEmail(username);
    }

    if (!user) {
      return res.status(400).json({ ok: false, message: 'User not found' });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ ok: false, message: 'Your account has been banned', banned: true });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ ok: false, message: 'Invalid password' });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.is_admin,
      teamId: user.team_id,
      status: user.status
    };

    res.json({ ok: true, message: 'Login successful', isAdmin: user.is_admin });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ ok: false, message: 'Login failed' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    res.json({ ok: true });
  });
});

// --- WALLET ROUTES ---

app.get('/wallet', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false, message: 'Not logged in' });
  }

  try {
    const user = await db.findUserById(req.session.user.id);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    res.json({ ok: true, balance: user.wallet || 0 });
  } catch (error) {
    console.error('Wallet error:', error);
    res.status(500).json({ ok: false, message: 'Failed to get wallet balance' });
  }
});

app.post('/wallet/purchase', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false, message: 'Not logged in' });
  }

  const { amount, price, paymentMethod } = req.body;

  if (!amount || !price || !paymentMethod) {
    return res.status(400).json({ ok: false, message: 'Missing required fields' });
  }

  try {
    const user = await db.findUserById(req.session.user.id);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    let bonusCredits = 0;
    if (amount >= 250) bonusCredits = Math.floor(amount * 0.1);
    if (amount >= 500) bonusCredits = Math.floor(amount * 0.2);
    if (amount >= 1000) bonusCredits = Math.floor(amount * 0.25);
    if (amount >= 2500) bonusCredits = Math.floor(amount * 0.3);
    if (amount >= 5000) bonusCredits = Math.floor(amount * 0.4);

    const totalCredits = amount + bonusCredits;
    const newWallet = (user.wallet || 0) + totalCredits;
    
    const transactions = user.transactions || [];
    transactions.push({
      type: 'Purchase',
      amount: totalCredits,
      price: price,
      paymentMethod: paymentMethod,
      timestamp: new Date().toISOString()
    });

    await db.updateUser(user.id, {
      wallet: newWallet,
      transactions: transactions
    });

    res.json({ 
      ok: true, 
      message: `Successfully purchased ${amount} credits${bonusCredits > 0 ? ` + ${bonusCredits} bonus` : ''}!`,
      newBalance: newWallet
    });
  } catch (error) {
    console.error('Purchase error:', error);
    res.status(500).json({ ok: false, message: 'Purchase failed' });
  }
});

app.get('/wallet/transactions', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false, message: 'Not logged in' });
  }

  try {
    const user = await db.findUserById(req.session.user.id);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    res.json({ ok: true, transactions: user.transactions || [] });
  } catch (error) {
    console.error('Transactions error:', error);
    res.status(500).json({ ok: false, message: 'Failed to get transactions' });
  }
});

app.post('/wallet/claim', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false, message: 'Not logged in' });
  }

  const { eventId } = req.body;
  
  try {
    const user = await db.findUserById(req.session.user.id);
    const event = await db.findEventById(eventId);

    if (!user || !event) {
      return res.status(404).json({ ok: false, message: 'User or event not found' });
    }

    if (!event.prizes || !event.prizes[user.id]) {
      return res.status(400).json({ ok: false, message: 'No prize to claim' });
    }

    const prizeAmount = event.prizes[user.id];
    const newWallet = (user.wallet || 0) + prizeAmount;
    
    delete event.prizes[user.id];

    await db.updateUser(user.id, { wallet: newWallet });
    await db.updateEvent(eventId, { prizes: event.prizes });

    res.json({ ok: true, message: `Claimed ${prizeAmount} credits!`, newBalance: newWallet });
  } catch (error) {
    console.error('Claim error:', error);
    res.status(500).json({ ok: false, message: 'Failed to claim prize' });
  }
});

// --- PASSWORD RESET ROUTES ---

app.post('/password-reset/request', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ ok: false, message: 'Email required' });
  }

  try {
    const user = await db.findUserByEmail(email);

    if (!user) {
      return res.json({ ok: true, message: 'If the email exists, a reset link has been sent' });
    }

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    await db.createResetToken({
      token,
      userId: user.id,
      email: user.email,
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date()
    });

    console.log('=== PASSWORD RESET EMAIL ===');
    console.log(`To: ${user.email}`);
    console.log(`Reset Link: http://localhost:${PORT}/undersites/password-reset.html?token=${token}`);
    console.log('===========================');

    res.json({ ok: true, message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ ok: false, message: 'Failed to process reset request' });
  }
});

app.post('/password-reset/verify', async (req, res) => {
  const { token } = req.body;

  try {
    const resetToken = await db.findResetToken(token);

    if (!resetToken) {
      return res.status(400).json({ ok: false, message: 'Invalid token' });
    }

    const now = new Date();
    const expiresAt = new Date(resetToken.expires_at);

    if (now > expiresAt) {
      return res.status(400).json({ ok: false, message: 'Token expired' });
    }

    res.json({ ok: true, email: resetToken.email });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ ok: false, message: 'Failed to verify token' });
  }
});

app.post('/password-reset/reset', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ ok: false, message: 'Token and new password required' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ ok: false, message: 'Password must be at least 4 characters' });
  }

  try {
    const resetToken = await db.findResetToken(token);

    if (!resetToken) {
      return res.status(400).json({ ok: false, message: 'Invalid token' });
    }

    const now = new Date();
    const expiresAt = new Date(resetToken.expires_at);

    if (now > expiresAt) {
      return res.status(400).json({ ok: false, message: 'Token expired' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.updateUser(resetToken.user_id, { passwordHash });
    await db.deleteResetToken(token);

    res.json({ ok: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ ok: false, message: 'Failed to reset password' });
  }
});

// --- PUSH NOTIFICATION ROUTES ---

app.post('/notifications/subscribe', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false, message: 'Not logged in' });
  }

  const { subscription } = req.body;
  
  try {
    await db.createPushSubscription({
      userId: req.session.user.id,
      subscription,
      createdAt: new Date()
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ ok: false, message: 'Failed to subscribe' });
  }
});

app.post('/notifications/send', isAdmin, (req, res) => {
  const { title, message, userId } = req.body;

  console.log('=== PUSH NOTIFICATION ===');
  console.log(`Title: ${title}`);
  console.log(`Message: ${message}`);
  console.log(`To User: ${userId || 'All users'}`);
  console.log('========================');

  res.json({ ok: true, message: 'Notification sent (simulated)' });
});

// Continue in next response due to length...// EVENT ROUTES - Complete PostgreSQL Conversion
// Add these routes to server-postgres.js after the team routes

// Update event image (admin only)
app.post('/events/:eventId/image', isAdmin, async (req, res) => {
  const { iconUrl } = req.body;
  
  try {
    const event = await db.findEventById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    await db.updateEvent(event.id, { iconUrl: iconUrl || '../images/Background.png' });
    const updatedEvent = await db.findEventById(event.id);

    res.json({ ok: true, event: updatedEvent });
  } catch (error) {
    console.error('Update event image error:', error);
    res.status(500).json({ ok: false, message: 'Failed to update event image' });
  }
});

// Update event (admin only)
app.put('/events/:eventId', isAdmin, async (req, res) => {
  const { name, description, date, time, mode, eliminationType, streamUrl, lobbyUrl, teamSize } = req.body;
  
  try {
    const event = await db.findEventById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (date) updates.date = date;
    if (time) updates.time = time;
    if (mode) updates.mode = mode;
    if (eliminationType) updates.eliminationType = eliminationType;
    if (streamUrl !== undefined) updates.streamUrl = streamUrl;
    if (lobbyUrl !== undefined) updates.lobbyUrl = lobbyUrl;
    if (teamSize !== undefined && mode !== 'solo') {
      updates.teamSize = Math.min(Math.max(parseInt(teamSize), 1), 5);
    }

    await db.updateEvent(event.id, updates);
    const updatedEvent = await db.findEventById(event.id);

    res.json({ ok: true, event: updatedEvent });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ ok: false, message: 'Failed to update event' });
  }
});

// Register for event
app.post('/events/:eventId/register', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false, message: 'Not logged in' });
  }

  const { type } = req.body;
  
  try {
    const event = await db.findEventById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    if (event.status !== 'upcoming') {
      return res.status(400).json({ ok: false, message: 'Event is not open for registration' });
    }

    const user = await db.findUserById(req.session.user.id);

    if (user.status === 'banned' || user.status === 'suspended') {
      return res.status(403).json({ ok: false, message: 'Account restricted' });
    }

    const registrations = event.registrations || [];
    const alreadyRegistered = registrations.some(r => 
      r.userId === user.id || (r.teamId && r.teamId === user.team_id)
    );

    if (alreadyRegistered) {
      return res.status(400).json({ ok: false, message: 'Already registered' });
    }

    // Check if registration is closed
    const eventDateTime = new Date(`${event.date}T${event.time}`);
    const now = new Date();
    const minutesDiff = (eventDateTime - now) / (1000 * 60);

    if (minutesDiff < -5) {
      return res.status(400).json({ ok: false, message: 'Registration closed' });
    }

    // Handle entry fee
    if (event.entry_fee > 0) {
      if (type === 'team') {
        const team = await db.findTeamById(user.team_id);
        
        if (team.captain_id !== user.id) {
          return res.status(403).json({ ok: false, message: 'Only captain can register team for paid events' });
        }
        
        if ((user.wallet || 0) < event.entry_fee) {
          return res.status(400).json({ ok: false, message: `Insufficient funds. Entry fee: ${event.entry_fee} credits` });
        }
        
        const newWallet = (user.wallet || 0) - event.entry_fee;
        const transactions = user.transactions || [];
        transactions.push({
          type: `Event Entry Fee - ${event.name}`,
          amount: -event.entry_fee,
          timestamp: new Date().toISOString()
        });
        
        await db.updateUser(user.id, { wallet: newWallet, transactions });
      } else {
        if ((user.wallet || 0) < event.entry_fee) {
          return res.status(400).json({ ok: false, message: `Insufficient funds. Entry fee: ${event.entry_fee} credits` });
        }
        
        const newWallet = (user.wallet || 0) - event.entry_fee;
        const transactions = user.transactions || [];
        transactions.push({
          type: `Event Entry Fee - ${event.name}`,
          amount: -event.entry_fee,
          timestamp: new Date().toISOString()
        });
        
        await db.updateUser(user.id, { wallet: newWallet, transactions });
      }
    }

    if (type === 'team') {
      if (!user.team_id) {
        return res.status(400).json({ ok: false, message: 'Not in a team' });
      }

      const team = await db.findTeamById(user.team_id);

      if (team.captain_id !== user.id) {
        return res.status(403).json({ ok: false, message: 'Only captain can register team' });
      }

      if (event.team_size && team.members.length > event.team_size) {
        return res.status(400).json({ 
          ok: false, 
          message: `Team size exceeds limit. This event requires ${event.team_size} players per team.` 
        });
      }

      registrations.push({
        type: 'team',
        teamId: team.id,
        teamName: team.name,
        memberCount: team.members.length,
        captainId: user.id,
        registeredAt: new Date().toISOString(),
        checkedIn: false,
        paidEntry: event.entry_fee > 0
      });
    } else {
      registrations.push({
        type: 'solo',
        userId: user.id,
        username: user.username,
        registeredAt: new Date().toISOString(),
        checkedIn: false,
        paidEntry: event.entry_fee > 0
      });
    }

    await db.updateEvent(event.id, { registrations });

    const registeredEvents = user.registered_events || [];
    registeredEvents.push(event.id);
    await db.updateUser(user.id, { registeredEvents });

    res.json({ ok: true });
  } catch (error) {
    console.error('Register for event error:', error);
    res.status(500).json({ ok: false, message: 'Failed to register for event' });
  }
});

// Check-in for event
app.post('/events/:eventId/checkin', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false, message: 'Not logged in' });
  }

  try {
    const event = await db.findEventById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    const eventDateTime = new Date(`${event.date}T${event.time}`);
    const now = new Date();
    const minutesDiff = (eventDateTime - now) / (1000 * 60);

    if (minutesDiff > 10) {
      return res.status(400).json({ ok: false, message: 'Check-in opens 10 minutes before the event' });
    }

    const user = await db.findUserById(req.session.user.id);
    const registrations = event.registrations || [];

    const registration = registrations.find(r => 
      r.userId === user.id || (r.teamId && r.teamId === user.team_id)
    );

    if (!registration) {
      return res.status(400).json({ ok: false, message: 'Not registered' });
    }
    
    if (registration.type === 'team') {
      const team = await db.findTeamById(user.team_id);
      if (team.captain_id !== user.id) {
        return res.status(403).json({ ok: false, message: 'Only captain can check in' });
      }
    }

    registration.checkedIn = true;
    await db.updateEvent(event.id, { registrations });

    // Broadcast check-in status via WebSocket
    broadcastToAll({ 
      type: 'checkin_update', 
      eventId: event.id, 
      userId: user.id, 
      teamId: user.team_id,
      checkedIn: true 
    });

    res.json({ ok: true, message: 'Checked in successfully' });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ ok: false, message: 'Failed to check in' });
  }
});

// Unregister from event
app.post('/events/:eventId/unregister', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false, message: 'Not logged in' });
  }

  try {
    const event = await db.findEventById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    const eventDateTime = new Date(`${event.date}T${event.time}`);
    const now = new Date();
    const minutesDiff = (eventDateTime - now) / (1000 * 60);

    if (minutesDiff < 0) {
      return res.status(400).json({ ok: false, message: 'Cannot unregister after event start' });
    }

    const user = await db.findUserById(req.session.user.id);
    const registrations = event.registrations || [];

    // Find registration to check if entry was paid
    const registration = registrations.find(r => 
      r.userId === user.id || (r.teamId && r.teamId === user.team_id)
    );

    // Refund entry fee if paid
    if (registration && registration.paidEntry && event.entry_fee > 0) {
      const newWallet = (user.wallet || 0) + event.entry_fee;
      const transactions = user.transactions || [];
      transactions.push({
        type: `Event Entry Refund - ${event.name}`,
        amount: event.entry_fee,
        timestamp: new Date().toISOString()
      });
      
      await db.updateUser(user.id, { wallet: newWallet, transactions });
    }

    const updatedRegistrations = registrations.filter(r => 
      r.userId !== user.id && r.teamId !== user.team_id
    );

    await db.updateEvent(event.id, { registrations: updatedRegistrations });

    const registeredEvents = (user.registered_events || []).filter(id => id !== event.id);
    await db.updateUser(user.id, { registeredEvents });

    res.json({ ok: true });
  } catch (error) {
    console.error('Unregister error:', error);
    res.status(500).json({ ok: false, message: 'Failed to unregister' });
  }
});

// Update event status (admin only)
app.post('/events/:eventId/status', isAdmin, async (req, res) => {
  const { status, streamUrl, lobbyUrl } = req.body;
  
  try {
    const event = await db.findEventById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    const updates = { status };
    
    if (streamUrl !== undefined) {
      updates.streamUrl = streamUrl;
    }

    if (lobbyUrl !== undefined) {
      updates.lobbyUrl = lobbyUrl;
    }
    
    if (status === 'finished') {
      updates.finishedAt = new Date();
    }

    await db.updateEvent(event.id, updates);
    const updatedEvent = await db.findEventById(event.id);

    res.json({ ok: true, event: updatedEvent });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ ok: false, message: 'Failed to update status' });
  }
});

// Set event winner (admin only)
app.post('/events/:eventId/winner', isAdmin, async (req, res) => {
  const { winnerId, winnerName } = req.body;
  
  try {
    const event = await db.findEventById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    const winner = {
      id: winnerId,
      name: winnerName,
      announcedAt: new Date().toISOString()
    };

    await db.updateEvent(event.id, { winner });
    const updatedEvent = await db.findEventById(event.id);

    res.json({ ok: true, event: updatedEvent });
  } catch (error) {
    console.error('Set winner error:', error);
    res.status(500).json({ ok: false, message: 'Failed to set winner' });
  }
});

// Award prize (admin only)
app.post('/events/:eventId/award-prize', isAdmin, async (req, res) => {
  const { userId, amount } = req.body;
  
  try {
    const event = await db.findEventById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    const user = await db.findUserById(userId);

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    const newWallet = (user.wallet || 0) + amount;
    const transactions = user.transactions || [];
    transactions.push({
      type: `Prize - ${event.name}`,
      amount: amount,
      timestamp: new Date().toISOString()
    });
    
    await db.updateUser(user.id, { wallet: newWallet, transactions });

    const prizes = event.prizes || {};
    prizes[userId] = amount;
    await db.updateEvent(event.id, { prizes });

    // Notify user
    broadcastNotification({ 
      type: 'prize_awarded', 
      userId: userId, 
      amount: amount, 
      eventName: event.name 
    });

    res.json({ ok: true, message: `Awarded ${amount} credits to ${user.username}` });
  } catch (error) {
    console.error('Award prize error:', error);
    res.status(500).json({ ok: false, message: 'Failed to award prize' });
  }
});

// Generate bracket (admin only)
app.post('/events/:eventId/bracket/generate', isAdmin, async (req, res) => {
  try {
    const event = await db.findEventById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    const registrations = event.registrations || [];
    const participants = registrations.map((r, index) => ({
      id: r.userId || r.teamId,
      name: r.username || r.teamName,
      seed: index + 1,
      checkedIn: r.checkedIn
    }));

    const rounds = Math.max(2, Math.ceil(Math.log2(participants.length)));
    const bracket = [];

    for (let round = 0; round < rounds; round++) {
      const matchesInRound = Math.pow(2, rounds - round - 1);
      const roundMatches = [];

      for (let match = 0; match < matchesInRound; match++) {
        if (round === 0) {
          const p1Index = match * 2;
          const p2Index = match * 2 + 1;
          
          roundMatches.push({
            matchId: `R${round}-M${match}`,
            round: round,
            participant1: participants[p1Index] || null,
            participant2: participants[p2Index] || null,
            winner: null,
            scheduledTime: null
          });
        } else {
          roundMatches.push({
            matchId: `R${round}-M${match}`,
            round: round,
            participant1: null,
            participant2: null,
            winner: null,
            scheduledTime: null
          });
        }
      }

      bracket.push(roundMatches);
    }

    let loserBracket = null;
    
    // Generate loser bracket for double elimination
    if (event.elimination_type === 'double') {
      const loserRounds = rounds - 1;
      loserBracket = [];
      
      for (let round = 0; round < loserRounds; round++) {
        const matchesInRound = Math.pow(2, loserRounds - round - 1);
        const roundMatches = [];
        
        for (let match = 0; match < matchesInRound; match++) {
          roundMatches.push({
            matchId: `LR${round}-M${match}`,
            round: round,
            participant1: null,
            participant2: null,
            winner: null,
            scheduledTime: null
          });
        }
        
        loserBracket.push(roundMatches);
      }
    }
    
    await db.updateEvent(event.id, { bracket, loserBracket });

    res.json({ ok: true, bracket, loserBracket });
  } catch (error) {
    console.error('Generate bracket error:', error);
    res.status(500).json({ ok: false, message: 'Failed to generate bracket' });
  }
});

// Update match result (admin only)
app.post('/events/:eventId/matches/:matchId/result', isAdmin, async (req, res) => {
  const { winnerId } = req.body;
  
  try {
    const event = await db.findEventById(req.params.eventId);

    if (!event || !event.bracket) {
      return res.status(404).json({ ok: false, message: 'Event or bracket not found' });
    }

    let matchFound = false;
    let loser = null;
    const bracket = event.bracket;
    const loserBracket = event.loser_bracket;
    
    // Check winner bracket
    for (const round of bracket) {
      const match = round.find(m => m.matchId === req.params.matchId);
      if (match) {
        const winner = match.participant1?.id === winnerId ? match.participant1 : match.participant2;
        loser = match.participant1?.id === winnerId ? match.participant2 : match.participant1;
        match.winner = winner;
        matchFound = true;

        // Advance winner to next round
        const nextRound = bracket[match.round + 1];
        if (nextRound) {
          const nextMatchIndex = Math.floor(round.indexOf(match) / 2);
          const nextMatch = nextRound[nextMatchIndex];
          if (!nextMatch.participant1) {
            nextMatch.participant1 = winner;
          } else {
            nextMatch.participant2 = winner;
          }
        }
        
        // For double elimination, send loser to loser bracket
        if (event.elimination_type === 'double' && loserBracket && loser) {
          const loserRound = loserBracket[match.round];
          if (loserRound) {
            const loserMatch = loserRound.find(m => !m.participant1 || !m.participant2);
            if (loserMatch) {
              if (!loserMatch.participant1) {
                loserMatch.participant1 = loser;
              } else {
                loserMatch.participant2 = loser;
              }
            }
          }
        }
        
        break;
      }
    }
    
    // Check loser bracket if not found in winner bracket
    if (!matchFound && loserBracket) {
      for (const round of loserBracket) {
        const match = round.find(m => m.matchId === req.params.matchId);
        if (match) {
          const winner = match.participant1?.id === winnerId ? match.participant1 : match.participant2;
          match.winner = winner;
          matchFound = true;

          // Advance winner in loser bracket
          const nextRound = loserBracket[match.round + 1];
          if (nextRound) {
            const nextMatchIndex = Math.floor(round.indexOf(match) / 2);
            const nextMatch = nextRound[nextMatchIndex];
            if (!nextMatch.participant1) {
              nextMatch.participant1 = winner;
            } else {
              nextMatch.participant2 = winner;
            }
          }
          break;
        }
      }
    }

    if (!matchFound) {
      return res.status(404).json({ ok: false, message: 'Match not found' });
    }

    await db.updateEvent(event.id, { bracket, loserBracket });

    res.json({ ok: true, bracket, loserBracket });
  } catch (error) {
    console.error('Update match result error:', error);
    res.status(500).json({ ok: false, message: 'Failed to update match result' });
  }
});

// Schedule match (admin only)
app.post('/events/:eventId/matches/:matchId/schedule', isAdmin, async (req, res) => {
  const { scheduledTime } = req.body;
  
  try {
    const event = await db.findEventById(req.params.eventId);

    if (!event || !event.bracket) {
      return res.status(404).json({ ok: false, message: 'Event or bracket not found' });
    }

    let matchFound = false;
    const bracket = event.bracket;
    const loserBracket = event.loser_bracket;
    
    for (const round of bracket) {
      const match = round.find(m => m.matchId === req.params.matchId);
      if (match) {
        match.scheduledTime = scheduledTime;
        matchFound = true;
        break;
      }
    }
    
    if (!matchFound && loserBracket) {
      for (const round of loserBracket) {
        const match = round.find(m => m.matchId === req.params.matchId);
        if (match) {
          match.scheduledTime = scheduledTime;
          matchFound = true;
          break;
        }
      }
    }

    if (!matchFound) {
      return res.status(404).json({ ok: false, message: 'Match not found' });
    }

    await db.updateEvent(event.id, { bracket, loserBracket });

    res.json({ ok: true });
  } catch (error) {
    console.error('Schedule match error:', error);
    res.status(500).json({ ok: false, message: 'Failed to schedule match' });
  }
});

// Manually update match participants (admin only)
app.post('/events/:eventId/matches/:matchId/update', isAdmin, async (req, res) => {
  const { participant1Id, participant2Id } = req.body;
  
  try {
    const event = await db.findEventById(req.params.eventId);

    if (!event || !event.bracket) {
      return res.status(404).json({ ok: false, message: 'Event or bracket not found' });
    }

    const getParticipant = (id) => {
      if (!id) return null;
      const registrations = event.registrations || [];
      const reg = registrations.find(r => r.userId === id || r.teamId === id);
      if (!reg) return null;
      return {
        id: reg.userId || reg.teamId,
        name: reg.username || reg.teamName,
        checkedIn: reg.checkedIn
      };
    };

    let matchFound = false;
    const bracket = event.bracket;
    
    for (const round of bracket) {
      const match = round.find(m => m.matchId === req.params.matchId);
      if (match) {
        if (participant1Id !== undefined) match.participant1 = getParticipant(participant1Id);
        if (participant2Id !== undefined) match.participant2 = getParticipant(participant2Id);
        matchFound = true;
        break;
      }
    }

    if (!matchFound) {
      return res.status(404).json({ ok: false, message: 'Match not found' });
    }

    await db.updateEvent(event.id, { bracket });

    res.json({ ok: true, bracket });
  } catch (error) {
    console.error('Update match participants error:', error);
    res.status(500).json({ ok: false, message: 'Failed to update match participants' });
  }
});

// Delete event (admin only)
app.delete('/events/:eventId', isAdmin, async (req, res) => {
  try {
    await db.deleteEvent(req.params.eventId);
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ ok: false, message: 'Failed to delete event' });
  }
});// TICKET ROUTES - Complete PostgreSQL Conversion
// Add these routes to server-postgres.js after the event routes

// Create ticket
app.post('/tickets/create', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false, message: 'Please login to submit a support ticket' });
  }

  const { subject, message } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ ok: false, message: 'Subject and message required' });
  }

  try {
    const newTicket = await db.createTicket({
      id: Date.now().toString(),
      userId: req.session.user.id,
      username: req.session.user.username,
      subject,
      message,
      status: 'open',
      responses: [],
      messages: [
        {
          id: Date.now().toString(),
          userId: req.session.user.id,
          username: req.session.user.username,
          message: message,
          isAdmin: false,
          timestamp: new Date().toISOString()
        }
      ],
      hasUnreadResponse: false,
      createdAt: new Date()
    });

    // Notify admins about new ticket
    broadcastToAdmins({ 
      type: 'new_ticket', 
      ticket: newTicket 
    });

    res.json({ ok: true, ticket: newTicket });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ ok: false, message: 'Failed to create ticket' });
  }
});

// Get user's tickets
app.get('/tickets/my', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false, message: 'Not logged in' });
  }

  try {
    const userTickets = await db.findTicketsByUserId(req.session.user.id);
    res.json({ ok: true, tickets: userTickets });
  } catch (error) {
    console.error('Get user tickets error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load tickets' });
  }
});

// Mark ticket responses as read
app.post('/tickets/:ticketId/mark-read', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false, message: 'Not logged in' });
  }

  try {
    const ticket = await db.findTicketById(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({ ok: false, message: 'Ticket not found' });
    }

    if (ticket.user_id !== req.session.user.id) {
      return res.status(403).json({ ok: false, message: 'Unauthorized' });
    }

    await db.updateTicket(ticket.id, { hasUnreadResponse: false });

    res.json({ ok: true });
  } catch (error) {
    console.error('Mark ticket as read error:', error);
    res.status(500).json({ ok: false, message: 'Failed to mark ticket as read' });
  }
});

// Get all tickets (admin only)
app.get('/tickets', isAdmin, async (req, res) => {
  try {
    const tickets = await db.getAllTickets();
    res.json({ ok: true, tickets });
  } catch (error) {
    console.error('Get all tickets error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load tickets' });
  }
});

// Respond to ticket (admin only)
app.post('/tickets/:ticketId/respond', isAdmin, async (req, res) => {
  const { message } = req.body;
  
  try {
    const ticket = await db.findTicketById(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({ ok: false, message: 'Ticket not found' });
    }

    const responses = ticket.responses || [];
    responses.push({
      message,
      respondedBy: req.session.user.username,
      respondedAt: new Date().toISOString()
    });
    
    const messages = ticket.messages || [];
    messages.push({
      id: Date.now().toString(),
      userId: req.session.user.id,
      username: req.session.user.username,
      message: message,
      isAdmin: true,
      timestamp: new Date().toISOString()
    });

    await db.updateTicket(ticket.id, {
      responses,
      messages,
      hasUnreadResponse: true
    });

    const updatedTicket = await db.findTicketById(ticket.id);

    res.json({ ok: true, ticket: updatedTicket });
  } catch (error) {
    console.error('Respond to ticket error:', error);
    res.status(500).json({ ok: false, message: 'Failed to respond to ticket' });
  }
});

// Close ticket (admin only)
app.post('/tickets/:ticketId/close', isAdmin, async (req, res) => {
  try {
    const ticket = await db.findTicketById(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({ ok: false, message: 'Ticket not found' });
    }

    await db.updateTicket(ticket.id, {
      status: 'closed',
      closedAt: new Date()
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Close ticket error:', error);
    res.status(500).json({ ok: false, message: 'Failed to close ticket' });
  }
});

// Reopen ticket (admin only)
app.post('/tickets/:ticketId/reopen', isAdmin, async (req, res) => {
  try {
    const ticket = await db.findTicketById(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({ ok: false, message: 'Ticket not found' });
    }

    await db.updateTicket(ticket.id, {
      status: 'open',
      closedAt: null
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Reopen ticket error:', error);
    res.status(500).json({ ok: false, message: 'Failed to reopen ticket' });
  }
});// ADMIN ROUTES - Complete PostgreSQL Conversion
// Add these routes to server-postgres.js after the ticket routes

// Get all users (admin only)
app.get('/admin/users', isAdmin, async (req, res) => {
  try {
    const users = await db.getAllUsers();
    const safeUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      status: u.status,
      teamId: u.team_id,
      wallet: u.wallet || 0,
      registeredEvents: u.registered_events || [],
      createdAt: u.created_at
    }));

    res.json({ ok: true, users: safeUsers });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load users' });
  }
});

// Get all teams (admin only)
app.get('/admin/teams', isAdmin, async (req, res) => {
  try {
    const teams = await db.getAllTeams();

    const teamsWithDetails = await Promise.all(
      teams.map(async (team) => {
        const captain = await db.findUserById(team.captain_id);
        const memberDetails = await Promise.all(
          team.members.map(async (memberId) => {
            const member = await db.findUserById(memberId);
            return {
              id: member.id,
              username: member.username
            };
          })
        );

        return {
          ...team,
          captainName: captain ? captain.username : 'Unknown',
          memberDetails
        };
      })
    );

    res.json({ ok: true, teams: teamsWithDetails });
  } catch (error) {
    console.error('Get all teams error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load teams' });
  }
});

// Delete team (admin only)
app.delete('/admin/teams/:teamId', isAdmin, async (req, res) => {
  try {
    const team = await db.findTeamById(req.params.teamId);

    if (!team) {
      return res.status(404).json({ ok: false, message: 'Team not found' });
    }

    // Remove team from all members
    for (const memberId of team.members) {
      await db.updateUser(memberId, { teamId: null });
    }

    // Delete team
    await db.deleteTeam(team.id);

    res.json({ ok: true });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ ok: false, message: 'Failed to delete team' });
  }
});

// Ban user (admin only)
app.post('/admin/users/:userId/ban', isAdmin, async (req, res) => {
  try {
    const user = await db.findUserById(req.params.userId);

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    await db.updateUser(user.id, { status: 'banned' });

    res.json({ ok: true });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ ok: false, message: 'Failed to ban user' });
  }
});

// Suspend user (admin only)
app.post('/admin/users/:userId/suspend', isAdmin, async (req, res) => {
  try {
    const user = await db.findUserById(req.params.userId);

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    await db.updateUser(user.id, { status: 'suspended' });

    res.json({ ok: true });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ ok: false, message: 'Failed to suspend user' });
  }
});

// Activate user (admin only)
app.post('/admin/users/:userId/activate', isAdmin, async (req, res) => {
  try {
    const user = await db.findUserById(req.params.userId);

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    await db.updateUser(user.id, { status: 'active' });

    res.json({ ok: true });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ ok: false, message: 'Failed to activate user' });
  }
});

// Delete user account (admin only)
app.delete('/admin/users/:userId', isAdmin, async (req, res) => {
  try {
    await db.deleteUser(req.params.userId);
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ ok: false, message: 'Failed to delete user' });
  }
});

// Admin: Add credits to user
app.post('/admin/users/:userId/add-credits', isAdmin, async (req, res) => {
  const { amount, reason } = req.body;
  
  try {
    const user = await db.findUserById(req.params.userId);

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ ok: false, message: 'Invalid amount' });
    }

    const newWallet = (user.wallet || 0) + parseInt(amount);
    const transactions = user.transactions || [];
    transactions.push({
      type: `Admin Credit (${reason || 'No reason provided'})`,
      amount: parseInt(amount),
      timestamp: new Date().toISOString()
    });

    await db.updateUser(user.id, { wallet: newWallet, transactions });

    res.json({ ok: true, message: `Added ${amount} credits to ${user.username}`, newBalance: newWallet });
  } catch (error) {
    console.error('Add credits error:', error);
    res.status(500).json({ ok: false, message: 'Failed to add credits' });
  }
});

// Admin: Remove credits from user
app.post('/admin/users/:userId/remove-credits', isAdmin, async (req, res) => {
  const { amount, reason } = req.body;
  
  try {
    const user = await db.findUserById(req.params.userId);

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ ok: false, message: 'Invalid amount' });
    }

    const removeAmount = parseInt(amount);
    const newWallet = Math.max(0, (user.wallet || 0) - removeAmount);
    const transactions = user.transactions || [];
    transactions.push({
      type: `Admin Deduction (${reason || 'No reason provided'})`,
      amount: -removeAmount,
      timestamp: new Date().toISOString()
    });

    await db.updateUser(user.id, { wallet: newWallet, transactions });

    res.json({ ok: true, message: `Removed ${amount} credits from ${user.username}`, newBalance: newWallet });
  } catch (error) {
    console.error('Remove credits error:', error);
    res.status(500).json({ ok: false, message: 'Failed to remove credits' });
  }
});

// Disqualify user from event (admin only) - NO REFUND
app.post('/admin/users/:userId/disqualify', isAdmin, async (req, res) => {
  const { eventId } = req.body;
  
  try {
    const event = await db.findEventById(eventId);

    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    const user = await db.findUserById(req.params.userId);

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    // NO REFUND on disqualification (money is lost)
    // Remove from registrations
    const registrations = event.registrations || [];
    const updatedRegistrations = registrations.filter(r => 
      r.userId !== user.id && r.teamId !== user.team_id
    );

    const disqualified = event.disqualified || [];
    disqualified.push({
      userId: user.id,
      username: user.username,
      disqualifiedAt: new Date().toISOString()
    });

    await db.updateEvent(event.id, { registrations: updatedRegistrations, disqualified });

    res.json({ ok: true, message: `${user.username} has been disqualified. Entry fee is NOT refunded.` });
  } catch (error) {
    console.error('Disqualify user error:', error);
    res.status(500).json({ ok: false, message: 'Failed to disqualify user' });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`Slovak Patriot server running at http://localhost:${PORT}`);
  console.log('WebSocket server is ready for chat connections');
  console.log('✓ Using PostgreSQL database for persistent storage');
});