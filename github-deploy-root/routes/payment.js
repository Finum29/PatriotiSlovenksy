const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../db');
const router = express.Router();

const PACKAGES = [
  { id: 'starter', credits: 100, price: 10, bonus: 0 },
  { id: 'basic', credits: 250, price: 25, bonus: 25 },
  { id: 'pro', credits: 500, price: 45, bonus: 100 },
  { id: 'premium', credits: 1000, price: 80, bonus: 250 },
  { id: 'ultimate', credits: 2500, price: 180, bonus: 750 }
];

router.post('/create-checkout', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ ok: false, message: 'Not logged in' });
  
  const pkg = PACKAGES.find(p => p.id === req.body.packageId);
  if (!pkg) return res.status(400).json({ ok: false, message: 'Invalid package' });

  try {
    const totalCredits = pkg.credits + pkg.bonus;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { 
            name: `${pkg.credits} Credits${pkg.bonus > 0 ? ` + ${pkg.bonus} Bonus` : ''}`,
            description: `Total: ${totalCredits} credits`
          },
          unit_amount: pkg.price * 100
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/wallet.html`,
      metadata: { 
        userId: req.session.user.id, 
        credits: totalCredits.toString(),
        packageId: pkg.id
      }
    });
    res.json({ ok: true, url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ ok: false, message: 'Payment session creation failed' });
  }
});

router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata.userId;
      const credits = parseInt(session.metadata.credits);
      
      const user = await db.findUserById(userId);
      if (user) {
        const newWallet = (user.wallet || 0) + credits;
        await db.updateUser(userId, { wallet: newWallet });
        console.log(`✓ Added ${credits} credits to user ${userId}. New balance: ${newWallet}`);
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

router.get('/verify-session/:sessionId', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    res.json({ ok: true, status: session.payment_status });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Session verification failed' });
  }
});

module.exports = router;