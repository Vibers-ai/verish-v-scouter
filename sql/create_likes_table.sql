-- Create influencer_likes table to track which users liked which influencers
CREATE TABLE IF NOT EXISTS influencer_likes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  influencer_id integer NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  user_name text,
  user_id text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(influencer_id, user_email)
);

-- Enable Row Level Security
ALTER TABLE influencer_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for the likes table
-- Policy: Anyone can view all likes
CREATE POLICY "Users can view all likes"
  ON influencer_likes
  FOR SELECT
  USING (true);

-- Policy: Users can insert their own likes (authenticated users only)
CREATE POLICY "Users can insert their own likes"
  ON influencer_likes
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can delete their own likes
CREATE POLICY "Users can delete their own likes"
  ON influencer_likes
  FOR DELETE
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_likes_influencer
  ON influencer_likes(influencer_id);

CREATE INDEX IF NOT EXISTS idx_likes_user_email
  ON influencer_likes(user_email);

CREATE INDEX IF NOT EXISTS idx_likes_created
  ON influencer_likes(created_at DESC);


-- Optional: Migrate existing saved influencers to the new system
-- This assigns them to a default admin user for historical data
-- Uncomment and modify as needed:
/*
INSERT INTO influencer_likes (influencer_id, user_email, user_name, created_at)
SELECT
  id,
  'admin@vibers.ai',
  'Historical Like',
  COALESCE(saved_at, now())
FROM influencers
WHERE saved = true
ON CONFLICT (influencer_id, user_email) DO NOTHING;
*/