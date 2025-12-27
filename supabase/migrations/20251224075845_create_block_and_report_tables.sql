/*
  # Create Block and Report Tables

  ## New Tables
  
  ### user_blocks
  - `id` (uuid, primary key) - Unique identifier
  - `blocker_id` (uuid, foreign key to auth.users) - User who blocked
  - `blocked_id` (uuid, foreign key to auth.users) - User who was blocked
  - `created_at` (timestamptz) - When the block was created
  
  ### reports
  - `id` (uuid, primary key) - Unique identifier
  - `reporter_id` (uuid, foreign key to auth.users) - User who reported
  - `reported_user_id` (uuid, foreign key to auth.users) - Reported user
  - `content_type` (text) - Type of content ('user' or 'review')
  - `content_id` (uuid, nullable) - ID of the reported content (review ID for reviews)
  - `reason` (text) - Reason for report (spam, inappropriate, harassment, impersonation, copyright, other)
  - `details` (text, nullable) - Additional details from reporter
  - `status` (text) - Status of report (pending, reviewing, resolved, dismissed)
  - `admin_notes` (text, nullable) - Notes from admin
  - `resolved_at` (timestamptz, nullable) - When report was resolved
  - `resolved_by` (uuid, nullable, foreign key to auth.users) - Admin who resolved
  - `created_at` (timestamptz) - When report was created

  ## Security
  
  ### user_blocks
  - Enable RLS
  - Users can view their own blocks
  - Users can create blocks
  - Users can delete their own blocks
  - Prevent duplicate blocks
  
  ### reports
  - Enable RLS  
  - Users can create reports
  - Users can view their own reports
  - Only authenticated users can report
*/

-- Create user_blocks table
CREATE TABLE IF NOT EXISTS user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('user', 'review')),
  content_id uuid,
  reason text NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'harassment', 'impersonation', 'copyright', 'other')),
  details text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  admin_notes text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- user_blocks policies
CREATE POLICY "Users can view their own blocks"
  ON user_blocks FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can create blocks"
  ON user_blocks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own blocks"
  ON user_blocks FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);

-- reports policies
CREATE POLICY "Users can view their own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reporter_id
    AND auth.uid() != reported_user_id
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id ON user_blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user_id ON reports(reported_user_id);