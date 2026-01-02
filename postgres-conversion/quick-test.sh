#!/bin/bash

# Quick Test Script - Verify PostgreSQL Setup
echo "🧪 Quick PostgreSQL Test for Slovak Patriot"
echo ""

# Set DATABASE_URL
export DATABASE_URL="postgresql://slovak_patriot_db_user:3Ib9Xxwp3JFuHuoJVFhPaBpeNhHZ3H9b@dpg-d598nmemcj7s73f3str0-a.frankfurt-postgres.render.com/slovak_patriot_db"
export PGPASSWORD="3Ib9Xxwp3JFuHuoJVFhPaBpeNhHZ3H9b"

PGHOST="dpg-d598nmemcj7s73f3str0-a.frankfurt-postgres.render.com"
PGUSER="slovak_patriot_db_user"
PGDATABASE="slovak_patriot_db"

echo "1️⃣ Testing database connection..."
psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 'Connection OK' as status;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "   ✅ Connection successful"
else
    echo "   ❌ Connection failed"
    exit 1
fi

echo ""
echo "2️⃣ Checking tables..."
TABLE_COUNT=$(psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)

if [ "$TABLE_COUNT" -eq 8 ]; then
    echo "   ✅ All 8 tables exist"
else
    echo "   ⚠️  Found $TABLE_COUNT tables (expected 8)"
    echo "   Run: ./setup-database.sh"
fi

echo ""
echo "3️⃣ Checking data..."
USER_COUNT=$(psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs)
EVENT_COUNT=$(psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT COUNT(*) FROM events;" 2>/dev/null | xargs)
TEAM_COUNT=$(psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT COUNT(*) FROM teams;" 2>/dev/null | xargs)

echo "   📊 Users: $USER_COUNT"
echo "   📊 Events: $EVENT_COUNT"
echo "   📊 Teams: $TEAM_COUNT"

if [ "$USER_COUNT" -eq 0 ]; then
    echo "   ⚠️  No data found. Run: node migrate.js"
fi

echo ""
echo "4️⃣ Testing database queries..."
psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT username, email FROM users LIMIT 3;" 2>/dev/null

echo ""
echo "✅ Quick test complete!"
echo ""
echo "📋 Next steps:"
echo "  - If tables missing: ./setup-database.sh"
echo "  - If no data: node migrate.js"
echo "  - Start server: node server-postgres.js"
echo ""