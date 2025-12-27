/*
  # Add foreign key relationship between bookmark_lists and profiles

  1. Changes
    - Add foreign key constraint from bookmark_lists.user_id to profiles.id
    - This enables Supabase to JOIN bookmark_lists with profiles table
  
  2. Notes
    - The user_id in bookmark_lists already references auth.users(id)
    - profiles.id also references auth.users(id) with ON DELETE CASCADE
    - Adding this relationship allows PostgREST to understand the connection
*/

-- Add foreign key constraint to enable JOIN with profiles table
DO $$ 
BEGIN
  -- First check if the constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'bookmark_lists_user_id_profiles_fkey' 
    AND table_name = 'bookmark_lists'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE bookmark_lists 
    ADD CONSTRAINT bookmark_lists_user_id_profiles_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;