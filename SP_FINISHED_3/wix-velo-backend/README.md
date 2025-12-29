# Slovak Patriot Tournament Platform - Wix Velo Backend

This is a complete Wix Velo backend implementation for the Slovak Patriot tournament management system. All data is stored persistently in Wix Data Collections, ensuring no data loss on refresh or redeployment.

## 📁 Project Structure

```
wix-velo-backend/
├── backend/              # Backend .jsw modules
│   ├── users.jsw        # User authentication, wallet, transactions
│   ├── events.jsw       # Event management, registration, brackets
│   ├── teams.jsw        # Team creation, joining, management
│   ├── tickets.jsw      # Support ticket system
│   ├── chat.jsw         # Chat messaging
│   └── admin.jsw        # Admin operations
├── database/            # Database schemas and migration
│   └── collections-schema.json
├── migration-scripts/   # Data migration utilities
└── public/pages/        # Frontend page code (to be updated)
```

## 🗄️ Database Collections

### 1. Users
- **Fields**: username, email, passwordHash, isAdmin, teamId, status, wallet, transactions, registeredEvents
- **Indexes**: username (unique), email (unique)
- **Purpose**: Store all user accounts, authentication, wallet balances, and transaction history

### 2. Events
- **Fields**: name, description, date, time, mode, eliminationType, iconUrl, streamUrl, lobbyUrl, teamSize, entryFee, prizePool, prizes, status, registrations, bracket, loserBracket, winner, disqualified
- **Purpose**: Store tournament events, registrations, brackets, and results

### 3. Teams
- **Fields**: name, description, motto, captainId, members, inviteCode
- **Indexes**: inviteCode (unique)
- **Purpose**: Store team information and membership

### 4. Tickets
- **Fields**: userId, username, subject, message, status, responses, messages, hasUnreadResponse, closedAt
- **Purpose**: Store support tickets with conversation history

### 5. ChatMessages
- **Fields**: userId, username, message, isAdmin, room, timestamp
- **Indexes**: room + timestamp
- **Purpose**: Store global chat messages

### 6. TournamentChat
- **Fields**: userId, username, message, isAdmin, isCaptain, teamId, room, timestamp
- **Indexes**: room + timestamp
- **Purpose**: Store tournament-specific chat messages

### 7. ResetTokens
- **Fields**: token, userId, email, expiresAt
- **Indexes**: token (unique)
- **Purpose**: Store password reset tokens

### 8. PushSubscriptions
- **Fields**: userId, subscription
- **Purpose**: Store push notification subscriptions

## 🚀 Setup Instructions

### Step 1: Create Wix Site
1. Go to [Wix.com](https://www.wix.com) and create a new site
2. Enable **Wix Velo** (Developer Mode)
3. Open the Velo sidebar

### Step 2: Create Database Collections
1. Open **Database** in Velo sidebar
2. For each collection in `database/collections-schema.json`:
   - Click **"+ Add a Collection"**
   - Set collection name and fields according to schema
   - Configure permissions as specified
   - Add indexes

### Step 3: Upload Backend Modules
1. In Velo sidebar, go to **Backend** section
2. Create a new folder called `backend`
3. Upload all `.jsw` files from the `backend/` directory:
   - users.jsw
   - events.jsw
   - teams.jsw
   - tickets.jsw
   - chat.jsw
   - admin.jsw

### Step 4: Install Required Packages
In Velo sidebar, go to **Package Manager** and install:
- `wix-data` (usually pre-installed)
- `wix-users-backend`
- `wix-secrets-backend`

### Step 5: Configure Permissions
Set collection permissions in Database Manager:
- **Users**: Read (Anyone), Insert/Update/Remove (Admin)
- **Events**: Read (Anyone), Insert/Update/Remove (Admin)
- **Teams**: Read (Anyone), Insert/Update (Member), Remove (Admin)
- **Tickets**: Read/Insert (Member), Update/Remove (Admin)
- **ChatMessages**: Read (Anyone), Insert (Member), Update/Remove (Admin)
- **TournamentChat**: Read/Insert (Member), Update/Remove (Admin)
- **ResetTokens**: Insert (Anyone), Read/Update/Remove (Admin)
- **PushSubscriptions**: Insert (Member), Read/Update/Remove (Admin)

## 📊 Data Migration

### Migrating Existing JSON Data

Use the migration scripts in `migration-scripts/` to convert your existing JSON files to Wix Data Collections:

1. **Export JSON data** from your current system
2. **Run migration script** to format data for Wix
3. **Import to Wix** using CSV or API

See `migration-scripts/README.md` for detailed instructions.

## 🔧 Backend API Reference

### Users Module (`users.jsw`)

```javascript
import { registerUser, loginUser, getUserById, getWalletBalance, purchaseCredits, getTransactionHistory, updateWallet, requestPasswordReset, verifyResetToken, resetPassword } from 'backend/users.jsw';

// Register new user
await registerUser({ username, email, password, confirmPassword });

// Login user
await loginUser(username, password);

// Get user by ID
await getUserById(userId);

// Get wallet balance
await getWalletBalance(userId);

// Purchase credits
await purchaseCredits(userId, { amount, price, paymentMethod });

// Get transaction history
await getTransactionHistory(userId);
```

### Events Module (`events.jsw`)

```javascript
import { getAllEvents, getEventById, createEvent, updateEvent, registerForEvent, checkInForEvent, unregisterFromEvent, updateEventStatus, generateBracket, updateMatchResult, awardPrize, deleteEvent } from 'backend/events.jsw';

// Get all events
await getAllEvents();

// Register for event
await registerForEvent(eventId, userId, type, userData);

// Check-in for event
await checkInForEvent(eventId, userId);

// Generate tournament bracket (admin)
await generateBracket(eventId, isAdmin);
```

### Teams Module (`teams.jsw`)

```javascript
import { createTeam, getTeamById, joinTeam, leaveTeam, kickMember, transferCaptaincy, disbandTeam, getAllTeams, deleteTeam } from 'backend/teams.jsw';

// Create team
await createTeam(userId, { name, description, motto });

// Join team with invite code
await joinTeam(userId, inviteCode);

// Leave team
await leaveTeam(userId);
```

### Tickets Module (`tickets.jsw`)

```javascript
import { createTicket, getUserTickets, getAllTickets, respondToTicket, markTicketAsRead, closeTicket, reopenTicket } from 'backend/tickets.jsw';

// Create support ticket
await createTicket(userId, { subject, message });

// Get user's tickets
await getUserTickets(userId);

// Respond to ticket (admin)
await respondToTicket(ticketId, adminId, message, isAdmin);
```

### Chat Module (`chat.jsw`)

```javascript
import { sendMessage, getChatMessages, sendTournamentMessage, getTournamentChatMessages, deleteMessage } from 'backend/chat.jsw';

// Send chat message
await sendMessage(userId, { message, room });

// Get chat messages
await getChatMessages(room, limit);

// Send tournament message
await sendTournamentMessage(userId, { message, room, isCaptain, teamId });
```

### Admin Module (`admin.jsw`)

```javascript
import { getAllUsers, banUser, suspendUser, activateUser, deleteUser, addCreditsToUser, removeCreditsFromUser, disqualifyUser } from 'backend/admin.jsw';

// Get all users (admin)
await getAllUsers(isAdmin);

// Ban user (admin)
await banUser(userId, isAdmin);

// Add credits to user (admin)
await addCreditsToUser(userId, amount, reason, isAdmin);
```

## 🔐 Authentication

Wix Velo uses its own authentication system. Update your frontend to use:

```javascript
import wixUsers from 'wix-users';

// Check if user is logged in
const isLoggedIn = wixUsers.currentUser.loggedIn;

// Get current user
const user = wixUsers.currentUser;

// Login (redirects to Wix login page)
wixUsers.promptLogin();

// Logout
wixUsers.logout();
```

## 🔄 Real-time Updates

For real-time features (chat, notifications), use Wix Realtime:

```javascript
import wixRealtime from 'wix-realtime-backend';

// Subscribe to collection changes
wixRealtime.subscribe('ChatMessages', {
  onItemAdded: (item) => {
    console.log('New message:', item);
  }
});
```

## 📝 Frontend Integration

Update your frontend JavaScript to call backend functions:

```javascript
// Old Express API call
fetch('/events', { method: 'GET' })

// New Wix backend call
import { getAllEvents } from 'backend/events.jsw';
const result = await getAllEvents();
```

## 🛠️ Development Workflow

1. **Local Development**: Use Wix Editor for development
2. **Testing**: Test in Wix preview mode
3. **Deployment**: Publish site to make changes live
4. **Monitoring**: Use Wix Site Monitoring for logs and errors

## 📚 Additional Resources

- [Wix Velo Documentation](https://www.wix.com/velo/reference)
- [Wix Data API](https://www.wix.com/velo/reference/wix-data)
- [Wix Users Backend](https://www.wix.com/velo/reference/wix-users-backend)
- [Wix Realtime](https://www.wix.com/velo/reference/wix-realtime-backend)

## 🐛 Troubleshooting

### Common Issues

1. **Permission Denied**: Check collection permissions in Database Manager
2. **Function Not Found**: Ensure backend modules are uploaded correctly
3. **Data Not Persisting**: Verify collection names match exactly
4. **Authentication Issues**: Use Wix Members API instead of custom auth

## 📞 Support

For issues or questions:
1. Check Wix Velo documentation
2. Visit Wix Developer Forum
3. Contact Wix Support

## 📄 License

This implementation is provided as-is for the Slovak Patriot tournament platform.