/*
  # Add foreign key relationship between book_reviews and profiles

  1. Changes
    - Drop existing foreign key constraint to auth.users
    - Add foreign key constraint from book_reviews.user_id to profiles.id
    - This allows Supabase to join book_reviews with profiles data

  2. Notes
    - The profiles table has a foreign key to auth.users(id)
    - By referencing profiles instead of auth.users directly, we can fetch username in a single query
*/

-- Drop the existing foreign key constraint to auth.users
ALTER TABLE book_reviews 
  DROP CONSTRAINT IF EXISTS book_reviews_user_id_fkey;

-- Add foreign key constraint to profiles table
ALTER TABLE book_reviews
  ADD CONSTRAINT book_reviews_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;
