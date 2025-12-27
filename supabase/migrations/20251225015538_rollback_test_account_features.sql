/*
  # Rollback test account features
  
  1. Changes
    - Remove automatic profile creation trigger
    - Remove trigger function
    - Restore manual profile insert policy for users
  
  2. Security
    - Re-enable users to manually create their own profiles
*/

-- Drop the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the trigger function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Restore the manual insert policy
CREATE POLICY "Users can insert own profile" 
  ON profiles 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);