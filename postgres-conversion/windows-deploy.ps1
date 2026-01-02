# Slovak Patriot - Complete Windows Deployment Script
# This script automates the entire PostgreSQL conversion and deployment process

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Slovak Patriot PostgreSQL Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$PGPASSWORD = "3Ib9Xxwp3JFuHuoJVFhPaBpeNhHZ3H9b"
$PGHOST = "dpg-d598nmemcj7s73f3str0-a.frankfurt-postgres.render.com"
$PGUSER = "slovak_patriot_db_user"
$PGDATABASE = "slovak_patriot_db"
$DATABASE_URL = "postgresql://$PGUSER:$PGPASSWORD@$PGHOST/$PGDATABASE"

$env:PGPASSWORD = $PGPASSWORD
$env:DATABASE_URL = $DATABASE_URL

# Get paths
$POSTGRES_DIR = "C:\Users\rekix\Desktop\SP_FINISHED_3\postgres-conversion"
$PROJECT_DIR = "C:\Users\rekix\Desktop\SP_FINISHED_3\uploads\slovak-patriot"

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Database Host: $PGHOST" -ForegroundColor Gray
Write-Host "  Database Name: $PGDATABASE" -ForegroundColor Gray
Write-Host "  Project Directory: $PROJECT_DIR" -ForegroundColor Gray
Write-Host ""

# Step 1: Test Database Connection
Write-Host "[1/6] Testing database connection..." -ForegroundColor Green
try {
    $result = psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "SELECT 'Connection OK' as status;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Database connection successful!" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Connection failed. Please check your credentials." -ForegroundColor Red
        Write-Host "  Error: $result" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  ✗ psql command not found. Please install PostgreSQL client." -ForegroundColor Red
    Write-Host "  Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Step 2: Create Database Tables
Write-Host "[2/6] Creating database tables..." -ForegroundColor Green
cd $POSTGRES_DIR

$tableCheck = psql -h $PGHOST -U $PGUSER -d $PGDATABASE -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>&1
$tableCount = [int]($tableCheck -replace '\s','')

if ($tableCount -eq 8) {
    Write-Host "  ℹ Tables already exist. Skipping creation." -ForegroundColor Yellow
} else {
    Write-Host "  Creating tables from schema.sql..." -ForegroundColor Gray
    $createResult = psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f schema.sql 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Database tables created successfully!" -ForegroundColor Green
        
        # Verify tables
        $tables = psql -h $PGHOST -U $PGUSER -d $PGDATABASE -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;" 2>&1
        Write-Host "  Tables created:" -ForegroundColor Gray
        $tables -split "`n" | ForEach-Object { 
            $table = $_.Trim()
            if ($table) { Write-Host "    - $table" -ForegroundColor Gray }
        }
    } else {
        Write-Host "  ✗ Failed to create tables." -ForegroundColor Red
        Write-Host "  Error: $createResult" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# Step 3: Install Dependencies
Write-Host "[3/6] Installing dependencies..." -ForegroundColor Green
cd $PROJECT_DIR

if (Test-Path "package.json") {
    # Check if pg is already installed
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $hasPg = $packageJson.dependencies.PSObject.Properties.Name -contains "pg"
    
    if (-not $hasPg) {
        Write-Host "  Installing PostgreSQL client (pg)..." -ForegroundColor Gray
        npm install pg
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Dependencies installed!" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Failed to install dependencies." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "  ℹ PostgreSQL client already installed." -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✗ package.json not found in $PROJECT_DIR" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Copy PostgreSQL Files
Write-Host "[4/6] Copying PostgreSQL files to project..." -ForegroundColor Green

$filesToCopy = @(
    @{Source="db.js"; Desc="Database connection pool"},
    @{Source="migrate.js"; Desc="Data migration script"},
    @{Source="server-postgres-COMPLETE.js"; Dest="server-postgres.js"; Desc="PostgreSQL server"}
)

foreach ($file in $filesToCopy) {
    $source = Join-Path $POSTGRES_DIR $file.Source
    $destName = if ($file.Dest) { $file.Dest } else { $file.Source }
    $dest = Join-Path $PROJECT_DIR $destName
    
    if (Test-Path $source) {
        Copy-Item $source $dest -Force
        Write-Host "  ✓ Copied $($file.Desc)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Source file not found: $source" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# Step 5: Migrate Data
Write-Host "[5/6] Migrating data from JSON to PostgreSQL..." -ForegroundColor Green
cd $PROJECT_DIR

# Check if data already exists
$userCount = psql -h $PGHOST -U $PGUSER -d $PGDATABASE -t -c "SELECT COUNT(*) FROM users;" 2>&1
$userCountNum = [int]($userCount -replace '\s','')

if ($userCountNum -gt 0) {
    Write-Host "  ℹ Data already exists in database ($userCountNum users found)." -ForegroundColor Yellow
    Write-Host "  Do you want to re-migrate? This will clear existing data. (y/N): " -ForegroundColor Yellow -NoNewline
    $response = Read-Host
    
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host "  Running migration..." -ForegroundColor Gray
        node migrate.js
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Data migration completed!" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Migration failed." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "  Skipping migration." -ForegroundColor Yellow
    }
} else {
    Write-Host "  Running migration..." -ForegroundColor Gray
    node migrate.js
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Data migration completed!" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Migration failed. Check if JSON files exist." -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# Step 6: Prepare for Deployment
Write-Host "[6/6] Preparing for deployment..." -ForegroundColor Green
cd $PROJECT_DIR

# Backup original server.js
if (Test-Path "server.js") {
    if (-not (Test-Path "server-json-backup.js")) {
        Write-Host "  Backing up original server.js..." -ForegroundColor Gray
        Copy-Item "server.js" "server-json-backup.js"
        Write-Host "  ✓ Backup created: server-json-backup.js" -ForegroundColor Green
    }
}

# Replace server.js with PostgreSQL version
if (Test-Path "server-postgres.js") {
    Copy-Item "server-postgres.js" "server.js" -Force
    Write-Host "  ✓ Updated server.js to use PostgreSQL" -ForegroundColor Green
} else {
    Write-Host "  ✗ server-postgres.js not found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ Deployment Preparation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Final Instructions
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Add DATABASE_URL to Render:" -ForegroundColor White
Write-Host "   a. Go to https://dashboard.render.com/" -ForegroundColor Gray
Write-Host "   b. Click your Web Service (slovak-patriot)" -ForegroundColor Gray
Write-Host "   c. Go to Environment tab" -ForegroundColor Gray
Write-Host "   d. Click 'Add Environment Variable'" -ForegroundColor Gray
Write-Host "   e. Key: DATABASE_URL" -ForegroundColor Gray
Write-Host "   f. Value: $DATABASE_URL" -ForegroundColor Cyan
Write-Host "   g. Click 'Save Changes'" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Deploy to Render:" -ForegroundColor White
Write-Host "   git add ." -ForegroundColor Cyan
Write-Host "   git commit -m `"Convert to PostgreSQL for permanent data storage`"" -ForegroundColor Cyan
Write-Host "   git push origin main" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Test your deployment:" -ForegroundColor White
Write-Host "   - Wait for Render to finish deployment (~2 minutes)" -ForegroundColor Gray
Write-Host "   - Visit your site and test login/registration" -ForegroundColor Gray
Write-Host "   - Check that data persists after page refresh" -ForegroundColor Gray
Write-Host ""
Write-Host "Database Info:" -ForegroundColor Yellow
Write-Host "  Host: $PGHOST" -ForegroundColor Gray
Write-Host "  Database: $PGDATABASE" -ForegroundColor Gray
Write-Host "  User: $PGUSER" -ForegroundColor Gray
Write-Host ""
Write-Host "Your data is now stored permanently in PostgreSQL!" -ForegroundColor Green
Write-Host "No more data loss on Render restarts! 🎉" -ForegroundColor Green
Write-Host ""

# Test local server (optional)
Write-Host "Would you like to test the server locally before deploying? (y/N): " -ForegroundColor Yellow -NoNewline
$testLocal = Read-Host

if ($testLocal -eq 'y' -or $testLocal -eq 'Y') {
    Write-Host ""
    Write-Host "Starting local server..." -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop the server when done testing." -ForegroundColor Yellow
    Write-Host "Then proceed with deployment steps above." -ForegroundColor Yellow
    Write-Host ""
    node server.js
}