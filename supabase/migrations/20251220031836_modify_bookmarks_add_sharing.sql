/*
  # Modify Bookmarks Table for Sharing Feature

  1. Changes to `bookmarks` table
    - Remove `reading_status` column (not needed for bookmark sharing)
    - Remove `rating` column (not needed for bookmark sharing)
    - Rename `notes` to `context` for clarity
    - Add `title` (text, bookmark custom title)
    - Add `is_public` (boolean, whether bookmark is shared publicly)

  2. New Tables
    - `bookmark_likes`
      - `id` (uuid, primary key)
      - `bookmark_id` (uuid, references bookmarks)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - Unique constraint on (bookmark_id, user_id)
    
    - `reports`
      - `id` (uuid, primary key)
      - `bookmark_id` (uuid, references bookmarks)
      - `user_id` (uuid, nullable for non-logged-in reports)
      - `reason` (text, report reason)
      - `created_at` (timestamptz)

  3. Security
    - Update RLS policies for new sharing model
    - Add policies for bookmark_likes and reports

  4. Indexes
    - Add indexes for performance optimization
*/

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can create their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can update their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON bookmarks;

-- Modify bookmarks table structure
DO $$
BEGIN
  -- Add new columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookmarks' AND column_name = 'title') THEN
    ALTER TABLE bookmarks ADD COLUMN title text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookmarks' AND column_name = 'is_public') THEN
    ALTER TABLE bookmarks ADD COLUMN is_public boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookmarks' AND column_name = 'context') THEN
    -- Rename notes to context
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookmarks' AND column_name = 'notes') THEN
      ALTER TABLE bookmarks RENAME COLUMN notes TO context;
    ELSE
      ALTER TABLE bookmarks ADD COLUMN context text DEFAULT '';
    END IF;
  END IF;

  -- Remove old columns if they exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookmarks' AND column_name = 'reading_status') THEN
    ALTER TABLE bookmarks DROP COLUMN reading_status;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookmarks' AND column_name = 'rating') THEN
    ALTER TABLE bookmarks DROP COLUMN rating;
  END IF;
END $$;

-- Create bookmark_likes table
CREATE TABLE IF NOT EXISTS bookmark_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bookmark_id uuid REFERENCES bookmarks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(bookmark_id, user_id)
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bookmark_id uuid REFERENCES bookmarks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_book_id ON bookmarks(book_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_is_public ON bookmarks(is_public);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmark_likes_bookmark_id ON bookmark_likes(bookmark_id);
CREATE INDEX IF NOT EXISTS idx_bookmark_likes_user_id ON bookmark_likes(user_id);

-- Enable RLS
ALTER TABLE bookmark_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Bookmarks policies
CREATE POLICY "Users can create their own bookmarks"
  ON bookmarks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own bookmarks"
  ON bookmarks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public bookmarks"
  ON bookmarks FOR SELECT
  TO public
  USING (is_public = true);

CREATE POLICY "Users can update their own bookmarks"
  ON bookmarks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON bookmarks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Bookmark likes policies
CREATE POLICY "Authenticated users can like bookmarks"
  ON bookmark_likes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM bookmarks
      WHERE bookmarks.id = bookmark_likes.bookmark_id
      AND bookmarks.is_public = true
    )
  );

CREATE POLICY "Anyone can view bookmark likes"
  ON bookmark_likes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can delete their own likes"
  ON bookmark_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Reports policies
CREATE POLICY "Anyone can create reports"
  ON reports FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can view their own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);