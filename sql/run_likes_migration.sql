-- Complete migration script for influencer likes functionality
-- Run this in Supabase SQL Editor

-- 1. Create the likes table
CREATE TABLE IF NOT EXISTS influencer_likes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  influencer_id integer NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  user_name text,
  user_id text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(influencer_id, user_email)
);

-- 2. Enable Row Level Security
ALTER TABLE influencer_likes ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist (to allow re-running)
DROP POLICY IF EXISTS "Users can view all likes" ON influencer_likes;
DROP POLICY IF EXISTS "Users can insert their own likes" ON influencer_likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON influencer_likes;

-- 4. Create new policies
-- Anyone can view all likes
CREATE POLICY "Users can view all likes"
  ON influencer_likes
  FOR SELECT
  USING (true);

-- For development: Allow all inserts (since we're not using Supabase auth)
-- In production with Supabase auth, use: WITH CHECK (auth.role() = 'authenticated')
CREATE POLICY "Users can insert their own likes"
  ON influencer_likes
  FOR INSERT
  WITH CHECK (true);  -- Changed to true for development without Supabase auth

-- For development: Allow all deletes
-- In production, use: USING (user_email = auth.jwt()->>'email')
CREATE POLICY "Users can delete their own likes"
  ON influencer_likes
  FOR DELETE
  USING (true);  -- Changed to true for development without Supabase auth

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_likes_influencer
  ON influencer_likes(influencer_id);

CREATE INDEX IF NOT EXISTS idx_likes_user_email
  ON influencer_likes(user_email);

CREATE INDEX IF NOT EXISTS idx_likes_created
  ON influencer_likes(created_at DESC);

-- 6. Grant permissions to anon role (for your app)
GRANT ALL ON influencer_likes TO anon;
GRANT ALL ON influencer_likes TO authenticated;

-- 7. Optional: Migrate existing saved influencers to the new system
-- Uncomment this section if you want to preserve existing likes
INSERT INTO influencer_likes (influencer_id, user_email, user_name, created_at)
SELECT
  id,
  'sy.lee@deep-dive.kr',
  '이소영',
  COALESCE(saved_at, now())
FROM influencers
WHERE saved = true
ON CONFLICT (influencer_id, user_email) DO NOTHING;

-- 8. Verify the migration
SELECT
  'Table created successfully' as status,
  COUNT(*) as columns_count
FROM information_schema.columns
WHERE table_name = 'influencer_likes';

-- Check if RLS is enabled
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'influencer_likes';

-- Check policies
SELECT
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'influencer_likes';