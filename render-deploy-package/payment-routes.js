// STRIPE PAYMENT ROUTES
// Add these routes to your server.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Credit packages with pricing
const CREDIT_PACKAGES = [
  { id: 'starter', credits: 100, price: 10, bonus: 0, priceId: 'price_starter' },
  { id: 'basic', credits: 250, price: 25, bonus: 25, priceId: 'price_basic' },
  { id: 'pro', credits: 500, price: 45, bonus: 100, priceId: 'price_pro' },
  { id: 'premium', credits: 1000, price: 80, bonus: 250, priceId: 'price_premium' },
  { id: 'ultimate', credits: 2500, price: 180, bonus: 750, priceId: 'price_ultimate' }
];

// Get available credit packages
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

// Create Stripe checkout session
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
            unit_amount: package.price * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/wallet`,
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

// Stripe webhook handler
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
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

// Verify payment success
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