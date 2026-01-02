const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const http = require('http');
const db = require('./db');
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payment');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

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

app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('✓ Stripe payment integration enabled');
});