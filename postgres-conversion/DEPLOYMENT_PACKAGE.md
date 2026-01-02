# PostgreSQL Conversion - Complete Deployment Package

## 📦 Package Contents

Your PostgreSQL conversion package includes:

1. **schema.sql** - Complete database schema (8 tables)
2. **db.js** - PostgreSQL connection pool with helper functions
3. **migrate.js** - Script to import existing JSON data
4. **README.md** - Detailed deployment instructions
5. **server-postgres.js** - Updated server (PARTIAL - see note below)

## ⚠️ Important Note About server-postgres.js

Due to the size of your server.js (2,032 lines), I've created a **partial conversion** showing the pattern. The full conversion requires:

### Routes Converted (✅ Complete):
- Authentication (signup, login, logout, session)
- Wallet (balance, purchase, transactions, claim)
- Password Reset (request, verify, reset)
- Push Notifications (subscribe, send)
- Teams (create, join, leave, kick, transfer, disband)
- Events (get all, create) - PARTIAL

### Routes Still Need Conversion (📝 Pattern provided):
- Event Management (update, register, checkin, unregister, status, winner, prize)
- Event Brackets (generate, update match, schedule)
- Support Tickets (create, respond, close, reopen)
- Admin Operations (users, teams, ban, suspend, credits, disqualify)

## 🔄 Conversion Pattern

For each remaining route, follow this pattern:

### JSON File Pattern (OLD):
```javascript
const users = readJSON(USERS_FILE);
const user = users.find(u => u.id === userId);
user.wallet = newAmount;
writeJSON(USERS_FILE, users);
```

### PostgreSQL Pattern (NEW):
```javascript
const user = await db.findUserById(userId);
await db.updateUser(userId, { wallet: newAmount });
```

## 📋 Quick Conversion Reference

### Reading Data:
```javascript
// OLD
const users = readJSON(USERS_FILE);
const events = readJSON(EVENTS_FILE);
const teams = readJSON(TEAMS_FILE);

// NEW
const users = await db.getAllUsers();
const events = await db.getAllEvents();
const teams = await db.getAllTeams();
```

### Finding Records:
```javascript
// OLD
const user = users.find(u => u.id === userId);
const event = events.find(e => e.id === eventId);

// NEW
const user = await db.findUserById(userId);
const event = await db.findEventById(eventId);
```

### Updating Records:
```javascript
// OLD
user.wallet = 100;
user.status = 'active';
writeJSON(USERS_FILE, users);

// NEW
await db.updateUser(userId, {
  wallet: 100,
  status: 'active'
});
```

### Creating Records:
```javascript
// OLD
const newUser = { id, username, email, ... };
users.push(newUser);
writeJSON(USERS_FILE, users);

// NEW
const newUser = await db.createUser({
  id, username, email, ...
});
```

### Deleting Records:
```javascript
// OLD
const filtered = users.filter(u => u.id !== userId);
writeJSON(USERS_FILE, filtered);

// NEW
await db.deleteUser(userId);
```

## 🚀 Fastest Deployment Path

### Option 1: Manual Completion (Recommended)
1. Use the provided `server-postgres.js` as a template
2. Convert remaining routes following the pattern above
3. Test each section as you convert
4. Deploy when complete

**Estimated time**: 2-3 hours

### Option 2: Hybrid Approach (Quickest)
1. Deploy schema.sql to create tables
2. Run migrate.js to import data
3. Keep using JSON files temporarily
4. Gradually convert routes to PostgreSQL
5. Both systems work simultaneously

**Estimated time**: 30 minutes to start, convert over time

### Option 3: AI-Assisted Completion
Ask me to complete specific route sections:
- "Convert all event routes to PostgreSQL"
- "Convert admin routes to PostgreSQL"
- "Convert ticket routes to PostgreSQL"

I'll provide the converted code for each section.

## 📊 Database Helper Functions Available

The `db.js` file provides these ready-to-use functions:

### User Operations:
- `db.findUserById(id)`
- `db.findUserByUsername(username)`
- `db.findUserByEmail(email)`
- `db.createUser(userData)`
- `db.updateUser(id, updates)`
- `db.getAllUsers()`
- `db.deleteUser(id)`

### Event Operations:
- `db.getAllEvents()`
- `db.findEventById(id)`
- `db.createEvent(eventData)`
- `db.updateEvent(id, updates)`
- `db.deleteEvent(id)`

### Team Operations:
- `db.getAllTeams()`
- `db.findTeamById(id)`
- `db.findTeamByInviteCode(code)`
- `db.createTeam(teamData)`
- `db.updateTeam(id, updates)`
- `db.deleteTeam(id)`

### Ticket Operations:
- `db.getAllTickets()`
- `db.findTicketById(id)`
- `db.findTicketsByUserId(userId)`
- `db.createTicket(ticketData)`
- `db.updateTicket(id, updates)`

### Chat Operations:
- `db.getChatMessages(room, limit)`
- `db.createChatMessage(messageData)`
- `db.getTournamentChatMessages(room, limit)`
- `db.createTournamentChatMessage(messageData)`

### Other Operations:
- `db.createResetToken(tokenData)`
- `db.findResetToken(token)`
- `db.deleteResetToken(token)`
- `db.createPushSubscription(subscriptionData)`

## 🔧 Field Name Mapping

PostgreSQL uses snake_case, JavaScript uses camelCase:

| JavaScript | PostgreSQL |
|------------|------------|
| passwordHash | password_hash |
| isAdmin | is_admin |
| teamId | team_id |
| entryFee | entry_fee |
| prizePool | prize_pool |
| captainId | captain_id |
| inviteCode | invite_code |
| userId | user_id |
| hasUnreadResponse | has_unread_response |
| closedAt | closed_at |
| createdAt | created_at |

The `db.js` helper functions handle this conversion automatically!

## ✅ Testing Checklist

After conversion, test:

- [ ] User registration and login
- [ ] Wallet balance and transactions
- [ ] Team creation and joining
- [ ] Event creation and registration
- [ ] Event check-in
- [ ] Tournament brackets
- [ ] Chat functionality (global and tournament)
- [ ] Support tickets
- [ ] Admin operations
- [ ] Password reset
- [ ] Data persistence after restart

## 🆘 Common Issues & Solutions

### Issue: "Cannot find module 'pg'"
**Solution**: `npm install pg`

### Issue: "Connection timeout"
**Solution**: Check DATABASE_URL is correct, ensure SSL is enabled

### Issue: "Column does not exist"
**Solution**: Check field name mapping (camelCase vs snake_case)

### Issue: "JSON parse error"
**Solution**: Use `JSON.stringify()` when storing arrays/objects

### Issue: "Foreign key violation"
**Solution**: Check that referenced records exist before creating

## 📞 Next Steps

**Choose your path:**

1. **I want to complete the conversion myself**
   - Use the patterns above
   - Reference the converted routes in server-postgres.js
   - Test incrementally

2. **I want you to complete specific sections**
   - Tell me which routes to convert next
   - I'll provide the complete code

3. **I want the full server-postgres.js file**
   - I'll create it in multiple parts
   - You'll combine them into one file

**Which option would you like?**