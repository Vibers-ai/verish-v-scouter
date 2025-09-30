-- Migration: Add company and platform support to influencers table
-- This enables multi-company and multi-platform (TikTok, Instagram) support

-- Step 1: Add company column
ALTER TABLE influencers
ADD COLUMN IF NOT EXISTS company VARCHAR(100);

-- Step 2: Add platform column
ALTER TABLE influencers
ADD COLUMN IF NOT EXISTS platform VARCHAR(50);

-- Step 3: Set default values for existing records
UPDATE influencers
SET company = 'verish', platform = 'tiktok'
WHERE company IS NULL OR platform IS NULL;

-- Step 4: Make columns NOT NULL after setting defaults
ALTER TABLE influencers
ALTER COLUMN company SET NOT NULL,
ALTER COLUMN platform SET NOT NULL;

-- Step 5: Set default values for future inserts
ALTER TABLE influencers
ALTER COLUMN company SET DEFAULT 'verish',
ALTER COLUMN platform SET DEFAULT 'tiktok';

-- Step 6: Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_influencers_company
ON influencers(company);

CREATE INDEX IF NOT EXISTS idx_influencers_platform
ON influencers(platform);

CREATE INDEX IF NOT EXISTS idx_influencers_company_platform
ON influencers(company, platform);

-- Step 7: Create or replace company-specific summary view
DROP VIEW IF EXISTS influencer_summary_by_company;

CREATE VIEW influencer_summary_by_company AS
SELECT
    company,
    influencer_type,
    COUNT(*) as total_influencers,
    SUM(views_count) as total_views,
    SUM(follower_count) as total_followers,
    SUM(likes_count) as total_likes,
    SUM(comments_count) as total_comments,
    SUM(shares_count) as total_shares,
    AVG(engagement_rate) as avg_engagement_rate,
    AVG(estimated_cpm) as avg_cpm
FROM influencers
GROUP BY company, influencer_type

UNION ALL

SELECT
    company,
    'all' as influencer_type,
    COUNT(*) as total_influencers,
    SUM(views_count) as total_views,
    SUM(follower_count) as total_followers,
    SUM(likes_count) as total_likes,
    SUM(comments_count) as total_comments,
    SUM(shares_count) as total_shares,
    AVG(engagement_rate) as avg_engagement_rate,
    AVG(estimated_cpm) as avg_cpm
FROM influencers
GROUP BY company;

-- Step 8: Create RPC function to get company-specific max values
CREATE OR REPLACE FUNCTION get_company_max_values(company_name TEXT)
RETURNS TABLE(max_followers BIGINT, max_views BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(MAX(follower_count), 10000000) as max_followers,
        COALESCE(MAX(views_count), 100000000) as max_views
    FROM influencers
    WHERE company = company_name;
END;
$$;

-- Step 9: Create RPC function to get company-specific scraping rounds
CREATE OR REPLACE FUNCTION get_company_scraping_rounds(company_name TEXT)
RETURNS TABLE(scraping_round VARCHAR(50))
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT i.scraping_round
    FROM influencers i
    WHERE i.company = company_name
    AND i.scraping_round IS NOT NULL
    ORDER BY i.scraping_round;
END;
$$;

-- Step 10: Verification queries
-- Run these to verify the migration succeeded
SELECT
    'Migration verification' as status,
    COUNT(*) as total_records,
    COUNT(DISTINCT company) as unique_companies,
    COUNT(DISTINCT platform) as unique_platforms
FROM influencers;

SELECT
    company,
    platform,
    COUNT(*) as record_count
FROM influencers
GROUP BY company, platform
ORDER BY company, platform;