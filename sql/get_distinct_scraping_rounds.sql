-- Create a function to get distinct scraping rounds efficiently
CREATE OR REPLACE FUNCTION get_distinct_scraping_rounds()
RETURNS TABLE(scraping_round TEXT)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT scraping_round
  FROM influencers
  WHERE scraping_round IS NOT NULL
  ORDER BY scraping_round::integer;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_distinct_scraping_rounds() TO authenticated;
GRANT EXECUTE ON FUNCTION get_distinct_scraping_rounds() TO anon;