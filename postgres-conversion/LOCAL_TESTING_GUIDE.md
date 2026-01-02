# 🧪 Local Testing Guide - Slovak Patriot PostgreSQL Conversion

## Prerequisites

Before testing locally, ensure you have:
- ✅ Node.js installed (v14 or higher)
- ✅ PostgreSQL client (`psql`) installed
- ✅ Your Render PostgreSQL database created
- ✅ Database tables created (run `setup-database.sh`)

## 🚀 Quick Local Setup (5 Minutes)

### Step 1: Setup Database (Already Done!)

If you haven't run it yet:
```bash
cd /workspace/postgres-conversion
./setup-database.sh
```

You should see:
```
✅ Database setup complete!
📊 Tables created: users, events, teams, tickets...
```

### Step 2: Prepare Your Project

```bash
# Navigate to your project
cd /workspace/uploads/SP_FINISHED_3/uploads/slovak-patriot

# Install PostgreSQL client
npm install pg

# Copy PostgreSQL files
cp /workspace/postgres-conversion/db.js .
cp /workspace/postgres-conversion/migrate.js .
cp /workspace/postgres-conversion/server-postgres-COMPLETE.js server-postgres.js
```

### Step 3: Set Environment Variable

```bash
# Set your DATABASE_URL
export DATABASE_URL="postgresql://slovak_patriot_db_user:3Ib9Xxwp3JFuHuoJVFhPaBpeNhHZ3H9b@dpg-d598nmemcj7s73f3str0-a.frankfurt-postgres.render.com/slovak_patriot_db"
```

**For Windows (Command Prompt):**
```cmd
set DATABASE_URL=postgresql://slovak_patriot_db_user:3Ib9Xxwp3JFuHuoJVFhPaBpeNhHZ3H9b@dpg-d598nmemcj7s73f3str0-a.frankfurt-postgres.render.com/slovak_patriot_db
```

**For Windows (PowerShell):**
```powershell
$env:DATABASE_URL="postgresql://slovak_patriot_db_user:3Ib9Xxwp3JFuHuoJVFhPaBpeNhHZ3H9b@dpg-d598nmemcj7s73f3str0-a.frankfurt-postgres.render.com/slovak_patriot_db"
```

### Step 4: Migrate Existing Data

```bash
# Import your JSON data to PostgreSQL
node migrate.js
```

Expected output:
```
🚀 Starting data migration from JSON to PostgreSQL...
✓ Database connection successful

📤 Migrating users...
  ✓ Imported user: john_doe
  ✓ Imported user: jane_smith
✓ Users migration complete (X records)

📤 Migrating events...
  ✓ Imported event: Tournament Alpha
✓ Events migration complete (X records)

... (continues for all 8 collections)

✅ Migration completed successfully!
```

### Step 5: Test the PostgreSQL Server

```bash
# Run the new PostgreSQL server
node server-postgres.js
```

Expected output:
```
Slovak Patriot server running at http://localhost:3000
WebSocket server is ready for chat connections
✓ Using PostgreSQL database for persistent storage
```

### Step 6: Verify in Browser

Open your browser and test:

1. **Homepage**: http://localhost:3000
2. **Login**: Try logging in with existing account
3. **Registration**: Create a new test account
4. **Wallet**: Check wallet balance persists
5. **Events**: View events list
6. **Teams**: Create/join a team
7. **Chat**: Send messages in global chat

## 🧪 Testing Checklist

### Basic Functionality
- [ ] Server starts without errors
- [ ] Homepage loads correctly
- [ ] Login works with existing account
- [ ] Registration creates new account
- [ ] Session persists across page refreshes

### Wallet System
- [ ] Wallet balance displays correctly
- [ ] Purchase credits works
- [ ] Transaction history shows
- [ ] Prize claiming works

### Event System
- [ ] Events list displays
- [ ] Event registration works
- [ ] Check-in functionality works
- [ ] Unregister with refund works
- [ ] Admin can create events
- [ ] Admin can update event status

### Team System
- [ ] Create team works
- [ ] Join team with invite code works
- [ ] Team members display correctly
- [ ] Leave team works
- [ ] Captain can kick members
- [ ] Disband team works

### Chat System
- [ ] Global chat messages appear
- [ ] WebSocket connection stable
- [ ] Tournament chat works
- [ ] Team chat works
- [ ] Message history loads

### Support Tickets
- [ ] Create ticket works
- [ ] View my tickets works
- [ ] Admin can view all tickets
- [ ] Admin can respond to tickets
- [ ] Close/reopen tickets works

### Admin Panel
- [ ] View all users works
- [ ] Ban/suspend users works
- [ ] Add/remove credits works
- [ ] View all teams works
- [ ] Delete teams works
- [ ] Disqualify users works

## 🔍 Debugging Tips

### Check Database Connection
```bash
# Test connection manually
PGPASSWORD=3Ib9Xxwp3JFuHuoJVFhPaBpeNhHZ3H9b psql -h dpg-d598nmemcj7s73f3str0-a.frankfurt-postgres.render.com -U slovak_patriot_db_user slovak_patriot_db -c "SELECT COUNT(*) FROM users;"
```

### View Database Contents
```bash
# Connect to database
PGPASSWORD=3Ib9Xxwp3JFuHuoJVFhPaBpeNhHZ3H9b psql -h dpg-d598nmemcj7s73f3str0-a.frankfurt-postgres.render.com -U slovak_patriot_db_user slovak_patriot_db

# Inside psql:
\dt              # List all tables
SELECT * FROM users LIMIT 5;
SELECT * FROM events;
SELECT * FROM teams;
\q               # Exit
```

### Check Server Logs
Look for these messages:
- ✅ `Database connection successful`
- ✅ `Slovak Patriot server running at...`
- ❌ `Connection timeout` - Check DATABASE_URL
- ❌ `relation does not exist` - Run schema.sql again

### Common Issues

**Issue: "Cannot find module 'pg'"**
```bash
npm install pg
```

**Issue: "Connection timeout"**
- Check DATABASE_URL is correct
- Verify database is running on Render
- Check firewall/network settings

**Issue: "relation 'users' does not exist"**
```bash
# Re-run schema setup
./setup-database.sh
```

**Issue: "Column does not exist"**
- Check field names (camelCase vs snake_case)
- db.js handles conversion automatically

## 📊 Data Verification

### Check User Count
```bash
PGPASSWORD=3Ib9Xxwp3JFuHuoJVFhPaBpeNhHZ3H9b psql -h dpg-d598nmemcj7s73f3str0-a.frankfurt-postgres.render.com -U slovak_patriot_db_user slovak_patriot_db -c "SELECT COUNT(*) as user_count FROM users;"
```

### Check Event Count
```bash
PGPASSWORD=3Ib9Xxwp3JFuHuoJVFhPaBpeNhHZ3H9b psql -h dpg-d598nmemcj7s73f3str0-a.frankfurt-postgres.render.com -U slovak_patriot_db_user slovak_patriot_db -c "SELECT COUNT(*) as event_count FROM events;"
```

### Check Recent Chat Messages
```bash
PGPASSWORD=3Ib9Xxwp3JFuHuoJVFhPaBpeNhHZ3H9b psql -h dpg-d598nmemcj7s73f3str0-a.frankfurt-postgres.render.com -U slovak_patriot_db_user slovak_patriot_db -c "SELECT username, message, timestamp FROM chat_messages ORDER BY timestamp DESC LIMIT 10;"
```

## 🎯 Performance Testing

### Test Concurrent Users
```bash
# Install Apache Bench (if not installed)
# Ubuntu/Debian: sudo apt-get install apache2-utils
# macOS: brew install apache2

# Test 100 requests with 10 concurrent users
ab -n 100 -c 10 http://localhost:3000/
```

### Test Database Query Speed
```bash
# Time a complex query
PGPASSWORD=3Ib9Xxwp3JFuHuoJVFhPaBpeNhHZ3H9b psql -h dpg-d598nmemcj7s73f3str0-a.frankfurt-postgres.render.com -U slovak_patriot_db_user slovak_patriot_db -c "\timing" -c "SELECT u.username, e.name FROM users u JOIN events e ON e.id = ANY(u.registered_events);"
```

## 🔄 Rollback to JSON (If Needed)

If you encounter issues and need to rollback:

```bash
# Stop the PostgreSQL server (Ctrl+C)

# Restore original server
mv server.js server-postgres.js
mv server-json-backup.js server.js

# Start original server
node server.js
```

Your JSON files are still intact!

## ✅ Success Criteria

Your local testing is successful if:

1. ✅ Server starts without errors
2. ✅ All routes respond correctly
3. ✅ Data persists after server restart
4. ✅ WebSocket chat works
5. ✅ All features from checklist pass
6. ✅ No console errors
7. ✅ Database queries are fast (<100ms)

## 🚀 Ready for Production?

Once local testing passes:

1. **Commit your changes**:
```bash
git add .
git commit -m "Convert to PostgreSQL for permanent data storage"
```

2. **Add DATABASE_URL to Render**:
   - Go to your Web Service
   - Environment tab
   - Add DATABASE_URL variable

3. **Deploy**:
```bash
git push origin main
```

4. **Monitor deployment**:
   - Watch Render logs
   - Check for errors
   - Test live site

## 📞 Need Help?

If you encounter issues:

1. Check the error messages carefully
2. Review the Debugging Tips section
3. Verify DATABASE_URL is correct
4. Check Render database is running
5. Review server logs for clues

---

**Testing complete?** Proceed to FINAL_DEPLOYMENT_GUIDE.md for production deployment!