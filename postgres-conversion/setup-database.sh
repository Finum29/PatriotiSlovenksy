#!/bin/bash

# PostgreSQL Database Setup Script
# This script creates all database tables using your Render PostgreSQL credentials

echo "🚀 Setting up PostgreSQL database for Slovak Patriot..."
echo ""

# Your PostgreSQL connection details
export PGPASSWORD="3Ib9Xxwp3JFuHuoJVFhPaBpeNhHZ3H9b"
PGHOST="dpg-d598nmemcj7s73f3str0-a.frankfurt-postgres.render.com"
PGUSER="slovak_patriot_db_user"
PGDATABASE="slovak_patriot_db"

# Full DATABASE_URL for your application
export DATABASE_URL="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}/${PGDATABASE}"

echo "📡 Connecting to: ${PGHOST}"
echo "👤 User: ${PGUSER}"
echo "🗄️  Database: ${PGDATABASE}"
echo ""

# Test connection
echo "🔍 Testing database connection..."
psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT version();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Connection successful!"
    echo ""
else
    echo "❌ Connection failed. Please check your credentials."
    exit 1
fi

# Run schema.sql
echo "📋 Creating database tables..."
echo ""

psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -f schema.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database setup complete!"
    echo ""
    echo "📊 Tables created:"
    echo "  - users"
    echo "  - events"
    echo "  - teams"
    echo "  - tickets"
    echo "  - chat_messages"
    echo "  - tournament_chat"
    echo "  - reset_tokens"
    echo "  - push_subscriptions"
    echo ""
    echo "🎯 Next steps:"
    echo "  1. Run migration: node migrate.js"
    echo "  2. Test locally: Follow LOCAL_TESTING_GUIDE.md"
    echo "  3. Deploy to Render: Follow FINAL_DEPLOYMENT_GUIDE.md"
    echo ""
    echo "💾 Your DATABASE_URL:"
    echo "  ${DATABASE_URL}"
    echo ""
else
    echo ""
    echo "❌ Database setup failed. Check the error messages above."
    exit 1
fi