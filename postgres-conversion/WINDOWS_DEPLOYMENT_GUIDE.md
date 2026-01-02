# 🪟 Windows Deployment Guide - Slovak Patriot PostgreSQL Conversion

## Quick Start (5 Minutes)

### Prerequisites
- ✅ PostgreSQL client (`psql`) installed on Windows
- ✅ Node.js installed
- ✅ Git installed
- ✅ Your project at: `C:\Users\rekix\Desktop\SP_FINISHED_3\uploads\slovak-patriot`

### One-Command Deployment

```powershell
cd C:\Users\rekix\Desktop\SP_FINISHED_3\postgres-conversion
.\windows-deploy.ps1
```

This script does **everything** for you:
1. ✅ Tests database connection
2. ✅ Creates all 8 database tables
3. ✅ Installs PostgreSQL client (`pg`)
4. ✅ Copies necessary files to your project
5. ✅ Migrates your JSON data to PostgreSQL
6. ✅ Prepares your project for deployment

Then just follow the on-screen instructions to deploy to Render!

---

## Manual Step-by-Step (If You Prefer)

### Step 1: Install PostgreSQL Client (If Not Installed)

**Check if psql is installed:**
```powershell
psql --version
```

**If not installed:**
1. Download from: https://www.postgresql.org/download/windows/
2. Install PostgreSQL (you only need the command-line tools)
3. Add to PATH: `C:\Program Files\PostgreSQL\15\bin`
4. Restart PowerShell

### Step 2: Setup Database Tables

```powershell
cd C:\Users\rekix\Desktop\SP_FINISHED_3\postgres-conversion

$env:PGPASSWORD="3Ib9Xxwp3JFuHuoJVFhPaBpeNhHZ3H9b"

# Test connection
psql -h dpg-d598nmemcj7s73f3str0-a.frankfurt-postgres.render.com -U slovak_patriot_db_user -d slovak_patriot_db -c "SELECT version();"

# Create tables
psql -h dpg-d598nmemcj7s73f3str0-a.frankfurt-postgres.render.com -U slovak_patriot_db_user -d slovak_patriot_db -f schema.sql

# Verify tables
psql -h dpg-d598nmemcj7s73f3str0-a.frankfurt-postgres.render.com -U slovak_patriot_db_user -d slovak_patriot_db -c "\dt"
```

### Step 3: Prepare Your Project

```powershell
cd C:\Users\rekix\Desktop\SP_FINISHED_3\uploads\slovak-patriot

# Install PostgreSQL client
npm install pg

# Copy files
Copy-Item C:\Users\rekix\Desktop\SP_FINISHED_3\postgres-conversion\db.js .
Copy-Item C:\Users\rekix\Desktop\SP_FINISHED_3\postgres-conversion\migrate.js .
Copy-Item C:\Users\rekix\Desktop\SP_FINISHED_3\postgres-conversion\server-postgres-COMPLETE.js server-postgres.js
```

### Step 4: Migrate Data

```powershell
$env:DATABASE_URL="postgresql://slovak_patriot_db_user:3Ib9Xxwp3JFuHuoJVFhPaBpeNhHZ3H9b@dpg-d598nmemcj7s73f3str0-a.frankfurt-postgres.render.com/slovak_patriot_db"

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

... (continues for all collections)

✅ Migration completed successfully!
```

### Step 5: Update Server

```powershell
# Backup original
Copy-Item server.js server-json-backup.js

# Use PostgreSQL version
Copy-Item server-postgres.js server.js
```

### Step 6: Test Locally (Optional)

```powershell
$env:DATABASE_URL="postgresql://slovak_patriot_db_user:3Ib9Xxwp3JFuHuoJVFhPaBpeNhHZ3H9b@dpg-d598nmemcj7s73f3str0-a.frankfurt-postgres.render.com/slovak_patriot_db"

node server.js
```

Open http://localhost:3000 and test:
- Login with existing account
- Register new account
- Check wallet balance
- View events
- Send chat messages

Press `Ctrl+C` to stop the server.

### Step 7: Add DATABASE_URL to Render

1. Go to https://dashboard.render.com/
2. Click **"Projects"** in left sidebar
3. Click your project
4. Click your **Web Service** (slovak-patriot)
5. Click **"Environment"** tab
6. Click **"Add Environment Variable"**
7. Enter:
   - **Key**: `DATABASE_URL`
   - **Value**: `postgresql://slovak_patriot_db_user:3Ib9Xxwp3JFuHuoJVFhPaBpeNhHZ3H9b@dpg-d598nmemcj7s73f3str0-a.frankfurt-postgres.render.com/slovak_patriot_db`
8. Click **"Save Changes"**

### Step 8: Deploy to Render

```powershell
git add .
git commit -m "Convert to PostgreSQL for permanent data storage"
git push origin main
```

Render will automatically detect the changes and redeploy!

### Step 9: Verify Deployment

1. Wait for deployment to complete (~2 minutes)
2. Check Render logs for any errors
3. Visit your live site
4. Test login/registration
5. Verify data persists after page refresh

---

## Troubleshooting

### Error: "psql: command not found"

**Solution:**
1. Install PostgreSQL from: https://www.postgresql.org/download/windows/
2. Add to PATH: `C:\Program Files\PostgreSQL\15\bin`
3. Restart PowerShell
4. Try again

### Error: "Connection timeout"

**Solution:**
1. Check your internet connection
2. Verify DATABASE_URL is correct
3. Check Render database is running (not paused)
4. Try connecting via Render dashboard

### Error: "relation 'users' does not exist"

**Solution:**
```powershell
# Re-run schema creation
cd C:\Users\rekix\Desktop\SP_FINISHED_3\postgres-conversion
$env:PGPASSWORD="3Ib9Xxwp3JFuHuoJVFhPaBpeNhHZ3H9b"
psql -h dpg-d598nmemcj7s73f3str0-a.frankfurt-postgres.render.com -U slovak_patriot_db_user -d slovak_patriot_db -f schema.sql
```

### Error: "Cannot find module 'pg'"

**Solution:**
```powershell
cd C:\Users\rekix\Desktop\SP_FINISHED_3\uploads\slovak-patriot
npm install pg
```

### Error: Migration fails with "JSON file not found"

**Solution:**
1. Check if JSON files exist in your project
2. Verify paths in migrate.js
3. Make sure you're running from the correct directory

---

## Quick Reference

### Database Connection String
```
postgresql://slovak_patriot_db_user:3Ib9Xxwp3JFuHuoJVFhPaBpeNhHZ3H9b@dpg-d598nmemcj7s73f3str0-a.frankfurt-postgres.render.com/slovak_patriot_db
```

### Project Paths
- **Postgres Conversion**: `C:\Users\rekix\Desktop\SP_FINISHED_3\postgres-conversion`
- **Your Project**: `C:\Users\rekix\Desktop\SP_FINISHED_3\uploads\slovak-patriot`

### Important Files
- `schema.sql` - Database schema
- `db.js` - Connection pool
- `migrate.js` - Data migration
- `server-postgres-COMPLETE.js` - PostgreSQL server
- `windows-deploy.ps1` - Automated deployment script

---

## After Deployment

### Normal Update Workflow

When you make changes to your code:

```powershell
# 1. Make your changes
code server.js  # or any file

# 2. Test locally (optional)
$env:DATABASE_URL="postgresql://slovak_patriot_db_user:3Ib9Xxwp3JFuHuoJVFhPaBpeNhHZ3H9b@dpg-d598nmemcj7s73f3str0-a.frankfurt-postgres.render.com/slovak_patriot_db"
node server.js

# 3. Deploy
git add .
git commit -m "Your update description"
git push origin main
```

**That's it!** No need to setup database again.

### View Database Contents

```powershell
$env:PGPASSWORD="3Ib9Xxwp3JFuHuoJVFhPaBpeNhHZ3H9b"
psql -h dpg-d598nmemcj7s73f3str0-a.frankfurt-postgres.render.com -U slovak_patriot_db_user -d slovak_patriot_db

# Inside psql:
SELECT * FROM users LIMIT 5;
SELECT * FROM events;
SELECT COUNT(*) FROM chat_messages;
\q  # Exit
```

---

## Success Checklist

- [ ] PostgreSQL client installed
- [ ] Database tables created (8 tables)
- [ ] Dependencies installed (`pg` package)
- [ ] Files copied to project
- [ ] Data migrated from JSON
- [ ] Server updated to use PostgreSQL
- [ ] DATABASE_URL added to Render
- [ ] Code pushed to git
- [ ] Deployment successful
- [ ] Site tested and working

---

**Need help?** Check the troubleshooting section or refer to `LOCAL_TESTING_GUIDE.md` for more details.