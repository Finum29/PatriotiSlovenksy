# Payment Integration Setup Guide

## 🎯 What's Been Added

I've added Stripe + PayPal payment integration to your Slovak Patriot platform. Users can now buy credits through a beautiful popup modal.

## 📦 Credit Packages

- **Small**: 100 credits for $10
- **Medium**: 500 credits for $40 (Best Value)
- **Large**: 1000 credits for $75
- **Mega**: 2500 credits for $175

## 🔧 Setup Steps

### 1. Get Stripe API Keys

1. Go to https://dashboard.stripe.com/register
2. Create an account (or login)
3. Go to Developers → API Keys
4. Copy your **Publishable Key** and **Secret Key**

### 2. Get PayPal Client ID

1. Go to https://developer.paypal.com/
2. Login and go to Dashboard
3. Create a new app
4. Copy your **Client ID**

### 3. Add Environment Variables to Render

In your Render dashboard, add these environment variables:

```
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
PAYPAL_CLIENT_ID=xxxxxxxxxxxxx
PAYPAL_CLIENT_SECRET=xxxxxxxxxxxxx
```

### 4. Update Payment Modal

Edit `/public/payment-modal.html`:

**Line 196**: Replace `YOUR_STRIPE_PUBLISHABLE_KEY` with your actual Stripe publishable key

**Line 7**: Replace `YOUR_PAYPAL_CLIENT_ID` with your actual PayPal client ID

### 5. Setup Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter your URL: `https://your-app.onrender.com/api/payment/webhook`
4. Select events: `payment_intent.succeeded`
5. Copy the webhook secret and add it to Render environment variables

### 6. Add Transactions Table

The payment system needs a transactions table. Add this to your database:

```sql
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  credits INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);
```

## 🚀 How to Use

### For Users

1. Click "Add Credits" button in your wallet
2. Opens payment modal popup
3. Select a credit package
4. Choose payment method (Stripe or PayPal)
5. Complete payment
6. Credits are added automatically!

### Integration in Your App

Add this button anywhere in your app:

```html
<button onclick="window.open('/payment-modal.html?userId=USER_ID', 'payment', 'width=600,height=700')">
  💳 Buy Credits
</button>
```

Or as a full-page redirect:

```javascript
window.location.href = `/payment-modal.html?userId=${userId}`;
```

## 📁 Files Added

1. **payment-routes.js** - Backend payment API routes
2. **public/payment-modal.html** - Beautiful payment UI
3. **PAYMENT_SETUP.md** - This setup guide

## 🔒 Security Features

- ✅ Stripe webhook signature verification
- ✅ Server-side payment validation
- ✅ Automatic credit addition after successful payment
- ✅ Transaction logging
- ✅ Secure API key handling

## 🧪 Testing

### Test Mode (Before Going Live)

1. Use Stripe test keys (start with `pk_test_` and `sk_test_`)
2. Use test card: `4242 4242 4242 4242`
3. Any future expiry date
4. Any 3-digit CVC

### Test PayPal

1. Use PayPal Sandbox credentials
2. Create test buyer account in PayPal Developer Dashboard

## 💰 Pricing Recommendations

Current pricing:
- $0.10 per credit (100 credits = $10)
- 20% discount on larger packages

You can adjust prices in `payment-routes.js`:

```javascript
const CREDIT_PACKAGES = {
  small: { credits: 100, price: 1000 }, // Change price (in cents)
  medium: { credits: 500, price: 4000 },
  // ...
};
```

## 🆘 Troubleshooting

**Payment fails silently:**
- Check Stripe/PayPal API keys are correct
- Check webhook is configured
- Check Render logs for errors

**Credits not added:**
- Verify webhook endpoint is accessible
- Check transactions table exists
- Check user_id is valid

**Modal doesn't open:**
- Check payment-modal.html is in public folder
- Verify userId is passed in URL

## 📊 Monitoring

View transactions in your database:

```sql
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 50;
```

Check user balances:

```sql
SELECT username, wallet_balance FROM users ORDER BY wallet_balance DESC;
```

## 🎨 Customization

The payment modal is fully customizable:
- Edit colors in the `<style>` section
- Change package names/prices in `payment-routes.js`
- Add more payment methods (Crypto, etc.)
- Customize success/error messages

## ✅ Checklist

- [ ] Stripe account created
- [ ] PayPal account created
- [ ] API keys added to Render
- [ ] Webhook configured
- [ ] Transactions table created
- [ ] Payment modal tested
- [ ] Test purchase completed
- [ ] Credits added successfully

---

**Need help?** Check Render logs or Stripe dashboard for detailed error messages.