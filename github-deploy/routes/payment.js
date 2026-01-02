const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../db');
const router = express.Router();

const PACKAGES = [
  { id: 'starter', credits: 100, price: 10, bonus: 0 },
  { id: 'basic', credits: 250, price: 25, bonus: 25 }
];

router.post('/create-checkout', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ ok: false });
  const pkg = PACKAGES.find(p => p.id === req.body.packageId);
  if (!pkg) return res.status(400).json({ ok: false });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `${pkg.credits} Credits` },
          unit_amount: pkg.price * 100
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment-success.html`,
      cancel_url: `${process.env.FRONTEND_URL}/wallet.html`,
      metadata: { userId: req.session.user.id, credits: pkg.credits.toString() }
    });
    res.json({ ok: true, url: session.url });
  } catch (error) {
    res.status(500).json({ ok: false });
  }
});

router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const user = await db.findUserById(session.metadata.userId);
      await db.updateUser(user.id, { wallet: (user.wallet || 0) + parseInt(session.metadata.credits) });
    }
    res.json({ received: true });
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

module.exports = router;