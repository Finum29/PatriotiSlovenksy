# Migration Scripts

This directory contains scripts to help migrate data from JSON files to Wix Data Collections.

## 📁 Files

- `json-to-wix-format.js` - Converts JSON files to Wix-compatible format
- `wix-formatted/` - Output directory for converted files (created automatically)

## 🚀 Usage

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Run Conversion Script

```bash
node json-to-wix-format.js
```

This will:
1. Read JSON files from the original project
2. Convert them to Wix-compatible format
3. Save formatted files to `wix-formatted/` directory

### Step 3: Review Converted Files

Check the `wix-formatted/` directory for:
- Users.json
- Events.json
- Teams.json
- Tickets.json
- ChatMessages.json
- TournamentChat.json
- ResetTokens.json
- PushSubscriptions.json

### Step 4: Import to Wix

#### Option A: Manual Import (Small Datasets)

1. Open Wix Editor
2. Go to Database → Select collection
3. Click "Import from JSON"
4. Upload the corresponding JSON file
5. Map fields and import

#### Option B: Wix Data API (Large Datasets)

Use the Wix Data API to bulk import:

```javascript
import wixData from 'wix-data-backend';
import fs from 'fs';

async function importData(collectionName, dataFile) {
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  
  for (const item of data) {
    try {
      await wixData.insert(collectionName, item);
      console.log(`Imported: ${item._id}`);
    } catch (error) {
      console.error(`Failed to import ${item._id}:`, error);
    }
  }
}

// Import all collections
await importData('Users', './wix-formatted/Users.json');
await importData('Events', './wix-formatted/Events.json');
await importData('Teams', './wix-formatted/Teams.json');
// ... etc
```

## ⚙️ Configuration

Edit `json-to-wix-format.js` to change:

```javascript
const INPUT_DIR = '../../uploads/SP_FINISHED_3/uploads/slovak-patriot';
const OUTPUT_DIR = './wix-formatted';
```

## 🔍 Validation

After conversion, verify:

1. **Field Types**: Check that all fields match Wix schema
2. **Date Formats**: Ensure dates are in ISO format
3. **References**: Verify ID references are valid
4. **Arrays/Objects**: Confirm JSON structure is correct

## 🐛 Troubleshooting

### Error: "Cannot find module"
```bash
npm install
```

### Error: "Input file not found"
Check that INPUT_DIR path is correct

### Error: "Permission denied"
Ensure you have read/write permissions for directories

## 📝 Notes

- Original JSON files are NOT modified
- Converted files use `_id` instead of `id` (Wix convention)
- All dates are converted to ISO format
- Empty arrays/objects are preserved
- Null values are maintained

## ✅ Post-Migration Checklist

- [ ] All files converted successfully
- [ ] No conversion errors in console
- [ ] Reviewed converted files for accuracy
- [ ] Collections created in Wix Database
- [ ] Data imported to Wix
- [ ] Verified record counts match
- [ ] Tested data integrity
- [ ] Updated frontend to use new backend