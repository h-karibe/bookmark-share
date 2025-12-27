/*
  # Allow Anonymous Reports
  
  ## Changes
  
  1. Modified `reports` table
    - Make `reporter_id` nullable to allow anonymous reports
  
  2. Security Updates
    - Update RLS policies to allow anonymous users to create reports
    - Keep existing policies for viewing reports (authenticated only)
    - Ensure anonymous users cannot self-report
  
  ## Notes
  
  - Anonymous reports will have `reporter_id` as null
  - Block functionality remains authentication-required (no changes needed)
  - This enables better content moderation by allowing anyone to report issues
*/

-- Make reporter_id nullable
ALTER TABLE reports ALTER COLUMN reporter_id DROP NOT NULL;

-- Drop old policy
DROP POLICY IF EXISTS "Users can create reports" ON reports;

-- Create new policy allowing both authenticated and anonymous reports
CREATE POLICY "Anyone can create reports"
  ON reports FOR INSERT
  TO public
  WITH CHECK (
    -- If authenticated, reporter_id must match auth.uid()
    (auth.uid() IS NOT NULL AND auth.uid() = reporter_id)
    OR
    -- If anonymous, reporter_id must be null
    (auth.uid() IS NULL AND reporter_id IS NULL)
  );

-- Update existing policy name for clarity
DROP POLICY IF EXISTS "Users can view their own reports" ON reports;

CREATE POLICY "Authenticated users can view their own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);
