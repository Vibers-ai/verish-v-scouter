# Supabase Migration Guide

## Overview
This guide walks through migrating your influencer data from JSON/localStorage to Supabase SQL database.

## Prerequisites

1. **Supabase Account**: Create a project at [supabase.com](https://supabase.com)
2. **Environment Variables**: Already configured in `react-app/.env`
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`

## Migration Steps

### Step 1: Create Database Schema

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase_schema.sql` in this repository
4. Copy the entire contents
5. Paste into Supabase SQL Editor
6. Click **Run** to create all tables, indexes, and views

### Step 2: Run the Migration

#### Option A: Using the UI Migration Tool

1. Start the React app:
   ```bash
   cd react-app
   npm run dev
   ```

2. Open the application in your browser

3. Click the **🔄** button (bottom-right corner) to open the Migration Tool

4. Follow these steps in order:
   - Click **"Start Migration"** to import JSON data
   - Wait for completion (679 influencers)
   - Click **"Sync localStorage"** to import tags and contact statuses
   - Click **"Validate Data"** to verify the migration

#### Option B: Manual Migration via Console

1. Open browser console in the React app
2. Run the migration:
   ```javascript
   import DatabaseMigration from './src/services/DatabaseMigration';

   // Run migration
   await DatabaseMigration.migrateFromJSON();

   // Sync localStorage data
   await DatabaseMigration.syncLocalStorageToDatabase();

   // Validate
   await DatabaseMigration.validateMigration();
   ```

### Step 3: Switch to Supabase Mode

1. In the React app, toggle **"Use Supabase Database"** checkbox
2. The app will now fetch data from Supabase instead of JSON

## Database Schema

### Tables

1. **influencers** - Main table with all influencer data
   - All original JSON fields
   - Additional fields:
     - `status` (default: 'none')
     - `scraping_round` ('1' for regular, '2' for sales)
     - `saved` (boolean, default: false)
     - `created_at`, `updated_at` timestamps

2. **influencer_tags** - Tags for each influencer
   - Many-to-many relationship
   - Stores tag strings

3. **contact_statuses** - Contact status tracking
   - One-to-one with influencers
   - Status options: none, good, contacted, no_response, responded, rejected

4. **influencer_summary** (View) - Aggregated statistics
   - Auto-calculates totals and averages
   - Grouped by influencer_type

## Data Mapping

### Scraping Round Logic
- `influencer_type: "regular"` → `scraping_round: "1"`
- `influencer_type: "sales"` → `scraping_round: "2"`
- Future types can use "3", "4", etc.

### Status Values
- `none` - 미연락 (Not contacted)
- `good` - 이사람 좋다 (Good candidate)
- `contacted` - 연락했음 (Contacted)
- `no_response` - 회신 안옴 (No response)
- `responded` - 회신 옴 (Responded)
- `rejected` - 거절 (Rejected)

## API Usage

### Fetching Influencers
```javascript
import InfluencerService from './services/InfluencerService';

// Get paginated influencers
const result = await InfluencerService.getInfluencers({
  page: 1,
  pageSize: 20,
  searchTerm: 'beauty',
  influencerType: 'regular',
  status: 'contacted',
  saved: true,
  scrapingRound: '1',
  sortField: 'follower_count',
  sortOrder: 'desc'
});

// Get single influencer
const influencer = await InfluencerService.getInfluencerById(123);
```

### Managing Tags
```javascript
// Add tag
await InfluencerService.addInfluencerTag(influencerId, 'beauty');

// Remove tag
await InfluencerService.removeInfluencerTag(influencerId, 'beauty');

// Set all tags
await InfluencerService.setInfluencerTags(influencerId, ['beauty', 'fashion']);
```

### Managing Contact Status
```javascript
// Set status
await InfluencerService.setInfluencerContactStatus(influencerId, 'contacted');

// Get status
const status = await InfluencerService.getInfluencerContactStatus(influencerId);
```

### Toggle Saved Status
```javascript
await InfluencerService.toggleSaved(influencerId);
```

## Features

### Real-time Updates
The system supports real-time subscriptions:
```javascript
const subscription = InfluencerService.subscribeToChanges((payload) => {
  console.log('Data changed:', payload);
});

// Cleanup
InfluencerService.unsubscribe(subscription);
```

### Performance Optimizations
- Server-side pagination
- Indexed columns for fast queries
- Summary view for aggregated statistics
- Batch operations for bulk imports

## Troubleshooting

### Common Issues

1. **Migration fails with duplicate key error**
   - Clear the database first using the Migration Tool
   - Or manually delete existing records

2. **Tags/Status not showing after migration**
   - Run "Sync localStorage" in Migration Tool
   - Check browser console for errors

3. **Slow performance**
   - Ensure indexes are created (check supabase_schema.sql)
   - Use pagination instead of loading all records

4. **Connection errors**
   - Verify .env variables are correct
   - Check Supabase project is active
   - Verify RLS policies allow access

## Rollback

To rollback to JSON mode:
1. Uncheck "Use Supabase Database" in the app
2. Data will load from `/data_combined_with_r2.json`
3. Tags and statuses remain in localStorage

## Support

- Check Supabase logs: Dashboard → Logs → API
- Monitor real-time connections: Dashboard → Realtime
- Database metrics: Dashboard → Database → Statistics

## Next Steps

After successful migration:
1. Set up automated backups in Supabase
2. Configure additional RLS policies if needed
3. Consider adding database triggers for audit trails
4. Set up monitoring and alerts