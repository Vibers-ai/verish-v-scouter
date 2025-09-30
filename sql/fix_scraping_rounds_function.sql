-- Fix: Re-create the old get_distinct_scraping_rounds function for backward compatibility
-- This function is called when no company parameter is provided

CREATE OR REPLACE FUNCTION get_distinct_scraping_rounds()
RETURNS TABLE(scraping_round VARCHAR(50))
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT i.scraping_round
    FROM influencers i
    WHERE i.scraping_round IS NOT NULL
    ORDER BY i.scraping_round;
END;
$$;

-- Verify both functions exist
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%scraping_rounds%'
ORDER BY routine_name;