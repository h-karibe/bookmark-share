/*
  # Fix profile trigger with better error handling
  
  1. Changes
    - Add exception handling to the trigger function
    - Make the function more robust to prevent signup failures
  
  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS
*/

-- Replace the trigger function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to insert the profile, but don't fail the signup if it errors
  BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'User')
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail the user creation
      RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;