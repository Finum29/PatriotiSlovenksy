# 🎉 Stripe Payment Integration - Complete Guide

## ✅ What's Been Integrated

Your Slovak Patriot platform now has **full Stripe payment integration** with:

### 1. **Credit Packages** 💎
- **Starter**: 100 credits for $10 (no bonus)
- **Basic**: 250 credits + 25 bonus for $25
- **Pro**: 500 credits + 100 bonus for $45
- **Premium**: 1,000 credits + 250 bonus for $80
- **Ultimate**: 2,500 credits + 750 bonus for $180

### 2. **Payment Flow** 🔄
- Beautiful payment modal (`/payment-modal.html`)
- Secure Stripe Checkout
- Automatic credit addition after payment
- Payment success page with confirmation

### 3. **Backend Integration** ⚙️
- Stripe webhook handler for payment confirmation
- Automatic credit addition to user wallet
- Transaction history tracking
- Payment verification system

---

## 📦 Files Created

1. **`.env.example`** - Environment variables template
2. **`payment-routes.js`** - Payment route documentation (for reference)
3. **`public/payment-modal.html`** - Credit package selection page
4. **`public/payment-success.html`** - Payment confirmation page
5. **`server.js`** - Updated with Stripe integration
6. **`package.json`** - Updated with Stripe dependency

---

## 🚀 Deployment Steps

### Step 1: Set Up Stripe Webhook (IMPORTANT!)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks)
2. Click **"Add endpoint"**
3. Set endpoint URL: `https://your-render-url.onrender.com/api/payment/webhook`
4. Select events to listen for:
   - ✅ `checkout.session.completed`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_`)

### Step 2: Deploy to Render.com

1. **Create PostgreSQL Database** (if not already done):
   - Go to Render Dashboard → New → PostgreSQL
   - Name: `slovak-patriot-db`
   - Copy the **Internal Database URL**

2. **Create Web Service**:
   - Go to Render Dashboard → New → Web Service
   - Connect your GitHub repository
   - Name: `slovak-patriot-platform`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Add Environment Variables**:
   ```
   DATABASE_URL=your_postgresql_internal_url
   STRIPE_PUBLISHABLE_KEY=pk_test_51SikjgKSYFKQ4B5mGGwqlUjUMmFDYGu1WLRHsot65pWITXKrtZFhOtgFDdRYYltxU4PzFGk0DmOgBS2O06lefwzR00njAQNpPv
   STRIPE_SECRET_KEY=sk_test_51SikjgKSYFKQ4B5mKAeieaoE8xpHivnqiUPP9hAtxE3P8w9aDkwAmvL4HKUWwqdYRgijxgDBj47RDfj9297zbrbC00Z4emNkm5
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_FROM_STEP1
   SESSION_SECRET=slovak_patriot_secret_2024
   FRONTEND_URL=https://your-render-url.onrender.com
   NODE_ENV=production
   PORT=3000
   ```

4. **Deploy**: Click "Create Web Service"

### Step 3: Test Payment Flow

1. Visit your deployed site: `https://your-render-url.onrender.com`
2. Login or create an account
3. Go to Wallet page
4. Click **"Add Credits"**
5. Select a package
6. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
7. Complete payment
8. Verify credits are added to your wallet

---

## 🧪 Testing with Stripe Test Cards

| Card Number | Description |
|-------------|-------------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 9995` | Payment declined |
| `4000 0025 0000 3155` | Requires authentication (3D Secure) |

---

## 🔄 Going Live (Production)

When ready to accept real payments:

1. **Activate Stripe Account**:
   - Complete Stripe account verification
   - Provide business details
   - Add bank account for payouts

2. **Get Live API Keys**:
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
   - Toggle from "Test mode" to "Live mode"
   - Copy **Live Publishable Key** and **Live Secret Key**

3. **Create Live Webhook**:
   - Go to [Webhooks](https://dashboard.stripe.com/webhooks)
   - Add endpoint with your production URL
   - Copy **Live Webhook Secret**

4. **Update Environment Variables** on Render:
   ```
   STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY
   STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET
   NODE_ENV=production
   ```

5. **Update Frontend** (`payment-modal.html`):
   - Replace test publishable key with live key on line 234

---

## 📊 Monitoring Payments

### Stripe Dashboard
- View all transactions: [Payments](https://dashboard.stripe.com/payments)
- Check webhook logs: [Webhooks](https://dashboard.stripe.com/webhooks)
- View customers: [Customers](https://dashboard.stripe.com/customers)

### Your Platform
- User transactions are stored in PostgreSQL `users` table
- Check `transactions` JSONB column for payment history

---

## 🛠️ Troubleshooting

### Payment Not Adding Credits?

1. **Check Webhook Logs**:
   - Go to Stripe Dashboard → Webhooks
   - Click on your endpoint
   - View recent webhook events
   - Check for errors

2. **Check Server Logs** on Render:
   - Go to your web service
   - Click "Logs" tab
   - Look for webhook errors

3. **Verify Webhook Secret**:
   - Ensure `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard

### Webhook Not Receiving Events?

1. **Test Webhook** in Stripe Dashboard:
   - Go to your webhook endpoint
   - Click "Send test webhook"
   - Select `checkout.session.completed`

2. **Check URL**:
   - Ensure webhook URL is correct
   - Must be: `https://your-domain.com/api/payment/webhook`
   - Must use HTTPS (Render provides this automatically)

---

## 💡 Customization

### Change Credit Packages

Edit `server.js` around line 280:

```javascript
const CREDIT_PACKAGES = [
  { id: 'starter', credits: 100, price: 10, bonus: 0 },
  { id: 'basic', credits: 250, price: 25, bonus: 25 },
  // Add more packages here
];
```

### Change Payment Success URL

Edit `server.js` around line 320:

```javascript
success_url: `${process.env.FRONTEND_URL}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
```

---

## 📞 Support

- **Stripe Support**: [https://support.stripe.com](https://support.stripe.com)
- **Stripe Docs**: [https://stripe.com/docs](https://stripe.com/docs)
- **Render Support**: [https://render.com/docs](https://render.com/docs)

---

## ✨ What's Next?

Your payment system is now fully functional! You can:

1. ✅ Accept test payments
2. ✅ Automatically add credits to users
3. ✅ Track all transactions
4. ✅ Go live when ready

**Remember**: Always test thoroughly in test mode before going live! 🚀