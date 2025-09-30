# Multi-Company & Multi-Platform Support

## Overview

This system now supports multiple companies viewing their own distinct sets of influencer data. Each company can track influencers from different social media platforms (TikTok, Instagram, etc.).

## Architecture

### Database Schema

Two new columns have been added to the `influencers` table:

- **`company`** (VARCHAR(100), NOT NULL): Identifies which company owns this influencer data
- **`platform`** (VARCHAR(50), NOT NULL): The social media platform (e.g., 'tiktok', 'instagram')

**Indexes:**
- `idx_influencers_company` - for efficient company filtering
- `idx_influencers_platform` - for platform filtering
- `idx_influencers_company_platform` - for combined filtering

### Data Isolation

Each company only sees their own influencer data:
- Queries automatically filter by `user.company` from SSO authentication
- Summaries, statistics, and max values are company-specific
- Scraping rounds are scoped per company

### Company Summary View

A new database view `influencer_summary_by_company` provides aggregated statistics grouped by both company and influencer type.

### RPC Functions

Two new Postgres functions for efficient company-specific queries:

1. **`get_company_max_values(company_name)`** - Returns max followers/views for a company
2. **`get_company_scraping_rounds(company_name)`** - Returns available scraping rounds for a company

## Setup Instructions

### 1. Run Database Migration

Execute the SQL migration file in your Supabase SQL Editor:

```bash
# Location: sql/add_company_platform_columns.sql
```

This will:
- Add `company` and `platform` columns
- Set existing records to `company='verish'` and `platform='tiktok'`
- Create indexes for performance
- Create company-specific views and functions

### 2. Verify Migration

After running the migration, check the verification queries at the bottom of the SQL file to ensure:
- All records have company and platform values
- Indexes are created
- Views and functions exist

### 3. Add New Company Data

To add influencers for a new company:

```python
# In your data processing scripts, include:
influencer_data = {
    # ... other fields ...
    'company': 'your-company-name',
    'platform': 'instagram',  # or 'tiktok', etc.
}
```

## Usage

### Frontend (Automatic)

The frontend automatically handles company filtering:

1. User logs in via SSO (or selects dev user)
2. `user.company` is extracted from authentication
3. All API calls include the company parameter
4. Only that company's data is fetched and displayed

### Backend Service

The `InfluencerService.js` has been updated to accept a `company` parameter:

```javascript
// Get influencers for a specific company
const result = await InfluencerService.getInfluencers({
  company: user.company,
  // ... other options
});

// Get company-specific summaries
const summaries = await InfluencerService.getAllSummaries(user.company);

// Get max values for sliders
const maxValues = await InfluencerService.getMaxValues(user.company);

// Get scraping rounds
const rounds = await InfluencerService.getUniqueScrapingRounds(user.company);
```

## Testing

### Development Mode

Use the Dev User Selector to test different companies:

1. Select a user with `company: 'Deep Dive'`
2. Verify you see different data than `company: 'Vibers AI'`
3. Check that summaries and statistics update accordingly

### Adding Test Data

To test with different companies:

```sql
-- Insert test Instagram influencers for Deep Dive
INSERT INTO influencers (
  account_id, author_name, company, platform,
  follower_count, views_count, scraping_round
) VALUES (
  'test_insta_user', 'Test Instagram User', 'Deep Dive', 'instagram',
  50000, 1000000, '1'
);
```

## Data Import Guide

### For New Companies

1. **Prepare Data**: Ensure your JSON/CSV includes `company` and `platform` fields
2. **Update Scripts**: Modify your Python processing scripts to include these fields
3. **Import**: Use existing bulk import methods via `InfluencerService.bulkCreateInfluencers()`

Example data structure:
```json
{
  "account_id": "instagram_user_123",
  "author_name": "Influencer Name",
  "company": "new-company",
  "platform": "instagram",
  "follower_count": 100000,
  "views_count": 5000000,
  "scraping_round": "1"
}
```

## Platform Differences

### TikTok vs Instagram

While both platforms share the core `influencers` table schema, consider:

**TikTok-specific fields:**
- `video_duration`
- `music_title`, `music_artist`
- `upload_time`

**Instagram-specific considerations:**
- Some fields may need different interpretation
- Engagement metrics may differ
- Update UI labels accordingly if needed

## Security

### Row Level Security (RLS)

Consider implementing Supabase RLS policies to enforce company isolation at the database level:

```sql
-- Example RLS policy (to be customized)
CREATE POLICY "Users can only view their company's data"
ON influencers FOR SELECT
USING (company = current_setting('app.current_user_company'));
```

## Troubleshooting

### No Data Showing

1. Check that user has `company` field in their user object
2. Verify database has records with matching `company` value
3. Check browser console for error messages

### Old Summary View Errors

If you see errors about `influencer_summary_by_company` not existing:
- Ensure you ran the complete migration SQL
- The service includes fallback to old `influencer_summary` view

### Wrong Data Showing

1. Check which user is logged in (shown in header)
2. Verify the company name matches exactly (case-sensitive)
3. Check database records: `SELECT DISTINCT company FROM influencers;`

## Future Enhancements

Potential improvements:
- Platform-specific UI customizations
- Cross-platform analytics and comparisons
- Admin panel to manage multiple companies
- Export data per company
- Company-specific branding/theming