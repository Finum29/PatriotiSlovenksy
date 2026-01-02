# Data Migration Guide: JSON Files to Wix Data Collections

This guide explains how to migrate your existing JSON data from the Express/Node.js application to Wix Data Collections.

## 📋 Overview

You need to migrate data from 8 JSON files to 8 Wix Data Collections:

| JSON File | Wix Collection | Records |
|-----------|---------------|---------|
| users.json | Users | User accounts |
| events.json | Events | Tournament events |
| teams.json | Teams | Team data |
| tickets.json | Tickets | Support tickets |
| chat.json | ChatMessages | Global chat |
| tournament-chat.json | TournamentChat | Tournament chat |
| reset-tokens.json | ResetTokens | Password reset tokens |
| push-subscriptions.json | PushSubscriptions | Push subscriptions |

## 🔄 Migration Methods

### Method 1: Manual CSV Import (Recommended for Small Datasets)

#### Step 1: Convert JSON to CSV

Use the provided Node.js script to convert JSON files to CSV format:

```bash
cd migration-scripts
node json-to-csv.js
```

This will create CSV files in the `migration-scripts/csv-output/` directory.

#### Step 2: Import to Wix

1. Open your Wix site in Editor
2. Go to **Database** → Select collection
3. Click **"Import"** button
4. Upload the corresponding CSV file
5. Map CSV columns to collection fields
6. Click **"Import"**

### Method 2: Wix Data API (Recommended for Large Datasets)

Use the Wix Data API to programmatically import data:

```javascript
// migration-scripts/import-to-wix.js
import wixData from 'wix-data-backend';

async function importUsers(usersData) {
  for (const user of usersData) {
    try {
      await wixData.insert('Users', {
        username: user.username,
        email: user.email,
        passwordHash: user.passwordHash,
        isAdmin: user.isAdmin || false,
        teamId: user.teamId || null,
        status: user.status || 'active',
        wallet: user.wallet || 0,
        transactions: user.transactions || [],
        registeredEvents: user.registeredEvents || [],
        createdAt: new Date(user.createdAt)
      });
      console.log(`Imported user: ${user.username}`);
    } catch (error) {
      console.error(`Failed to import user ${user.username}:`, error);
    }
  }
}
```

### Method 3: Wix CLI (For Developers)

Use Wix CLI to bulk import data:

```bash
# Install Wix CLI
npm install -g @wix/cli

# Login to Wix
wix login

# Import data
wix data import Users users.csv
```

## 📝 Field Mapping

### Users Collection

| JSON Field | Wix Field | Type | Notes |
|------------|-----------|------|-------|
| id | _id | text | Auto-generated if not provided |
| username | username | text | Required, unique |
| email | email | text | Required, unique |
| passwordHash | passwordHash | text | Keep existing hash |
| isAdmin | isAdmin | boolean | Default: false |
| teamId | teamId | text | Reference to Teams |
| status | status | text | Default: 'active' |
| wallet | wallet | number | Default: 0 |
| transactions | transactions | array | JSON array |
| registeredEvents | registeredEvents | array | Array of event IDs |
| createdAt | createdAt | date | Convert to Date object |

### Events Collection

| JSON Field | Wix Field | Type | Notes |
|------------|-----------|------|-------|
| id | _id | text | Auto-generated if not provided |
| name | name | text | Required |
| description | description | richText | Optional |
| date | date | text | Format: YYYY-MM-DD |
| time | time | text | Format: HH:MM |
| mode | mode | text | 'solo', 'team', or 'both' |
| eliminationType | eliminationType | text | 'single' or 'double' |
| iconUrl | iconUrl | image | Image URL |
| streamUrl | streamUrl | url | Optional |
| lobbyUrl | lobbyUrl | url | Optional |
| teamSize | teamSize | number | Optional |
| entryFee | entryFee | number | Default: 0 |
| prizePool | prizePool | object | JSON object |
| prizes | prizes | object | JSON object |
| status | status | text | 'upcoming', 'live', 'finished' |
| registrations | registrations | array | JSON array |
| bracket | bracket | array | JSON array |
| loserBracket | loserBracket | array | JSON array |
| winner | winner | object | JSON object |
| disqualified | disqualified | array | JSON array |
| finishedAt | finishedAt | date | Optional |
| createdAt | createdAt | date | Convert to Date object |

### Teams Collection

| JSON Field | Wix Field | Type | Notes |
|------------|-----------|------|-------|
| id | _id | text | Auto-generated if not provided |
| name | name | text | Required |
| description | description | richText | Optional |
| motto | motto | text | Optional |
| captainId | captainId | text | Required, reference to Users |
| members | members | array | Array of user IDs |
| inviteCode | inviteCode | text | Required, unique |
| createdAt | createdAt | date | Convert to Date object |

### Tickets Collection

| JSON Field | Wix Field | Type | Notes |
|------------|-----------|------|-------|
| id | _id | text | Auto-generated if not provided |
| userId | userId | text | Required, reference to Users |
| username | username | text | Required |
| subject | subject | text | Required |
| message | message | richText | Required |
| status | status | text | 'open' or 'closed' |
| responses | responses | array | JSON array |
| messages | messages | array | JSON array |
| hasUnreadResponse | hasUnreadResponse | boolean | Default: false |
| closedAt | closedAt | date | Optional |
| createdAt | createdAt | date | Convert to Date object |

### ChatMessages Collection

| JSON Field | Wix Field | Type | Notes |
|------------|-----------|------|-------|
| id | _id | text | Auto-generated if not provided |
| userId | userId | text | Required, reference to Users |
| username | username | text | Required |
| message | message | richText | Required |
| isAdmin | isAdmin | boolean | Default: false |
| room | room | text | Default: 'global' |
| timestamp | timestamp | date | Convert to Date object |

### TournamentChat Collection

| JSON Field | Wix Field | Type | Notes |
|------------|-----------|------|-------|
| id | _id | text | Auto-generated if not provided |
| userId | userId | text | Required, reference to Users |
| username | username | text | Required |
| message | message | richText | Required |
| isAdmin | isAdmin | boolean | Default: false |
| isCaptain | isCaptain | boolean | Default: false |
| teamId | teamId | text | Optional, reference to Teams |
| room | room | text | Required |
| timestamp | timestamp | date | Convert to Date object |

### ResetTokens Collection

| JSON Field | Wix Field | Type | Notes |
|------------|-----------|------|-------|
| token | token | text | Required, unique |
| userId | userId | text | Required, reference to Users |
| email | email | text | Required |
| expiresAt | expiresAt | date | Required |
| createdAt | createdAt | date | Convert to Date object |

### PushSubscriptions Collection

| JSON Field | Wix Field | Type | Notes |
|------------|-----------|------|-------|
| userId | userId | text | Required, reference to Users |
| subscription | subscription | object | JSON object |
| createdAt | createdAt | date | Convert to Date object |

## ⚠️ Important Notes

### 1. ID Mapping
- Wix uses `_id` instead of `id`
- If migrating with existing IDs, ensure they're unique
- Update all references (e.g., teamId, userId) to use new Wix IDs

### 2. Date Conversion
All date fields must be converted to JavaScript Date objects:

```javascript
// JSON: "2025-11-24T15:38:12.999Z"
// Wix: new Date("2025-11-24T15:38:12.999Z")
```

### 3. Password Hashes
- Keep existing bcrypt password hashes
- They will work with Wix's password comparison functions

### 4. References
Update all ID references after migration:
- User's `teamId` → Team's `_id`
- Event's `registrations[].userId` → User's `_id`
- Team's `members[]` → User's `_id`

### 5. Array and Object Fields
- Arrays and objects are stored as JSON in Wix
- Ensure proper JSON formatting

## 🔍 Validation

After migration, verify:

1. **Record Count**: Check that all records were imported
2. **Data Integrity**: Verify field values are correct
3. **References**: Ensure all ID references are valid
4. **Indexes**: Confirm unique indexes (username, email, inviteCode)
5. **Permissions**: Test read/write permissions

## 🧪 Testing

Create a test checklist:

- [ ] Users can login with existing credentials
- [ ] Wallet balances are correct
- [ ] Transaction history is preserved
- [ ] Events show correct registrations
- [ ] Teams have correct members
- [ ] Chat messages are visible
- [ ] Support tickets are accessible
- [ ] Admin functions work correctly

## 🚨 Rollback Plan

Before migration:
1. **Backup all JSON files**
2. **Export Wix data** before import
3. **Test on staging site** first
4. **Keep Express server running** until verified

If issues occur:
1. Delete imported data from Wix
2. Fix data format issues
3. Re-import corrected data

## 📞 Support

If you encounter issues during migration:
1. Check Wix Data API documentation
2. Verify field types match schema
3. Test with small dataset first
4. Contact Wix Support for platform issues

## ✅ Post-Migration Checklist

- [ ] All collections created with correct schemas
- [ ] All data imported successfully
- [ ] Indexes created (username, email, inviteCode, etc.)
- [ ] Permissions configured correctly
- [ ] Backend modules uploaded and working
- [ ] Frontend updated to use new backend
- [ ] Authentication working
- [ ] Real-time features functional
- [ ] Admin panel accessible
- [ ] All features tested end-to-end
- [ ] Old Express server decommissioned

## 🎉 Migration Complete!

Once all checks pass, your Slovak Patriot platform is now running on Wix Velo with persistent database storage. All data will survive refreshes, inactivity, and redeployments.