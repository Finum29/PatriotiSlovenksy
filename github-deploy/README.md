# Slovak Patriot Tournament Platform

Complete tournament management platform with Stripe payments and admin audit logging.

## Features

- ✅ User authentication & management
- ✅ Stripe payment integration (5 credit packages)
- ✅ PostgreSQL database
- ✅ **Uneditable admin audit log** (tracks all admin actions)
- ✅ Tournament & event management
- ✅ Team management
- ✅ Real-time chat (WebSocket)

## Deployment to Render.com

### 1. Create PostgreSQL Database
- Go to Render Dashboard → New → PostgreSQL
- Copy the Internal Database URL

### 2. Create Web Service
- Go to Render Dashboard → New → Web Service
- Connect this GitHub repository
- Build Command: `npm install`
- Start Command: `npm start`

### 3. Environment Variables
```
DATABASE_URL=your_postgresql_internal_url
STRIPE_SECRET_KEY=sk_test_51SikjgKSYFKQ4B5mKAeieaoE8xpHivnqiUPP9hAtxE3P8w9aDkwAmvL4HKUWwqdYRgijxgDBj47RDfj9297zbrbC00Z4emNkm5
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
FRONTEND_URL=https://your-render-url.onrender.com
SESSION_SECRET=slovak_patriot_secret_2024
NODE_ENV=production
PORT=3000
```

### 4. Set Up Stripe Webhook
- Go to Stripe Dashboard → Webhooks
- Add endpoint: `https://your-render-url.onrender.com/api/payment/webhook`
- Select event: `checkout.session.completed`
- Copy webhook secret and add to environment variables

## Admin Audit Log

Access at: `/admin-audit.html` (admin only)

**Features:**
- Immutable log (cannot be edited or deleted)
- Tracks all admin actions (ban, suspend, activate, delete, credit changes)
- Includes timestamps, admin usernames, IP addresses
- Searchable and filterable
- Paginated view

**Logged Actions:**
- BAN_USER
- SUSPEND_USER
- ACTIVATE_USER
- DELETE_USER
- ADD_CREDITS
- REMOVE_CREDITS
- DELETE_TEAM
- AWARD_PRIZE
- DISQUALIFY_USER

## Local Development

```bash
npm install
npm start
```

Server runs at http://localhost:3000

## File Structure

```
/
├── server.js           # Main server
├── db.js              # Database + audit log functions
├── package.json       # Dependencies
├── routes/
│   ├── auth.js        # Authentication routes
│   ├── payment.js     # Stripe payment routes
│   └── admin.js       # Admin routes with audit logging
└── public/
    ├── payment-modal.html    # Credit purchase page
    └── admin-audit.html      # Audit log viewer
```

## Credit Packages

- Starter: 100 credits - $10
- Basic: 250 + 25 bonus - $25
- Pro: 500 + 100 bonus - $45
- Premium: 1000 + 250 bonus - $80
- Ultimate: 2500 + 750 bonus - $180