# PostgreSQL Conversion for Slovak Patriot Tournament Platform

This directory contains all files needed to convert your Express server from JSON file storage to PostgreSQL database storage on Render.com.

## 📁 Files Included

1. **schema.sql** - Database schema (8 tables with indexes)
2. **db.js** - PostgreSQL connection pool and helper functions
3. **migrate.js** - Script to import existing JSON data to PostgreSQL
4. **server-postgres.js** - Updated server.js using PostgreSQL (to be created)
5. **README.md** - This file

## 🚀 Deployment Steps

### Step 1: Setup PostgreSQL on Render.com

1. Log in to your [Render.com Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"PostgreSQL"**
3. Configure your database:
   - **Name**: `slovak-patriot-db`
   - **Database**: `slovak_patriot`
   - **User**: (auto-generated)
   - **Region**: Same as your web service
   - **Plan**: Free or Starter
4. Click **"Create Database"**
5. Wait for database to be created (takes ~2 minutes)

### Step 2: Get Database Connection Info

1. Open your PostgreSQL database in Render dashboard
2. Go to **"Info"** tab
3. Copy the **"Internal Database URL"** (starts with `postgres://`)
4. This is your `DATABASE_URL`

### Step 3: Add DATABASE_URL to Your Web Service

1. Go to your **Web Service** in Render dashboard
2. Click **"Environment"** tab
3. Add new environment variable:
   - **Key**: `DATABASE_URL`
   - **Value**: (paste the Internal Database URL)
4. Click **"Save Changes"**

### Step 4: Create Database Schema

Connect to your PostgreSQL database and run the schema:

**Option A: Using Render Dashboard**
1. Open your PostgreSQL database
2. Go to **"Shell"** tab
3. Copy and paste the entire contents of `schema.sql`
4. Press Enter to execute

**Option B: Using psql locally**
```bash
# Install PostgreSQL client if needed
brew install postgresql  # macOS
sudo apt-get install postgresql-client  # Ubuntu

# Connect to your database
psql "postgres://your-database-url-here"

# Run schema file
\i schema.sql

# Verify tables were created
\dt
```

### Step 5: Install PostgreSQL Package

Add the `pg` package to your project:

```bash
cd /workspace/uploads/SP_FINISHED_3/uploads/slovak-patriot
npm install pg
```

Update your `package.json` to include:
```json
{
  "dependencies": {
    "pg": "^8.11.3",
    ...other dependencies
  }
}
```

### Step 6: Copy Files to Your Project

```bash
# Copy db.js to your project
cp /workspace/postgres-conversion/db.js /workspace/uploads/SP_FINISHED_3/uploads/slovak-patriot/

# Copy migrate.js to your project
cp /workspace/postgres-conversion/migrate.js /workspace/uploads/SP_FINISHED_3/uploads/slovak-patriot/
```

### Step 7: Migrate Existing Data

Run the migration script to import your JSON data:

```bash
cd /workspace/uploads/SP_FINISHED_3/uploads/slovak-patriot
node migrate.js
```

You should see output like:
```
🚀 Starting data migration from JSON to PostgreSQL...
✓ Database connection successful

📤 Migrating users...
  ✓ Imported user: john_doe
  ✓ Imported user: jane_smith
✓ Users migration complete (2 records)

📤 Migrating events...
  ✓ Imported event: Summer Tournament
✓ Events migration complete (1 records)

...

✅ Migration completed successfully!
```

### Step 8: Update server.js

The updated `server-postgres.js` will be created next. It replaces all JSON file operations with PostgreSQL queries while keeping all your routes and WebSocket functionality exactly the same.

### Step 9: Test Locally

Before deploying, test locally with your Render database:

```bash
# Set DATABASE_URL environment variable
export DATABASE_URL="postgres://your-database-url-here"

# Start server
node server-postgres.js
```

Test all features:
- ✓ User registration and login
- ✓ Event creation and registration
- ✓ Team management
- ✓ Wallet transactions
- ✓ Chat functionality
- ✓ Admin operations

### Step 10: Deploy to Render

1. Replace `server.js` with `server-postgres.js`:
   ```bash
   mv server.js server-json-backup.js
   mv server-postgres.js server.js
   ```

2. Commit and push to your Git repository:
   ```bash
   git add .
   git commit -m "Convert to PostgreSQL database"
   git push origin main
   ```

3. Render will automatically detect the changes and redeploy
4. Monitor the deployment logs for any errors

## ✅ Verification Checklist

After deployment, verify:

- [ ] Users can register and login
- [ ] Wallet balances are correct
- [ ] Events show proper registrations
- [ ] Teams have correct members
- [ ] Chat messages appear
- [ ] Admin panel works
- [ ] Data persists after server restart
- [ ] No errors in Render logs

## 🔄 Rollback Plan

If something goes wrong:

1. **Immediate rollback**:
   ```bash
   mv server.js server-postgres.js
   mv server-json-backup.js server.js
   git add .
   git commit -m "Rollback to JSON storage"
   git push origin main
   ```

2. Your JSON files are still intact and will work immediately

## 📊 Database Maintenance

### Backup Database

Render automatically backs up your PostgreSQL database. To create a manual backup:

1. Go to your PostgreSQL database in Render
2. Click **"Backups"** tab
3. Click **"Create Backup"**

### View Database

Use any PostgreSQL client:
- [pgAdmin](https://www.pgadmin.org/)
- [DBeaver](https://dbeaver.io/)
- [TablePlus](https://tableplus.com/)

Connection details are in your Render database "Info" tab.

### Monitor Performance

1. Go to your PostgreSQL database in Render
2. Click **"Metrics"** tab
3. Monitor:
   - Connection count
   - Query performance
   - Storage usage

## 🆘 Troubleshooting

### Error: "Connection timeout"
- Check DATABASE_URL is correct
- Ensure your web service and database are in the same region
- Verify SSL settings in db.js

### Error: "relation does not exist"
- Run schema.sql again
- Check table names match (lowercase with underscores)

### Error: "too many connections"
- Increase max connections in db.js pool config
- Upgrade database plan on Render

### Data not showing up
- Verify migration completed successfully
- Check Render logs for database errors
- Query database directly to verify data exists

## 📞 Support

If you encounter issues:
1. Check Render logs: Dashboard → Your Service → Logs
2. Check database connection: Dashboard → Your Database → Shell
3. Review error messages carefully
4. Test queries directly in database shell

## 🎉 Benefits of PostgreSQL

✅ **Permanent Data Storage** - No more data loss on restart
✅ **Better Performance** - Indexed queries are faster than JSON files
✅ **Concurrent Access** - Multiple connections without file locks
✅ **Data Integrity** - ACID compliance and foreign keys
✅ **Automatic Backups** - Render handles backups automatically
✅ **Scalability** - Easy to upgrade as your platform grows

---

**Next**: I'll create the updated `server-postgres.js` file that uses these database functions instead of JSON files.