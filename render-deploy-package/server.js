const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const cron = require('node-cron');
const db = require('./db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_51SikjgKSYFKQ4B5mKAeieaoE8xpHivnqiUPP9hAtxE3P8w9aDkwAmvL4HKUWwqdYRgijxgDBj47RDfj9297zbrbC00Z4emNkm5');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Middleware
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'slovak_patriot_secret_2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
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

// --- STRIPE PAYMENT ROUTES ---

const CREDIT_PACKAGES = [
  { id: 'starter', credits: 100, price: 10, bonus: 0 },
  { id: 'basic', credits: 250, price: 25, bonus: 25 },
  { id: 'pro', credits: 500, price: 45, bonus: 100 },
  { id: 'premium', credits: 1000, price: 80, bonus: 250 },
  { id: 'ultimate', credits: 2500, price: 180, bonus: 750 }
];

app.get('/api/payment/packages', (req, res) => {
  res.json({ 
    ok: true, 
    packages: CREDIT_PACKAGES.map(pkg => ({
      id: pkg.id,
      credits: pkg.credits,
      price: pkg.price,
      bonus: pkg.bonus,
      total: pkg.credits + pkg.bonus
    }))
  });
});

app.post('/api/payment/create-checkout', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false, message: 'Not logged in' });
  }

  const { packageId } = req.body;
  const package = CREDIT_PACKAGES.find(p => p.id === packageId);

  if (!package) {
    return res.status(400).json({ ok: false, message: 'Invalid package' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${package.credits} Credits${package.bonus > 0 ? ` + ${package.bonus} Bonus` : ''}`,
              description: `Slovak Patriot Tournament Credits`,
            },
            unit_amount: package.price * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/undersites/wallet.html`,
      metadata: {
        userId: req.session.user.id,
        username: req.session.user.username,
        packageId: package.id,
        credits: package.credits.toString(),
        bonus: package.bonus.toString()
      }
    });

    res.json({ ok: true, sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ ok: false, message: 'Failed to create checkout session' });
  }
});

app.post('/api/payment/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test'
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    try {
      const userId = session.metadata.userId;
      const credits = parseInt(session.metadata.credits);
      const bonus = parseInt(session.metadata.bonus);
      const totalCredits = credits + bonus;

      const user = await db.findUserById(userId);
      if (!user) {
        console.error('User not found:', userId);
        return res.status(404).json({ error: 'User not found' });
      }

      const newWallet = (user.wallet || 0) + totalCredits;
      const transactions = user.transactions || [];
      transactions.push({
        type: 'Stripe Purchase',
        amount: totalCredits,
        price: session.amount_total / 100,
        paymentMethod: 'Stripe',
        paymentId: session.payment_intent,
        timestamp: new Date().toISOString()
      });

      await db.updateUser(userId, {
        wallet: newWallet,
        transactions: transactions
      });

      console.log(`✓ Credits added: ${totalCredits} credits to user ${session.metadata.username}`);
    } catch (error) {
      console.error('Error processing payment:', error);
      return res.status(500).json({ error: 'Failed to process payment' });
    }
  }

  res.json({ received: true });
});

app.get('/api/payment/verify/:sessionId', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false, message: 'Not logged in' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    
    if (session.payment_status === 'paid' && session.metadata.userId === req.session.user.id) {
      const user = await db.findUserById(req.session.user.id);
      res.json({ 
        ok: true, 
        paid: true,
        credits: parseInt(session.metadata.credits) + parseInt(session.metadata.bonus),
        newBalance: user.wallet || 0
      });
    } else {
      res.json({ ok: true, paid: false });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ ok: false, message: 'Failed to verify payment' });
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

// NOTE: All other routes (events, tickets, teams, admin) remain the same as in the original server.js
// They are omitted here for brevity but should be included in the final file

// Start server
server.listen(PORT, () => {
  console.log(`Slovak Patriot server running at http://localhost:${PORT}`);
  console.log('WebSocket server is ready for chat connections');
  console.log('✓ Using PostgreSQL database for persistent storage');
  console.log('✓ Stripe payment integration enabled');
});