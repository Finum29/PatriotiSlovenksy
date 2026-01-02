# Slovak Patriot Tournament Platform

Complete tournament management platform with Stripe payments and admin audit logging.

## ✨ Features

- ✅ User authentication & management
- ✅ Stripe payment integration (5 credit packages: $10-$180)
- ✅ PostgreSQL database with automatic schema creation
- ✅ **Uneditable admin audit log** - Immutable tracking of all admin actions
- ✅ Tournament & event management
- ✅ Team management
- ✅ Real-time features

## 🚀 Quick Deploy to Render.com

### Step 1: Create PostgreSQL Database
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **PostgreSQL**
3. Name it: `slovak-patriot-db`
4. Select free tier
5. Click **Create Database**
6. Copy the **Internal Database URL** (starts with `postgresql://`)

### Step 2: Create Web Service
1. Click **New +** → **Web Service**
2. Connect your GitHub repository: `PatriotiSlovenksy`
3. Configure:
   - **Name:** `slovak-patriot-platform`
   - **Root Directory:** *(leave blank)*
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Click **Create Web Service**

### Step 3: Add Environment Variables
In your web service settings, add these environment variables:

```
DATABASE_URL=your_postgresql_internal_url_from_step1
STRIPE_SECRET_KEY=sk_test_51SikjgKSYFKQ4B5mKAeieaoE8xpHivnqiUPP9hAtxE3P8w9aDkwAmvL4HKUWwqdYRgijxgDBj47RDfj9297zbrbC00Z4emNkm5
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
FRONTEND_URL=https://your-app-name.onrender.com
SESSION_SECRET=slovak_patriot_secret_2024
NODE_ENV=production
PORT=3000
```

### Step 4: Configure Stripe Webhook
1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://your-app-name.onrender.com/api/payment/webhook`
4. Select event: `checkout.session.completed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Update `STRIPE_WEBHOOK_SECRET` in Render environment variables

## 🔍 Admin Audit Log

Access at: `/admin-audit.html` (admin only)

**Features:**
- ✅ Immutable log (cannot be edited or deleted)
- ✅ Tracks all admin actions with timestamps
- ✅ Records admin username, action type, target, details, IP address
- ✅ Searchable and filterable interface
- ✅ Paginated view (50 logs per page)

**Logged Actions:**
- `BAN_USER` - User banned
- `SUSPEND_USER` - User suspended
- `ACTIVATE_USER` - User activated
- `DELETE_USER` - User deleted
- `ADD_CREDITS` - Credits added to user
- `REMOVE_CREDITS` - Credits removed from user

## 💳 Credit Packages

| Package | Price | Credits | Bonus | Total |
|---------|-------|---------|-------|-------|
| Starter | $10 | 100 | 0 | 100 |
| Basic | $25 | 250 | 25 | 275 |
| Pro | $45 | 500 | 100 | 600 |
| Premium | $80 | 1000 | 250 | 1250 |
| Ultimate | $180 | 2500 | 750 | 3250 |

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Edit .env with your credentials
# Then start the server
npm start
```

Server runs at http://localhost:3000

## 📁 Project Structure

```
/
├── server.js              # Main server with Express
├── db.js                  # PostgreSQL database + audit logging
├── package.json           # Dependencies
├── routes/
│   ├── auth.js           # Authentication routes
│   ├── payment.js        # Stripe payment routes
│   └── admin.js          # Admin routes with audit logging
├── public/
│   ├── payment-modal.html    # Credit purchase page
│   └── admin-audit.html      # Audit log viewer
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore rules
└── README.md             # This file
```

## 🔒 Security Notes

- Test Stripe keys are safe in code (for development)
- Production keys MUST be in environment variables only
- `.env` file is in `.gitignore` (never commit secrets)
- Admin audit log is append-only (no edit/delete functions)
- All admin actions are logged with IP addresses

## 🎯 Going Live (Production)

When ready to accept real payments:

1. **Activate Stripe Account**
   - Complete business verification
   - Add bank account for payouts
   - Provide tax information

2. **Get Live API Keys**
   - Switch to "Live mode" in Stripe Dashboard
   - Copy live secret key (starts with `sk_live_`)
   - Update `STRIPE_SECRET_KEY` in Render

3. **Update Webhook**
   - Create new webhook endpoint in live mode
   - Use production URL
   - Update `STRIPE_WEBHOOK_SECRET` in Render

4. **Test Thoroughly**
   - Make a small real payment first
   - Verify credits are added correctly
   - Check audit log records the transaction

## 📞 Support

For issues or questions:
- Check Render logs for deployment errors
- Verify all environment variables are set correctly
- Ensure PostgreSQL database is running
- Test Stripe webhook with Stripe CLI

---

Built with ❤️ for Slovak Patriot Community