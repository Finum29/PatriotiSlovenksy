// Add these routes to server.js after the existing wallet routes

// Purchase credits
app.post('/wallet/purchase', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false, message: 'Not logged in' });
  }

  const { amount, price, paymentMethod } = req.body;

  if (!amount || !price || !paymentMethod) {
    return res.status(400).json({ ok: false, message: 'Missing required fields' });
  }

  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.id === req.session.user.id);

  if (!user) {
    return res.status(404).json({ ok: false, message: 'User not found' });
  }

  // In production, integrate with actual payment gateway (Stripe, PayPal, etc.)
  // For now, simulate successful payment
  
  // Calculate bonus credits
  let bonusCredits = 0;
  if (amount >= 250) bonusCredits = Math.floor(amount * 0.1);
  if (amount >= 500) bonusCredits = Math.floor(amount * 0.2);
  if (amount >= 1000) bonusCredits = Math.floor(amount * 0.25);
  if (amount >= 2500) bonusCredits = Math.floor(amount * 0.3);
  if (amount >= 5000) bonusCredits = Math.floor(amount * 0.4);

  const totalCredits = amount + bonusCredits;
  user.wallet = (user.wallet || 0) + totalCredits;
  
  // Initialize transaction history
  user.transactions = user.transactions || [];
  user.transactions.push({
    type: 'Purchase',
    amount: totalCredits,
    price: price,
    paymentMethod: paymentMethod,
    timestamp: new Date().toISOString()
  });

  writeJSON(USERS_FILE, users);

  res.json({ 
    ok: true, 
    message: `Successfully purchased ${amount} credits${bonusCredits > 0 ? ` + ${bonusCredits} bonus` : ''}!`,
    newBalance: user.wallet 
  });
});

// Get transaction history
app.get('/wallet/transactions', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false, message: 'Not logged in' });
  }

  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.id === req.session.user.id);

  if (!user) {
    return res.status(404).json({ ok: false, message: 'User not found' });
  }

  res.json({ ok: true, transactions: user.transactions || [] });
});

// Admin: Add credits to user
app.post('/admin/users/:userId/add-credits', isAdmin, (req, res) => {
  const { amount, reason } = req.body;
  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.id === req.params.userId);

  if (!user) {
    return res.status(404).json({ ok: false, message: 'User not found' });
  }

  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ ok: false, message: 'Invalid amount' });
  }

  user.wallet = (user.wallet || 0) + parseInt(amount);
  
  user.transactions = user.transactions || [];
  user.transactions.push({
    type: `Admin Credit (${reason || 'No reason provided'})`,
    amount: parseInt(amount),
    timestamp: new Date().toISOString()
  });

  writeJSON(USERS_FILE, users);

  res.json({ ok: true, message: `Added ${amount} credits to ${user.username}`, newBalance: user.wallet });
});

// Admin: Remove credits from user
app.post('/admin/users/:userId/remove-credits', isAdmin, (req, res) => {
  const { amount, reason } = req.body;
  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.id === req.params.userId);

  if (!user) {
    return res.status(404).json({ ok: false, message: 'User not found' });
  }

  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ ok: false, message: 'Invalid amount' });
  }

  const removeAmount = parseInt(amount);
  user.wallet = Math.max(0, (user.wallet || 0) - removeAmount);
  
  user.transactions = user.transactions || [];
  user.transactions.push({
    type: `Admin Deduction (${reason || 'No reason provided'})`,
    amount: -removeAmount,
    timestamp: new Date().toISOString()
  });

  writeJSON(USERS_FILE, users);

  res.json({ ok: true, message: `Removed ${amount} credits from ${user.username}`, newBalance: user.wallet });
});