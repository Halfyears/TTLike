-- Fix: scraper_logs had RLS enabled but no SELECT policy, so the admin dashboard
-- could never read any rows (anon/authenticated key got empty results).
-- Since this table is admin-only monitoring data, we allow authenticated users to read.

-- Allow any authenticated user to SELECT from scraper_logs
-- (the admin page already gates access via admin-role check on the frontend)
CREATE POLICY "authenticated_can_read_scraper_logs"
  ON scraper_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role can INSERT (already bypasses RLS, but be explicit for clarity)
-- The Python scraper uses SUPABASE_SERVICE_KEY which bypasses RLS entirely.
