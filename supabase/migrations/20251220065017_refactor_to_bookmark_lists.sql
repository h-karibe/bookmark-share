/*
  # Refactor Bookmarks to Bookmark Lists

  1. Remove Old Tables
    - Drop `bookmarks`, `bookmark_likes`, `reports` tables

  2. New Tables
    - `bookmark_lists`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text, list name)
      - `is_public` (boolean, public/private setting)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `bookmark_list_items`
      - `id` (uuid, primary key)
      - `bookmark_list_id` (uuid, references bookmark_lists)
      - `book_id` (uuid, book identifier)
      - `context` (text, notes for this book in this list)
      - `created_at` (timestamptz)
      - Unique constraint on (bookmark_list_id, book_id)
    
    - `list_likes`
      - `id` (uuid, primary key)
      - `list_id` (uuid, references bookmark_lists)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - Unique constraint on (list_id, user_id)
    
    - `list_reports`
      - `id` (uuid, primary key)
      - `list_id` (uuid, references bookmark_lists)
      - `user_id` (uuid, nullable, references auth.users)
      - `reason` (text, report reason)
      - `created_at` (timestamptz)

  3. Default Lists Creation
    - Create trigger function to auto-create default lists on signup
    - Default lists: "買いたい本" and "オススメの本" (both private)

  4. Security
    - Enable RLS on all tables
    - Add policies for appropriate access control

  5. Indexes
    - Add indexes for performance optimization
*/

-- Drop old tables and policies
DROP TABLE IF EXISTS bookmark_likes CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS bookmarks CASCADE;

-- Create bookmark_lists table
CREATE TABLE IF NOT EXISTS bookmark_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  is_public boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create bookmark_list_items table
CREATE TABLE IF NOT EXISTS bookmark_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bookmark_list_id uuid REFERENCES bookmark_lists(id) ON DELETE CASCADE NOT NULL,
  book_id uuid NOT NULL,
  context text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(bookmark_list_id, book_id)
);

-- Create list_likes table
CREATE TABLE IF NOT EXISTS list_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES bookmark_lists(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(list_id, user_id)
);

-- Create list_reports table
CREATE TABLE IF NOT EXISTS list_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES bookmark_lists(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bookmark_lists_user_id ON bookmark_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmark_lists_is_public ON bookmark_lists(is_public);
CREATE INDEX IF NOT EXISTS idx_bookmark_lists_created_at ON bookmark_lists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmark_list_items_list_id ON bookmark_list_items(bookmark_list_id);
CREATE INDEX IF NOT EXISTS idx_bookmark_list_items_book_id ON bookmark_list_items(book_id);
CREATE INDEX IF NOT EXISTS idx_list_likes_list_id ON list_likes(list_id);
CREATE INDEX IF NOT EXISTS idx_list_likes_user_id ON list_likes(user_id);

-- Enable RLS
ALTER TABLE bookmark_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmark_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_reports ENABLE ROW LEVEL SECURITY;

-- Bookmark Lists policies
CREATE POLICY "Users can create their own lists"
  ON bookmark_lists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own lists"
  ON bookmark_lists FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public lists"
  ON bookmark_lists FOR SELECT
  TO public
  USING (is_public = true);

CREATE POLICY "Users can update their own lists"
  ON bookmark_lists FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lists"
  ON bookmark_lists FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Bookmark List Items policies
CREATE POLICY "Users can add items to their own lists"
  ON bookmark_list_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookmark_lists
      WHERE bookmark_lists.id = bookmark_list_items.bookmark_list_id
      AND bookmark_lists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view items in their own lists"
  ON bookmark_list_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookmark_lists
      WHERE bookmark_lists.id = bookmark_list_items.bookmark_list_id
      AND bookmark_lists.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view items in public lists"
  ON bookmark_list_items FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM bookmark_lists
      WHERE bookmark_lists.id = bookmark_list_items.bookmark_list_id
      AND bookmark_lists.is_public = true
    )
  );

CREATE POLICY "Users can update items in their own lists"
  ON bookmark_list_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookmark_lists
      WHERE bookmark_lists.id = bookmark_list_items.bookmark_list_id
      AND bookmark_lists.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookmark_lists
      WHERE bookmark_lists.id = bookmark_list_items.bookmark_list_id
      AND bookmark_lists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items from their own lists"
  ON bookmark_list_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookmark_lists
      WHERE bookmark_lists.id = bookmark_list_items.bookmark_list_id
      AND bookmark_lists.user_id = auth.uid()
    )
  );

-- List Likes policies
CREATE POLICY "Authenticated users can like public lists"
  ON list_likes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM bookmark_lists
      WHERE bookmark_lists.id = list_likes.list_id
      AND bookmark_lists.is_public = true
    )
  );

CREATE POLICY "Anyone can view list likes"
  ON list_likes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can delete their own likes"
  ON list_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- List Reports policies
CREATE POLICY "Anyone can create reports"
  ON list_reports FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can view their own reports"
  ON list_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to create default bookmark lists for new users
CREATE OR REPLACE FUNCTION create_default_bookmark_lists()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO bookmark_lists (user_id, name, is_public)
  VALUES 
    (NEW.id, '買いたい本', false),
    (NEW.id, 'オススメの本', false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create default lists on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_create_lists ON auth.users;
CREATE TRIGGER on_auth_user_created_create_lists
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_bookmark_lists();
