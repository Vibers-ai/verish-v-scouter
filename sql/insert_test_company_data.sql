-- Test data for multi-company support
-- This file creates sample influencers for different companies to test data isolation

-- Note: Run the add_company_platform_columns.sql migration first!

-- Example 1: Add Instagram influencers for "Deep Dive" company
INSERT INTO influencers (
    account_id,
    author_name,
    author_id,
    company,
    platform,
    follower_count,
    follower_count_formatted,
    views_count,
    views_count_formatted,
    likes_count,
    likes_count_formatted,
    comments_count,
    shares_count,
    upload_count,
    video_caption,
    video_url,
    profile_entry,
    profile_intro,
    email,
    scraping_round,
    influencer_type,
    engagement_rate,
    estimated_cpm,
    follower_tier,
    status
) VALUES
(
    'deepdive_insta_001',
    'Deep Dive Test User 1',
    1234567890,
    'Deep Dive',
    'instagram',
    125000,
    '125.0K',
    2500000,
    '2.5M',
    150000,
    '150.0K',
    2500,
    500,
    45,
    'Test Instagram post from Deep Dive #test #instagram',
    'https://instagram.com/p/test123',
    'https://instagram.com/deepdive_test',
    'Test Instagram profile for Deep Dive company',
    'test@deepdive.com',
    '1',
    'regular',
    8.5,
    120,
    '메가',
    'none'
),
(
    'deepdive_insta_002',
    'Deep Dive Test User 2',
    1234567891,
    'Deep Dive',
    'instagram',
    85000,
    '85.0K',
    1800000,
    '1.8M',
    95000,
    '95.0K',
    1800,
    350,
    32,
    'Another test Instagram post #deepdive #test',
    'https://instagram.com/p/test456',
    'https://instagram.com/deepdive_test2',
    'Another test Instagram profile',
    'test2@deepdive.com',
    '1',
    'regular',
    7.2,
    110,
    '메가',
    'none'
);

-- Example 2: Add more TikTok influencers for "Vibers AI" company
INSERT INTO influencers (
    account_id,
    author_name,
    author_id,
    company,
    platform,
    follower_count,
    follower_count_formatted,
    views_count,
    views_count_formatted,
    likes_count,
    likes_count_formatted,
    comments_count,
    shares_count,
    upload_count,
    video_caption,
    video_url,
    profile_entry,
    profile_intro,
    email,
    video_duration,
    music_title,
    music_artist,
    scraping_round,
    influencer_type,
    engagement_rate,
    estimated_cpm,
    follower_tier,
    status
) VALUES
(
    'vibers_tiktok_001',
    'Vibers Test User 1',
    9876543210,
    'Vibers AI',
    'tiktok',
    250000,
    '250.0K',
    5000000,
    '5.0M',
    400000,
    '400.0K',
    5000,
    1200,
    78,
    'Test TikTok video from Vibers #vibers #test #tiktok',
    'https://tiktok.com/@vibers_test/video/123',
    'https://tiktok.com/@vibers_test',
    'Test TikTok profile for Vibers AI',
    'test@vibers.ai',
    45,
    'original sound',
    'Vibers Test User 1',
    '2',
    'sales',
    12.3,
    150,
    '메가',
    'none'
);

-- Verification queries
SELECT
    company,
    platform,
    COUNT(*) as count,
    AVG(follower_count) as avg_followers,
    AVG(views_count) as avg_views
FROM influencers
GROUP BY company, platform
ORDER BY company, platform;

-- Check that company-specific queries work
SELECT * FROM influencer_summary_by_company
ORDER BY company, influencer_type;