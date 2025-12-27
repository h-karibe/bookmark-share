/*
  # Create book reviews table

  1. New Tables
    - `book_reviews`
      - `id` (uuid, primary key)
      - `book_id` (uuid, foreign key to books)
      - `user_id` (uuid, foreign key to auth.users)
      - `review` (text, max 255 characters)
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)

  2. Security
    - Enable RLS on `book_reviews` table
    - Add policy for anyone to read reviews
    - Add policy for authenticated users to create their own reviews
    - Add policy for users to update their own reviews
    - Add policy for users to delete their own reviews

  3. Indexes
    - Add index on book_id for faster lookups
    - Add index on user_id for user's review queries
*/

CREATE TABLE IF NOT EXISTS book_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review text NOT NULL CHECK (char_length(review) <= 255),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS book_reviews_book_id_idx ON book_reviews(book_id);
CREATE INDEX IF NOT EXISTS book_reviews_user_id_idx ON book_reviews(user_id);

ALTER TABLE book_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews"
  ON book_reviews FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create reviews"
  ON book_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON book_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
  ON book_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
